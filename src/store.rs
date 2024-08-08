// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const IWALLET_STORAGE: &'static str = r#"
/**
 * Interface to persistently store data required for a wallet
 */
interface IWalletStore {
    /**
     * Retrieve an account by its index
     */
    getAccount(number): string;
    /**
     * Store an account at a given index
     */
    setAccount(number, string): void;
}
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "IWalletStore")]
    pub type IWalletStore;
}
