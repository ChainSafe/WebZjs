// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use std::fmt::Display;
use wasm_bindgen::JsValue;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("webzjs-common crate gives error: {0}")]
    WebzJSCommon(#[from] webzjs_common::Error),
    #[error("Invalid account id")]
    AccountIdConversion(#[from] zip32::TryFromIntError),
    #[error("Failed to derive key from seed")]
    // doesn't implement std::error. Should probably fix this upstream
    Derivation(#[from] zcash_keys::keys::DerivationError),
    // #[error("Failed to derive key from seed")] // doesn't implement std::error. Should probably fix this upstream
    // Decoding(#[from] zcash_keys::keys::DecodingError),
    #[error("Javascript error")]
    Js(JsValue),
    #[error("DomException {name} ({code}): {message}")]
    DomException {
        name: String,
        message: String,
        code: u16,
    },
    #[error("Address generation error")]
    AddressGeneration(#[from] zcash_keys::keys::AddressGenerationError),
    #[error("Error attempting to decode address: {0}")]
    AddressDecoding(#[from] zcash_address::ParseError),
    #[error("Error attempting to decode key: {0}")]
    KeyDecoding(String),
    #[error("Invalid network string given: {0}")]
    InvalidNetwork(String),
    #[error("Error returned from GRPC server: {0}")]
    Grpc(#[from] tonic::Status),
    #[error("Error handling wallet birthday")]
    Birthday,
    #[error("Memory client error: {0}")]
    MemoryClient(#[from] zcash_client_memory::Error),
    #[error("Error scanning: {0}")]
    Scan(zcash_client_backend::scanning::ScanError),
    #[error("IO Error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Error parsing min_confirmations. Must be an integer > 0 (e.g. at least 1)")]
    InvalidMinConformations,
    #[error("Error parsing zatoshi amount: {0}")]
    InvalidAmount(#[from] zcash_protocol::value::BalanceError),
    #[error("Failed to send transaction (code {code}): {reason}")]
    SendFailed { code: i32, reason: String },
    #[error("Failed to parse key: {0}")]
    KeyParse(String),

    // TODO: The error type from librustzcash backend is generic. Handle that later.
    // Perhaps we make our error struct generic as well
    // See: zcash_client_backend::sync::Error
    #[error("Syncing Error: {0}")]
    Sync(String),

    #[error("Attempted to create a transaction with a memo to an unsupported recipient. Only shielded addresses are supported.")]
    UnsupportedMemoRecipient,
    #[error("Error decoding memo: {0}")]
    MemoDecoding(#[from] zcash_protocol::memo::Error),

    #[cfg(feature = "sqlite-db")]
    #[error("Sqlite error: {0}")]
    Sqlite(#[from] zcash_client_sqlite::error::SqliteClientError),
    #[error("Invalid seed phrase")]
    InvalidSeedPhrase,
    #[error("Failed when creating transaction")]
    FailedToCreateTransaction,
    #[error("Failed to serialize db using postcard: {0}")]
    FailedSerialization(#[from] postcard::Error),
    #[error("Account with given id not found: {0}")]
    AccountNotFound(u32),
    #[error("Transaction with given txid not found: {0}")]
    TransactionNotFound(zcash_primitives::transaction::TxId),
    #[error("Error constructing ZIP321 transaction request: {0}")]
    Zip321(#[from] zcash_client_backend::zip321::Zip321Error),
    #[error("serde wasm-bindgen error")]
    SerdeWasmBindgen(#[from] serde_wasm_bindgen::Error),
    #[error("Fail to parse TxIds")]
    TxIdParse,
    #[error("Failed to create Pczt")]
    PcztCreate,
    #[error("Failed to prove Pczt: {0}")]
    PcztProve(String),
    #[error("Failed to send Pczt: {0}")]
    PcztSend(String),
    #[error("Failed to combine Pczt: {0}")]
    PcztCombine(String),
    // TODO: Remove this. It is just to help with the inability to handle the generic tests from LRZ at the moment
    #[error("An generic error occurred: {0}")]
    Generic(String),
}

impl From<Error> for JsValue {
    fn from(e: Error) -> Self {
        js_sys::Error::new(&e.to_string()).into()
    }
}

impl From<JsValue> for Error {
    fn from(e: JsValue) -> Self {
        Error::Js(e)
    }
}

impl From<indexed_db_futures::web_sys::DomException> for Error {
    fn from(e: indexed_db_futures::web_sys::DomException) -> Self {
        Self::DomException {
            name: e.name(),
            message: e.message(),
            code: e.code(),
        }
    }
}

impl From<zcash_client_backend::scanning::ScanError> for Error {
    fn from(e: zcash_client_backend::scanning::ScanError) -> Self {
        Self::Scan(e)
    }
}

impl<A, B, C> From<zcash_client_backend::sync::Error<A, B, C>> for Error
where
    A: Display,
    B: Display,
    C: Display,
{
    fn from(e: zcash_client_backend::sync::Error<A, B, C>) -> Self {
        Self::Sync(e.to_string())
    }
}
