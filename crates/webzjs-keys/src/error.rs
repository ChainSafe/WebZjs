use wasm_bindgen::JsValue;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("webzjs-common crate gives error: {0}")]
    WebzJSCommon(#[from] webzjs_common::Error),
    #[error("Invalid account id")]
    AccountIdConversion(#[from] zip32::TryFromIntError),
    #[error("Failed to derive key from seed")]
    Derivation(#[from] zcash_keys::keys::DerivationError),
    #[error("Error attempting to decode key: {0}")]
    KeyDecoding(String),
    #[error("Failed to sign Pczt: {0}")]
    PcztSign(String),
    #[error("Error attempting to get seed fingerprint.")]
    SeedFingerprint,
}

impl From<Error> for JsValue {
    fn from(e: Error) -> Self {
        js_sys::Error::new(&e.to_string()).into()
    }
}
