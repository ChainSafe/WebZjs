// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use crate::store::WalletStore;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const IWALLET_STORAGE: &'static str = r#"
/**
 * Interface over a string indexed key-value store for byte payloads
 */
interface IWalletStore {
    /**
     * Update the value for a given key in store (or set it for the first time)
     */
    update(key: string, value: Uint8Array): void;
    /**
     * Get the value at a given key
     */
    get(key: string): Uint8Array;
    /**
     * Clear the value at a given key
     */
    clear(key: string): void;
}
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "IWalletStore")]
    /// This is a store implementation injected by the host js environment
    /// This allows for writing thin wrappers in javascript to use BrowserStorage, Local Storage,
    /// or Snap Storage to store data for the wallet
    pub type InjectedStore;

    #[wasm_bindgen(method)]
    pub fn update(this: &InjectedStore, index: &str, value: &[u8]);

    #[wasm_bindgen(method)]
    pub fn get(this: &InjectedStore, index: &str) -> Vec<u8>;

    #[wasm_bindgen(method)]
    pub fn clear(this: &InjectedStore, index: &str);
}

impl WalletStore for InjectedStore {
    fn update(&mut self, key: &str, value: &[u8]) {
        InjectedStore::update(self, key, value);
    }

    fn get(&self, key: &str) -> Vec<u8> {
        InjectedStore::get(self, key)
    }

    fn clear(&mut self, key: &str) {
        InjectedStore::clear(self, key);
    }
}
