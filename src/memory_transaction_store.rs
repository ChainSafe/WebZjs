// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! An in-memory (hashmap) store for a wallets transaction
//! This implementation is largely based on the TransactionRecordsById implementation in from zingolib

use std::collections::HashMap;

use crate::transaction_record::TransactionRecord;
use zcash_client_backend::{
    data_api::InputSource,
    wallet::{NoteId, WalletTransparentOutput},
};
use zcash_primitives::{
    legacy::TransparentAddress, transaction::components::OutPoint, transaction::TxId,
};
use zcash_protocol::consensus::BlockHeight;

pub struct MemoryTransactionStore {
    transactions: HashMap<TxId, TransactionRecord>,
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
        txid: &zcash_primitives::transaction::TxId,
        protocol: zcash_protocol::ShieldedProtocol,
        index: u32,
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
    fn select_spendable_notes(
        &self,
        account: Self::AccountId,
        target_value: zcash_protocol::value::Zatoshis,
        sources: &[zcash_protocol::ShieldedProtocol],
        anchor_height: zcash_protocol::consensus::BlockHeight,
        exclude: &[Self::NoteRef],
    ) -> Result<zcash_client_backend::data_api::SpendableNotes<Self::NoteRef>, Self::Error> {
        todo!()
    }

    /// Fetches the transparent output corresponding to the provided `outpoint`.
    ///
    /// Returns `Ok(None)` if the UTXO is not known to belong to the wallet or is not
    /// spendable as of the chain tip height.
    fn get_unspent_transparent_output(
        &self,
        _outpoint: &OutPoint,
    ) -> Result<Option<WalletTransparentOutput>, Self::Error> {
        Ok(None)
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

#[derive(thiserror::Error, Debug)]
pub enum MemoryStoreError {}
