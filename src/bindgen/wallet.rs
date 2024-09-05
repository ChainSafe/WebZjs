use std::collections::HashMap;

use wasm_bindgen::prelude::*;

use bip0039::{English, Mnemonic};
use futures_util::{StreamExt, TryStreamExt};
use secrecy::{ExposeSecret, SecretVec, Zeroize};
use tonic_web_wasm_client::Client;

use zcash_client_backend::data_api::{
    AccountBirthday, AccountPurpose, NullifierQuery, WalletRead, WalletWrite,
};
use zcash_client_backend::proto::service;
use zcash_client_backend::proto::service::compact_tx_streamer_client::CompactTxStreamerClient;
use zcash_client_backend::scanning::{scan_block, Nullifiers, ScanningKeys};
use zcash_client_memory::MemoryWalletDb;
use zcash_keys::keys::UnifiedSpendingKey;
use zcash_primitives::consensus;

use crate::error::Error;

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
    min_confirmations: u32,
}

#[wasm_bindgen]
impl Wallet {
    /// Create a new instance of a Zcash wallet for a given network
    #[wasm_bindgen(constructor)]
    pub fn new(
        network: &str,
        lightwalletd_url: &str,
        max_checkpoints: usize,
        min_confirmations: u32,
    ) -> Result<Wallet, Error> {
        let network = match network {
            "main" => consensus::Network::MainNetwork,
            "test" => consensus::Network::TestNetwork,
            _ => {
                return Err(Error::InvalidNetwork(network.to_string()));
            }
        };

        Ok(Wallet {
            db: MemoryWalletDb::new(network, max_checkpoints),
            client: CompactTxStreamerClient::new(Client::new(lightwalletd_url.to_string())),
            network,
            min_confirmations,
        })
    }

    /// Add a new account to the wallet
    ///
    /// # Arguments
    /// seed_phrase - mnemonic phrase to initialise the wallet
    /// account_index - The HD derivation index to use. Can be any integer
    /// birthday_height - The block height at which the account was created, optionally None and the current height is used
    ///
    pub async fn create_account(
        &mut self,
        seed_phrase: &str,
        account_index: u32,
        birthday_height: Option<u32>,
    ) -> Result<String, Error> {
        // decode the mnemonic and derive the first account
        let mnemonic = <Mnemonic<English>>::from_phrase(seed_phrase).unwrap();
        let seed = {
            let mut seed = mnemonic.to_seed("");
            let secret = seed.to_vec();
            seed.zeroize();
            SecretVec::new(secret)
        };
        let usk = UnifiedSpendingKey::from_seed(
            &self.network,
            seed.expose_secret(),
            account_index.try_into()?,
        )?;
        let ufvk = usk.to_unified_full_viewing_key();

        let birthday = match birthday_height {
            Some(height) => height,
            None => {
                let chain_tip: u32 = self
                    .client
                    .get_latest_block(service::ChainSpec::default())
                    .await?
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
            let treestate = self.client.get_tree_state(request).await?.into_inner();
            AccountBirthday::from_treestate(treestate, None).map_err(|_| Error::BirthdayError)?
        };

        let _account = self
            .db
            .import_account_ufvk(&ufvk, &birthday, AccountPurpose::Spending)?;
        // TOOD: Make this public on account Ok(account.account_id().to_string())
        Ok("0".to_string())
    }

    pub fn suggest_scan_ranges(&self) -> Result<Vec<BlockRange>, Error> {
        Ok(self.db.suggest_scan_ranges().map(|ranges| {
            ranges
                .iter()
                .map(|scan_range| {
                    BlockRange(
                        scan_range.block_range().start.into(),
                        scan_range.block_range().end.into(),
                    )
                })
                .collect()
        })?)
    }

    /// Fully sync the wallet with the blockchain calling the provided callback with progress updates
    pub async fn get_and_scan_range(&mut self, start: u32, end: u32) -> Result<(), Error> {
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
            .await?;

        let chainstate = tree_state.into_inner().to_chain_state()?;

        // Get the scanning keys from the DB
        let account_ufvks = self.db.get_unified_full_viewing_keys()?;
        let scanning_keys = ScanningKeys::from_account_ufvks(account_ufvks);

        // Get the nullifiers for the unspent notes we are tracking
        let nullifiers = Nullifiers::new(
            self.db.get_sapling_nullifiers(NullifierQuery::Unspent)?,
            self.db.get_orchard_nullifiers(NullifierQuery::Unspent)?,
        );

        // convert the compact blocks into ScannedBlocks
        // TODO: We can tweak how we batch and collect this stream in the future
        //          to optimize for parallelism and memory usage
        let scanned_blocks = self
            .client
            .get_block_range(range)
            .await?
            .into_inner()
            .map(|compact_block| {
                scan_block(
                    &self.network,
                    compact_block.unwrap(),
                    &scanning_keys,
                    &nullifiers,
                    None,
                )
            })
            .try_collect()
            .await?;

        self.db.put_blocks(&chainstate, scanned_blocks)?;
        Ok(())
    }

    pub fn get_wallet_summary(&self) -> Result<Option<WalletSummary>, Error> {
        Ok(self
            .db
            .get_wallet_summary(self.min_confirmations)?
            .map(Into::into))
    }
}

#[wasm_bindgen]
pub struct BlockRange(pub u32, pub u32);

#[wasm_bindgen]
#[allow(dead_code)]
#[derive(Debug)]
pub struct WalletSummary {
    account_balances: HashMap<u32, AccountBalance>,
    chain_tip_height: u32,
    fully_scanned_height: u32,
    // scan_progress: Option<Ratio<u64>>,
    next_sapling_subtree_index: u64,
    next_orchard_subtree_index: u64,
}

#[wasm_bindgen]
#[allow(dead_code)]
#[derive(Debug)]
pub struct AccountBalance {
    sapling_balance: u64,
    orchard_balance: u64,
    unshielded_balance: u64,
}

impl From<zcash_client_backend::data_api::AccountBalance> for AccountBalance {
    fn from(balance: zcash_client_backend::data_api::AccountBalance) -> Self {
        AccountBalance {
            sapling_balance: balance.sapling_balance().spendable_value().into(),
            orchard_balance: balance.orchard_balance().spendable_value().into(),
            unshielded_balance: balance.unshielded().into(),
        }
    }
}

impl<T> From<zcash_client_backend::data_api::WalletSummary<T>> for WalletSummary
where
    T: std::cmp::Eq + std::hash::Hash + std::ops::Deref<Target = u32> + Clone,
{
    fn from(summary: zcash_client_backend::data_api::WalletSummary<T>) -> Self {
        let account_balances = summary
            .account_balances()
            .iter()
            .map(|(k, v)| (*(*k).clone().deref(), (*v).into()))
            .collect();

        WalletSummary {
            account_balances,
            chain_tip_height: summary.chain_tip_height().into(),
            fully_scanned_height: summary.fully_scanned_height().into(),
            next_sapling_subtree_index: summary.next_sapling_subtree_index(),
            next_orchard_subtree_index: summary.next_orchard_subtree_index(),
        }
    }
}
