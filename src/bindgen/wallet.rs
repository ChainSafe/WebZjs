use std::collections::HashMap;
use std::num::NonZeroU32;

use nonempty::NonEmpty;
use wasm_bindgen::prelude::*;

use bip0039::{English, Mnemonic};
use secrecy::{ExposeSecret, SecretVec, Zeroize};
use tonic_web_wasm_client::Client;

use zcash_keys::keys::UnifiedSpendingKey;
use zcash_primitives::consensus::{self, BlockHeight};
use zcash_primitives::transaction::TxId;

use crate::error::Error;
use crate::{BlockRange, Proposal, WalletInner};

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
    inner: WalletInner<tonic_web_wasm_client::Client>,
}

#[wasm_bindgen]
impl Wallet {
    /// Create a new instance of a Zcash wallet for a given network
    #[wasm_bindgen(constructor)]
    pub fn new(
        network: &str,
        lightwalletd_url: &str,
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
        let client = Client::new(lightwalletd_url.to_string());

        Ok(Self {
            inner: WalletInner::new(client, network, min_confirmations)?,
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
        self.inner
            .create_account(seed_phrase, account_index, birthday_height)
            .await
    }

    pub fn suggest_scan_ranges(&self) -> Result<Vec<BlockRange>, Error> {
        self.inner.suggest_scan_ranges()
    }

    /// Synchronize the wallet with the blockchain up to the tip
    /// The passed callback will be called for every batch of blocks processed with the current progress
    pub async fn sync(&mut self, callback: &js_sys::Function) -> Result<(), Error> {
        let tip = self.update_chain_tip().await?;
        let callback = move |scanned_to: BlockHeight| {
            let this = JsValue::null();
            let _ = callback.call2(
                &this,
                &JsValue::from(Into::<u32>::into(scanned_to)),
                &JsValue::from(Into::<u32>::into(tip)),
            );
        };

        self.inner.sync(callback).await?;

        Ok(())
    }

    /// Download and process all blocks in the given range
    async fn fetch_and_scan_range(&mut self, start: u32, end: u32) -> Result<(), Error> {
        self.inner.fetch_and_scan_range(start, end).await
    }

    pub fn get_wallet_summary(&self) -> Result<Option<WalletSummary>, Error> {
        Ok(self.inner.get_wallet_summary()?.map(Into::into))
    }

    async fn update_chain_tip(&mut self) -> Result<BlockHeight, Error> {
        self.inner.update_chain_tip().await
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
        self.inner
            .propose_transfer(account_index, to_address, value)
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
        self.inner.create_proposed_transactions(proposal, usk)
    }

    ///
    /// Create a transaction proposal to send funds from the wallet to a given address and if approved will sign it and send the proposed transaction(s) to the network
    ///
    /// First a proposal is created by selecting inputs and outputs to cover the requested amount. This proposal is then sent to the approval callback.
    /// This allows wallet developers to display a confirmation dialog to the user before continuing.
    ///
    /// # Arguments
    ///
    pub async fn transfer(
        &mut self,
        seed_phrase: &str,
        from_account_index: usize,
        to_address: String,
        value: u64,
    ) -> Result<(), Error> {
        self.inner
            .transfer(seed_phrase, from_account_index, to_address, value)
            .await
    }
}

fn usk_from_seed_str(
    seed: &str,
    account_index: u32,
    network: &consensus::Network,
) -> Result<UnifiedSpendingKey, Error> {
    let mnemonic = <Mnemonic<English>>::from_phrase(seed).unwrap();
    let seed = {
        let mut seed = mnemonic.to_seed("");
        let secret = seed.to_vec();
        seed.zeroize();
        SecretVec::new(secret)
    };
    let usk =
        UnifiedSpendingKey::from_seed(network, seed.expose_secret(), account_index.try_into()?)?;
    Ok(usk)
}

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
