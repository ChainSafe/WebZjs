use std::collections::HashMap;
use std::num::NonZeroU32;

use nonempty::NonEmpty;
use sha2::digest::block_buffer::Block;
use wasm_bindgen::prelude::*;

use bip0039::{English, Mnemonic};
use futures_util::{StreamExt, TryStreamExt};
use secrecy::{ExposeSecret, SecretVec, Zeroize};
use tonic_web_wasm_client::Client;

use zcash_address::ZcashAddress;
use zcash_client_backend::data_api::scanning::ScanRange;
use zcash_client_backend::data_api::wallet::input_selection::GreedyInputSelector;
use zcash_client_backend::data_api::wallet::{create_proposed_transactions, propose_transfer};
use zcash_client_backend::data_api::{
    AccountBirthday, AccountPurpose, InputSource, NullifierQuery, WalletRead, WalletWrite,
};
use zcash_client_backend::fees::zip317::SingleOutputChangeStrategy;
use zcash_client_backend::proto::service;
use zcash_client_backend::proto::service::compact_tx_streamer_client::CompactTxStreamerClient;
use zcash_client_backend::scanning::{scan_block, Nullifiers, ScanningKeys};
use zcash_client_backend::wallet::OvkPolicy;
use zcash_client_backend::zip321::{Payment, TransactionRequest};
use zcash_client_backend::ShieldedProtocol;
use zcash_client_memory::MemoryWalletDb;
use zcash_keys::keys::UnifiedSpendingKey;
use zcash_primitives::consensus::{self, BlockHeight};
use zcash_primitives::transaction::components::amount::NonNegativeAmount;
use zcash_primitives::transaction::fees::zip317::FeeRule;
use zcash_primitives::transaction::TxId;
use zcash_proofs::prover::LocalTxProver;

use crate::error::Error;

const BATCH_SIZE: u32 = 10000;

type Proposal =
    zcash_client_backend::proposal::Proposal<FeeRule, zcash_client_backend::wallet::NoteId>;

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
    min_confirmations: NonZeroU32,
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
        let min_confirmations = NonZeroU32::try_from(min_confirmations)
            .map_err(|_| Error::InvalidMinConformations(min_confirmations))?;

        Ok(Wallet {
            db: MemoryWalletDb::new(network, max_checkpoints),
            client: CompactTxStreamerClient::new(Client::new(lightwalletd_url.to_string())),
            network,
            min_confirmations: min_confirmations,
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
        let usk = usk_from_seed_str(seed_phrase, account_index, &self.network)?;
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

    /// Synchronize the wallet with the blockchain up to the tip
    /// The passed callback will be called for every batch of blocks processed with the current progress
    pub async fn sync(&mut self, callback: &js_sys::Function) -> Result<(), Error> {
        let tip = self.update_chain_tip().await?;

        tracing::info!("Retrieving suggested scan ranges from wallet");
        let scan_ranges = self.db.suggest_scan_ranges()?;
        tracing::info!("Suggested scan ranges: {:?}", scan_ranges);

        // TODO: Ensure wallet's view of the chain tip as of the previous wallet session is valid.
        // See https://github.com/Electric-Coin-Company/zec-sqlite-cli/blob/8c2e49f6d3067ec6cc85248488915278c3cb1c5a/src/commands/sync.rs#L157

        let callback = move |scanned_to: BlockHeight| {
            let this = JsValue::null();
            let _ = callback.call2(
                &this,
                &JsValue::from(Into::<u32>::into(scanned_to)),
                &JsValue::from(Into::<u32>::into(tip)),
            );
        };

        // Download and process all blocks in the requested ranges
        // Split each range into BATCH_SIZE chunks to avoid requesting too many blocks at once
        for scan_range in scan_ranges.into_iter().flat_map(|r| {
            // Limit the number of blocks we download and scan at any one time.
            (0..).scan(r, |acc, _| {
                if acc.is_empty() {
                    None
                } else if let Some((cur, next)) = acc.split_at(acc.block_range().start + BATCH_SIZE)
                {
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
            self.fetch_and_scan_range(
                scan_range.block_range().start.into(),
                scan_range.block_range().end.into(),
            )
            .await?;
            callback(scan_range.block_range().end);
        }

        Ok(())
    }

    /// Download and process all blocks in the given range
    async fn fetch_and_scan_range(&mut self, start: u32, end: u32) -> Result<(), Error> {
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

        let range = service::BlockRange {
            start: Some(service::BlockId {
                height: start.into(),
                ..Default::default()
            }),
            end: Some(service::BlockId {
                height: (end - 1).into(),
                ..Default::default()
            }),
        };

        tracing::info!("Scanning block range: {:?} to {:?}", start, end);

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
            .get_wallet_summary(self.min_confirmations.into())?
            .map(Into::into))
    }

    async fn update_chain_tip(&mut self) -> Result<BlockHeight, Error> {
        tracing::info!("Retrieving chain tip from lightwalletd");

        let tip_height = self
            .client
            .get_latest_block(service::ChainSpec::default())
            .await?
            .get_ref()
            .height
            .try_into()
            .unwrap();

        tracing::info!("Latest block height is {}", tip_height);
        self.db.update_chain_tip(tip_height)?;

        Ok(tip_height)
    }

    ///
    /// Create a transaction proposal to send funds from the wallet to a given address
    ///
    fn propose_transfer(
        &mut self,
        account_index: usize,
        to_address: String,
        value: u64,
    ) -> Result<Proposal, Error> {
        let account_id = self.db.get_account_ids()?[account_index];

        let input_selector = GreedyInputSelector::new(
            SingleOutputChangeStrategy::new(FeeRule::standard(), None, ShieldedProtocol::Orchard),
            Default::default(),
        );

        let request = TransactionRequest::new(vec![Payment::without_memo(
            ZcashAddress::try_from_encoded(&to_address)?,
            NonNegativeAmount::from_u64(value)?,
        )])
        .unwrap();

        tracing::info!("Chain height: {:?}", self.db.chain_height()?);
        tracing::info!(
            "target and anchor heights: {:?}",
            self.db
                .get_target_and_anchor_heights(self.min_confirmations)?
        );

        let proposal = propose_transfer::<
            _,
            _,
            _,
            <MemoryWalletDb<consensus::Network> as InputSource>::Error,
        >(
            &mut self.db,
            &self.network,
            account_id,
            &input_selector,
            request,
            self.min_confirmations,
        )
        .unwrap();
        tracing::info!("Proposal: {:#?}", proposal);
        Ok(proposal)
    }

    ///
    /// Do the proving and signing required to create one or more transaction from the proposal. Created transactions are stored in the wallet database.
    ///
    /// Note: At the moment this requires a USK but ideally we want to be able to hand the signing off to a separate service
    ///     e.g. browser plugin, hardware wallet, etc. Will need to look into refactoring librustzcash create_proposed_transactions to allow for this
    ///
    fn create_proposed_transactions(
        &mut self,
        proposal: Proposal,
        usk: &UnifiedSpendingKey,
    ) -> Result<NonEmpty<TxId>, Error> {
        let prover = LocalTxProver::bundled();

        let transactions = create_proposed_transactions::<
            _,
            _,
            <MemoryWalletDb<consensus::Network> as InputSource>::Error,
            _,
            _,
        >(
            &mut self.db,
            &self.network,
            &prover,
            &prover,
            usk,
            OvkPolicy::Sender,
            &proposal,
        )
        .unwrap();

        Ok(transactions)
    }

    ///
    /// Create a transaction proposal to send funds from the wallet to a given address and if approved will sign it and send the proposed transaction(s) to the network
    ///
    /// First a proposal is created by selecting inputs and outputs to cover the requested amount. This proposal is then sent to the approval callback.
    /// This allows wallet developers to display a confirmation dialog to the user before continuing.
    ///
    /// # Arguments
    ///
    pub fn transfer(
        &mut self,
        seed_phrase: &str,
        from_account_index: usize,
        to_address: String,
        value: u64,
    ) -> Result<(), Error> {
        let usk = usk_from_seed_str(seed_phrase, 0, &self.network)?;
        let proposal = self.propose_transfer(from_account_index, to_address, value)?;
        // TODO: Add callback for approving the transaction here
        let txids = self.create_proposed_transactions(proposal, &usk)?;
        Ok(())
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

fn usk_from_seed_str(seed: &str, account_index: u32, network: &consensus::Network) -> Result<UnifiedSpendingKey, Error> {
    let mnemonic = <Mnemonic<English>>::from_phrase(seed).unwrap();
    let seed = {
        let mut seed = mnemonic.to_seed("");
        let secret = seed.to_vec();
        seed.zeroize();
        SecretVec::new(secret)
    };
    let usk = UnifiedSpendingKey::from_seed(
        network,
        seed.expose_secret(),
        account_index.try_into()?,
    )?;
    Ok(usk)
}