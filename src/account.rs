// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use wasm_bindgen::prelude::*;
use zcash_keys::keys::{Era, UnifiedSpendingKey};
use zcash_primitives::consensus::MAIN_NETWORK;
use zcash_primitives::zip32::AccountId;

use crate::error::Error;

#[wasm_bindgen]
pub struct Account {
    usk: UnifiedSpendingKey,
}

#[wasm_bindgen]
impl Account {
    #[wasm_bindgen]
    /// Derive a Zcash unified account from a seed and index for a given network configuration.
    /// This will throw an error if the seed does not have at least 32 bits or if the account index is invalid
    pub fn from_seed(seed: &[u8], account_index: u32) -> Result<Account, Error> {
        Ok(Account {
            usk: UnifiedSpendingKey::from_seed(
                &MAIN_NETWORK,
                seed,
                AccountId::try_from(account_index)?,
            )
            .unwrap(),
        })
    }

    #[wasm_bindgen]
    pub fn to_bytes(&self) -> Vec<u8> {
        self.usk.to_bytes(Era::Orchard)
    }

    #[wasm_bindgen]
    pub fn from_bytes(encoded: &[u8]) -> Result<Account, Error> {
        Ok(Account {
            usk: UnifiedSpendingKey::from_bytes(Era::Orchard, encoded).unwrap(),
        })
    }
}
