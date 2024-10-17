use std::num::NonZeroU32;

use bip0039::{English, Mnemonic};
use nonempty::NonEmpty;
use secrecy::{ExposeSecret, SecretVec, Zeroize};
use tonic::{
    client::GrpcService,
    codegen::{Body, Bytes, StdError},
};

use crate::error::Error;
use crate::{BlockRange, Network};

use serde::{Serialize, Serializer};
use std::fmt::Debug;
use std::hash::Hash;
use std::sync::Arc;
use subtle::ConditionallySelectable;
use tokio::sync::RwLock;
use zcash_address::ZcashAddress;
use zcash_client_backend::data_api::wallet::{
    create_proposed_transactions, input_selection::GreedyInputSelector, propose_transfer,
};
use zcash_client_backend::data_api::WalletCommitmentTrees;
use zcash_client_backend::data_api::{
    Account, AccountBirthday, AccountPurpose, InputSource, WalletRead, WalletSummary, WalletWrite,
};
use zcash_client_backend::fees::zip317::SingleOutputChangeStrategy;
use zcash_client_backend::proposal::Proposal;
use zcash_client_backend::proto::service::{
    self, compact_tx_streamer_client::CompactTxStreamerClient,
};
use zcash_client_backend::wallet::OvkPolicy;
use zcash_client_backend::zip321::{Payment, TransactionRequest};
use zcash_client_backend::ShieldedProtocol;
use zcash_client_memory::{MemBlockCache, MemoryWalletDb};
use zcash_keys::keys::{UnifiedFullViewingKey, UnifiedSpendingKey};
use zcash_primitives::transaction::components::amount::NonNegativeAmount;
use zcash_primitives::transaction::fees::zip317::FeeRule;
use zcash_primitives::transaction::TxId;
use zcash_proofs::prover::LocalTxProver;

use zcash_client_backend::sync::run;
const BATCH_SIZE: u32 = 10000;

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

pub struct Wallet<W, T> {
    /// Internal database used to maintain wallet data (e.g. accounts, transactions, cached blocks)
    pub(crate) db: Arc<RwLock<W>>,
    // gRPC client used to connect to a lightwalletd instance for network data
    pub(crate) client: CompactTxStreamerClient<T>,
    pub(crate) network: crate::Network,
    pub(crate) min_confirmations: NonZeroU32,
}

impl<W, T: Clone> Clone for Wallet<W, T> {
    fn clone(&self) -> Self {
        Self {
            db: self.db.clone(),
            client: self.client.clone(),
            network: self.network,
            min_confirmations: self.min_confirmations,
        }
    }
}

impl<W, T, AccountId, NoteRef> Wallet<W, T>
where
    W: WalletRead<AccountId = AccountId>
        + WalletWrite
        + InputSource<
            AccountId = <W as WalletRead>::AccountId,
            Error = <W as WalletRead>::Error,
            NoteRef = NoteRef,
        > + WalletCommitmentTrees,

    AccountId: Copy + Debug + Eq + Hash + Default + Send + ConditionallySelectable + 'static,
    NoteRef: Copy + Eq + Ord + Debug,
    Error: From<<W as WalletRead>::Error>,

    <W as WalletRead>::Error: std::error::Error + Send + Sync + 'static,
    <W as WalletCommitmentTrees>::Error: std::error::Error + Send + Sync + 'static,

    // GRPC connection Trait Bounds
    T: GrpcService<tonic::body::BoxBody> + Clone,
    T::Error: Into<StdError>,
    T::ResponseBody: Body<Data = Bytes> + std::marker::Send + 'static,
    <T::ResponseBody as Body>::Error: Into<StdError> + std::marker::Send,
{
    /// Create a new instance of a Zcash wallet for a given network
    pub fn new(
        db: W,
        client: T,
        network: Network,
        min_confirmations: NonZeroU32,
    ) -> Result<Self, Error> {
        Ok(Wallet {
            db: Arc::new(RwLock::new(db)),
            client: CompactTxStreamerClient::new(client),
            network,
            min_confirmations,
        })
    }

    pub async fn serialize_db<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        W: Serialize,
        S: Serializer,
    {
        self.db.read().await.serialize(serializer)
    }

    pub async fn db_to_bytes(&self) -> Result<Vec<u8>, Error>
    where
        W: Serialize,
    {
        Ok(postcard::to_allocvec(&*self.db.read().await)?)
    }

    /// Add a new account to the wallet
    ///
    /// # Arguments
    /// seed_phrase - mnemonic phrase to initialise the wallet
    /// account_id - The HD derivation index to use. Can be any integer
    /// birthday_height - The block height at which the account was created, optionally None and the current height is used
    ///
    pub async fn create_account(
        &self,
        seed_phrase: &str,
        account_hd_index: u32,
        birthday_height: Option<u32>,
    ) -> Result<AccountId, Error> {
        // decode the mnemonic and derive the first account
        let usk = usk_from_seed_str(seed_phrase, account_hd_index, &self.network)?;
        let ufvk = usk.to_unified_full_viewing_key();

        tracing::info!("Key successfully decoded. Importing into wallet");

        self.import_account_ufvk(&ufvk, birthday_height, AccountPurpose::Spending)
            .await
    }

    pub async fn import_ufvk(
        &self,
        ufvk: &UnifiedFullViewingKey,
        birthday_height: Option<u32>,
    ) -> Result<AccountId, Error> {
        self.import_account_ufvk(ufvk, birthday_height, AccountPurpose::ViewOnly)
            .await
    }

    /// Helper method for importing an account directly from a Ufvk or from seed.
    async fn import_account_ufvk(
        &self,
        ufvk: &UnifiedFullViewingKey,
        birthday_height: Option<u32>,
        purpose: AccountPurpose,
    ) -> Result<AccountId, Error> {
        tracing::info!("Importing account with Ufvk: {:?}", ufvk);
        let mut client = self.client.clone();
        let birthday = match birthday_height {
            Some(height) => height,
            None => {
                let chain_tip: u32 = client
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
            let treestate = client.get_tree_state(request).await?.into_inner();
            AccountBirthday::from_treestate(treestate, None).map_err(|_| Error::BirthdayError)?
        };

        Ok(self
            .db
            .write()
            .await
            .import_account_ufvk(ufvk, &birthday, purpose)?
            .id())
    }

    pub async fn suggest_scan_ranges(&self) -> Result<Vec<BlockRange>, Error> {
        Ok(self.db.read().await.suggest_scan_ranges().map(|ranges| {
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

    pub async fn sync(&self) -> Result<(), Error> {
        let mut client = self.client.clone();
        // TODO: This should be held in the Wallet struct so we can download in parallel
        let db_cache = MemBlockCache::new();

        let mut db = self.db.write().await;
        run(
            &mut client,
            &self.network.clone(),
            &db_cache,
            &mut *db,
            BATCH_SIZE,
        )
        .await
        .map_err(Into::into)
    }

    pub async fn get_wallet_summary(&self) -> Result<Option<WalletSummary<AccountId>>, Error> {
        Ok(self
            .db
            .read()
            .await
            .get_wallet_summary(self.min_confirmations.into())?)
    }

    ///
    /// Create a transaction proposal to send funds from the wallet to a given address
    ///
    pub async fn propose_transfer(
        &self,
        account_id: AccountId,
        to_address: ZcashAddress,
        value: u64,
    ) -> Result<Proposal<FeeRule, NoteRef>, Error> {
        let input_selector = GreedyInputSelector::new(
            SingleOutputChangeStrategy::new(FeeRule::standard(), None, ShieldedProtocol::Orchard),
            Default::default(),
        );

        let request = TransactionRequest::new(vec![Payment::without_memo(
            to_address,
            NonNegativeAmount::from_u64(value)?,
        )])?;

        tracing::info!("Chain height: {:?}", self.db.read().await.chain_height()?);
        tracing::info!(
            "target and anchor heights: {:?}",
            self.db
                .read()
                .await
                .get_target_and_anchor_heights(self.min_confirmations)?
        );
        let mut db = self.db.write().await;
        let proposal = propose_transfer::<_, _, _, <W as WalletCommitmentTrees>::Error>(
            &mut *db,
            &self.network,
            account_id,
            &input_selector,
            request,
            self.min_confirmations,
        )
        .map_err(|_e| Error::Generic("something bad happened when calling propose transfer. Possibly insufficient balance..".to_string()))?;
        tracing::info!("Proposal: {:#?}", proposal);
        Ok(proposal)
    }

    ///
    /// Do the proving and signing required to create one or more transaction from the proposal. Created transactions are stored in the wallet database.
    ///
    /// Note: At the moment this requires a USK but ideally we want to be able to hand the signing off to a separate service
    ///     e.g. browser plugin, hardware wallet, etc. Will need to look into refactoring librustzcash create_proposed_transactions to allow for this
    ///
    pub async fn create_proposed_transactions(
        &self,
        proposal: Proposal<FeeRule, NoteRef>,
        usk: &UnifiedSpendingKey,
    ) -> Result<NonEmpty<TxId>, Error> {
        let prover = LocalTxProver::bundled();
        let mut db = self.db.write().await;
        let transactions = create_proposed_transactions::<
            _,
            _,
            <MemoryWalletDb<crate::Network> as InputSource>::Error,
            _,
            _,
        >(
            &mut *db,
            &self.network,
            &prover,
            &prover,
            usk,
            OvkPolicy::Sender,
            &proposal,
        )
        .map_err(|_| Error::FailedToCreateTransaction)?;

        Ok(transactions)
    }

    pub async fn send_authorized_transactions(&self, txids: &NonEmpty<TxId>) -> Result<(), Error> {
        let mut client = self.client.clone();
        for txid in txids.iter() {
            let (txid, raw_tx) = self
                .db
                .read()
                .await
                .get_transaction(*txid)?
                .map(|tx| {
                    let mut raw_tx = service::RawTransaction::default();
                    tx.write(&mut raw_tx.data).unwrap(); // safe to unwrap here as we know the tx is valid
                    (tx.txid(), raw_tx)
                })
                .ok_or(Error::TransactionNotFound(*txid))?;

            let response = client.send_transaction(raw_tx).await?.into_inner();

            if response.error_code != 0 {
                return Err(Error::SendFailed {
                    code: response.error_code,
                    reason: response.error_message,
                });
            } else {
                tracing::info!("Transaction {} send successfully :)", txid);
            }
        }
        Ok(())
    }

    ///
    /// A helper function that creates a proposal, creates a transation from the proposal and then submits it
    ///
    pub async fn transfer(
        &self,
        seed_phrase: &str,
        from_account_id: AccountId,
        to_address: ZcashAddress,
        value: u64,
    ) -> Result<(), Error> {
        let usk = usk_from_seed_str(seed_phrase, 0, &self.network)?;
        let proposal = self
            .propose_transfer(from_account_id, to_address, value)
            .await?;
        // TODO: Add callback for approving the transaction here
        let txids = self.create_proposed_transactions(proposal, &usk).await?;

        // send the transactions to the network!!
        tracing::info!("Sending transactions");
        self.send_authorized_transactions(&txids).await
    }
}

pub(crate) fn usk_from_seed_str(
    seed: &str,
    account_id: u32,
    network: &crate::Network,
) -> Result<UnifiedSpendingKey, Error> {
    let mnemonic = <Mnemonic<English>>::from_phrase(seed).map_err(|_| Error::InvalidSeedPhrase)?;
    let seed = {
        let mut seed = mnemonic.to_seed("");
        let secret = seed.to_vec();
        seed.zeroize();
        SecretVec::new(secret)
    };
    let usk = UnifiedSpendingKey::from_seed(network, seed.expose_secret(), account_id.try_into()?)?;
    Ok(usk)
}
