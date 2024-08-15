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
    /// # Examples
    ///
    /// ```
    /// use zingo_status::confirmation_status::ConfirmationStatus;
    /// use zcash_primitives::consensus::BlockHeight;
    ///
    /// let status = ConfirmationStatus::Confirmed(10.into());
    /// assert_eq!(status.is_confirmed_before(&9.into()), false);
    ///
    /// let status = ConfirmationStatus::Confirmed(10.into());
    /// assert_eq!(status.is_confirmed_before(&10.into()), false);
    ///
    /// let status = ConfirmationStatus::Confirmed(10.into());
    /// assert_eq!(status.is_confirmed_before(&11.into()), true);
    /// ```
    pub fn is_confirmed_before(&self, comparison_height: &BlockHeight) -> bool {
        match self {
            Self::Confirmed(self_height) => self_height < comparison_height,
            _ => false,
        }
    }

    /// To return true, the status must be confirmed and no later than specified height.
    /// # Examples
    ///
    /// ```
    /// use zingo_status::confirmation_status::ConfirmationStatus;
    /// use zcash_primitives::consensus::BlockHeight;
    ///
    /// let status = ConfirmationStatus::Confirmed(10.into());
    /// assert_eq!(status.is_confirmed_before_or_at(&9.into()), false);
    ///
    /// let status = ConfirmationStatus::Pending(10.into());
    /// assert_eq!(status.is_confirmed_before_or_at(&10.into()), false);
    ///
    /// let status = ConfirmationStatus::Confirmed(10.into());
    /// assert_eq!(status.is_confirmed_before_or_at(&11.into()), true);
    /// ```
    pub fn is_confirmed_before_or_at(&self, comparison_height: &BlockHeight) -> bool {
        match self {
            Self::Confirmed(self_height) => {
                self.is_confirmed_before(comparison_height) || self_height == comparison_height
            }
            _ => false,
        }
    }

    /// # Examples
    ///
    /// ```
    /// use zingo_status::confirmation_status::ConfirmationStatus;
    /// use zcash_primitives::consensus::BlockHeight;
    ///
    /// let status = ConfirmationStatus::Confirmed(15.into());
    /// assert_eq!(status.get_height(), 15.into());
    /// ```
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
