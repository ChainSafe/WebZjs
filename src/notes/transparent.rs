//! TODO: Add Mod Description Here!
use std::io::Write;

use byteorder::{ReadBytesExt, WriteBytesExt};

use zcash_client_backend::PoolType;
use zcash_primitives::transaction::{components::OutPoint, TxId};

use crate::notes::{interface::OutputConstructor, query::OutputSpendStatusQuery, OutputInterface};
use crate::transaction_record::TransactionRecord;

/// TODO: Add Doc Comment Here!
#[derive(Clone, Debug, PartialEq)]
pub struct TransparentOutput {
    /// TODO: Add Doc Comment Here!
    pub address: String,
    /// TODO: Add Doc Comment Here!
    pub txid: TxId,
    /// TODO: Add Doc Comment Here!
    pub output_index: u64,
    /// TODO: Add Doc Comment Here!
    pub script: Vec<u8>,
    /// TODO: Add Doc Comment Here!
    pub value: u64,

    spent: Option<(TxId, u32)>, // If this utxo was confirmed spent Todo: potential data incoherence with pending_spent

    /// If this utxo was spent in a send, but has not yet been confirmed.
    /// Contains the txid and height at which the Tx was broadcast
    pub pending_spent: Option<(TxId, u32)>,
}

impl OutputInterface for TransparentOutput {
    fn pool_type(&self) -> PoolType {
        PoolType::Transparent
    }

    fn value(&self) -> u64 {
        self.value
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
impl OutputConstructor for TransparentOutput {
    fn get_record_outputs(transaction_record: &TransactionRecord) -> Vec<&Self> {
        transaction_record.transparent_outputs.iter().collect()
    }
    fn get_record_query_matching_outputs(
        transaction_record: &TransactionRecord,
        spend_status_query: OutputSpendStatusQuery,
    ) -> Vec<&Self> {
        transaction_record
            .transparent_outputs
            .iter()
            .filter(|output| output.spend_status_query(spend_status_query))
            .collect()
    }
    fn get_record_to_outputs_mut(transaction_record: &mut TransactionRecord) -> Vec<&mut Self> {
        transaction_record.transparent_outputs.iter_mut().collect()
    }
    fn get_record_query_matching_outputs_mut(
        transaction_record: &mut TransactionRecord,
        spend_status_query: OutputSpendStatusQuery,
    ) -> Vec<&mut Self> {
        transaction_record
            .transparent_outputs
            .iter_mut()
            .filter(|output| output.spend_status_query(spend_status_query))
            .collect()
    }
}

impl TransparentOutput {
    /// TODO: Add Doc Comment Here!
    pub fn from_parts(
        address: String,
        txid: TxId,
        output_index: u64,
        script: Vec<u8>,
        value: u64,
        spent: Option<(TxId, u32)>,
        pending_spent: Option<(TxId, u32)>,
    ) -> Self {
        Self {
            address,
            txid,
            output_index,
            script,
            value,
            spent,
            pending_spent,
        }
    }

    /// TODO: Add Doc Comment Here!
    pub fn to_outpoint(&self) -> OutPoint {
        OutPoint::new(*self.txid.as_ref(), self.output_index as u32)
    }

    /// write + read
    pub fn serialized_version() -> u64 {
        4
    }

    /// TODO: Add Doc Comment Here!
    pub fn write<W: Write>(&self, mut writer: W) -> std::io::Result<()> {
        writer.write_u64::<byteorder::LittleEndian>(Self::serialized_version())?;

        writer.write_u32::<byteorder::LittleEndian>(self.address.as_bytes().len() as u32)?;
        writer.write_all(self.address.as_bytes())?;

        writer.write_all(self.txid.as_ref())?;

        writer.write_u64::<byteorder::LittleEndian>(self.output_index)?;
        writer.write_u64::<byteorder::LittleEndian>(self.value)?;
        writer.write_i32::<byteorder::LittleEndian>(0)?;

        let (spent, spent_at_height) = if let Some(spent_tuple) = self.spent {
            (Some(spent_tuple.0), Some(spent_tuple.1 as i32))
        } else {
            (None, None)
        };

        zcash_encoding::Vector::write(&mut writer, &self.script, |w, b| w.write_all(&[*b]))?;

        zcash_encoding::Optional::write(&mut writer, spent, |w, transaction_id| {
            w.write_all(transaction_id.as_ref())
        })?;

        zcash_encoding::Optional::write(&mut writer, spent_at_height, |w, s| {
            w.write_i32::<byteorder::LittleEndian>(s)
        })?;

        Ok(())
    }

    /// TODO: Add Doc Comment Here!
    pub fn read<R: std::io::Read>(mut reader: R) -> std::io::Result<Self> {
        let version = reader.read_u64::<byteorder::LittleEndian>()?;

        let address_len = reader.read_i32::<byteorder::LittleEndian>()?;
        let mut address_bytes = vec![0; address_len as usize];
        reader.read_exact(&mut address_bytes)?;
        let address = String::from_utf8(address_bytes).unwrap();
        assert_eq!(address.chars().take(1).collect::<Vec<char>>()[0], 't');

        let mut transaction_id_bytes = [0; 32];
        reader.read_exact(&mut transaction_id_bytes)?;
        let transaction_id = TxId::from_bytes(transaction_id_bytes);

        let output_index = reader.read_u64::<byteorder::LittleEndian>()?;
        let value = reader.read_u64::<byteorder::LittleEndian>()?;
        let _height = reader.read_i32::<byteorder::LittleEndian>()?;

        let script = zcash_encoding::Vector::read(&mut reader, |r| {
            let mut byte = [0; 1];
            r.read_exact(&mut byte)?;
            Ok(byte[0])
        })?;

        let spent = zcash_encoding::Optional::read(&mut reader, |r| {
            let mut transaction_bytes = [0u8; 32];
            r.read_exact(&mut transaction_bytes)?;
            Ok(TxId::from_bytes(transaction_bytes))
        })?;

        let spent_at_height = if version <= 1 {
            None
        } else {
            zcash_encoding::Optional::read(&mut reader, |r| {
                r.read_i32::<byteorder::LittleEndian>()
            })?
        };

        let _pending_spent = if version == 3 {
            zcash_encoding::Optional::read(&mut reader, |r| {
                let mut transaction_bytes = [0u8; 32];
                r.read_exact(&mut transaction_bytes)?;

                let height = r.read_u32::<byteorder::LittleEndian>()?;
                Ok((TxId::from_bytes(transaction_bytes), height))
            })?
        } else {
            None
        };

        let spent_tuple: Option<(TxId, u32)> = if let Some(txid) = spent {
            if let Some(height) = spent_at_height {
                Some((txid, height as u32))
            } else {
                Some((txid, 0))
            }
        } else {
            None
        };

        Ok(TransparentOutput {
            address,
            txid: transaction_id,
            output_index,
            script,
            value,
            spent: spent_tuple,
            pending_spent: None,
        })
    }
}
