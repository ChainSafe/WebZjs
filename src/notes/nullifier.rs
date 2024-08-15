use crate::traits::{FromBytes, ToBytes};
use crate::transaction_record::TransactionRecord;

pub trait Nullifier:
    PartialEq + Copy + Sized + ToBytes<32> + FromBytes<32> + Send + Into<PoolNullifier>
{
    /// TODO: Add Doc Comment Here!
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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PoolNullifier {
    /// TODO: Add Doc Comment Here!
    Sapling(sapling_crypto::Nullifier),
    /// TODO: Add Doc Comment Here!
    Orchard(orchard::note::Nullifier),
}

impl std::hash::Hash for PoolNullifier {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        match self {
            PoolNullifier::Sapling(n) => {
                state.write_u8(0);
                n.0.hash(state);
            }
            PoolNullifier::Orchard(n) => {
                state.write_u8(1);
                n.to_bytes().hash(state);
            }
        }
    }
}

impl From<orchard::note::Nullifier> for PoolNullifier {
    fn from(n: orchard::note::Nullifier) -> Self {
        PoolNullifier::Orchard(n)
    }
}

impl From<sapling_crypto::Nullifier> for PoolNullifier {
    fn from(n: sapling_crypto::Nullifier) -> Self {
        PoolNullifier::Sapling(n)
    }
}
