// #![allow(unused)]
use incrementalmerkletree::{Address, Marking, Retention};
use sapling::NullifierDerivingKey;
use secrecy::{ExposeSecret, SecretVec};
use shardtree::{error::ShardTreeError, store::memory::MemoryShardStore, ShardTree};
use std::{
    cmp::Ordering,
    collections::{BTreeMap, HashMap, HashSet},
    convert::Infallible,
    hash::Hash,
    num::NonZeroU32,
};
use zcash_keys::keys::{AddressGenerationError, DerivationError, UnifiedIncomingViewingKey};
use zip32::{fingerprint::SeedFingerprint, DiversifierIndex, Scope};

use zcash_primitives::{
    block::BlockHash,
    consensus::{BlockHeight, Network},
    legacy::TransparentAddress,
    transaction::{Transaction, TxId},
    zip32::AccountId,
};
use zcash_protocol::{
    memo::{self, Memo, MemoBytes},
    value::Zatoshis,
    ShieldedProtocol::{Orchard, Sapling},
};

use zcash_client_backend::{
    address::UnifiedAddress,
    keys::{UnifiedAddressRequest, UnifiedFullViewingKey, UnifiedSpendingKey},
    wallet::{NoteId, TransparentAddressMetadata, WalletSpend, WalletTransparentOutput, WalletTx},
};

use zcash_client_backend::data_api::{
    chain::ChainState, chain::CommitmentTreeRoot, scanning::ScanRange, Account, AccountBirthday,
    AccountPurpose, AccountSource, BlockMetadata, DecryptedTransaction, NullifierQuery,
    ScannedBlock, SeedRelevance, SentTransaction, WalletCommitmentTrees, WalletRead, WalletSummary,
    WalletWrite, ORCHARD_SHARD_HEIGHT, SAPLING_SHARD_HEIGHT,
};

struct MemoryWalletBlock {
    height: BlockHeight,
    hash: BlockHash,
    block_time: u32,
    // Just the transactions that involve an account in this wallet
    transactions: BTreeMap<TxId, WalletTx<u32>>,
    memos: BTreeMap<NoteId, MemoBytes>,
}

impl PartialEq for MemoryWalletBlock {
    fn eq(&self, other: &Self) -> bool {
        (self.height, self.block_time) == (other.height, other.block_time)
    }
}

impl Eq for MemoryWalletBlock {}

impl PartialOrd for MemoryWalletBlock {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some((self.height, self.block_time).cmp(&(other.height, other.block_time)))
    }
}

impl Ord for MemoryWalletBlock {
    fn cmp(&self, other: &Self) -> Ordering {
        (self.height, self.block_time).cmp(&(other.height, other.block_time))
    }
}

pub struct MemoryWalletAccount {
    seed_fingerprint: SeedFingerprint,
    account_id: AccountId,
    ufvk: UnifiedFullViewingKey,
    birthday: AccountBirthday,
    addresses: BTreeMap<DiversifierIndex, UnifiedAddressRequest>,
    notes: HashSet<NoteId>,
}

pub struct MemoryWalletDb {
    network: Network,
    accounts: BTreeMap<u32, MemoryWalletAccount>,
    blocks: BTreeMap<BlockHeight, MemoryWalletBlock>,
    tx_idx: BTreeMap<TxId, BlockHeight>,
    // (txid, spent)
    sapling_spends: BTreeMap<sapling::Nullifier, (TxId, bool)>,
    orchard_spends: BTreeMap<orchard::note::Nullifier, (TxId, bool)>,
    sapling_tree: ShardTree<
        MemoryShardStore<sapling::Node, BlockHeight>,
        { SAPLING_SHARD_HEIGHT * 2 },
        SAPLING_SHARD_HEIGHT,
    >,
    orchard_tree: ShardTree<
        MemoryShardStore<orchard::tree::MerkleHashOrchard, BlockHeight>,
        { ORCHARD_SHARD_HEIGHT * 2 },
        { ORCHARD_SHARD_HEIGHT },
    >,
}

impl MemoryWalletDb {
    pub fn new(network: Network, max_checkpoints: usize) -> Self {
        Self {
            network,
            accounts: BTreeMap::new(),
            blocks: BTreeMap::new(),
            tx_idx: BTreeMap::new(),
            sapling_spends: BTreeMap::new(),
            orchard_spends: BTreeMap::new(),
            sapling_tree: ShardTree::new(MemoryShardStore::empty(), max_checkpoints),
            orchard_tree: ShardTree::new(MemoryShardStore::empty(), max_checkpoints),
        }
    }
}

#[derive(Debug)]
pub enum Error {
    AccountUnknown(u32),
    ViewingKeyNotFound(u32),
    MemoDecryption(memo::Error),
    KeyDerivation(DerivationError),
    AddressGeneration(AddressGenerationError),
    TxUnknown(TxId),
}

impl From<DerivationError> for Error {
    fn from(value: DerivationError) -> Self {
        Error::KeyDerivation(value)
    }
}

impl From<AddressGenerationError> for Error {
    fn from(value: AddressGenerationError) -> Self {
        Error::AddressGeneration(value)
    }
}

impl From<memo::Error> for Error {
    fn from(value: memo::Error) -> Self {
        Error::MemoDecryption(value)
    }
}

pub struct MemAccount {
    id: u32,
    ufvk: UnifiedFullViewingKey,
}

impl Account<u32> for MemAccount {
    fn id(&self) -> u32 {
        self.id
    }

    fn source(&self) -> AccountSource {
        AccountSource::Imported {
            purpose: AccountPurpose::ViewOnly,
        }
    }

    fn ufvk(&self) -> Option<&UnifiedFullViewingKey> {
        Some(&self.ufvk)
    }

    fn uivk(&self) -> UnifiedIncomingViewingKey {
        self.ufvk.to_unified_incoming_viewing_key()
    }
}

impl From<(u32, UnifiedFullViewingKey)> for MemAccount {
    fn from((id, ufvk): (u32, UnifiedFullViewingKey)) -> Self {
        Self { id, ufvk }
    }
}

impl WalletRead for MemoryWalletDb {
    type Error = Error;
    type AccountId = u32;
    type Account = MemAccount;

    fn get_account_ids(&self) -> Result<Vec<Self::AccountId>, Self::Error> {
        Ok(self.accounts.keys().copied().collect())
    }

    fn get_account(
        &self,
        account_id: Self::AccountId,
    ) -> Result<Option<Self::Account>, Self::Error> {
        Ok(self
            .accounts
            .get(&account_id)
            .map(|account| (account_id, account.ufvk.clone()).into()))
    }

    fn get_derived_account(
        &self,
        _seed: &SeedFingerprint,
        _account_id: zip32::AccountId,
    ) -> Result<Option<Self::Account>, Self::Error> {
        todo!()
    }

    fn validate_seed(
        &self,
        _account_id: Self::AccountId,
        _seed: &SecretVec<u8>,
    ) -> Result<bool, Self::Error> {
        todo!()
    }

    fn seed_relevance_to_derived_accounts(
        &self,
        seed: &SecretVec<u8>,
    ) -> Result<SeedRelevance<Self::AccountId>, Self::Error> {
        todo!()
    }

    fn get_account_for_ufvk(
        &self,
        ufvk: &UnifiedFullViewingKey,
    ) -> Result<Option<Self::Account>, Self::Error> {
        let ufvk_req =
            UnifiedAddressRequest::all().expect("At least one protocol should be enabled");
        Ok(self.accounts.iter().find_map(|(id, acct)| {
            if acct.ufvk.default_address(ufvk_req).unwrap()
                == ufvk.default_address(ufvk_req).unwrap()
            {
                Some((*id, acct.ufvk.clone()).into())
            } else {
                None
            }
        }))
    }

    fn get_current_address(
        &self,
        account: Self::AccountId,
    ) -> Result<Option<UnifiedAddress>, Self::Error> {
        self.accounts
            .get(&account)
            .map(|account| {
                account
                    .ufvk
                    .default_address(
                        UnifiedAddressRequest::all()
                            .expect("At least one protocol should be enabled."),
                    )
                    .map(|(addr, _)| addr)
            })
            .transpose()
            .map_err(|e| e.into())
    }

    fn get_account_birthday(&self, account: Self::AccountId) -> Result<BlockHeight, Self::Error> {
        self.accounts
            .get(&account)
            .map(|account| account.birthday.height())
            .ok_or_else(|| Error::AccountUnknown(account))
    }

    fn get_wallet_birthday(&self) -> Result<Option<BlockHeight>, Self::Error> {
        self.accounts
            .values()
            .map(|account| account.birthday.height())
            .min()
            .ok_or(Error::AccountUnknown(0))
            .map(Some)
    }

    fn get_wallet_summary(
        &self,
        _min_confirmations: u32,
    ) -> Result<Option<WalletSummary<Self::AccountId>>, Self::Error> {
        todo!()
    }

    fn chain_height(&self) -> Result<Option<BlockHeight>, Self::Error> {
        todo!()
    }

    fn get_block_hash(&self, block_height: BlockHeight) -> Result<Option<BlockHash>, Self::Error> {
        Ok(self.blocks.iter().find_map(|b| {
            if b.0 == &block_height {
                Some(b.1.hash)
            } else {
                None
            }
        }))
    }

    fn block_metadata(&self, _height: BlockHeight) -> Result<Option<BlockMetadata>, Self::Error> {
        todo!()
    }

    fn block_fully_scanned(&self) -> Result<Option<BlockMetadata>, Self::Error> {
        todo!()
    }

    fn get_max_height_hash(&self) -> Result<Option<(BlockHeight, BlockHash)>, Self::Error> {
        todo!()
    }

    fn block_max_scanned(&self) -> Result<Option<BlockMetadata>, Self::Error> {
        todo!()
    }

    fn suggest_scan_ranges(&self) -> Result<Vec<ScanRange>, Self::Error> {
        Ok(vec![])
    }

    fn get_target_and_anchor_heights(
        &self,
        _min_confirmations: NonZeroU32,
    ) -> Result<Option<(BlockHeight, BlockHeight)>, Self::Error> {
        todo!()
    }

    fn get_min_unspent_height(&self) -> Result<Option<BlockHeight>, Self::Error> {
        todo!()
    }

    fn get_tx_height(&self, txid: TxId) -> Result<Option<BlockHeight>, Self::Error> {
        self.tx_idx
            .get(&txid)
            .copied()
            .map(Some)
            .ok_or(Error::TxUnknown(txid))
    }

    fn get_unified_full_viewing_keys(
        &self,
    ) -> Result<HashMap<Self::AccountId, UnifiedFullViewingKey>, Self::Error> {
        Ok(HashMap::new())
    }

    fn get_memo(&self, id_note: NoteId) -> Result<Option<Memo>, Self::Error> {
        self.tx_idx
            .get(id_note.txid())
            .and_then(|height| self.blocks.get(height))
            .and_then(|block| block.memos.get(&id_note))
            .map(Memo::try_from)
            .transpose()
            .map_err(Error::from)
    }

    fn get_transaction(&self, _id_tx: TxId) -> Result<Option<Transaction>, Self::Error> {
        todo!()
    }

    fn get_sapling_nullifiers(
        &self,
        query: NullifierQuery,
    ) -> Result<Vec<(Self::AccountId, sapling::Nullifier)>, Self::Error> {
        // self.sapling_spends
        //     .iter()
        //     .filter(|s| match query {
        //         NullifierQuery::All => true,
        //         NullifierQuery::Unspent => !s.1 .1,
        //     })
        //     .map(|(nullifier, (txid, _))| {
        //         self.accounts.iter().find_map(|(id, acct)| {
        //             let dfvk = acct.ufvk.sapling().ok()?;
        //             let nk = dfvk.to_nk(Scope::External);
        //             let note = nk.to_note_from_nullifier(*nullifier);
        //             Some((*id, note))
        //         })
        //     })
        //     .collect()
        todo!()
    }

    fn get_orchard_nullifiers(
        &self,
        _query: NullifierQuery,
    ) -> Result<Vec<(Self::AccountId, orchard::note::Nullifier)>, Self::Error> {
        todo!()
    }

    fn get_transparent_receivers(
        &self,
        _account: Self::AccountId,
    ) -> Result<HashMap<TransparentAddress, Option<TransparentAddressMetadata>>, Self::Error> {
        todo!()
    }

    fn get_transparent_balances(
        &self,
        _account: Self::AccountId,
        _max_height: BlockHeight,
    ) -> Result<HashMap<TransparentAddress, Zatoshis>, Self::Error> {
        todo!()
    }

    fn transaction_data_requests(
        &self,
    ) -> Result<Vec<zcash_client_backend::data_api::TransactionDataRequest>, Self::Error> {
        todo!()
    }
}

impl WalletWrite for MemoryWalletDb {
    type UtxoRef = u32;

    fn create_account(
        &mut self,
        seed: &SecretVec<u8>,
        birthday: &AccountBirthday,
    ) -> Result<(Self::AccountId, UnifiedSpendingKey), Self::Error> {
        let seed_fingerprint =
            SeedFingerprint::from_seed(seed.expose_secret()).expect("Valid seed.");
        let account_id = self.accounts.last_key_value().map_or(0, |(id, _)| id + 1);
        let account_index = AccountId::try_from(account_id).unwrap();
        let usk =
            UnifiedSpendingKey::from_seed(&self.network, seed.expose_secret(), account_index)?;
        let ufvk = usk.to_unified_full_viewing_key();
        self.accounts.insert(
            account_id,
            MemoryWalletAccount {
                seed_fingerprint,
                account_id: account_index,
                ufvk,
                birthday: birthday.clone(),
                addresses: BTreeMap::new(),
                notes: HashSet::new(),
            },
        );

        Ok((account_id, usk))
    }

    fn get_next_available_address(
        &mut self,
        _account: Self::AccountId,
        _request: UnifiedAddressRequest,
    ) -> Result<Option<UnifiedAddress>, Self::Error> {
        todo!()
    }

    fn update_chain_tip(&mut self, _tip_height: BlockHeight) -> Result<(), Self::Error> {
        todo!()
    }

    /// Adds a sequence of blocks to the data store.
    ///
    /// Assumes blocks will be here in order.
    fn put_blocks(
        &mut self,
        from_state: &ChainState,
        blocks: Vec<ScannedBlock<Self::AccountId>>,
    ) -> Result<(), Self::Error> {
        // TODO:
        // - Make sure blocks are coming in order.
        // - Make sure the first block in the sequence is tip + 1?
        // - Add a check to make sure the blocks are not already in the data store.
        for block in blocks.into_iter() {
            let mut transactions = BTreeMap::new();
            let mut memos = BTreeMap::new();
            for transaction in block.transactions().iter() {
                let txid = transaction.txid();
                for account_id in self.get_account_ids()? {
                    let ufvk = self
                        .get_account(account_id)?
                        .ok_or(Error::AccountUnknown(account_id))?
                        .ufvk()
                        .ok_or(Error::ViewingKeyNotFound(account_id))?
                        .clone();
                    let dfvk = ufvk
                        .sapling()
                        .ok_or(Error::ViewingKeyNotFound(account_id))?;
                    let nk = dfvk.to_nk(Scope::External);

                    transaction.sapling_outputs().iter().map(|o| {
                        // Insert the Sapling nullifiers of the spent notes into the `sapling_spends` map.
                        let nullifier = o.note().nf(&nk, o.note_commitment_tree_position().into());
                        self.sapling_spends
                            .entry(nullifier)
                            .or_insert((txid, false));

                        // Insert the memo into the `memos` map.
                        let note_id = NoteId::new(
                            txid,
                            Sapling,
                            u16::try_from(o.index())
                                .expect("output indices are representable as u16"),
                        );
                        if let Ok(Some(memo)) = self.get_memo(note_id) {
                            memos.insert(note_id, memo.encode());
                        }
                    });

                    transaction.orchard_outputs().iter().map(|o| {
                        // Insert the Orchard nullifiers of the spent notes into the `orchard_spends` map.
                        if let Some(nullifier) = o.nf() {
                            self.orchard_spends
                                .entry(*nullifier)
                                .or_insert((txid, false));
                        }

                        // Insert the memo into the `memos` map.
                        let note_id = NoteId::new(
                            txid,
                            Orchard,
                            u16::try_from(o.index())
                                .expect("output indices are representable as u16"),
                        );
                        if let Ok(Some(memo)) = self.get_memo(note_id) {
                            memos.insert(note_id, memo.encode());
                        }
                    });

                    // Add frontier to the sapling tree
                    self.sapling_tree.insert_frontier(
                        from_state.final_sapling_tree().clone(),
                        Retention::Checkpoint {
                            id: from_state.block_height(),
                            marking: Marking::Reference,
                        },
                    );

                    // Add frontier to the orchard tree
                    self.orchard_tree.insert_frontier(
                        from_state.final_orchard_tree().clone(),
                        Retention::Checkpoint {
                            id: from_state.block_height(),
                            marking: Marking::Reference,
                        },
                    );

                    // Mark the Sapling nullifiers of the spent notes as spent in the `sapling_spends` map.
                    transaction.sapling_spends().iter().map(|s| {
                        let nullifier = s.nf();
                        if let Some((txid, spent)) = self.sapling_spends.get_mut(nullifier) {
                            *spent = true;
                        }
                    });

                    // Mark the Orchard nullifiers of the spent notes as spent in the `orchard_spends` map.
                    transaction.orchard_spends().iter().map(|s| {
                        let nullifier = s.nf();
                        if let Some((txid, spent)) = self.orchard_spends.get_mut(nullifier) {
                            *spent = true;
                        }
                    });

                    self.tx_idx.insert(txid, block.height());
                    transactions.insert(txid, transaction.clone());
                }
            }

            let memory_block = MemoryWalletBlock {
                height: block.height(),
                hash: block.block_hash(),
                block_time: block.block_time(),
                transactions: transactions,
                memos,
            };

            self.blocks.insert(block.height(), memory_block);

            // Add the Sapling commitments to the sapling tree.
            let block_commitments = block.into_commitments();
            let start_position = from_state
                .final_sapling_tree()
                .value()
                .map_or(0.into(), |t| t.position() + 1);
            self.sapling_tree
                .batch_insert(start_position, block_commitments.sapling.into_iter());

            {
                // Add the Orchard commitments to the orchard tree.
                let start_position = from_state
                    .final_orchard_tree()
                    .value()
                    .map_or(0.into(), |t| t.position() + 1);
                self.orchard_tree
                    .batch_insert(start_position, block_commitments.orchard.into_iter());
            }
        }

        Ok(())
    }

    /// Adds a transparent UTXO received by the wallet to the data store.
    fn put_received_transparent_utxo(
        &mut self,
        _output: &WalletTransparentOutput,
    ) -> Result<Self::UtxoRef, Self::Error> {
        Ok(0)
    }

    fn store_decrypted_tx(
        &mut self,
        _received_tx: DecryptedTransaction<Self::AccountId>,
    ) -> Result<(), Self::Error> {
        todo!()
    }

    fn truncate_to_height(&mut self, _block_height: BlockHeight) -> Result<(), Self::Error> {
        todo!()
    }

    fn import_account_hd(
        &mut self,
        seed: &SecretVec<u8>,
        account_index: zip32::AccountId,
        birthday: &AccountBirthday,
    ) -> Result<(Self::Account, UnifiedSpendingKey), Self::Error> {
        todo!()
    }

    fn import_account_ufvk(
        &mut self,
        unified_key: &UnifiedFullViewingKey,
        birthday: &AccountBirthday,
        purpose: zcash_client_backend::data_api::AccountPurpose,
    ) -> Result<Self::Account, Self::Error> {
        todo!()
    }

    fn store_transactions_to_be_sent(
        &mut self,
        transactions: &[SentTransaction<Self::AccountId>],
    ) -> Result<(), Self::Error> {
        todo!()
    }

    fn set_transaction_status(
        &mut self,
        _txid: TxId,
        _status: zcash_client_backend::data_api::TransactionStatus,
    ) -> Result<(), Self::Error> {
        todo!()
    }
}

impl WalletCommitmentTrees for MemoryWalletDb {
    type Error = Infallible;
    type SaplingShardStore<'a> = MemoryShardStore<sapling::Node, BlockHeight>;

    fn with_sapling_tree_mut<F, A, E>(&mut self, mut callback: F) -> Result<A, E>
    where
        for<'a> F: FnMut(
            &'a mut ShardTree<
                Self::SaplingShardStore<'a>,
                { sapling::NOTE_COMMITMENT_TREE_DEPTH },
                SAPLING_SHARD_HEIGHT,
            >,
        ) -> Result<A, E>,
        E: From<ShardTreeError<Infallible>>,
    {
        callback(&mut self.sapling_tree)
    }

    fn put_sapling_subtree_roots(
        &mut self,
        start_index: u64,
        roots: &[CommitmentTreeRoot<sapling::Node>],
    ) -> Result<(), ShardTreeError<Self::Error>> {
        self.with_sapling_tree_mut(|t| {
            for (root, i) in roots.iter().zip(0u64..) {
                let root_addr = Address::from_parts(SAPLING_SHARD_HEIGHT.into(), start_index + i);
                t.insert(root_addr, *root.root_hash())?;
            }
            Ok::<_, ShardTreeError<Self::Error>>(())
        })?;

        Ok(())
    }

    type OrchardShardStore<'a> = MemoryShardStore<orchard::tree::MerkleHashOrchard, BlockHeight>;

    fn with_orchard_tree_mut<F, A, E>(&mut self, mut callback: F) -> Result<A, E>
    where
        for<'a> F: FnMut(
            &'a mut ShardTree<
                Self::OrchardShardStore<'a>,
                { ORCHARD_SHARD_HEIGHT * 2 },
                { ORCHARD_SHARD_HEIGHT },
            >,
        ) -> Result<A, E>,
        E: From<ShardTreeError<Self::Error>>,
    {
        callback(&mut self.orchard_tree)
    }

    /// Adds a sequence of note commitment tree subtree roots to the data store.
    fn put_orchard_subtree_roots(
        &mut self,
        start_index: u64,
        roots: &[CommitmentTreeRoot<orchard::tree::MerkleHashOrchard>],
    ) -> Result<(), ShardTreeError<Self::Error>> {
        self.with_orchard_tree_mut(|t| {
            for (root, i) in roots.iter().zip(0u64..) {
                let root_addr = Address::from_parts(ORCHARD_SHARD_HEIGHT.into(), start_index + i);
                t.insert(root_addr, *root.root_hash())?;
            }
            Ok::<_, ShardTreeError<Self::Error>>(())
        })?;

        Ok(())
    }
}
