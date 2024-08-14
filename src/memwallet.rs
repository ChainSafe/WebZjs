// #![allow(unused)]
use shardtree::{error::ShardTreeError, store::memory::MemoryShardStore, ShardTree};
use std::{
    cmp::Ordering,
    collections::{BTreeMap, BTreeSet, HashSet},
    convert::Infallible,
    io,
};
use zcash_keys::keys::{AddressGenerationError, DerivationError, UnifiedIncomingViewingKey};
use zip32::{fingerprint::SeedFingerprint, DiversifierIndex};

use zcash_primitives::{
    block::BlockHash,
    consensus::{BlockHeight, Network},
    transaction::{components::amount::NonNegativeAmount, components::OutPoint, Transaction, TxId},
    zip32::AccountId,
};
use zcash_protocol::{
    memo::{self, MemoBytes},
    value::Zatoshis,
};

use zcash_client_backend::{
    data_api::{SentTransaction, SentTransactionOutput},
    keys::{UnifiedAddressRequest, UnifiedFullViewingKey},
    wallet::{NoteId, WalletTx},
};

use zcash_client_backend::data_api::{
    Account, AccountBirthday, AccountPurpose, AccountSource, ORCHARD_SHARD_HEIGHT,
    SAPLING_SHARD_HEIGHT,
};

pub mod wallet_commitment_trees;
pub mod wallet_input_source;
pub mod wallet_read;
pub mod wallet_write;

struct MemoryWalletBlock {
    height: BlockHeight,
    hash: BlockHash,
    block_time: u32,
    // Just the transactions that involve an account in this wallet
    transactions: BTreeSet<TxId>,
    memos: BTreeMap<NoteId, MemoBytes>,
}
pub struct MemoryWalletAccount {
    account_id: AccountId,
    seed_fingerprint: SeedFingerprint,
    ufvk: UnifiedFullViewingKey,
    birthday: AccountBirthday,
    addresses: BTreeMap<DiversifierIndex, UnifiedAddressRequest>,
    // Id for Shielded txn outputs. The actual data is indexed into MemoryWalletBlock
    notes: BTreeSet<NoteId>,
}
pub struct MemoryWalletTransaction {
    height: Option<BlockHeight>,
    expiry_height: Option<BlockHeight>,
    tx_bytes: Vec<u8>,
}

pub struct MemoryWalletDb {
    network: Network,
    accounts: BTreeMap<u32, MemoryWalletAccount>,
    blocks: BTreeMap<BlockHeight, MemoryWalletBlock>,
    tx_idx: BTreeMap<TxId, BlockHeight>,
    // General store for all kinds of transactions relevant or not to this wallet
    transactions: BTreeMap<TxId, WalletTx<u32>>,
    // Serialized Transaction data
    raw_txs: BTreeMap<TxId, MemoryWalletTransaction>,
    // (txid, spent)
    sapling_spends: BTreeMap<sapling::Nullifier, (TxId, bool)>,
    orchard_spends: BTreeMap<orchard::note::Nullifier, (TxId, bool)>,

    chain_tip: BlockHeight,
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

impl MemoryWalletDb {
    pub fn new(network: Network, max_checkpoints: usize) -> Self {
        Self {
            network,
            chain_tip: BlockHeight::from_u32(0),
            accounts: BTreeMap::new(),
            blocks: BTreeMap::new(),
            tx_idx: BTreeMap::new(),
            sapling_spends: BTreeMap::new(),
            orchard_spends: BTreeMap::new(),
            transactions: BTreeMap::new(),
            sapling_tree: ShardTree::new(MemoryShardStore::empty(), max_checkpoints),
            orchard_tree: ShardTree::new(MemoryShardStore::empty(), max_checkpoints),
            raw_txs: BTreeMap::new(),
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
    ShardTreeError(ShardTreeError<Infallible>),
    Io(std::io::Error),
    Other(String),
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
impl From<ShardTreeError<Infallible>> for Error {
    fn from(value: ShardTreeError<Infallible>) -> Self {
        Error::ShardTreeError(value)
    }
}
impl From<std::io::Error> for Error {
    fn from(value: std::io::Error) -> Self {
        Error::Io(value)
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
