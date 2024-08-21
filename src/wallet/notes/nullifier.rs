// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use crate::wallet::traits::{FromBytes, ToBytes};
use crate::wallet::transaction_record::TransactionRecord;

pub trait Nullifier: PartialEq + Copy + Sized + ToBytes<32> + FromBytes<32> + Send {
    fn get_nullifiers_spent_in_transaction(transaction: &TransactionRecord) -> &Vec<Self>;
}

impl Nullifier for sapling_crypto::Nullifier {
    fn get_nullifiers_spent_in_transaction(
        transaction_metadata_set: &TransactionRecord,
    ) -> &Vec<Self> {
        &transaction_metadata_set.spent_sapling_nullifiers
    }
}

impl Nullifier for orchard::note::Nullifier {
    fn get_nullifiers_spent_in_transaction(transaction: &TransactionRecord) -> &Vec<Self> {
        &transaction.spent_orchard_nullifiers
    }
}
