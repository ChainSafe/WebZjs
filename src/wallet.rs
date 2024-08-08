// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use crate::store::IWalletStore;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
/// A wallet is a collection of a number of accounts that can be synchronized together.
struct Wallet;

#[wasm_bindgen]
impl Wallet {
    pub fn new(_storage: IWalletStore) -> Self {
        Wallet
    }
}
