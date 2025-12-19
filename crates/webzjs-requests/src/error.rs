use wasm_bindgen::JsValue;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Error parsing zatoshi amount: {0}")]
    InvalidAmount(#[from] zcash_protocol::value::BalanceError),
    #[error("Attempted to create a transaction with a memo to an unsupported recipient. Only shielded addresses are supported.")]
    UnsupportedMemoRecipient,
    #[error("Error constructing ZIP321 transaction request: {0}")]
    Zip321(#[from] zip321::Zip321Error),
    #[error("Error decoding memo: {0}")]
    MemoDecoding(#[from] zcash_protocol::memo::Error),
    #[error("Error attempting to decode address: {0}")]
    AddressDecoding(#[from] zcash_address::ParseError),
    #[error("serde wasm-bindgen error")]
    SerdeWasmBindgen(#[from] serde_wasm_bindgen::Error),
}

impl From<Error> for JsValue {
    fn from(e: Error) -> Self {
        js_sys::Error::new(&e.to_string()).into()
    }
}
