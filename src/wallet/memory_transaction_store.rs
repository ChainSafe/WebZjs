// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! An in-memory (hashmap) store for a wallets transaction
//! This implementation is largely based on the MemoryTransactionStore implementation in from zingolib

use std::collections::HashMap;

use crate::wallet::transaction_record::TransactionRecord;
use zcash_client_backend::{
    data_api::{InputSource, SpendableNotes},
    wallet::{NoteId, ReceivedNote, WalletTransparentOutput},
};
use zcash_primitives::{
    legacy::{Script, TransparentAddress},
    transaction::{
        components::{amount::NonNegativeAmount, OutPoint, TxOut},
        fees::zip317::MARGINAL_FEE,
        TxId,
    },
};
use zcash_protocol::{consensus::BlockHeight, value::BalanceError};

use super::notes::{query::OutputSpendStatusQuery, OrchardNote, OutputInterface, SaplingNote};

pub struct MemoryTransactionStore {
    transactions: HashMap<TxId, TransactionRecord>,
}

impl Default for MemoryTransactionStore {
    fn default() -> Self {
        Self::new()
    }
}

impl MemoryTransactionStore {
    pub fn new() -> Self {
        Self {
            transactions: HashMap::new(),
        }
    }

    /// Adds a TransactionRecord to the hashmap, using its TxId as a key.
    pub fn insert_transaction_record(&mut self, transaction_record: TransactionRecord) {
        self.transactions
            .insert(transaction_record.txid, transaction_record);
    }

    /// get a list of spendable NoteIds with associated note values
    #[allow(clippy::type_complexity)]
    pub(crate) fn get_spendable_note_ids_and_values(
        &self,
        sources: &[zcash_client_backend::ShieldedProtocol],
        anchor_height: zcash_primitives::consensus::BlockHeight,
        exclude: &[NoteId],
    ) -> Result<Vec<(NoteId, u64)>, Vec<(TxId, BlockHeight)>> {
        let mut missing_output_index = vec![];
        let ok = self
            .transactions
            .values()
            .flat_map(|transaction_record| {
                if transaction_record
                    .status
                    .is_confirmed_before_or_at(&anchor_height)
                {
                    if let Ok(notes_from_tx) =
                        transaction_record.get_spendable_note_ids_and_values(sources, exclude)
                    {
                        notes_from_tx
                    } else {
                        missing_output_index.push((
                            transaction_record.txid,
                            transaction_record.status.get_height(),
                        ));
                        vec![]
                    }
                } else {
                    vec![]
                }
            })
            .collect();
        if missing_output_index.is_empty() {
            Ok(ok)
        } else {
            Err(missing_output_index)
        }
    }
}

impl InputSource for MemoryTransactionStore {
    type Error = MemoryStoreError;
    type AccountId = zcash_primitives::zip32::AccountId;
    type NoteRef = NoteId;

    /// Fetches a spendable note by indexing into a transaction's shielded outputs for the
    /// specified shielded protocol.
    ///
    /// Returns `Ok(None)` if the note is not known to belong to the wallet or if the note
    /// is not spendable.
    fn get_spendable_note(
        &self,
        _txid: &zcash_primitives::transaction::TxId,
        _protocol: zcash_protocol::ShieldedProtocol,
        _index: u32,
    ) -> Result<
        Option<
            zcash_client_backend::wallet::ReceivedNote<
                Self::NoteRef,
                zcash_client_backend::wallet::Note,
            >,
        >,
        Self::Error,
    > {
        // This is not required by propose_transfer so we just don't implement it
        unimplemented!()
    }

    /// Returns a list of spendable notes sufficient to cover the specified target value, if
    /// possible. Only spendable notes from the given account, corresponding to the specified shielded protocol will
    /// be included.
    ///
    /// TODO: Zingo doesn't support multiple accounts but we do. Ensure only notes from the specified account are included
    ///
    fn select_spendable_notes(
        &self,
        _account: Self::AccountId,
        target_value: zcash_protocol::value::Zatoshis,
        sources: &[zcash_protocol::ShieldedProtocol],
        anchor_height: zcash_protocol::consensus::BlockHeight,
        exclude: &[Self::NoteRef],
    ) -> Result<zcash_client_backend::data_api::SpendableNotes<Self::NoteRef>, Self::Error> {
        let mut unselected = self
            .get_spendable_note_ids_and_values(sources, anchor_height, exclude)
            .map_err(MemoryStoreError::MissingOutputIndexes)?
            .into_iter()
            .map(|(id, value)| NonNegativeAmount::from_u64(value).map(|value| (id, value)))
            .collect::<Result<Vec<_>, _>>()
            .map_err(MemoryStoreError::InvalidValue)?;
        unselected.sort_by_key(|(_id, value)| *value); // from smallest to largest
        let dust_spendable_index = unselected.partition_point(|(_id, value)| *value < MARGINAL_FEE);
        let _dust_notes: Vec<_> = unselected.drain(..dust_spendable_index).collect();
        let mut selected = vec![];
        let mut index_of_unselected = 0;

        loop {
            // if no unselected notes are available, return the currently selected notes even if the target value has not been reached
            if unselected.is_empty() {
                break;
            }
            // update target value for further note selection
            let selected_notes_total_value = selected
                .iter()
                .try_fold(NonNegativeAmount::ZERO, |acc, (_id, value)| acc + *value)
                .ok_or(MemoryStoreError::InvalidValue(BalanceError::Overflow))?;
            let updated_target_value =
                match calculate_remaining_needed(target_value, selected_notes_total_value) {
                    RemainingNeeded::Positive(updated_target_value) => updated_target_value,
                    RemainingNeeded::GracelessChangeAmount(_change) => {
                        //println!("{:?}", change);
                        break;
                    }
                };

            match unselected.get(index_of_unselected) {
                Some(smallest_unselected) => {
                    // selected a note to test if it has enough value to complete the transaction on its own
                    if smallest_unselected.1 >= updated_target_value {
                        selected.push(*smallest_unselected);
                        unselected.remove(index_of_unselected);
                    } else {
                        // this note is not big enough. try the next
                        index_of_unselected += 1;
                    }
                }
                None => {
                    // the iterator went off the end of the vector without finding a note big enough to complete the transaction
                    // add the biggest note and reset the iteraton
                    selected.push(unselected.pop().expect("should be nonempty")); // TODO:  Add soundness proving unit-test
                    index_of_unselected = 0;
                }
            }
        }

        // Note: Zingo implementation has commented out code here for dust sweeping. Investigate this further in the future

        let mut selected_sapling = Vec::<ReceivedNote<NoteId, sapling_crypto::Note>>::new();
        let mut selected_orchard = Vec::<ReceivedNote<NoteId, orchard::Note>>::new();

        // transform each NoteId to a ReceivedNote
        selected.iter().try_for_each(|(id, _value)| {
            let transaction_record = self
                .transactions
                .get(id.txid())
                .expect("should exist as note_id is created from the record itself");
            let output_index = id.output_index() as u32;
            match id.protocol() {
                zcash_client_backend::ShieldedProtocol::Sapling => transaction_record
                    .get_received_note::<SaplingNote>(output_index)
                    .map(|received_note| {
                        selected_sapling.push(received_note);
                    }),
                zcash_client_backend::ShieldedProtocol::Orchard => transaction_record
                    .get_received_note::<OrchardNote>(output_index)
                    .map(|received_note| {
                        selected_orchard.push(received_note);
                    }),
            }
            .ok_or(MemoryStoreError::WitnessPositionNotFound(*id))
        })?;

        Ok(SpendableNotes::new(selected_sapling, selected_orchard))
    }

    /// Fetches the transparent output corresponding to the provided `outpoint`.
    ///
    /// Returns `Ok(None)` if the UTXO is not known to belong to the wallet or is not
    /// spendable as of the chain tip height.
    fn get_unspent_transparent_output(
        &self,
        outpoint: &OutPoint,
    ) -> Result<Option<WalletTransparentOutput>, Self::Error> {
        let Some((height, output)) = self.transactions.values().find_map(|transaction_record| {
            transaction_record
                .transparent_outputs
                .iter()
                .find_map(|output| {
                    if &output.to_outpoint() == outpoint {
                        transaction_record
                            .status
                            .get_confirmed_height()
                            .map(|height| (height, output))
                    } else {
                        None
                    }
                })
                .filter(|(_height, output)| {
                    output.spend_status_query(OutputSpendStatusQuery::only_unspent())
                })
        }) else {
            return Ok(None);
        };
        let value =
            NonNegativeAmount::from_u64(output.value).map_err(MemoryStoreError::InvalidValue)?;

        let script_pubkey = Script(output.script.clone());

        Ok(WalletTransparentOutput::from_parts(
            outpoint.clone(),
            TxOut {
                value,
                script_pubkey,
            },
            Some(height),
        ))
    }

    /// Returns the list of spendable transparent outputs received by this wallet at `address`
    /// such that, at height `target_height`:
    /// * the transaction that produced the output had or will have at least `min_confirmations`
    ///   confirmations; and
    /// * the output is unspent as of the current chain tip.
    ///
    /// An output that is potentially spent by an unmined transaction in the mempool is excluded
    /// iff the spending transaction will not be expired at `target_height`.
    fn get_spendable_transparent_outputs(
        &self,
        _address: &TransparentAddress,
        _target_height: BlockHeight,
        _min_confirmations: u32,
    ) -> Result<Vec<WalletTransparentOutput>, Self::Error> {
        Ok(vec![])
    }
}

enum RemainingNeeded {
    Positive(NonNegativeAmount),
    GracelessChangeAmount(NonNegativeAmount),
}

// Calculate remaining difference between target and selected.
// There are two mutually exclusive cases:
//    (Change) There's no more needed so we've selected 0 or more change
//    (Positive) We need > 0 more value.
// This function represents the NonPositive case as None, which
// then serves to signal a break in the note selection for where
// this helper is uniquely called.
fn calculate_remaining_needed(
    target_value: NonNegativeAmount,
    selected_value: NonNegativeAmount,
) -> RemainingNeeded {
    if let Some(amount) = target_value - selected_value {
        if amount == NonNegativeAmount::ZERO {
            // Case (Change) target_value == total_selected_value
            RemainingNeeded::GracelessChangeAmount(NonNegativeAmount::ZERO)
        } else {
            // Case (Positive) target_value > total_selected_value
            RemainingNeeded::Positive(amount)
        }
    } else {
        // Case (Change) target_value < total_selected_value
        // Return the non-zero change quantity
        RemainingNeeded::GracelessChangeAmount(
            (selected_value - target_value).expect("This is guaranteed positive"),
        )
    }
}

/// Error type used by InputSource trait
#[derive(thiserror::Error, Debug, PartialEq)]
pub enum MemoryStoreError {
    /// No witness position found for note. Note cannot be spent.
    #[error("No witness position found for note. Note cannot be spent: {0:?}")]
    WitnessPositionNotFound(NoteId),
    /// Value outside the valid range of zatoshis
    #[error("Value outside valid range of zatoshis. {0:?}")]
    InvalidValue(BalanceError),
    /// Wallet data is out of date
    #[error("Output index data is missing! Wallet data is out of date, please rescan.")]
    MissingOutputIndexes(Vec<(TxId, zcash_primitives::consensus::BlockHeight)>),
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::{prop_assert_eq, proptest};
    use zcash_client_backend::{data_api::InputSource as _, ShieldedProtocol};
    use zcash_primitives::{
        consensus::BlockHeight,
        transaction::components::amount::NonNegativeAmount,
    };
    use zip32::AccountId;

    use crate::wallet::{
        notes::{orchard::mocks::OrchardNoteBuilder, transparent::mocks::TransparentOutputBuilder},
        transaction_record::mocks::{
            nine_note_transaction_record_default, TransactionRecordBuilder,
        },
    };

    proptest! {

        #[test]
        fn select_spendable_notes_2(
            target_value in 5_000..3_980_000u32,
        ) {
            let mut transaction_records_by_id = MemoryTransactionStore::new();
            transaction_records_by_id.insert_transaction_record(

        TransactionRecordBuilder::default()
            .orchard_notes(OrchardNoteBuilder::default().value(1_000_000).clone())
            .orchard_notes(OrchardNoteBuilder::default().value(1_000_000).clone())
            .orchard_notes(OrchardNoteBuilder::default().value(1_000_000).clone())
            .orchard_notes(OrchardNoteBuilder::default().value(1_000_000).clone())
            .randomize_txid()
            .set_output_indexes()
            .build()
                );

            let target_amount = NonNegativeAmount::const_from_u64(target_value as u64);
            let anchor_height: BlockHeight = 10.into();
            let spendable_notes =
                zcash_client_backend::data_api::InputSource::select_spendable_notes(
                    &transaction_records_by_id,
                    AccountId::ZERO,
                    target_amount,
                    &[ShieldedProtocol::Sapling, ShieldedProtocol::Orchard],
                    anchor_height,
                    &[],
                ).unwrap();
            let expected_len = match target_value {
                target_value if target_value <= 1_000_000 => 1,
                target_value if target_value <= 2_000_000 => 2,
                target_value if target_value <= 3_000_000 => 3,
                _ => 4
            };

            prop_assert_eq!(spendable_notes.sapling().len() + spendable_notes.orchard().len(), expected_len);
        }
    }

    #[test]
    fn get_unspent_transparent_output() {
        let mut transaction_records_by_id = MemoryTransactionStore::new();

        let transaction_record = nine_note_transaction_record_default();

        transaction_records_by_id.insert_transaction_record(transaction_record);

        let transparent_output = transaction_records_by_id
            .transactions
            .values()
            .next()
            .unwrap()
            .transparent_outputs
            .first()
            .unwrap();
        let record_height = transaction_records_by_id
            .transactions
            .values()
            .next()
            .unwrap()
            .status
            .get_confirmed_height();

        let wto = transaction_records_by_id
            .get_unspent_transparent_output(
                &TransparentOutputBuilder::default().build().to_outpoint(),
            )
            .unwrap()
            .unwrap();

        assert_eq!(wto.outpoint(), &transparent_output.to_outpoint());
        assert_eq!(wto.txout().value.into_u64(), transparent_output.value);
        assert_eq!(wto.txout().script_pubkey.0, transparent_output.script);
        assert_eq!(Some(wto.mined_height()), Some(record_height))
    }
}
