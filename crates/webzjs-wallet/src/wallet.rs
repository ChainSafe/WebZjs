use std::num::{NonZeroU32, NonZeroUsize};

use bip0039::{English, Mnemonic};
use nonempty::NonEmpty;
use secrecy::{ExposeSecret, SecretVec, Zeroize};
use tonic::{
    client::GrpcService,
    codegen::{Body, Bytes, StdError},
};

use crate::error::Error;
use crate::BlockRange;
use webzjs_common::Network;

use pczt::roles::combiner::Combiner;
use pczt::roles::prover::Prover;

use pczt::roles::updater::Updater;
use pczt::Pczt;
use sapling::ProofGenerationKey;
use serde::de::DeserializeOwned;
use serde::Serialize;
use std::fmt::Debug;
use std::hash::Hash;
use std::sync::Arc;
use subtle::ConditionallySelectable;
use tokio::sync::RwLock;
use zcash_address::ZcashAddress;
use zcash_client_backend::data_api::wallet::{
    create_pczt_from_proposal, create_proposed_transactions,
    extract_and_store_transaction_from_pczt, input_selection::GreedyInputSelector,
    propose_shielding, propose_transfer,
};
use zcash_client_backend::data_api::{
    Account, AccountBirthday, AccountPurpose, InputSource, WalletRead, WalletSummary, WalletWrite,
};
use zcash_client_backend::data_api::{WalletCommitmentTrees, Zip32Derivation};
use zcash_client_backend::fees::standard::MultiOutputChangeStrategy;
use zcash_client_backend::fees::{DustOutputPolicy, SplitPolicy, StandardFeeRule};
use zcash_client_backend::proposal::Proposal;
use zcash_client_backend::proto::service::{
    self, compact_tx_streamer_client::CompactTxStreamerClient,
};
use zcash_client_backend::wallet::OvkPolicy;
use zcash_client_backend::zip321::{Payment, TransactionRequest};
use zcash_client_memory::{MemBlockCache, MemoryWalletDb};
use zcash_keys::keys::{UnifiedFullViewingKey, UnifiedSpendingKey};
use zcash_primitives::transaction::fees::FeeRule;
use zcash_primitives::transaction::TxId;
use zcash_proofs::prover::LocalTxProver;
use zcash_protocol::ShieldedProtocol;

use zcash_client_backend::sync::run;

use zcash_protocol::consensus::Parameters;
use zcash_protocol::value::Zatoshis;
use zip32;
use zip32::fingerprint::SeedFingerprint;

const BATCH_SIZE: u32 = 10000;

/// constant that signals what's the minimum transparent balance for proposing a
/// shielding transaction
const SHIELDING_THRESHOLD: Zatoshis = Zatoshis::const_from_u64(100000);

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
    pub(crate) network: Network,
    pub(crate) min_confirmations: NonZeroU32,
    /// Note management: the number of notes to maintain in the wallet
    pub(crate) target_note_count: usize,
    /// Note management: the minimum allowed value for split change amounts
    pub(crate) min_split_output_value: u64,
}

impl<W, T: Clone> Clone for Wallet<W, T> {
    fn clone(&self) -> Self {
        Self {
            db: self.db.clone(),
            client: self.client.clone(),
            network: self.network,
            min_confirmations: self.min_confirmations,
            target_note_count: self.target_note_count,
            min_split_output_value: self.min_split_output_value,
        }
    }
}

impl<P: Parameters, T> Wallet<MemoryWalletDb<P>, T> {
    // Encodes the MemoryWallet into protobuf bytes
    pub async fn db_to_bytes(&self) -> Result<Vec<u8>, Error> {
        let mut memory_wallet_bytes = Vec::new();
        self.db.read().await.encode(&mut memory_wallet_bytes)?;
        Ok(memory_wallet_bytes)
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

    AccountId: Copy
        + Debug
        + Eq
        + Hash
        + Default
        + Send
        + ConditionallySelectable
        + Serialize
        + DeserializeOwned
        + 'static,
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
            target_note_count: 4,
            min_split_output_value: 10000000,
        })
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
        account_name: &str,
        seed_phrase: &str,
        account_hd_index: u32,
        birthday_height: Option<u32>,
        key_source: Option<&str>,
    ) -> Result<AccountId, Error> {
        // decode the mnemonic and derive the first account
        let (usk, seed_fp) = usk_from_seed_str(seed_phrase, account_hd_index, &self.network)?;
        let ufvk = usk.to_unified_full_viewing_key();

        let derivation =
            Zip32Derivation::new(seed_fp, zip32::AccountId::try_from(account_hd_index)?);

        tracing::info!("Key successfully decoded. Importing into wallet");

        self.import_account_ufvk(
            account_name,
            &ufvk,
            birthday_height,
            AccountPurpose::Spending {
                derivation: Some(derivation),
            },
            key_source,
        )
        .await
    }

    pub async fn import_ufvk(
        &self,
        account_name: &str,
        ufvk: &UnifiedFullViewingKey,
        purpose: AccountPurpose,
        birthday_height: Option<u32>,
        key_source: Option<&str>,
    ) -> Result<AccountId, Error> {
        self.import_account_ufvk(account_name, ufvk, birthday_height, purpose, key_source)
            .await
    }

    /// Helper method for importing an account directly from a Ufvk or from seed.
    async fn import_account_ufvk(
        &self,
        account_name: &str,
        ufvk: &UnifiedFullViewingKey,
        birthday_height: Option<u32>,
        purpose: AccountPurpose,
        key_source: Option<&str>,
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
            AccountBirthday::from_treestate(treestate, None).map_err(|_| Error::Birthday)?
        };

        Ok(self
            .db
            .write()
            .await
            .import_account_ufvk(account_name, ufvk, &birthday, purpose, key_source)?
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
    ) -> Result<Proposal<StandardFeeRule, NoteRef>, Error> {
        let input_selector = GreedyInputSelector::new();

        let change_strategy = MultiOutputChangeStrategy::new(
            StandardFeeRule::Zip317,
            None,
            ShieldedProtocol::Orchard,
            DustOutputPolicy::default(),
            SplitPolicy::with_min_output_value(
                NonZeroUsize::new(self.target_note_count)
                    .ok_or(Error::FailedToCreateTransaction)?,
                Zatoshis::from_u64(self.min_split_output_value)?,
            ),
        );
        let request = TransactionRequest::new(vec![Payment::without_memo(
            to_address,
            Zatoshis::from_u64(value)?,
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
        let proposal = propose_transfer::<_, _, _,_, <W as WalletCommitmentTrees>::Error>(
            &mut *db,
            &self.network,
            account_id,
            &input_selector,
            &change_strategy,
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
        proposal: Proposal<StandardFeeRule, NoteRef>,
        usk: &UnifiedSpendingKey,
    ) -> Result<NonEmpty<TxId>, Error> {
        let prover = LocalTxProver::bundled();
        let mut db = self.db.write().await;
        let transactions = create_proposed_transactions::<
            _,
            _,
            <MemoryWalletDb<Network> as InputSource>::Error,
            _,
            <StandardFeeRule as FeeRule>::Error,
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
    /// A helper function that creates a proposal, creates a transaction from the proposal and then submits it
    ///
    pub async fn transfer(
        &self,
        seed_phrase: &str,
        account_hd_index: u32,
        from_account_id: AccountId,
        to_address: ZcashAddress,
        value: u64,
    ) -> Result<(), Error> {
        let (usk, _) = usk_from_seed_str(seed_phrase, account_hd_index, &self.network)?;
        let proposal = self
            .propose_transfer(from_account_id, to_address, value)
            .await?;
        // TODO: Add callback for approving the transaction here
        let txids = self.create_proposed_transactions(proposal, &usk).await?;

        // send the transactions to the network!!
        tracing::info!("Sending transactions");
        self.send_authorized_transactions(&txids).await
    }

    pub async fn pczt_shield(&self, account_id: AccountId) -> Result<Pczt, Error> {
        let change_strategy = MultiOutputChangeStrategy::new(
            StandardFeeRule::Zip317,
            None,
            ShieldedProtocol::Orchard,
            DustOutputPolicy::default(),
            SplitPolicy::with_min_output_value(
                NonZeroUsize::new(self.target_note_count)
                    .ok_or(Error::FailedToCreateTransaction)?,
                Zatoshis::from_u64(self.min_split_output_value)?,
            ),
        );

        let input_selector = GreedyInputSelector::new();
        let mut db = self.db.write().await;

        // Shield all funds immediately
        let max_height = match db.chain_height()? {
            Some(max_height) => max_height,
            // If we haven't scanned anything, there's nothing to do.
            None => {
                return Err(Error::Generic(
                    "Havent scanned yet, cant shield".to_string(),
                ))
            }
        };

        let transparent_balances = db.get_transparent_balances(account_id, max_height)?;
        let from_addrs = transparent_balances.into_keys().collect::<Vec<_>>();

        let proposal = propose_shielding::<_, _, _, _, <W as WalletCommitmentTrees>::Error>(
            &mut *db,
            &self.network,
            &input_selector,
            &change_strategy,
            SHIELDING_THRESHOLD, // use a shielding threshold above a marginal fee transaction plus some value like Zashi does.
            &from_addrs,
            account_id,
            1, // librustzcash operates under the assumption of zero or one conf being the same but that could change.
        )
        .map_err(|e| Error::Generic(format!("Error when shielding: {:?}", e)))?;

        let pczt = create_pczt_from_proposal::<
            _,
            _,
            <MemoryWalletDb<Network> as InputSource>::Error,
            _,
            <StandardFeeRule as FeeRule>::Error,
            _,
        >(
            &mut *db,
            &self.network,
            account_id,
            OvkPolicy::Sender,
            &proposal,
        )
        .map_err(|_| Error::PcztCreate)?;

        Ok(pczt)
    }
    ///
    /// Create a PCZT
    ///
    pub async fn pczt_create(
        &self,
        account_id: AccountId,
        to_address: ZcashAddress,
        value: u64,
    ) -> Result<Pczt, Error> {
        // Create the PCZT.
        let change_strategy = MultiOutputChangeStrategy::new(
            StandardFeeRule::Zip317,
            None,
            ShieldedProtocol::Orchard,
            DustOutputPolicy::default(),
            SplitPolicy::with_min_output_value(
                NonZeroUsize::new(self.target_note_count)
                    .ok_or(Error::FailedToCreateTransaction)?,
                Zatoshis::from_u64(self.min_split_output_value)?,
            ),
        );

        let input_selector = GreedyInputSelector::new();
        let request = TransactionRequest::new(vec![Payment::without_memo(
            to_address,
            Zatoshis::from_u64(value)?,
        )])?;
        let mut db = self.db.write().await;
        let proposal = propose_transfer::<_, _, _,_, <W as WalletCommitmentTrees>::Error>(
            &mut *db,
            &self.network,
            account_id,
            &input_selector,
            &change_strategy,
            request,
            self.min_confirmations,
        )
            .map_err(|e| Error::Generic(format!("something bad happened when calling propose transfer. Possibly insufficient balance... {:?}", e)))?;
        tracing::info!("Proposal: {:#?}", proposal);
        let pczt = create_pczt_from_proposal::<
            _,
            _,
            <MemoryWalletDb<Network> as InputSource>::Error,
            _,
            <StandardFeeRule as FeeRule>::Error,
            _,
        >(
            &mut *db,
            &self.network,
            account_id,
            OvkPolicy::Sender,
            &proposal,
        )
        .map_err(|_| Error::PcztCreate)?;
        Ok(pczt)
    }

    ///
    /// Prove a PCZT
    ///
    pub async fn pczt_prove(
        &self,
        pczt: Pczt,
        sapling_proof_gen_key: Option<ProofGenerationKey>,
    ) -> Result<Pczt, Error> {
        // Add Sapling proof generation key.
        // TODO: Check to see if there is any sapling in here in the first place
        let pczt = if let Some(sapling_proof_gen_key) = sapling_proof_gen_key {
            Updater::new(pczt)
                .update_sapling_with(|mut updater| {
                    let non_dummy_spends = updater
                        .bundle()
                        .spends()
                        .iter()
                        .enumerate()
                        // Dummy spends will already have a proof generation key.
                        .filter(|(_, spend)| spend.proof_generation_key().is_none())
                        .map(|(index, spend)| {
                            (
                                index,
                                spend
                                    .zip32_derivation()
                                    .as_ref()
                                    .map(|d| (*d.seed_fingerprint(), d.derivation_path().clone())),
                            )
                        })
                        .collect::<Vec<_>>();

                    // Assume all non-dummy spent notes are from the same account.
                    for (index, _) in non_dummy_spends {
                        updater.update_spend_with(index, |mut spend_updater| {
                            spend_updater.set_proof_generation_key(sapling_proof_gen_key.clone())
                        })?;
                    }

                    Ok(())
                })
                .map_err(|e| {
                    Error::PcztProve(format!(
                        "Failed to add Sapling proof generation key: {:?}",
                        e
                    ))
                })?
                .finish()
        } else {
            pczt
        };

        let prover = LocalTxProver::bundled();
        let pczt = Prover::new(pczt)
            .create_orchard_proof(&orchard::circuit::ProvingKey::build())
            .map_err(|e| Error::PcztProve(format!("Failed to create Orchard proof: {:?}", e)))?
            .create_sapling_proofs(&prover, &prover)
            .map_err(|e| Error::PcztProve(format!("Failed to create Sapling proofs: {:?}", e)))?
            .finish();
        Ok(pczt)
    }

    pub async fn pczt_send(&self, pczt: Pczt) -> Result<(), Error> {
        let prover = LocalTxProver::bundled();
        let (spend_vk, output_vk) = prover.verifying_keys();
        let mut db = self.db.write().await;
        let txid = extract_and_store_transaction_from_pczt::<_, ()>(
            &mut *db,
            pczt,
            &spend_vk,
            &output_vk,
            &orchard::circuit::VerifyingKey::build(),
        )
        .map_err(|e| {
            Error::PcztSend(format!(
                "Failed to extract and store transaction from PCZT: {:?}",
                e
            ))
        })?;
        drop(db);
        self.send_authorized_transactions(&NonEmpty::new(txid))
            .await
    }

    pub fn pczt_combine(&self, pczts: Vec<Pczt>) -> Result<Pczt, Error> {
        Combiner::new(pczts)
            .combine()
            .map_err(|e| Error::PcztCombine(format!("Failed to combine PCZT: {:?}", e)))
    }
}

pub(crate) fn usk_from_seed_str(
    seed: &str,
    account_id: u32,
    network: &Network,
) -> Result<(UnifiedSpendingKey, SeedFingerprint), Error> {
    let mnemonic = <Mnemonic<English>>::from_phrase(seed).map_err(|_| Error::InvalidSeedPhrase)?;
    let seed = {
        let mut seed = mnemonic.to_seed("");
        let secret = seed.to_vec();
        seed.zeroize();
        SecretVec::new(secret)
    };
    let seed_fingerprint =
        SeedFingerprint::from_seed(seed.expose_secret()).expect("seed fingerprint");
    let usk = UnifiedSpendingKey::from_seed(network, seed.expose_secret(), account_id.try_into()?)?;
    Ok((usk, seed_fingerprint))
}
