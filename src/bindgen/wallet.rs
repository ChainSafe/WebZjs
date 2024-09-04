use wasm_bindgen::prelude::*;

use bip0039::{English, Mnemonic};
use futures_util::{StreamExt, TryStreamExt};
use secrecy::{SecretVec, Zeroize};
use tonic_web_wasm_client::Client;

use zcash_client_backend::data_api::scanning::ScanRange;
use zcash_client_backend::data_api::{AccountBirthday, NullifierQuery, WalletRead, WalletWrite};
use zcash_client_backend::proto::service;
use zcash_client_backend::proto::service::compact_tx_streamer_client::CompactTxStreamerClient;
use zcash_client_backend::scan;
use zcash_client_backend::scanning::{scan_block, Nullifiers, ScanningKeys};
use zcash_client_memory::MemoryWalletDb;
use zcash_primitives::consensus;

/// # A Zcash wallet
///
/// A wallet is a set of accounts that can be synchronized together with the blockchain.
/// Once synchronized these can be used to build transactions that spend notes
///
/// ## Adding Accounts
///
/// TODO
///
/// ## Synchronizing
///
/// A wallet can be syncced with the blockchain by feeding it blocks. The accounts currently managed by the wallet will be used to
/// scan the blocks and retrieve relevant transactions. The wallet itself keeps track of blocks it has seen and can be queried for
/// the suggest range of blocks that should be retrieved for it to process next.
///
/// ## Building Transactions
///
/// TODO
///
#[wasm_bindgen]
pub struct Wallet {
    /// Internal database used to maintain wallet data (e.g. accounts, transactions, cached blocks)
    db: MemoryWalletDb<consensus::Network>,
    // gRPC client used to connect to a lightwalletd instance for network data
    client: CompactTxStreamerClient<tonic_web_wasm_client::Client>,
    network: consensus::Network,
}

#[wasm_bindgen]
impl Wallet {
    /// Create a new instance of a Zcash wallet for a given network
    #[wasm_bindgen(constructor)]
    pub fn new(
        network: &str,
        lightwalletd_url: &str,
        max_checkpoints: usize,
    ) -> Result<Wallet, JsValue> {
        let network = match network {
            "main" => consensus::Network::MainNetwork,
            "test" => consensus::Network::TestNetwork,
            _ => {
                return Err(JsValue::from_str(
                    "Invalid network. Must be 'main' or 'test'",
                ))
            }
        };

        Ok(Wallet {
            db: MemoryWalletDb::new(network, max_checkpoints),
            client: CompactTxStreamerClient::new(Client::new(lightwalletd_url.to_string())),
            network,
        })
    }

    /// Add a new account to the wallet
    ///
    /// # Arguments
    /// seed_phrase - mnemonic phrase to initialise the wallet
    /// birthday_height - The block height at which the account was created, optionally None and the current height is used
    ///
    pub async fn create_account(
        &mut self,
        seed_phrase: &str,
        birthday_height: Option<u32>,
    ) -> Result<String, JsValue> {
        // decode the mnemonic
        let mnemonic = <Mnemonic<English>>::from_phrase(seed_phrase).unwrap();
        let seed = {
            let mut seed = mnemonic.to_seed("");
            let secret = seed.to_vec();
            seed.zeroize();
            SecretVec::new(secret)
        };

        let birthday = match birthday_height {
            Some(height) => height,
            None => {
                let chain_tip: u32 = self
                    .client
                    .get_latest_block(service::ChainSpec::default())
                    .await
                    .unwrap()
                    .into_inner()
                    .height
                    .try_into()
                    .expect("block heights must fit into u32");
                chain_tip - 100
            }
        };
        // Construct an `AccountBirthday` for the account's birthday.
        let birthday = {
            // Fetch the tree state corresponding to the last block prior to the wallet's
            // birthday height. NOTE: THIS APPROACH LEAKS THE BIRTHDAY TO THE SERVER!
            let request = service::BlockId {
                height: (birthday - 1).into(),
                ..Default::default()
            };
            let treestate = self
                .client
                .get_tree_state(request)
                .await
                .unwrap()
                .into_inner();
            AccountBirthday::from_treestate(treestate, None)
                .map_err(|_| "cooked")
                .unwrap()
        };

        let (id, _spending_key) = self.db.create_account(&seed, &birthday).unwrap();
        Ok(id.to_string())
    }

    pub fn suggest_scan_ranges(&self) -> Result<Vec<BlockRange>, JsValue> {
        Ok(self
            .db
            .suggest_scan_ranges()
            .map(|ranges| {
                ranges
                    .iter()
                    .map(|scan_range| {
                        BlockRange(
                            scan_range.block_range().start.into(),
                            scan_range.block_range().end.into(),
                        )
                    })
                    .collect()
            })
            .unwrap())
    }

    /// Fully sync the wallet with the blockchain calling the provided callback with progress updates
    pub async fn get_and_scan_range(
        &mut self,
        start: u32,
        end: u32,
    ) -> Result<(), JsValue> {
        let range = service::BlockRange {
            start: Some(service::BlockId {
                height: start.into(),
                ..Default::default()
            }),
            end: Some(service::BlockId {
                height: end.into(),
                ..Default::default()
            }),
        };

        // get the chainstate prior to the range
        let tree_state = self
            .client
            .get_tree_state(service::BlockId {
                height: (start - 1).into(),
                ..Default::default()
            })
            .await
            .unwrap();
        let chainstate = tree_state.into_inner().to_chain_state().unwrap();

        // Get the scanning keys from the DB
        let account_ufvks = self.db.get_unified_full_viewing_keys().unwrap();
        let scanning_keys = ScanningKeys::from_account_ufvks(account_ufvks);

        // Get the nullifiers for the unspent notes we are tracking
        let nullifiers = Nullifiers::new(
            self.db
                .get_sapling_nullifiers(NullifierQuery::Unspent).unwrap(),
            self.db
                .get_orchard_nullifiers(NullifierQuery::Unspent).unwrap()
        );

        // convert the compact blocks into ScannedBlocks
        // TODO: We can tweak how we batch and collect this stream in the future
        //          to optimize for parallelism and memory usage
        let scanned_blocks = self
            .client
            .get_block_range(range)
            .await
            .unwrap()
            .into_inner()
            .map(|compact_block| {
                scan_block(
                    &self.network,
                    compact_block.unwrap(),
                    &scanning_keys,
                    &nullifiers,
                    None,
                )
            }).try_collect().await.unwrap();

        self.db.put_blocks(&chainstate, scanned_blocks).unwrap();
        Ok(())
    }
}

#[wasm_bindgen]
pub struct BlockRange(pub u32, pub u32);
