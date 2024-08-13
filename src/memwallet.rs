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

pub mod wallet_commitment_trees;
pub mod wallet_read;
pub mod wallet_write;

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
