// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use wasm_bindgen::prelude::*;

use crate::account::{Account, AccountIndex};
use crate::error::Error;
use crate::store::{InjectedStore, WalletStore};
use crate::transaction_proposal::TransactionProposal;
use crate::transaction_request::TransactionRequest;

/// A wallet is a collection of a number of accounts that can be synchronized together.
struct Wallet<S: WalletStore> {
    store: S,
}

impl<S: WalletStore> Wallet<S> {
    pub fn new(store: S) -> Self {
        Wallet { store }
    }

    pub fn add(&self, _account: Account) {}

    pub async fn get(&self, _index: AccountIndex) -> Result<Account, Error> {
        Account::from_bytes(&self.store.get("yer").await?.unwrap())
    }

    /// Given a request, create a proposal of how funds can be spent from the given account to realize it
    pub fn propose_transfer(
        &self,
        _spend_from_account: AccountIndex,
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

#[wasm_bindgen(js_name = Wallet)]
/// A wallet is a collection of a number of accounts that can be synchronized together.
struct WalletInjectedStore(Wallet<InjectedStore>);

#[wasm_bindgen(js_class = Wallet)]
impl WalletInjectedStore {
    #[wasm_bindgen(constructor)]
    pub fn new(store: InjectedStore) -> Self {
        WalletInjectedStore(Wallet::new(store))
    }

    pub fn add(&self, account: Account) {
        self.0.add(account)
    }

    pub async fn get(&self, index: AccountIndex) -> Result<Account, Error> {
        self.0.get(index).await
    }

    /// Given a request, create a proposal of how funds can be spent from the given account to realize it
    pub fn propose_transfer(
        &self,
        spend_from_account: AccountIndex,
        request: TransactionRequest,
    ) -> TransactionProposal {
        self.0.propose_transfer(spend_from_account, request)
    }

    /// Given a proposal, build, sign, and prove the transaction, then store it in the wallet transaction store
    /// Returns the transaction id
    pub fn create_proposed_transaction(&self, proposal: TransactionProposal) -> Vec<JsValue> {
        self.0.create_proposed_transaction(proposal)
    }
}
