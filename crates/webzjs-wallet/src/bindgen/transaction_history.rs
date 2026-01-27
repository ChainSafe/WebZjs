// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use wasm_bindgen::prelude::*;
use zcash_client_backend::data_api::TransactionStatus;
use zcash_client_memory::MemoryWalletDb;
use zcash_protocol::consensus::BlockHeight;
use zcash_protocol::TxId;

use crate::error::Error;
use super::wallet::AccountId;
use webzjs_common::Network;

/// The type of transaction
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[wasm_bindgen]
pub enum TransactionType {
    /// Funds received from external source
    Received,
    /// Funds sent to external recipient
    Sent,
    /// Internal transfer (shielding, de-shielding, or pool migration)
    Shielded,
}

/// The status of a transaction
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[wasm_bindgen]
pub enum TransactionStatusType {
    /// Transaction has been mined
    Confirmed,
    /// Transaction is waiting to be mined
    Pending,
    /// Transaction has expired without being mined
    Expired,
}

/// A single transaction history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(inspectable)]
pub struct TransactionHistoryEntry {
    /// Hex-encoded transaction ID
    txid: String,
    /// Type of transaction (Received, Sent, or Shielded)
    tx_type: TransactionType,
    /// Net value change in zatoshis (positive = received, negative = sent)
    value: i64,
    /// Fee paid in zatoshis (only for sent transactions)
    fee: Option<u64>,
    /// Block height where transaction was mined
    block_height: Option<u32>,
    /// Number of confirmations
    confirmations: u32,
    /// Transaction status
    status: TransactionStatusType,
    /// Decoded memo text (UTF-8)
    memo: Option<String>,
    /// Estimated timestamp (seconds since Unix epoch)
    timestamp: Option<u64>,
    /// Pool type: "sapling", "orchard", "transparent", or "mixed"
    pool: String,
}

#[wasm_bindgen]
impl TransactionHistoryEntry {
    #[wasm_bindgen(getter)]
    pub fn txid(&self) -> String {
        self.txid.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn tx_type(&self) -> TransactionType {
        self.tx_type
    }

    #[wasm_bindgen(getter)]
    pub fn value(&self) -> i64 {
        self.value
    }

    #[wasm_bindgen(getter)]
    pub fn fee(&self) -> Option<u64> {
        self.fee
    }

    #[wasm_bindgen(getter)]
    pub fn block_height(&self) -> Option<u32> {
        self.block_height
    }

    #[wasm_bindgen(getter)]
    pub fn confirmations(&self) -> u32 {
        self.confirmations
    }

    #[wasm_bindgen(getter)]
    pub fn status(&self) -> TransactionStatusType {
        self.status
    }

    #[wasm_bindgen(getter)]
    pub fn memo(&self) -> Option<String> {
        self.memo.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn timestamp(&self) -> Option<u64> {
        self.timestamp
    }

    #[wasm_bindgen(getter)]
    pub fn pool(&self) -> String {
        self.pool.clone()
    }
}

/// Response containing paginated transaction history
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(inspectable)]
pub struct TransactionHistoryResponse {
    transactions: Vec<TransactionHistoryEntry>,
    total_count: u32,
    has_more: bool,
}

#[wasm_bindgen]
impl TransactionHistoryResponse {
    #[wasm_bindgen(getter)]
    pub fn transactions(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.transactions).unwrap_or(JsValue::NULL)
    }

    #[wasm_bindgen(getter)]
    pub fn total_count(&self) -> u32 {
        self.total_count
    }

    #[wasm_bindgen(getter)]
    pub fn has_more(&self) -> bool {
        self.has_more
    }
}


/// Internal struct to accumulate transaction data
#[derive(Debug, Default)]
struct TxAccumulator {
    received_value: u64,
    sent_value: u64,
    fee: Option<u64>,
    memos: Vec<String>,
    pools: std::collections::HashSet<String>,
    block_height: Option<BlockHeight>,
    status: Option<TransactionStatus>,
    expiry_height: Option<BlockHeight>,
}

/// Extract transaction history from the wallet database
pub fn extract_transaction_history(
    db: &MemoryWalletDb<Network>,
    account_id: u32,
    chain_tip_height: Option<u32>,
    limit: u32,
    offset: u32,
) -> Result<TransactionHistoryResponse, Error> {
    let account_id_typed = AccountId::from(account_id);

    // Accumulate data by txid
    let mut tx_map: BTreeMap<TxId, TxAccumulator> = BTreeMap::new();

    // Process received notes for this account
    for note in db.received_notes().iter() {
        if note.account_id() != account_id_typed {
            continue;
        }

        let txid = note.txid();
        let entry = tx_map.entry(txid).or_default();

        // Add received value
        entry.received_value += note.note().value().into_u64();

        // Determine pool from note type
        let pool = match note.note() {
            zcash_client_backend::wallet::Note::Sapling(_) => "sapling",
            zcash_client_backend::wallet::Note::Orchard(_) => "orchard",
        };
        entry.pools.insert(pool.to_string());

        // Extract memo text
        if let zcash_protocol::memo::Memo::Text(text) = note.memo() {
            let memo_str = text.to_string();
            if !memo_str.is_empty() && !entry.memos.contains(&memo_str) {
                entry.memos.push(memo_str);
            }
        }

        // Get transaction status from tx_table
        if let Some(tx_entry) = db.tx_table().get(&txid) {
            entry.status = Some(tx_entry.status());
            entry.block_height = tx_entry.mined_height();
            entry.expiry_height = tx_entry.expiry_height();
        }
    }

    // Process sent notes for this account
    for (sent_note_id, sent_note) in db.sent_notes().iter() {
        if sent_note.from_account_id() != account_id_typed {
            continue;
        }

        let txid = *sent_note_id.txid();
        let entry = tx_map.entry(txid).or_default();

        // Add sent value
        entry.sent_value += sent_note.value().into_u64();

        // Determine pool from recipient
        let pool = match sent_note.to() {
            zcash_client_backend::wallet::Recipient::External { output_pool, .. } => {
                match output_pool {
                    zcash_protocol::PoolType::Transparent => "transparent",
                    zcash_protocol::PoolType::Shielded(
                        zcash_protocol::ShieldedProtocol::Sapling,
                    ) => "sapling",
                    zcash_protocol::PoolType::Shielded(
                        zcash_protocol::ShieldedProtocol::Orchard,
                    ) => "orchard",
                }
            }
            zcash_client_backend::wallet::Recipient::EphemeralTransparent { .. } => "transparent",
            zcash_client_backend::wallet::Recipient::InternalAccount { note, .. } => {
                match note.as_ref() {
                    zcash_client_backend::wallet::Note::Sapling(_) => "sapling",
                    zcash_client_backend::wallet::Note::Orchard(_) => "orchard",
                }
            }
        };
        entry.pools.insert(pool.to_string());

        // Extract memo from sent note
        if let zcash_protocol::memo::Memo::Text(text) = sent_note.memo() {
            let memo_str = text.to_string();
            if !memo_str.is_empty() && !entry.memos.contains(&memo_str) {
                entry.memos.push(memo_str);
            }
        }

        // Get transaction status from tx_table if not already set
        if entry.status.is_none() {
            if let Some(tx_entry) = db.tx_table().get(&txid) {
                entry.status = Some(tx_entry.status());
                entry.block_height = tx_entry.mined_height();
                entry.expiry_height = tx_entry.expiry_height();
            }
        }
    }

    // Convert accumulated data to transaction entries
    let mut transactions: Vec<TransactionHistoryEntry> = tx_map
        .into_iter()
        .map(|(txid, acc)| {
            let net_value = acc.received_value as i64 - acc.sent_value as i64;

            // Determine transaction type
            let tx_type = if net_value > 0 {
                TransactionType::Received
            } else if net_value < 0 {
                TransactionType::Sent
            } else if acc.received_value > 0 && acc.sent_value > 0 {
                // Net zero but both received and sent - internal transfer
                TransactionType::Shielded
            } else {
                // Default to received if we can't determine
                TransactionType::Received
            };

            // Determine pool type
            let pool = if acc.pools.len() > 1 {
                "mixed".to_string()
            } else {
                acc.pools.into_iter().next().unwrap_or_else(|| "unknown".to_string())
            };

            // Calculate confirmations
            let block_height_u32 = acc.block_height.map(|h| u32::from(h));
            let confirmations = match (block_height_u32, chain_tip_height) {
                (Some(tx_height), Some(tip_height)) if tip_height >= tx_height => {
                    tip_height - tx_height + 1
                }
                _ => 0,
            };

            // Determine status
            let status = match acc.status {
                Some(TransactionStatus::Mined(_)) => TransactionStatusType::Confirmed,
                Some(TransactionStatus::NotInMainChain) => {
                    // Check if expired
                    if let (Some(expiry), Some(tip)) = (acc.expiry_height, chain_tip_height) {
                        if u32::from(expiry) <= tip {
                            TransactionStatusType::Expired
                        } else {
                            TransactionStatusType::Pending
                        }
                    } else {
                        TransactionStatusType::Pending
                    }
                }
                _ => TransactionStatusType::Pending,
            };

            // Combine memos
            let memo = if acc.memos.is_empty() {
                None
            } else {
                Some(acc.memos.join("\n"))
            };

            // Get actual timestamp from block data (not estimated)
            let timestamp = acc.block_height
                .and_then(|height| db.get_block_time(height))
                .map(|t| t as u64);

            TransactionHistoryEntry {
                txid: hex::encode(txid.as_ref()),
                tx_type,
                value: match tx_type {
                    TransactionType::Shielded => acc.received_value as i64,
                    _ => net_value,
                },
                fee: acc.fee,
                block_height: block_height_u32,
                confirmations,
                status,
                memo,
                timestamp,
                pool,
            }
        })
        .collect();

    // Sort by block height descending (newest first), with pending at the top
    transactions.sort_by(|a, b| {
        match (a.block_height, b.block_height) {
            (None, None) => std::cmp::Ordering::Equal,
            (None, Some(_)) => std::cmp::Ordering::Less, // Pending first
            (Some(_), None) => std::cmp::Ordering::Greater,
            (Some(a_height), Some(b_height)) => b_height.cmp(&a_height), // Descending
        }
    });

    let total_count = transactions.len() as u32;

    // Apply pagination
    let offset_usize = offset as usize;
    let limit_usize = limit as usize;

    let paginated: Vec<TransactionHistoryEntry> = transactions
        .into_iter()
        .skip(offset_usize)
        .take(limit_usize)
        .collect();

    let has_more = (offset_usize + paginated.len()) < total_count as usize;

    Ok(TransactionHistoryResponse {
        transactions: paginated,
        total_count,
        has_more,
    })
}
