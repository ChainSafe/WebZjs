// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use zcash_client_backend::wallet::NoteId;
use zcash_primitives::transaction::TxId;
use zcash_protocol::{
    consensus::BlockHeight,
    memo::Memo,
    ShieldedProtocol::{Orchard, Sapling},
};

use crate::wallet::notes::{
    interface::{OutputInterface, ShieldedNoteInterface},
    OrchardNote, SaplingNote, TransparentOutput,
};

/// A transaction record is the primary data structure used to store and persist information about a transaction.
/// This includes transactions sent by the wallet and also those decrypted from a scanning the blockchain.
#[derive(Debug)]
pub struct TransactionRecord {
    /// the relationship of the transaction to the blockchain. can be either Broadcast (to mempool}, or Confirmed.
    pub status: ConfirmationStatus,

    /// Timestamp of Tx. Added in v4
    pub datetime: u64,

    /// Txid of this transaction. It's duplicated here (It is also the Key in the HashMap that points to this
    /// WalletTx in LightWallet::txs)
    pub txid: TxId,

    /// List of all nullifiers spent by this wallet in this Tx.
    pub spent_sapling_nullifiers: Vec<sapling_crypto::Nullifier>,

    /// List of all nullifiers spent by this wallet in this Tx. These nullifiers belong to the wallet.
    pub spent_orchard_nullifiers: Vec<orchard::note::Nullifier>,

    /// List of all sapling notes received by this wallet in this tx. Some of these might be change notes.
    pub sapling_notes: Vec<SaplingNote>,

    /// List of all sapling notes received by this wallet in this tx. Some of these might be change notes.
    pub orchard_notes: Vec<OrchardNote>,

    /// List of all Utxos by this wallet received in this Tx. Some of these might be change notes
    pub transparent_outputs: Vec<TransparentOutput>,

    /// Total amount of transparent funds that belong to us that were spent by this wallet in this Tx.
    pub total_transparent_value_spent: u64,

    /// Total value of all the sapling nullifiers that were spent by this wallet in this Tx
    pub total_sapling_value_spent: u64,

    /// Total value of all the orchard nullifiers that were spent by this wallet in this Tx
    pub total_orchard_value_spent: u64,
    /// All outgoing sends
    pub outgoing_tx_data: Vec<OutgoingTxData>,
}

impl TransactionRecord {
    pub fn new(status: ConfirmationStatus, datetime: u64, transaction_id: &TxId) -> Self {
        TransactionRecord {
            status,
            datetime,
            txid: *transaction_id,
            spent_sapling_nullifiers: vec![],
            spent_orchard_nullifiers: vec![],
            sapling_notes: vec![],
            orchard_notes: vec![],
            transparent_outputs: vec![],
            total_transparent_value_spent: 0,
            total_sapling_value_spent: 0,
            total_orchard_value_spent: 0,
            outgoing_tx_data: vec![],
        }
    }

    pub fn get_received_note<SN: ShieldedNoteInterface>(
        &self,
        index: u32,
    ) -> Option<zcash_client_backend::wallet::ReceivedNote<NoteId, SN::Note>> {
        let note = SN::get_record_outputs(self)
            .into_iter()
            .find(|note| *note.output_index() == Some(index));
        note.and_then(|note| {
            let txid = self.txid;
            let note_record_reference =
                NoteId::new(txid, note.to_zcb_note().protocol(), index as u16);
            note.witnessed_position().map(|pos| {
                zcash_client_backend::wallet::ReceivedNote::from_parts(
                    note_record_reference,
                    txid,
                    index as u16,
                    note.note().clone(),
                    zip32::Scope::External,
                    pos,
                )
            })
        })
    }

    /// get a list of unspent NoteIds with associated note values
    pub(crate) fn get_spendable_note_ids_and_values(
        &self,
        sources: &[zcash_client_backend::ShieldedProtocol],
        exclude: &[NoteId],
    ) -> Result<Vec<(NoteId, u64)>, ()> {
        let mut all = vec![];
        let mut missing_output_index = false;
        if sources.contains(&Sapling) {
            self.sapling_notes.iter().for_each(|zingo_sapling_note| {
                if zingo_sapling_note.is_unspent() {
                    if let Some(output_index) = zingo_sapling_note.output_index() {
                        let id = NoteId::new(self.txid, Sapling, *output_index as u16);
                        if !exclude.contains(&id) {
                            all.push((id, zingo_sapling_note.value()));
                        }
                    } else {
                        println!("note has no index");
                        missing_output_index = true;
                    }
                }
            });
        }
        if sources.contains(&Orchard) {
            self.orchard_notes.iter().for_each(|zingo_orchard_note| {
                if zingo_orchard_note.is_unspent() {
                    if let Some(output_index) = zingo_orchard_note.output_index() {
                        let id = NoteId::new(self.txid, Orchard, *output_index as u16);
                        if !exclude.contains(&id) {
                            all.push((id, zingo_orchard_note.value()));
                        }
                    } else {
                        println!("note has no index");
                        missing_output_index = true;
                    }
                }
            });
        }
        if missing_output_index {
            Err(())
        } else {
            Ok(all)
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ConfirmationStatus {
    /// The transaction is pending confirmation to the zcash blockchain. It may be waiting in the mempool.
    /// The BlockHeight is the 1 + the height of the chain as the transaction was broadcast, i.e. the target height.
    Pending(BlockHeight),
    /// The transaction has been included in at-least one block mined to the zcash blockchain.
    /// The height of a confirmed block that contains the transaction.
    Confirmed(BlockHeight),
}

impl ConfirmationStatus {
    /// To return true, the status must be confirmed earlier than specified height.
    pub fn is_confirmed_before(&self, comparison_height: &BlockHeight) -> bool {
        match self {
            Self::Confirmed(self_height) => self_height < comparison_height,
            _ => false,
        }
    }

    pub fn get_confirmed_height(&self) -> Option<BlockHeight> {
        match self {
            Self::Confirmed(self_height) => Some(*self_height),
            _ => None,
        }
    }

    /// To return true, the status must be confirmed and no later than specified height.
    pub fn is_confirmed_before_or_at(&self, comparison_height: &BlockHeight) -> bool {
        match self {
            Self::Confirmed(self_height) => {
                self.is_confirmed_before(comparison_height) || self_height == comparison_height
            }
            _ => false,
        }
    }

    /// # Examples
    pub fn get_height(&self) -> BlockHeight {
        match self {
            Self::Pending(self_height) => *self_height,
            Self::Confirmed(self_height) => *self_height,
        }
    }
}

/// Only for TransactionRecords *from* "this" capability
#[derive(Clone, Debug)]
pub struct OutgoingTxData {
    /// TODO: Add Doc Comment Here!
    pub recipient_address: String,
    /// Amount to this receiver
    pub value: u64,
    /// Note to the receiver, why not an option?
    pub memo: Memo,
    /// What if it wasn't provided?  How does this relate to
    /// recipient_address?
    pub recipient_ua: Option<String>,
}

#[cfg(test)]
pub mod mocks {
    //! Mock version of the struct for testing
    use super::{ConfirmationStatus, OutgoingTxData};
    use zcash_primitives::memo::Memo;
    use zcash_primitives::transaction::TxId;

    use crate::{
        mocks::{
            nullifier::{OrchardNullifierBuilder, SaplingNullifierBuilder},
            random_txid,
            utils::{build_method, build_method_push, build_push_list},
        },
        wallet::notes::{
            orchard::mocks::OrchardNoteBuilder, sapling::mocks::SaplingNoteBuilder,
            transparent::mocks::TransparentOutputBuilder,
        },
    };

    use super::TransactionRecord;

    pub(crate) struct OutgoingTxDataBuilder {
        recipient_address: Option<String>,
        value: Option<u64>,
        memo: Option<Memo>,
        recipient_ua: Option<Option<String>>,
    }

    impl OutgoingTxDataBuilder {
        pub(crate) fn new() -> Self {
            Self {
                recipient_address: None,
                value: None,
                memo: None,
                recipient_ua: None,
            }
        }

        // Methods to set each field
        build_method!(recipient_address, String);
        build_method!(value, u64);
        build_method!(memo, Memo);
        build_method!(recipient_ua, Option<String>);

        pub(crate) fn build(&self) -> OutgoingTxData {
            OutgoingTxData {
                recipient_address: self.recipient_address.clone().unwrap(),
                value: self.value.unwrap(),
                memo: self.memo.clone().unwrap(),
                recipient_ua: self.recipient_ua.clone().unwrap(),
            }
        }
    }

    impl Default for OutgoingTxDataBuilder {
        fn default() -> Self {
            let mut builder = Self::new();
            builder
                .recipient_address("default_address".to_string())
                .value(50_000)
                .memo(Memo::default())
                .recipient_ua(None);
            builder
        }
    }

    /// to create a mock TransactionRecord
    pub(crate) struct TransactionRecordBuilder {
        status: Option<ConfirmationStatus>,
        datetime: Option<u64>,
        txid: Option<TxId>,
        spent_sapling_nullifiers: Vec<SaplingNullifierBuilder>,
        spent_orchard_nullifiers: Vec<OrchardNullifierBuilder>,
        transparent_outputs: Vec<TransparentOutputBuilder>,
        sapling_notes: Vec<SaplingNoteBuilder>,
        orchard_notes: Vec<OrchardNoteBuilder>,
        total_transparent_value_spent: Option<u64>,
        outgoing_tx_data: Vec<OutgoingTxDataBuilder>,
    }
    #[allow(dead_code)] //TODO:  fix this gross hack that I tossed in to silence the language-analyzer false positive
    impl TransactionRecordBuilder {
        /// blank builder
        pub fn new() -> Self {
            Self {
                status: None,
                datetime: None,
                txid: None,
                spent_sapling_nullifiers: vec![],
                spent_orchard_nullifiers: vec![],
                transparent_outputs: vec![],
                sapling_notes: vec![],
                orchard_notes: vec![],
                total_transparent_value_spent: None,
                outgoing_tx_data: vec![],
            }
        }
        // Methods to set each field
        build_method!(status, ConfirmationStatus);
        build_method!(datetime, u64);
        build_method!(txid, TxId);
        build_method_push!(spent_sapling_nullifiers, SaplingNullifierBuilder);
        build_method_push!(spent_orchard_nullifiers, OrchardNullifierBuilder);
        build_method_push!(transparent_outputs, TransparentOutputBuilder);
        build_method_push!(sapling_notes, SaplingNoteBuilder);
        build_method_push!(orchard_notes, OrchardNoteBuilder);
        build_method!(total_transparent_value_spent, u64);
        build_method_push!(outgoing_tx_data, OutgoingTxDataBuilder);

        /// Use the mockery of random_txid to get one?
        pub fn randomize_txid(&mut self) -> &mut Self {
            self.txid(crate::mocks::random_txid())
        }

        /// Sets the output indexes of all contained notes
        pub fn set_output_indexes(&mut self) -> &mut Self {
            for (i, toutput) in self.transparent_outputs.iter_mut().enumerate() {
                toutput.output_index = Some(i as u64);
            }
            for (i, snote) in self.sapling_notes.iter_mut().enumerate() {
                snote.output_index = Some(Some(i as u32));
            }
            for (i, snote) in self.orchard_notes.iter_mut().enumerate() {
                snote.output_index = Some(Some(i as u32));
            }
            self
        }

        /// builds a mock TransactionRecord after all pieces are supplied
        pub fn build(&self) -> TransactionRecord {
            let mut transaction_record = TransactionRecord::new(
                self.status.unwrap(),
                self.datetime.unwrap(),
                &self.txid.unwrap(),
            );
            build_push_list!(spent_sapling_nullifiers, self, transaction_record);
            build_push_list!(spent_orchard_nullifiers, self, transaction_record);
            build_push_list!(transparent_outputs, self, transaction_record);
            build_push_list!(sapling_notes, self, transaction_record);
            build_push_list!(orchard_notes, self, transaction_record);
            build_push_list!(outgoing_tx_data, self, transaction_record);
            transaction_record.total_transparent_value_spent =
                self.total_transparent_value_spent.unwrap();
            transaction_record
        }
    }

    impl Default for TransactionRecordBuilder {
        fn default() -> Self {
            Self {
                status: Some(ConfirmationStatus::Confirmed(
                    zcash_primitives::consensus::BlockHeight::from_u32(5),
                )),
                datetime: Some(1705077003),
                txid: Some(crate::mocks::random_txid()),
                spent_sapling_nullifiers: vec![],
                spent_orchard_nullifiers: vec![],
                transparent_outputs: vec![],
                sapling_notes: vec![],
                orchard_notes: vec![],
                total_transparent_value_spent: Some(0),
                outgoing_tx_data: vec![],
            }
        }
    }

    /// creates a TransactionRecord holding each type of note with custom values.
    #[allow(clippy::too_many_arguments)]
    pub fn nine_note_transaction_record(
        transparent_unspent: u64,
        transparent_spent: u64,
        transparent_semi_spent: u64,
        sapling_unspent: u64,
        sapling_spent: u64,
        sapling_semi_spent: u64,
        orchard_unspent: u64,
        orchard_spent: u64,
        orchard_semi_spent: u64,
    ) -> TransactionRecord {
        let spend = Some((random_txid(), 112358));
        let semi_spend = Some((random_txid(), 853211));

        TransactionRecordBuilder::default()
            .transparent_outputs(
                TransparentOutputBuilder::default()
                    .value(transparent_unspent)
                    .clone(),
            )
            .transparent_outputs(
                TransparentOutputBuilder::default()
                    .spent(spend)
                    .value(transparent_spent)
                    .clone(),
            )
            .transparent_outputs(
                TransparentOutputBuilder::default()
                    .pending_spent(semi_spend)
                    .value(transparent_semi_spent)
                    .clone(),
            )
            .sapling_notes(SaplingNoteBuilder::default().value(sapling_unspent).clone())
            .sapling_notes(
                SaplingNoteBuilder::default()
                    .spent(spend)
                    .value(sapling_spent)
                    .clone(),
            )
            .sapling_notes(
                SaplingNoteBuilder::default()
                    .pending_spent(semi_spend)
                    .value(sapling_semi_spent)
                    .clone(),
            )
            .orchard_notes(OrchardNoteBuilder::default().value(orchard_unspent).clone())
            .orchard_notes(
                OrchardNoteBuilder::default()
                    .spent(spend)
                    .value(orchard_spent)
                    .clone(),
            )
            .orchard_notes(
                OrchardNoteBuilder::default()
                    .pending_spent(semi_spend)
                    .value(orchard_semi_spent)
                    .clone(),
            )
            .randomize_txid()
            .set_output_indexes()
            .build()
    }

    /// default values are multiples of 10_000
    pub fn nine_note_transaction_record_default() -> TransactionRecord {
        nine_note_transaction_record(
            10_000, 20_000, 30_000, 40_000, 50_000, 60_000, 70_000, 80_000, 90_000,
        )
    }
    #[test]
    fn check_nullifier_indices() {
        let sap_null_one = SaplingNullifierBuilder::new()
            .assign_unique_nullifier()
            .clone();
        let sap_null_two = SaplingNullifierBuilder::new()
            .assign_unique_nullifier()
            .clone();
        let orch_null_one = OrchardNullifierBuilder::new()
            .assign_unique_nullifier()
            .clone();
        let orch_null_two = OrchardNullifierBuilder::new()
            .assign_unique_nullifier()
            .clone();
        let sent_transaction_record = TransactionRecordBuilder::default()
            .status(ConfirmationStatus::Confirmed(15.into()))
            .spent_sapling_nullifiers(sap_null_one.clone())
            .spent_sapling_nullifiers(sap_null_two.clone())
            .spent_orchard_nullifiers(orch_null_one.clone())
            .spent_orchard_nullifiers(orch_null_two.clone())
            .transparent_outputs(TransparentOutputBuilder::default())
            .sapling_notes(SaplingNoteBuilder::default())
            .orchard_notes(OrchardNoteBuilder::default())
            .outgoing_tx_data(OutgoingTxDataBuilder::default())
            .build();
        assert_eq!(
            sent_transaction_record.spent_sapling_nullifiers[0],
            sap_null_one.build()
        );
        assert_eq!(
            sent_transaction_record.spent_sapling_nullifiers[1],
            sap_null_two.build()
        );
        assert_eq!(
            sent_transaction_record.spent_orchard_nullifiers[0],
            orch_null_one.build()
        );
        assert_eq!(
            sent_transaction_record.spent_orchard_nullifiers[1],
            orch_null_two.build()
        );
    }
}
