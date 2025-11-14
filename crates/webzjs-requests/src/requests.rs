// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use crate::error::Error;
use wasm_bindgen::prelude::*;
use zcash_address::ZcashAddress;
use zcash_protocol::memo::MemoBytes;

/// A [ZIP-321](https://zips.z.cash/zip-0321) transaction request
///
/// These can be created from a "zcash:" URI string, or constructed from an array of payment requests and encoded as a uri string
#[wasm_bindgen]
pub struct TransactionRequest(zip321::TransactionRequest);

#[wasm_bindgen]
impl TransactionRequest {
    /// Construct a new transaction request from a list of payment requests
    #[wasm_bindgen(constructor)]
    pub fn new(payments: Vec<PaymentRequest>) -> Result<TransactionRequest, Error> {
        let payments = payments.into_iter().map(|p| p.0).collect();
        Ok(TransactionRequest(zip321::TransactionRequest::new(
            payments,
        )?))
    }

    /// Construct an empty transaction request
    pub fn empty() -> TransactionRequest {
        TransactionRequest(zip321::TransactionRequest::empty())
    }

    /// Returns the list of payment requests that are part of this transaction request.
    pub fn payment_requests(&self) -> Vec<PaymentRequest> {
        // BTreeMap automatically stores keys in sorted order so we can do this
        self.0
            .payments()
            .iter()
            .map(|(_index, p)| PaymentRequest(p.clone()))
            .collect()
    }

    /// Returns the total value of the payments in this transaction request, in zatoshis.
    pub fn total(&self) -> Result<u64, Error> {
        Ok(self.0.total()?.into())
    }

    /// Decode a transaction request from a "zcash:" URI string.
    ///
    /// ## Example
    ///
    /// ```javascript
    /// let uri = "zcash:u1mcxxpa0wyyd3qpkl8rftsa6n7tkh9lv8u8j3zpd9f6qz37dqwur38w6tfl5rpv7m8g8mlca7nyn7qxr5qtjemjqehcttwpupz3fk76q8ft82yh4scnyxrxf2jgywgr5f9ttzh8ah8ljpmr8jzzypm2gdkcfxyh4ad93c889qv3l4pa748945c372ku7kdglu388zsjvrg9dskr0v9zj?amount=1&memo=VGhpcyBpcyBhIHNpbXBsZSBtZW1vLg&message=Thank%20you%20for%20your%20purchase"
    /// let request = TransactionRequest.from_uri(uri);
    /// request.total() == 1; // true
    /// request.payment_requests().length == 1; // true
    /// request.payment_requests()[0].recipient_address() == "u1mcxxpa0wyyd3qpk..."; // true
    /// ```
    ///
    pub fn from_uri(uri: &str) -> Result<TransactionRequest, Error> {
        Ok(zip321::TransactionRequest::from_uri(uri).map(TransactionRequest)?)
    }

    /// Returns the URI representation of this transaction request.
    pub fn to_uri(&self) -> String {
        self.0.to_uri()
    }
}

/// A ZIP-321 transaction request
#[wasm_bindgen]
pub struct PaymentRequest(zip321::Payment);

#[wasm_bindgen]
impl PaymentRequest {
    /// Construct a new payment request
    #[wasm_bindgen(constructor)]
    pub fn new(
        recipient_address: &str,
        amount: u64,
        memo: Option<Vec<u8>>,
        label: Option<String>,
        message: Option<String>,
        other_params: JsValue,
    ) -> Result<PaymentRequest, Error> {
        let address = ZcashAddress::try_from_encoded(recipient_address)?;
        let amount = amount.try_into()?;
        let memo = if let Some(memo_bytes) = memo {
            Some(MemoBytes::from_bytes(&memo_bytes)?)
        } else {
            None
        };
        let other_params = serde_wasm_bindgen::from_value(other_params)?;

        if let Some(payment) =
            zip321::Payment::new(address, amount, memo, label, message, other_params)
        {
            Ok(PaymentRequest(payment))
        } else {
            Err(Error::UnsupportedMemoRecipient)
        }
    }

    /// Helper method to construct a simple payment request with no memo, label, message, or other parameters.
    pub fn simple_payment(recipient_address: &str, amount: u64) -> Result<PaymentRequest, Error> {
        let address = ZcashAddress::try_from_encoded(recipient_address)?;
        let amount = amount.try_into()?;
        Ok(PaymentRequest(zip321::Payment::without_memo(
            address, amount,
        )))
    }

    /// Returns the payment address to which the payment should be sent.
    pub fn recipient_address(&self) -> String {
        self.0.recipient_address().encode()
    }

    /// Returns the value of the payment that is being requested, in zatoshis.
    pub fn amount(&self) -> u64 {
        self.0.amount().into()
    }

    /// Returns the memo that, if included, must be provided with the payment.
    pub fn memo(&self) -> Option<Vec<u8>> {
        self.0.memo().map(|m| m.as_array().to_vec())
    }

    /// A human-readable label for this payment within the larger structure
    /// of the transaction request.
    ///
    /// This will not be part of any generated transactions and is just for display purposes.
    pub fn label(&self) -> Option<String> {
        self.0.label().cloned()
    }

    /// A human-readable message to be displayed to the user describing the
    /// purpose of this payment.
    ///
    /// This will not be part of any generated transactions and is just for display purposes.
    pub fn message(&self) -> Option<String> {
        self.0.message().cloned()
    }

    /// A list of other arbitrary key/value pairs associated with this payment.
    ///
    /// This will not be part of any generated transactions. How these are used is up to the wallet
    pub fn other_params(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.0.other_params()).unwrap()
    }
}
