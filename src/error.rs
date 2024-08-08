// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use wasm_bindgen::JsValue;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Invalid account id")]
    AccountIdConversion(#[from] zcash_primitives::zip32::TryFromIntError),
    // #[error("Failed to derive key from seed")] // doesn't implement std::error. Should probably fix this upstream
    // DerivationError(#[from] zcash_keys::keys::DerivationError),
    // #[error("Failed to derive key from seed")] // doesn't implement std::error. Should probably fix this upstream
    // DecodingError(#[from] zcash_keys::keys::DecodingError),
}

impl From<Error> for JsValue {
    fn from(e: Error) -> Self {
        js_sys::Error::new(&e.to_string()).into()
    }
}
