use std::sync::Arc;
use subtle::ConditionallySelectable;
use tokio::sync::RwLock;
use tonic::codegen::{Body, Bytes, StdError};
use tonic::{body::BoxBody, client::GrpcService};
use tracing::{debug, info};
use zcash_client_backend::data_api::chain::BlockCache;
use zcash_client_backend::data_api::scanning::{ScanPriority, ScanRange};
use zcash_client_backend::data_api::{WalletCommitmentTrees, WalletRead, WalletWrite};
use zcash_client_backend::proto::service::compact_tx_streamer_client::CompactTxStreamerClient;
use zcash_client_backend::sync::{
    download_blocks, download_chain_state, refresh_utxos, scan_blocks, update_chain_tip,
    update_subtree_roots, Error,
};
use zcash_primitives::consensus::{BlockHeight, NetworkUpgrade, Parameters};

/// Scans the chain until the wallet is up-to-date.
pub async fn run<P, ChT, CaT, DbT>(
    client: &mut CompactTxStreamerClient<ChT>,
    params: &P,
    db_cache: &CaT,
    db_data: Arc<RwLock<DbT>>,
    batch_size: u32,
) -> Result<(), Error<CaT::Error, <DbT as WalletRead>::Error, <DbT as WalletCommitmentTrees>::Error>>
where
    P: Parameters + Send + 'static,
    ChT: GrpcService<BoxBody>,
    ChT::Error: Into<StdError>,
    ChT::ResponseBody: Body<Data = Bytes> + Send + 'static,
    <ChT::ResponseBody as Body>::Error: Into<StdError> + Send,
    CaT: BlockCache,
    CaT::Error: std::error::Error + Send + Sync + 'static,
    DbT: WalletWrite + WalletCommitmentTrees,
    DbT::AccountId: ConditionallySelectable + Default + Send + 'static,
    <DbT as WalletRead>::Error: std::error::Error + Send + Sync + 'static,
    <DbT as WalletCommitmentTrees>::Error: std::error::Error + Send + Sync + 'static,
{
    let wallet_birthday = db_data
        .read()
        .await
        .get_wallet_birthday()
        .map_err(Error::Wallet)?
        .unwrap_or_else(|| params.activation_height(NetworkUpgrade::Sapling).unwrap());
    tracing::info!("Sync3 Run!");

    // 1) Download note commitment tree data from lightwalletd
    // 2) Pass the commitment tree data to the database.
    update_subtree_roots(client, &mut *db_data.write().await).await?;

    while running(
        client,
        params,
        db_cache,
        db_data.clone(),
        batch_size,
        wallet_birthday,
    )
    .await?
    {}

    Ok(())
}

pub async fn running<P, ChT, CaT, DbT, TrErr>(
    client: &mut CompactTxStreamerClient<ChT>,
    params: &P,
    db_cache: &CaT,
    db_data: Arc<RwLock<DbT>>,
    batch_size: u32,
    wallet_birthday: BlockHeight,
) -> Result<bool, Error<CaT::Error, <DbT as WalletRead>::Error, TrErr>>
where
    P: Parameters + Send + 'static,
    ChT: GrpcService<BoxBody>,
    ChT::Error: Into<StdError>,
    ChT::ResponseBody: Body<Data = Bytes> + Send + 'static,
    <ChT::ResponseBody as Body>::Error: Into<StdError> + Send,
    CaT: BlockCache,
    CaT::Error: std::error::Error + Send + Sync + 'static,
    DbT: WalletWrite,
    DbT::AccountId: ConditionallySelectable + Default + Send + 'static,
    DbT::Error: std::error::Error + Send + Sync + 'static,
{
    // 3) Download chain tip metadata from lightwalletd
    // 4) Notify the wallet of the updated chain tip.
    update_chain_tip(client, &mut *db_data.write().await).await?;

    // Refresh UTXOs for the accounts in the wallet. We do this before we perform
    // any shielded scanning, to ensure that we discover any UTXOs between the old
    // fully-scanned height and the current chain tip.
    let account_ids = db_data
        .read()
        .await
        .get_account_ids()
        .map_err(Error::Wallet)?;
    for account_id in account_ids {
        let start_height = db_data
            .read()
            .await
            .block_fully_scanned()
            .map_err(Error::Wallet)?
            .map(|meta| meta.block_height())
            .unwrap_or(wallet_birthday);
        info!(
            "Refreshing UTXOs for {:?} from height {}",
            account_id, start_height,
        );
        refresh_utxos(
            params,
            client,
            &mut *db_data.write().await,
            account_id,
            start_height,
        )
        .await?;
    }

    // 5) Get the suggested scan ranges from the wallet database
    let mut scan_ranges = db_data
        .read()
        .await
        .suggest_scan_ranges()
        .map_err(Error::Wallet)?;

    // Store the handles to cached block deletions (which we spawn into separate
    // tasks to allow us to continue downloading and scanning other ranges).
    let mut block_deletions = vec![];

    // 6) Run the following loop until the wallet's view of the chain tip as of
    //    the previous wallet session is valid.
    loop {
        // If there is a range of blocks that needs to be verified, it will always
        // be returned as the first element of the vector of suggested ranges.
        match scan_ranges.first() {
            Some(scan_range) if scan_range.priority() == ScanPriority::Verify => {
                // Download the blocks in `scan_range` into the block source,
                // overwriting any existing blocks in this range.
                download_blocks(client, db_cache, scan_range).await?;

                let chain_state =
                    download_chain_state(client, scan_range.block_range().start - 1).await?;

                // Scan the downloaded blocks and check for scanning errors that
                // indicate the wallet's chain tip is out of sync with blockchain
                // history.
                let scan_ranges_updated = scan_blocks(
                    params,
                    db_cache,
                    &mut *db_data.write().await,
                    &chain_state,
                    scan_range,
                )
                .await?;

                // Delete the now-scanned blocks, because keeping the entire chain
                // in CompactBlock files on disk is horrendous for the filesystem.
                block_deletions.push(db_cache.delete(scan_range.clone()));

                if scan_ranges_updated {
                    // The suggested scan ranges have been updated, so we re-request.
                    scan_ranges = db_data
                        .read()
                        .await
                        .suggest_scan_ranges()
                        .map_err(Error::Wallet)?;
                } else {
                    // At this point, the cache and scanned data are locally
                    // consistent (though not necessarily consistent with the
                    // latest chain tip - this would be discovered the next time
                    // this codepath is executed after new blocks are received) so
                    // we can break out of the loop.
                    break;
                }
            }
            _ => {
                // Nothing to verify; break out of the loop
                break;
            }
        }
    }

    // 7) Loop over the remaining suggested scan ranges, retrieving the requested data
    //    and calling `scan_cached_blocks` on each range.
    let scan_ranges = db_data
        .read()
        .await
        .suggest_scan_ranges()
        .map_err(Error::Wallet)?;
    debug!("Suggested ranges: {:?}", scan_ranges);
    for scan_range in scan_ranges.into_iter().flat_map(|r| {
        // Limit the number of blocks we download and scan at any one time.
        (0..).scan(r, |acc, _| {
            if acc.is_empty() {
                None
            } else if let Some((cur, next)) = acc.split_at(acc.block_range().start + batch_size) {
                *acc = next;
                Some(cur)
            } else {
                let cur = acc.clone();
                let end = acc.block_range().end;
                *acc = ScanRange::from_parts(end..end, acc.priority());
                Some(cur)
            }
        })
    }) {
        // Download the blocks in `scan_range` into the block source.
        download_blocks(client, db_cache, &scan_range).await?;

        let chain_state = download_chain_state(client, scan_range.block_range().start - 1).await?;

        // Scan the downloaded blocks.
        let scan_ranges_updated = scan_blocks(
            params,
            db_cache,
            &mut *db_data.write().await,
            &chain_state,
            &scan_range,
        )
        .await?;

        // Delete the now-scanned blocks.
        block_deletions.push(db_cache.delete(scan_range));

        if scan_ranges_updated {
            // The suggested scan ranges have been updated (either due to a continuity
            // error or because a higher priority range has been added).
            info!("Waiting for cached blocks to be deleted...");
            for deletion in block_deletions {
                deletion.await.map_err(Error::Cache)?;
            }
            return Ok(true);
        }
    }

    info!("Waiting for cached blocks to be deleted...");
    for deletion in block_deletions {
        deletion.await.map_err(Error::Cache)?;
    }
    Ok(false)
}
