// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use crate::error::Error;
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
    update(key: string, value: Uint8Array): Promise<void>;
    /**
     * Get the value at a given key
     */
    get(key: string): Promise<Uint8Array>;
    /**
     * Clear the value at a given key
     */
    clear(key: string): Promise<void>;
}
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "IWalletStore")]
    /// This is a store implementation injected by the host js environment
    /// This allows for writing thin wrappers in javascript to use BrowserStorage, Local Storage,
    /// or Snap Storage to store data for the wallet
    pub type InjectedStore;

    #[wasm_bindgen(method, catch)]
    pub async fn update(this: &InjectedStore, index: &str, value: &[u8]) -> Result<(), JsValue>;

    #[wasm_bindgen(method, catch)]
    pub async fn get(this: &InjectedStore, index: &str) -> Result<JsValue, JsValue>;

    #[wasm_bindgen(method, catch)]
    pub async fn clear(this: &InjectedStore, index: &str) -> Result<(), JsValue>;
}

impl WalletStore for InjectedStore {
    async fn update(&mut self, key: &str, value: &[u8]) -> Result<(), Error> {
        InjectedStore::update(self, key, value).await?;
        Ok(())
    }

    async fn get(&self, key: &str) -> Result<Vec<u8>, Error> {
        let result = InjectedStore::get(self, key).await?;
        Ok(js_sys::Uint8Array::new(&result).to_vec())
    }

    async fn clear(&mut self, key: &str) -> Result<(), Error> {
        InjectedStore::clear(self, key).await?;
        Ok(())
    }
}
