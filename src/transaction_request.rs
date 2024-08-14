// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! Wrappers around librustzcash types.
//! Provides a js-friendly interface for creating and manipulating payments and transaction requests.

use js_sys::Reflect;
use wasm_bindgen::prelude::*;

use zcash_address::ZcashAddress;
use zcash_protocol::memo::MemoBytes;
use zcash_protocol::value::Zatoshis;

#[wasm_bindgen]
pub struct Payment(pub(crate) zip321::Payment);

#[wasm_bindgen(getter_with_clone)]
pub struct PaymentArgs {
    /// The recipient's address string formatted
    pub recipient_address: String,
    /// The amount to send as string formatted zatoshis
    pub amount: u64,
    /// Bytes representing the memo field. Must be <= 512 bytes
    pub memo: Option<Vec<u8>>,
    /// A label for the payment
    pub label: Option<String>,
    /// A message to include with the payment
    pub message: Option<String>,
    /// Other parameters to include with the payment
    pub other_params: JsValue,
}

#[wasm_bindgen]
impl Payment {
    #[wasm_bindgen(constructor)]
    /// Construct a new payment given the recipient's address and an amount in zatoshis
    /// Optionally also accepts a memo, label, and message
    pub fn new(args: PaymentArgs) -> Result<Payment, Error> {
        // convert the other params from a jsObject to a Vec<(String, String)>
        let other_params: Result<Vec<(String, String)>, Error> =
            Reflect::own_keys(&args.other_params)?
                .into_iter()
                .map(|key| -> Result<(String, String), Error> {
                    let value = Reflect::get(&args.other_params, &key)?;
                    Ok((
                        key.as_string().ok_or(Error::InvalidOtherParams)?,
                        value.as_string().ok_or(Error::InvalidOtherParams)?,
                    ))
                })
                .collect();

        let memo: Option<MemoBytes> =
            if let Some(memo) = args.memo.map(|m| MemoBytes::from_bytes(&m)) {
                Some(memo?)
            } else {
                None
            };

        Ok(Payment(
            zip321::Payment::new(
                ZcashAddress::try_from_encoded(&args.recipient_address)?,
                Zatoshis::from_u64(args.amount)?,
                memo,
                args.label,
                args.message,
                other_params?,
            )
            .ok_or(Error::InvalidReceiver)?,
        ))
    }
}

#[wasm_bindgen]
pub struct TransactionRequest(pub(crate) zip321::TransactionRequest);

#[wasm_bindgen]
impl TransactionRequest {
    #[wasm_bindgen(constructor)]
    /// Construct a new transaction request from an array of payments
    pub fn new(payments: Vec<Payment>) -> Result<TransactionRequest, Error> {
        Ok(TransactionRequest(zip321::TransactionRequest::new(
            payments.into_iter().map(|p| p.0).collect(),
        )?))
    }

    /// Encode transaction request as a URI using the ZIP321 standard
    pub fn from_uri(uri: &str) -> Result<TransactionRequest, Error> {
        Ok(TransactionRequest(zip321::TransactionRequest::from_uri(
            uri,
        )?))
    }

    /// Construct a transaction request from a ZIP321 encoded URI
    pub fn to_uri(&self) -> String {
        self.0.to_uri()
    }
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Javascript error")]
    JsError(JsValue),
    #[error("Address parsing error")]
    AddressParseError(#[from] zcash_address::ParseError),
    #[error("Zatoshis conversion error")]
    ZatoshisConversionError(#[from] zcash_protocol::value::BalanceError),
    #[error("Memo conversion error")]
    MemoConversionError(#[from] zcash_protocol::memo::Error),
    #[error("Payment requests that a memo be sent to a recipient that cannot receive a memo")]
    InvalidReceiver,
    #[error("other_params must be an object with only string keys and values")]
    InvalidOtherParams,
    #[error("Failed to parse URI")]
    FromUriErrror(#[from] zip321::Zip321Error),
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
