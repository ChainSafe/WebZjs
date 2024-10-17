// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use std::fmt::Display;
use wasm_bindgen::JsValue;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Invalid account id")]
    AccountIdConversion(#[from] zcash_primitives::zip32::TryFromIntError),
    #[error("Failed to derive key from seed")]
    // doesn't implement std::error. Should probably fix this upstream
    DerivationError(#[from] zcash_keys::keys::DerivationError),
    // #[error("Failed to derive key from seed")] // doesn't implement std::error. Should probably fix this upstream
    // DecodingError(#[from] zcash_keys::keys::DecodingError),
    #[error("Javascript error")]
    JsError(JsValue),
    #[error("DomException {name} ({code}): {message}")]
    DomException {
        name: String,
        message: String,
        code: u16,
    },
    #[error("Address generation error")]
    AddressGenerationError(#[from] zcash_keys::keys::AddressGenerationError),
    #[error("Error attempting to decode address: {0}")]
    AddressDecodingError(#[from] zcash_address::ParseError),
    #[error("Error attempting to decode key: {0}")]
    KeyDecodingError(String),
    #[error("Invalid network string given: {0}")]
    InvalidNetwork(String),
    #[error("Error returned from GRPC server: {0}")]
    GrpcError(#[from] tonic::Status),
    #[error("Error handling wallet birthday")]
    BirthdayError,
    #[error("Memory client error: {0}")]
    MemoryClientError(#[from] zcash_client_memory::Error),
    #[error("Error scanning: {0}")]
    ScanError(zcash_client_backend::scanning::ScanError),
    #[error("IO Error: {0}")]
    IoError(#[from] std::io::Error),
    #[error(
        "Error parsing min_confirmations argument {0}. Must be an integer > 0 (e.g. at least 1)"
    )]
    InvalidMinConformations(u32),
    #[error("Error parsing zatoshi amount: {0}")]
    InvalidAmount(#[from] zcash_primitives::transaction::components::amount::BalanceError),
    #[error("Failed to send transaction")]
    SendFailed { code: i32, reason: String },
    #[error("Failed to parse key: {0}")]
    KeyParseError(String),

    // TODO: The error type from librustzcash backend is generic. Handle that later.
    // Perhaps we make our error struct generic as well
    // See: zcash_client_backend::sync::Error
    #[error("Syncing Error: {0}")]
    SyncError(String),

    #[cfg(feature = "sqlite-db")]
    #[error("Sqlite error: {0}")]
    SqliteError(#[from] zcash_client_sqlite::error::SqliteClientError),
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
    Zip321Error(#[from] zip321::Zip321Error),
    #[error("serde wasm-bindgen error")]
    SerdeWasmBindgenError(#[from] serde_wasm_bindgen::Error),
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
        Error::JsError(e)
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
        Self::ScanError(e)
    }
}

impl<A, B, C> From<zcash_client_backend::sync::Error<A, B, C>> for Error
where
    A: Display,
    B: Display,
    C: Display,
{
    fn from(e: zcash_client_backend::sync::Error<A, B, C>) -> Self {
        Self::SyncError(e.to_string())
    }
}
