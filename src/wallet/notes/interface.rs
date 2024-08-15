//! Logic that's common to all value transfer instruments. A significant discrepancy between
//! librustzcash and zingolib is that transparent "notes" are a reified concept in zingolib.

use incrementalmerkletree::{Hashable, Position};
use zcash_client_backend::{PoolType, ShieldedProtocol};
use zcash_primitives::{memo::Memo, merkle_tree::HashSer, transaction::TxId};

use crate::wallet::{
    capability::WalletCapability,
    notes::{
        nullifier::Nullifier,
        query::{OutputPoolQuery, OutputQuery, OutputSpendStatusQuery},
    },
    traits::{FromBytes, FromCommitment, ReadableWriteable, ToBytes},
    transaction_record::TransactionRecord,
};

/// Trait methods of Outputs that aren't static (i.e. don't take self)
pub trait OutputConstructor {
    /// Returns the Outputs in the TransactionRecord in this pool.
    fn get_record_outputs(transaction_record: &TransactionRecord) -> Vec<&Self>;
    /// Returns the Outputs in the TransactionRecord that fit the OutputSpendStatusQuery in this pool.
    fn get_record_query_matching_outputs(
        transaction_record: &TransactionRecord,
        spend_status_query: OutputSpendStatusQuery,
    ) -> Vec<&Self>;
    /// Returns the Outputs in the TransactionRecord that fit the OutputSpendStatusQuery in this pool.
    fn get_record_to_outputs_mut(transaction_record: &mut TransactionRecord) -> Vec<&mut Self>;
    /// Returns the Outputs in the TransactionRecord that fit the OutputSpendStatusQuery in this pool.
    fn get_record_query_matching_outputs_mut(
        transaction_record: &mut TransactionRecord,
        spend_status_query: OutputSpendStatusQuery,
    ) -> Vec<&mut Self>;
}
/// Expresses the behavior that *all* value transfers MUST support (inclusive of transparent).
#[enum_dispatch::enum_dispatch]
pub trait OutputInterface: Sized {
    /// returns the zcash_client_backend PoolType enum (one of 3)
    /// Where lrz splits between shielded and transparent, zingolib
    /// uses this type to discriminate among the three pools that we
    /// must manage. NOTE:  Possibly we should distinguish with this
    /// method name?
    fn pool_type(&self) -> PoolType;

    /// number of Zatoshis unlocked by the value-transfer
    fn value(&self) -> u64;

    /// If the funds are spent, the TxId and Blockheight of record
    fn spent(&self) -> &Option<(TxId, u32)>;

    /// Mutable access to the spent field.. hmm  NOTE:  Should we keep this pattern?
    /// what is spent becomes a Vec<OnceCell(TxiD, u32)>, where the last element of that
    /// Vec is the last known block chain record of the spend.  So then reorgs, just extend
    /// the Vec which tracks all BlockChain records of the value-transfer
    fn spent_mut(&mut self) -> &mut Option<(TxId, u32)>;

    /// The TxId and broadcast height of a transfer that's not known to be on-record on the chain
    fn pending_spent(&self) -> &Option<(TxId, u32)>;

    /// TODO: Add Doc Comment Here!
    fn pending_spent_mut(&mut self) -> &mut Option<(TxId, u32)>;

    /// Returns true if the note has been presumptively spent but the spent has not been validated.
    fn is_pending_spent(&self) -> bool {
        self.pending_spent().is_some()
    }

    /// returns true if the note is confirmed spent
    fn is_spent(&self) -> bool {
        self.spent().is_some()
    }

    /// Returns true if the note has one of the spend statuses enumerated by the query
    fn spend_status_query(&self, query: OutputSpendStatusQuery) -> bool {
        (*query.unspent() && !self.is_spent() && !self.is_pending_spent())
            || (*query.pending_spent() && self.is_pending_spent())
            || (*query.spent() && self.is_spent())
    }

    /// Returns true if the note is unspent (spendable).
    fn is_unspent(&self) -> bool {
        self.spend_status_query(OutputSpendStatusQuery::only_unspent())
    }

    /// Returns true if the note is one of the pools enumerated by the query.
    fn pool_query(&self, query: OutputPoolQuery) -> bool {
        (*query.transparent() && self.pool_type() == PoolType::Transparent)
            || (*query.sapling()
                && self.pool_type() == PoolType::Shielded(ShieldedProtocol::Sapling))
            || (*query.orchard()
                && self.pool_type() == PoolType::Shielded(ShieldedProtocol::Orchard))
    }

    /// Returns true if the note is one of the spend statuses enumerated by the query AND one of the pools enumerated by the query.
    fn query(&self, query: OutputQuery) -> bool {
        self.spend_status_query(*query.spend_status()) && self.pool_query(*query.pools())
    }
}

///   ShieldedNotes are either part of a Sapling or Orchard Pool
pub trait ShieldedNoteInterface: OutputInterface + OutputConstructor + Sized {
    /// TODO: Add Doc Comment Here!
    type Diversifier: Copy + FromBytes<11> + ToBytes<11>;
    /// TODO: Add Doc Comment Here!
    type Note: PartialEq
        + for<'a> ReadableWriteable<(Self::Diversifier, &'a WalletCapability)>
        + Clone;
    /// TODO: Add Doc Comment Here!
    type Node: Hashable + HashSer + FromCommitment + Send + Clone + PartialEq + Eq;
    /// TODO: Add Doc Comment Here!
    type Nullifier: Nullifier;

    /// TODO: Add Doc Comment Here!
    fn diversifier(&self) -> &Self::Diversifier;

    /// TODO: Add Doc Comment Here!
    #[allow(clippy::too_many_arguments)]
    fn from_parts(
        diversifier: Self::Diversifier,
        note: Self::Note,
        position_of_commitment_to_witness: Option<Position>,
        nullifier: Option<Self::Nullifier>,
        spent: Option<(TxId, u32)>,
        pending_spent: Option<(TxId, u32)>,
        memo: Option<Memo>,
        is_change: bool,
        have_spending_key: bool,
        output_index: Option<u32>,
    ) -> Self;

    /// TODO: Add Doc Comment Here!
    fn get_deprecated_serialized_view_key_buffer() -> Vec<u8>;

    /// TODO: Add Doc Comment Here!
    fn have_spending_key(&self) -> bool;

    /// TODO: Add Doc Comment Here!
    fn is_change(&self) -> bool;

    /// TODO: Add Doc Comment Here!
    fn is_change_mut(&mut self) -> &mut bool;

    /// TODO: Add Doc Comment Here!
    fn memo(&self) -> &Option<Memo>;

    /// TODO: Add Doc Comment Here!
    fn memo_mut(&mut self) -> &mut Option<Memo>;

    /// TODO: Add Doc Comment Here!
    fn note(&self) -> &Self::Note;

    /// TODO: Add Doc Comment Here!
    fn nullifier(&self) -> Option<Self::Nullifier>;

    /// TODO: Add Doc Comment Here!
    fn nullifier_mut(&mut self) -> &mut Option<Self::Nullifier>;

    /// TODO: Add Doc Comment Here!
    fn output_index(&self) -> &Option<u32>;

    /// TODO: Add Doc Comment Here!
    fn output_index_mut(&mut self) -> &mut Option<u32>;

    /// TODO: Add Doc Comment Here!
    fn pending_receipt(&self) -> bool {
        self.nullifier().is_none()
    }

    /// TODO: Add Doc Comment Here!
    fn pool() -> PoolType;

    /// TODO: Add Doc Comment Here!
    fn transaction_metadata_notes(wallet_transaction: &TransactionRecord) -> &Vec<Self>;

    /// TODO: Add Doc Comment Here!
    fn transaction_metadata_notes_mut(wallet_transaction: &mut TransactionRecord)
        -> &mut Vec<Self>;

    /// TODO: Add Doc Comment Here!
    fn value_from_note(note: &Self::Note) -> u64;

    /// TODO: Add Doc Comment Here!
    fn witnessed_position(&self) -> &Option<Position>;

    /// TODO: Add Doc Comment Here!
    fn witnessed_position_mut(&mut self) -> &mut Option<Position>;

    /// TODO: Add Doc Comment Here!
    fn to_zcb_note(&self) -> zcash_client_backend::wallet::Note;
}
