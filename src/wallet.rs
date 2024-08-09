// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use wasm_bindgen::prelude::*;

use crate::store::{InjectedStore, WalletStore};
use crate::error::Error;
use crate::account::{Account, AccountIndex};

/// A wallet is a collection of a number of accounts that can be synchronized together.
struct Wallet<S: WalletStore> {
    store: S,
}

impl<S: WalletStore> Wallet<S> {
    pub fn new(store: S) -> Self {
        Wallet {
            store
        }
    }

    pub fn add(&self, _account: Account) {
    }

    pub fn get(&self, _index: AccountIndex) -> Result<Account, Error> {
        Account::from_bytes(&self.store.get("yer"))
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

    pub fn get(&self, index: AccountIndex) -> Result<Account, Error> {
        self.0.get(index)
    }
}
