use std::collections::HashMap;
use std::num::NonZeroU32;

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use tonic_web_wasm_client::Client;

use zcash_address::ZcashAddress;
use zcash_client_backend::proto::service::compact_tx_streamer_client::CompactTxStreamerClient;
use zcash_client_memory::MemoryWalletDb;
use zcash_keys::keys::UnifiedFullViewingKey;
use zcash_primitives::consensus::{self, BlockHeight};

use crate::error::Error;
use crate::{BlockRange, MemoryWallet, Wallet, PRUNING_DEPTH};

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
#[derive(Clone)]
pub struct WebWallet {
    inner: MemoryWallet<tonic_web_wasm_client::Client>,
}

impl WebWallet {
    fn network_from_str(network: &str) -> Result<consensus::Network, Error> {
        match network {
            "main" => Ok(consensus::Network::MainNetwork),
            "test" => Ok(consensus::Network::TestNetwork),
            _ => Err(Error::InvalidNetwork(network.to_string())),
        }
    }

    pub fn client(&self) -> CompactTxStreamerClient<tonic_web_wasm_client::Client> {
        self.inner.client.clone()
    }

    pub fn inner_mut(&mut self) -> &mut MemoryWallet<tonic_web_wasm_client::Client> {
        &mut self.inner
    }
}

#[wasm_bindgen]
impl WebWallet {
    /// Create a new instance of a Zcash wallet for a given network
    #[wasm_bindgen(constructor)]
    pub fn new(
        network: &str,
        lightwalletd_url: &str,
        min_confirmations: u32,
    ) -> Result<WebWallet, Error> {
        let network = Self::network_from_str(network)?;
        let min_confirmations = NonZeroU32::try_from(min_confirmations)
            .map_err(|_| Error::InvalidMinConformations(min_confirmations))?;
        let client = Client::new(lightwalletd_url.to_string());

        Ok(Self {
            inner: Wallet::new(
                MemoryWalletDb::new(network, PRUNING_DEPTH),
                client,
                network,
                min_confirmations,
            )?,
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
        &self,
        seed_phrase: &str,
        account_index: u32,
        birthday_height: Option<u32>,
    ) -> Result<String, Error> {
        tracing::info!("Create account called");
        self.inner
            .create_account(seed_phrase, account_index, birthday_height)
            .await
    }

    pub async fn import_ufvk(
        &self,
        key: &str,
        birthday_height: Option<u32>,
    ) -> Result<String, Error> {
        let ufvk = UnifiedFullViewingKey::decode(&self.inner.network, key)
            .map_err(Error::KeyParseError)?;

        self.inner.import_ufvk(&ufvk, birthday_height).await
    }

    pub async fn suggest_scan_ranges(&self) -> Result<Vec<BlockRange>, Error> {
        self.inner.suggest_scan_ranges().await
    }

    /// Synchronize the wallet with the blockchain up to the tip
    /// The passed callback will be called for every batch of blocks processed with the current progress
    pub async fn sync(&self, callback: &js_sys::Function) -> Result<(), Error> {
        let callback = move |scanned_to: BlockHeight, tip: BlockHeight| {
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

    /// Synchronize the wallet with the blockchain up to the tip using zcash_client_backend's algo
    pub async fn sync2(&self) -> Result<(), Error> {
        self.inner.sync2().await
    }

    pub async fn get_wallet_summary(&self) -> Result<Option<WalletSummary>, Error> {
        Ok(self.inner.get_wallet_summary().await?.map(Into::into))
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
        &self,
        seed_phrase: &str,
        from_account_index: usize,
        to_address: String,
        value: u64,
    ) -> Result<(), Error> {
        let to_address = ZcashAddress::try_from_encoded(&to_address)?;
        self.inner
            .transfer(seed_phrase, from_account_index, to_address, value)
            .await
    }
}

#[wasm_bindgen]
#[derive(Debug, Serialize, Deserialize)]
pub struct WalletSummary {
    account_balances: HashMap<u32, AccountBalance>,
    pub chain_tip_height: u32,
    pub fully_scanned_height: u32,
    // scan_progress: Option<Ratio<u64>>,
    pub next_sapling_subtree_index: u64,
    pub next_orchard_subtree_index: u64,
}

#[wasm_bindgen]
impl WalletSummary {
    #[wasm_bindgen(getter)]
    pub fn account_balances(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.account_balances).unwrap()
    }
}


#[derive(Debug, Serialize, Deserialize)]
pub struct AccountBalance {
    pub sapling_balance: u64,
    pub orchard_balance: u64,
    pub unshielded_balance: u64,
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
