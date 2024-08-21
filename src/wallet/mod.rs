// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! Data types and traits that relate to a wallet,
//! which is a collection of accounts and historical transactions
//! These can be used to build new transactions.
//!
//! A wallet is defined without regard to how it is stored or synchronized.
//!

use wasm_bindgen::prelude::*;

use crate::account::{Account, AccountId};
use crate::bindgen::transaction_proposal::TransactionProposal;
use crate::bindgen::transaction_request::TransactionRequest;
use crate::error::Error;
use crate::store::WalletStore;

pub mod capability;
pub mod extended_transparent;
pub mod memory_transaction_store;
pub mod notes;
pub mod traits;
pub mod transaction_record;

/// A wallet is a collection of a number of accounts that can be synchronized together.
pub struct Wallet<S: WalletStore> {
    store: S,
}

impl<S: WalletStore> Wallet<S> {
    pub fn new(store: S) -> Self {
        Wallet { store }
    }

    pub fn add(&self, _account: Account) {}

    pub async fn get(&self, _index: AccountId) -> Result<Account, Error> {
        todo!();
    }

    /// Given a request, create a proposal of how funds can be spent from the given account to realize it
    pub fn propose_transfer(
        &self,
        _spend_from_account: AccountId,
        _request: TransactionRequest,
    ) -> TransactionProposal {
        todo!();
    }

    /// Given a proposal, build, sign, and prove the transaction, then store it in the wallet transaction store
    /// Returns the transaction id
    pub fn create_proposed_transaction(&self, _proposal: TransactionProposal) -> Vec<JsValue> {
        todo!();
    }
}
