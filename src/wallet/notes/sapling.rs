// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use incrementalmerkletree::Position;
use zcash_client_backend::{PoolType, ShieldedProtocol};
use zcash_primitives::{memo::Memo, transaction::TxId};

use crate::wallet::notes::interface::OutputConstructor;
use crate::wallet::transaction_record::TransactionRecord;

use super::{query::OutputSpendStatusQuery, OutputInterface, ShieldedNoteInterface};

#[derive(Clone)]
pub struct SaplingNote {
    pub diversifier: sapling_crypto::Diversifier,
    pub sapling_crypto_note: sapling_crypto::Note,

    // The position of this note's value commitment in the global commitment tree
    // We need to create a witness to it, to spend
    pub(crate) witnessed_position: Option<Position>,

    // The note's index in its containing transaction
    pub(crate) output_index: Option<u32>,

    pub nullifier: Option<sapling_crypto::Nullifier>,

    pub spent: Option<(TxId, u32)>, // If this note was confirmed spent. Todo: as related to pending spent, this is potential data incoherence

    /// If this note was spent in a send, but has not yet been confirmed.
    /// Contains the transaction id and height at which it was broadcast
    pub pending_spent: Option<(TxId, u32)>,

    pub memo: Option<Memo>,

    /// DEPRECATED
    pub is_change: bool,

    /// If the spending key is available in the wallet (i.e., whether to keep witness up-to-date) Todo should this data point really be here?
    pub have_spending_key: bool,
}

impl std::fmt::Debug for SaplingNote {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SaplingNoteData")
            .field("diversifier", &self.diversifier)
            .field("note", &self.sapling_crypto_note)
            .field("nullifier", &self.nullifier)
            .field("spent", &self.spent)
            .field("pending_spent", &self.pending_spent)
            .field("memo", &self.memo)
            .field("diversifier", &self.diversifier)
            .field("note", &self.sapling_crypto_note)
            .field("nullifier", &self.nullifier)
            .field("spent", &self.spent)
            .field("pending_spent", &self.pending_spent)
            .field("memo", &self.memo)
            .field("is_change", &self.is_change)
            .finish_non_exhaustive()
    }
}

impl OutputInterface for SaplingNote {
    fn pool_type(&self) -> PoolType {
        PoolType::Shielded(ShieldedProtocol::Sapling)
    }

    fn value(&self) -> u64 {
        self.sapling_crypto_note.value().inner()
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
impl OutputConstructor for SaplingNote {
    fn get_record_outputs(transaction_record: &TransactionRecord) -> Vec<&Self> {
        transaction_record.sapling_notes.iter().collect()
    }
    fn get_record_query_matching_outputs(
        transaction_record: &TransactionRecord,
        spend_status_query: OutputSpendStatusQuery,
    ) -> Vec<&Self> {
        transaction_record
            .sapling_notes
            .iter()
            .filter(|output| output.spend_status_query(spend_status_query))
            .collect()
    }
    fn get_record_to_outputs_mut(transaction_record: &mut TransactionRecord) -> Vec<&mut Self> {
        transaction_record.sapling_notes.iter_mut().collect()
    }
    fn get_record_query_matching_outputs_mut(
        transaction_record: &mut TransactionRecord,
        spend_status_query: OutputSpendStatusQuery,
    ) -> Vec<&mut Self> {
        transaction_record
            .sapling_notes
            .iter_mut()
            .filter(|output| output.spend_status_query(spend_status_query))
            .collect()
    }
}

impl ShieldedNoteInterface for SaplingNote {
    type Diversifier = sapling_crypto::Diversifier;
    type Note = sapling_crypto::Note;
    type Node = sapling_crypto::Node;
    type Nullifier = sapling_crypto::Nullifier;

    fn diversifier(&self) -> &Self::Diversifier {
        &self.diversifier
    }

    fn nullifier_mut(&mut self) -> &mut Option<Self::Nullifier> {
        &mut self.nullifier
    }

    fn from_parts(
        diversifier: sapling_crypto::Diversifier,
        sapling_crypto_note: sapling_crypto::Note,
        witnessed_position: Option<Position>,
        nullifier: Option<sapling_crypto::Nullifier>,
        spent: Option<(TxId, u32)>,
        pending_spent: Option<(TxId, u32)>,
        memo: Option<Memo>,
        is_change: bool,
        have_spending_key: bool,
        output_index: Option<u32>,
    ) -> Self {
        Self {
            diversifier,
            sapling_crypto_note,
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
        vec![0u8; 169]
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
        &self.sapling_crypto_note
    }

    fn nullifier(&self) -> Option<Self::Nullifier> {
        self.nullifier
    }

    fn pool() -> PoolType {
        PoolType::Shielded(ShieldedProtocol::Sapling)
    }

    fn transaction_metadata_notes(wallet_transaction: &TransactionRecord) -> &Vec<Self> {
        &wallet_transaction.sapling_notes
    }

    fn transaction_metadata_notes_mut(
        wallet_transaction: &mut TransactionRecord,
    ) -> &mut Vec<Self> {
        &mut wallet_transaction.sapling_notes
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
        zcash_client_backend::wallet::Note::Sapling(self.note().clone())
    }
}