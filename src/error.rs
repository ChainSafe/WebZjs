// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

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

    #[cfg(feature = "sqlite-db")]
    #[error("Sqlite error: {0}")]
    SqliteError(#[from] zcash_client_sqlite::error::SqliteClientError),
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
