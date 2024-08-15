// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! Wrappers around librustzcash types.
//! Provides a js-friendly interface to inspect a proposal. This can be used to display the details of a transaction proposal to the user
//! before they decide to sign, prove, and broadcast it.

use wasm_bindgen::prelude::*;

use crate::bindgen::transaction_request::TransactionRequest;

use zcash_client_backend::proposal::{self, Proposal};
use zcash_client_backend::wallet::NoteId;
use zcash_primitives::transaction::fees::zip317;

#[wasm_bindgen]
pub struct Step(pub(crate) proposal::Step<NoteId>);

#[wasm_bindgen]
impl Step {
    #[wasm_bindgen(getter)]
    /// Returns the transaction request that describes the payments to be made.
    pub fn transaction_request(&self) -> TransactionRequest {
        TransactionRequest(self.0.transaction_request().clone())
    }

    #[wasm_bindgen(getter)]
    /// sum of the proposed change outputs and the required fee
    pub fn balance_total(&self) -> u64 {
        self.0.balance().total().into_u64()
    }

    #[wasm_bindgen(getter)]
    /// Returns the fee computed for the transaction, assuming that the suggested
    /// change outputs are added to the transaction.
    pub fn total_fee(&self) -> u64 {
        self.0.balance().fee_required().into_u64()
    }

    #[wasm_bindgen(getter)]
    /// Returns a flag indicating whether or not the proposed transaction
    /// is exclusively wallet-internal (if it does not involve any external
    /// recipients).
    pub fn is_shielding(&self) -> bool {
        self.0.is_shielding()
    }

    // TODO: Add methods to inspect the notes that are being spent
}

#[wasm_bindgen]
/// A proposal is a request to spend funds from an account
/// It is created by a wallet in response to a transaction request
pub struct TransactionProposal(pub(crate) Proposal<zip317::FeeRule, NoteId>);

#[wasm_bindgen]
impl TransactionProposal {
    #[wasm_bindgen(getter)]
    /// The total amount of zatoshis to be spent
    pub fn steps(&self) -> Vec<Step> {
        self.0
            .steps()
            .into_iter()
            .map(|s| Step(s.clone()))
            .collect()
    }
}
