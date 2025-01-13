use std::num::NonZeroU32;
use std::str::FromStr;

use nonempty::NonEmpty;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use tonic_web_wasm_client::Client;

use crate::error::Error;
use crate::wallet::usk_from_seed_str;
use crate::{bindgen::proposal::Proposal, Wallet, PRUNING_DEPTH};
use wasm_thread as thread;
use webz_common::Network;
use zcash_address::ZcashAddress;
use zcash_client_backend::data_api::{InputSource, WalletRead};
use zcash_client_backend::proto::service::{
    compact_tx_streamer_client::CompactTxStreamerClient, ChainSpec,
};
use zcash_client_memory::MemoryWalletDb;
use zcash_keys::encoding::AddressCodec;
use zcash_keys::keys::UnifiedFullViewingKey;
use zcash_primitives::transaction::TxId;

pub type MemoryWallet<T> = Wallet<MemoryWalletDb<Network>, T>;
pub type AccountId = <MemoryWalletDb<Network> as WalletRead>::AccountId;
pub type NoteRef = <MemoryWalletDb<Network> as InputSource>::NoteRef;

/// # A Zcash wallet
///
/// This is the main entry point for interacting with this library.
/// For the most part you will only need to create and interact with a Wallet instance.
///
/// A wallet is a set of accounts that can be synchronized together with the blockchain.
/// Once synchronized, the wallet can be used to propose, build and send transactions.
///
/// Create a new WebWallet with
/// ```javascript
/// const wallet = new WebWallet("main", "https://zcash-mainnet.chainsafe.dev", 10);
/// ```
///
/// ## Adding Accounts
///
/// Accounts can be added by either importing a seed phrase or a Unified Full Viewing Key (UFVK).
/// If you do import via a UFVK it is important that you also have access to the Unified Spending Key (USK) for that account otherwise the wallet will not be able to create transactions.
///
/// When importing an account you can also specify the block height at which the account was created. This can significantly reduce the time it takes to sync the account as the wallet will only scan for transactions after this height.
/// Failing to provide a birthday height will result in extremely slow sync times as the wallet will need to scan the entire blockchain.
///
/// e.g.
/// ```javascript
/// const account_id = await wallet.create_account("...", 1, 2657762)
///
/// // OR
///
/// const account_id = await wallet.import_ufvk("...", 2657762)
/// ``
///
/// ## Synchronizing
///
/// The wallet can be synchronized with the blockchain by calling the `sync` method. This will fetch compact blocks from the connected lightwalletd instance and scan them for transactions.
/// The sync method uses a built-in strategy to determine which blocks is needs to download and scan in order to gain full knowledge of the balances for all accounts that are managed.
///
/// Syncing is a long running process and so is delegated to a WebWorker to prevent from blocking the main thread. It is safe to call other methods on the wallet during syncing although they may take
/// longer than usual while they wait for a write-lock to be released.
///
/// ```javascript
/// await wallet.sync();
/// ```
///
/// ## Transacting
///
/// Sending a transaction is a three step process: proposing, authorizing, and sending.
///
/// A transaction proposal is created by calling `propose_transfer` with the intended recipient and amount. This will create a proposal object that describes which notes will be spent in order to fulfil this request.
/// The proposal should be presented to the user for review before being authorized.
///
/// To authorize the transaction the caller must currently provide the seed phrase and account index of the account that will be used to sign the transaction. This method also perform the SNARK proving which is an expensive operation and performed in parallel by a series of WebWorkers.
/// Note: Handing the sensitive key material this way is not recommended for production applications. Upcoming changes to how proposals are authorized will allow separation of proof generation and signing but currently these are coupled.
///
/// Finally, A transaction can be sent to the network by calling `send_authorized_transactions` with the list of transaction IDs that were generated by the authorization step.
///
/// The full flow looks like
/// ```javascript
/// const proposal = wallet.propose_transfer(1, "...", 100000000);
/// const authorized_txns = wallet.create_proposed_transactions(proposal, "...", 1);
/// await wallet.send_authorized_transactions(authorized_txns);
/// ```
///
#[wasm_bindgen]
#[derive(Clone)]
pub struct WebWallet {
    inner: MemoryWallet<tonic_web_wasm_client::Client>,
}

impl WebWallet {
    pub fn client(&self) -> CompactTxStreamerClient<tonic_web_wasm_client::Client> {
        self.inner.client.clone()
    }

    pub fn inner_mut(&mut self) -> &mut MemoryWallet<tonic_web_wasm_client::Client> {
        &mut self.inner
    }
}

#[wasm_bindgen]
impl WebWallet {
    /// Create a new instance of a Zcash wallet for a given network. Only one instance should be created per page.
    ///
    /// # Arguments
    ///
    /// * `network` - Must be one of "main" or "test"
    /// * `lightwalletd_url` - Url of the lightwalletd instance to connect to (e.g. https://zcash-mainnet.chainsafe.dev)
    /// * `min_confirmations` - Number of confirmations required before a transaction is considered final
    /// * `db_bytes` - (Optional) UInt8Array of a serialized wallet database. This can be used to restore a wallet from a previous session that was serialized by `db_to_bytes`
    ///
    /// # Examples
    ///
    /// ```javascript
    /// const wallet = new WebWallet("main", "https://zcash-mainnet.chainsafe.dev", 10);
    /// ```
    #[wasm_bindgen(constructor)]
    pub fn new(
        network: &str,
        lightwalletd_url: &str,
        min_confirmations: u32,
        db_bytes: Option<Box<[u8]>>,
    ) -> Result<WebWallet, Error> {
        let network = Network::from_str(network)?;
        let min_confirmations = NonZeroU32::try_from(min_confirmations)
            .map_err(|_| Error::InvalidMinConformations(min_confirmations))?;
        let client = Client::new(lightwalletd_url.to_string());

        let db = match db_bytes {
            Some(bytes) => {
                tracing::info!(
                    "Serialized db was provided to constructor. Attempting to deserialize"
                );
                MemoryWalletDb::decode_new(bytes.as_ref(), network, PRUNING_DEPTH)?
            }
            None => MemoryWalletDb::new(network, PRUNING_DEPTH),
        };

        Ok(Self {
            inner: Wallet::new(db, client, network, min_confirmations)?,
        })
    }

    /// Add a new account to the wallet using a given seed phrase
    ///
    /// # Arguments
    ///
    /// * `seed_phrase` - 24 word mnemonic seed phrase
    /// * `account_hd_index` - [ZIP32](https://zips.z.cash/zip-0032) hierarchical deterministic index of the account
    /// * `birthday_height` - Block height at which the account was created. The sync logic will assume no funds are send or received prior to this height which can VERY significantly reduce sync time
    ///
    /// # Examples
    ///
    /// ```javascript
    /// const wallet = new WebWallet("main", "https://zcash-mainnet.chainsafe.dev", 10);
    /// const account_id = await wallet.create_account("...", 1, 2657762)
    /// ```
    pub async fn create_account(
        &self,
        account_name: &str,
        seed_phrase: &str,
        account_hd_index: u32,
        birthday_height: Option<u32>,
    ) -> Result<u32, Error> {
        tracing::info!("Create account called");
        self.inner
            .create_account(
                account_name,
                seed_phrase,
                account_hd_index,
                birthday_height,
                None,
            )
            .await
            .map(|id| *id)
    }

    /// Add a new account to the wallet by directly importing a Unified Full Viewing Key (UFVK)
    ///
    /// # Arguments
    ///
    /// * `key` - [ZIP316](https://zips.z.cash/zip-0316) encoded UFVK
    /// * `birthday_height` - Block height at which the account was created. The sync logic will assume no funds are send or received prior to this height which can VERY significantly reduce sync time
    ///
    /// # Examples
    ///
    /// ```javascript
    /// const wallet = new WebWallet("main", "https://zcash-mainnet.chainsafe.dev", 10);
    /// const account_id = await wallet.import_ufvk("...", 2657762)
    /// ```
    pub async fn create_account_ufvk(
        &self,
        account_name: &str,
        encoded_ufvk: &str,
        birthday_height: Option<u32>,
    ) -> Result<u32, Error> {
        let ufvk = UnifiedFullViewingKey::decode(&self.inner.network, encoded_ufvk)
            .map_err(Error::KeyParse)?;

        self.inner
            .import_ufvk(account_name, &ufvk, birthday_height, None)
            .await
            .map(|id| *id)
    }

    ///
    /// Start a background sync task which will fetch and scan blocks from the connected lighwalletd server
    ///
    /// IMPORTANT: This will spawn a new webworker which will handle the sync task. The sync task will continue to run in the background until the sync process is complete.
    /// During this time the main thread will not block but certain wallet methods may temporarily block while the wallet is being written to during the sync.
    ///
    pub async fn sync(&self) -> Result<(), Error> {
        assert!(!thread::is_web_worker_thread());

        let db = self.inner.clone();

        let sync_handler = thread::Builder::new()
            .name("sync".to_string())
            .spawn_async(|| async {
                assert!(thread::is_web_worker_thread());
                tracing::debug!(
                    "Current num threads (wasm_thread) {}",
                    rayon::current_num_threads()
                );

                let db = db;
                db.sync().await.unwrap_throw();
            })
            .unwrap_throw()
            .join_async();
        sync_handler.await.unwrap();
        Ok(())
    }

    pub async fn get_wallet_summary(&self) -> Result<Option<WalletSummary>, Error> {
        Ok(self.inner.get_wallet_summary().await?.map(Into::into))
    }

    /// Create a new transaction proposal to send funds to a given address
    ///
    /// Not this does NOT sign, generate a proof, or send the transaction. It will only craft the proposal which designates how notes from this account can be spent to realize the requested transfer.
    ///
    /// # Arguments
    ///
    /// * `account_id` - The ID of the account in this wallet to send funds from
    /// * `to_address` - [ZIP316](https://zips.z.cash/zip-0316) encoded address to send funds to
    /// * `value` - Amount to send in Zatoshis (1 ZEC = 100_000_000 Zatoshis)
    ///
    /// # Returns
    ///
    /// A proposal object which can be inspected and later used to generate a valid transaction
    ///
    /// # Examples
    ///
    /// ```javascript
    /// const proposal = await wallet.propose_transfer(1, "u18rakpts0de589sx9dkamcjms3apruqqax9k2s6e7zjxx9vv5kc67pks2trg9d3nrgd5acu8w8arzjjuepakjx38dyxl6ahd948w0mhdt9jxqsntan6px3ysz80s04a87pheg2mqvlzpehrgup7568nfd6ez23xd69ley7802dfvplnfn7c07vlyumcnfjul4pvv630ac336rjhjyak5", 100000000);
    /// ```
    pub async fn propose_transfer(
        &self,
        account_id: u32,
        to_address: String,
        value: u64,
    ) -> Result<Proposal, Error> {
        let to_address = ZcashAddress::try_from_encoded(&to_address)?;
        let proposal = self
            .inner
            .propose_transfer(AccountId::from(account_id), to_address, value)
            .await?;
        Ok(proposal.into())
    }

    /// Generate a valid Zcash transaction from a given proposal
    ///
    /// IMPORTANT: This will spawn a new webworker which will handle the proving task which may take 10s of seconds
    ///
    /// # Arguments
    ///
    /// * `proposal` - A proposal object generated by `propose_transfer`
    /// * `seed_phrase` - 24 word mnemonic seed phrase. This MUST correspond to the accountID used when creating the proposal.
    /// * `account_hd_index` - [ZIP32](https://zips.z.cash/zip-0032) hierarchical deterministic index of the account. This MUST correspond to the accountID used when creating the proposal.
    ///
    /// # Returns
    ///
    /// A list of transaction IDs which can be used to track the status of the transaction on the network.
    /// The transactions themselves are stored within the wallet
    ///
    /// # Examples
    ///
    /// ```javascript
    /// const proposal = await wallet.propose_transfer(1, "u18rakpts0de589sx9dkamcjms3apruqqax9k2s6e7zjxx9vv5kc67pks2trg9d3nrgd5acu8w8arzjjuepakjx38dyxl6ahd948w0mhdt9jxqsntan6px3ysz80s04a87pheg2mqvlzpehrgup7568nfd6ez23xd69ley7802dfvplnfn7c07vlyumcnfjul4pvv630ac336rjhjyak5", 100000000);
    /// const authorized_txns = await wallet.create_proposed_transactions(proposal, "...", 1);
    /// ```
    pub async fn create_proposed_transactions(
        &self,
        proposal: Proposal,
        seed_phrase: &str,
        account_hd_index: u32,
    ) -> Result<JsValue, Error> {
        assert!(!thread::is_web_worker_thread());

        let usk = usk_from_seed_str(seed_phrase, account_hd_index, &self.inner.network)?;
        let db = self.inner.clone();

        let sync_handler = thread::Builder::new()
            .name("create_proposed_transaction".to_string())
            .spawn_async(|| async move {
                assert!(thread::is_web_worker_thread());
                tracing::debug!(
                    "Current num threads (wasm_thread) {}",
                    rayon::current_num_threads()
                );

                let db = db;
                let txids = db
                    .create_proposed_transactions(proposal.into(), &usk)
                    .await
                    .unwrap_throw();
                return txids;
            })
            .unwrap_throw()
            .join_async();
        let txids = sync_handler.await.unwrap();

        Ok(serde_wasm_bindgen::to_value(&txids)?)
    }

    /// Serialize the internal wallet database to bytes
    ///
    /// This should be used for persisting the wallet between sessions. The resulting byte array can be used to construct a new wallet instance.
    /// Note this method is async and will block until a read-lock can be acquired on the wallet database
    ///
    /// # Returns
    ///
    /// A postcard encoded byte array of the wallet database
    ///
    pub async fn db_to_bytes(&self) -> Result<Box<[u8]>, Error> {
        let bytes = self.inner.db_to_bytes().await?;
        Ok(bytes.into_boxed_slice())
    }

    /// Send a list of authorized transactions to the network to be included in the blockchain
    ///
    /// These will be sent via the connected lightwalletd instance
    ///
    /// # Arguments
    ///
    /// * `txids` - A list of transaction IDs (typically generated by `create_proposed_transactions`)
    ///
    /// # Examples
    ///
    /// ```javascript
    /// const proposal = wallet.propose_transfer(1, "u18rakpts0de589sx9dkamcjms3apruqqax9k2s6e7zjxx9vv5kc67pks2trg9d3nrgd5acu8w8arzjjuepakjx38dyxl6ahd948w0mhdt9jxqsntan6px3ysz80s04a87pheg2mqvlzpehrgup7568nfd6ez23xd69ley7802dfvplnfn7c07vlyumcnfjul4pvv630ac336rjhjyak5", 100000000);
    /// const authorized_txns = wallet.create_proposed_transactions(proposal, "...", 1);
    /// await wallet.send_authorized_transactions(authorized_txns);
    /// ```
    pub async fn send_authorized_transactions(&self, txids: JsValue) -> Result<(), Error> {
        let txids: NonEmpty<TxId> = serde_wasm_bindgen::from_value(txids)?;
        self.inner.send_authorized_transactions(&txids).await
    }

    /// Get the current unified address for a given account. This is returned as a string in canonical encoding
    ///
    /// # Arguments
    ///
    /// * `account_id` - The ID of the account to get the address for
    ///
    pub async fn get_current_address(&self, account_id: u32) -> Result<String, Error> {
        let db = self.inner.db.read().await;
        if let Some(address) = db.get_current_address(account_id.into())? {
            Ok(address.encode(&self.inner.network))
        } else {
            Err(Error::AccountNotFound(account_id))
        }
    }

    /// Get the current unified address for a given account and extracts the transparent component. This is returned as a string in canonical encoding
    ///
    /// # Arguments
    ///
    /// * `account_id` - The ID of the account to get the address for
    ///
    pub async fn get_current_address_transparent(&self, account_id: u32) -> Result<String, Error> {
        let db = self.inner.db.read().await;
        if let Some(address) = db.get_current_address(account_id.into())? {
            Ok(address.transparent().unwrap().encode(&self.inner.network))
        } else {
            Err(Error::AccountNotFound(account_id))
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////
    // lightwalletd gRPC methods
    ///////////////////////////////////////////////////////////////////////////////////////

    ///
    /// Get the hightest known block height from the connected lightwalletd instance
    ///
    pub async fn get_latest_block(&self) -> Result<u64, Error> {
        self.client()
            .get_latest_block(ChainSpec {})
            .await
            .map(|response| response.into_inner().height)
            .map_err(Error::from)
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[wasm_bindgen(inspectable)]
pub struct WalletSummary {
    account_balances: Vec<(u32, AccountBalance)>,
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
        let mut account_balances: Vec<_> = summary
            .account_balances()
            .iter()
            .map(|(k, v)| (*(*k).clone().deref(), (*v).into()))
            .collect();

        account_balances.sort_by(|a, b| a.0.cmp(&b.0));

        WalletSummary {
            account_balances,
            chain_tip_height: summary.chain_tip_height().into(),
            fully_scanned_height: summary.fully_scanned_height().into(),
            next_sapling_subtree_index: summary.next_sapling_subtree_index(),
            next_orchard_subtree_index: summary.next_orchard_subtree_index(),
        }
    }
}
