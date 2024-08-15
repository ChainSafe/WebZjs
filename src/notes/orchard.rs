//! TODO: Add Mod Description Here!
use incrementalmerkletree::Position;
use zcash_client_backend::{PoolType, ShieldedProtocol};
use zcash_primitives::{memo::Memo, transaction::TxId};

use crate::notes::interface::OutputConstructor;
use crate::transaction_record::TransactionRecord;

use super::{query::OutputSpendStatusQuery, OutputInterface, ShieldedNoteInterface};

/// TODO: Add Doc Comment Here!
#[derive(Clone, Debug)]
pub struct OrchardNote {
    /// TODO: Add Doc Comment Here!
    pub diversifier: orchard::keys::Diversifier,
    /// TODO: Add Doc Comment Here!
    pub orchard_crypto_note: orchard::note::Note,

    /// The position of this note's value commitment in the global commitment tree
    /// We need to create a witness to it, to spend
    pub witnessed_position: Option<Position>,

    /// The note's index in its containing transaction
    pub(crate) output_index: Option<u32>,

    pub(crate) nullifier: Option<orchard::note::Nullifier>,

    /// If this note was confirmed spent
    pub spent: Option<(TxId, u32)>, // Todo: as related to pending spent, this is potential data incoherence

    /// If this note was spent in a send, but has not yet been confirmed.
    /// Contains the transaction id and height at which it was broadcast
    pub pending_spent: Option<(TxId, u32)>,

    /// TODO: Add Doc Comment Here!
    pub memo: Option<Memo>,

    /// DEPRECATED
    pub is_change: bool,

    /// If the spending key is available in the wallet (i.e., whether to keep witness up-to-date)
    pub have_spending_key: bool,
}

impl OutputInterface for OrchardNote {
    fn pool_type(&self) -> PoolType {
        PoolType::Shielded(ShieldedProtocol::Orchard)
    }

    fn value(&self) -> u64 {
        self.orchard_crypto_note.value().inner()
    }

    fn spent(&self) -> &Option<(TxId, u32)> {
        &self.spent
    }

    fn spent_mut(&mut self) -> &mut Option<(TxId, u32)> {
        &mut self.spent
    }

    fn pending_spent(&self) -> &Option<(TxId, u32)> {
        &self.pending_spent
    }

    fn pending_spent_mut(&mut self) -> &mut Option<(TxId, u32)> {
        &mut self.pending_spent
    }
}
impl OutputConstructor for OrchardNote {
    fn get_record_outputs(transaction_record: &TransactionRecord) -> Vec<&Self> {
        transaction_record.orchard_notes.iter().collect()
    }
    fn get_record_query_matching_outputs(
        transaction_record: &TransactionRecord,
        spend_status_query: OutputSpendStatusQuery,
    ) -> Vec<&Self> {
        transaction_record
            .orchard_notes
            .iter()
            .filter(|output| output.spend_status_query(spend_status_query))
            .collect()
    }
    fn get_record_to_outputs_mut(transaction_record: &mut TransactionRecord) -> Vec<&mut Self> {
        transaction_record.orchard_notes.iter_mut().collect()
    }
    fn get_record_query_matching_outputs_mut(
        transaction_record: &mut TransactionRecord,
        spend_status_query: OutputSpendStatusQuery,
    ) -> Vec<&mut Self> {
        transaction_record
            .orchard_notes
            .iter_mut()
            .filter(|output| output.spend_status_query(spend_status_query))
            .collect()
    }
}

impl ShieldedNoteInterface for OrchardNote {
    type Diversifier = orchard::keys::Diversifier;
    type Note = orchard::note::Note;
    type Node = orchard::tree::MerkleHashOrchard;
    type Nullifier = orchard::note::Nullifier;

    fn diversifier(&self) -> &Self::Diversifier {
        &self.diversifier
    }

    fn nullifier_mut(&mut self) -> &mut Option<Self::Nullifier> {
        &mut self.nullifier
    }

    fn from_parts(
        diversifier: Self::Diversifier,
        orchard_crypto_note: Self::Note,
        witnessed_position: Option<Position>,
        nullifier: Option<Self::Nullifier>,
        spent: Option<(TxId, u32)>,
        pending_spent: Option<(TxId, u32)>,
        memo: Option<Memo>,
        is_change: bool,
        have_spending_key: bool,
        output_index: Option<u32>,
    ) -> Self {
        Self {
            diversifier,
            orchard_crypto_note,
            witnessed_position,
            nullifier,
            spent,
            pending_spent,
            memo,
            is_change,
            have_spending_key,
            output_index,
        }
    }

    fn get_deprecated_serialized_view_key_buffer() -> Vec<u8> {
        vec![0u8; 96]
    }

    fn have_spending_key(&self) -> bool {
        self.have_spending_key
    }
    fn is_change(&self) -> bool {
        self.is_change
    }

    fn is_change_mut(&mut self) -> &mut bool {
        &mut self.is_change
    }

    fn memo(&self) -> &Option<Memo> {
        &self.memo
    }

    fn memo_mut(&mut self) -> &mut Option<Memo> {
        &mut self.memo
    }

    fn note(&self) -> &Self::Note {
        &self.orchard_crypto_note
    }

    fn nullifier(&self) -> Option<Self::Nullifier> {
        self.nullifier
    }

    fn pool() -> PoolType {
        PoolType::Shielded(ShieldedProtocol::Orchard)
    }

    fn transaction_metadata_notes(wallet_transaction: &TransactionRecord) -> &Vec<Self> {
        &wallet_transaction.orchard_notes
    }

    fn transaction_metadata_notes_mut(
        wallet_transaction: &mut TransactionRecord,
    ) -> &mut Vec<Self> {
        &mut wallet_transaction.orchard_notes
    }

    fn value_from_note(note: &Self::Note) -> u64 {
        note.value().inner()
    }

    fn witnessed_position(&self) -> &Option<Position> {
        &self.witnessed_position
    }

    fn witnessed_position_mut(&mut self) -> &mut Option<Position> {
        &mut self.witnessed_position
    }

    fn output_index(&self) -> &Option<u32> {
        &self.output_index
    }

    fn output_index_mut(&mut self) -> &mut Option<u32> {
        &mut self.output_index
    }

    fn to_zcb_note(&self) -> zcash_client_backend::wallet::Note {
        zcash_client_backend::wallet::Note::Orchard(*self.note())
    }
}
