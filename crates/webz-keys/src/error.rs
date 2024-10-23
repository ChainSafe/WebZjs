use wasm_bindgen::JsValue;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("webz-common crate gives error: {0}")]
    WebzCommon(#[from] webz_common::Error),
    #[error("Invalid account id")]
    AccountIdConversion(#[from] zcash_primitives::zip32::TryFromIntError),
    #[error("Failed to derive key from seed")]
    Derivation(#[from] zcash_keys::keys::DerivationError),
    #[error("Error attempting to decode key: {0}")]
    KeyDecoding(String),
}

impl From<Error> for JsValue {
    fn from(e: Error) -> Self {
        js_sys::Error::new(&e.to_string()).into()
    }
}
