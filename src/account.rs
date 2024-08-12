// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use wasm_bindgen::prelude::*;
use zcash_keys::keys::{Era, UnifiedAddressRequest, UnifiedSpendingKey};
use zcash_primitives::consensus::MAIN_NETWORK;
use zcash_primitives::zip32::{AccountId, DiversifierIndex};

use crate::error::Error;

pub type AccountIndex = u32;

#[wasm_bindgen]
pub struct Account {
    #[wasm_bindgen(skip)]
    pub usk: UnifiedSpendingKey,
}

#[wasm_bindgen]
impl Account {
    #[wasm_bindgen]
    /// Derive a Zcash unified account from a seed and index for a given network configuration.
    /// This will throw an error if the seed does not have at least 32 bits or if the account index is invalid
    pub fn from_seed(seed: &[u8], account_index: AccountIndex) -> Result<Account, Error> {
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

    #[wasm_bindgen]
    /// Return the string encoded address for this account. This returns a unified address with all address subtypes (orchard, sapling, p2pkh)
    /// The diversifier index can be used to derive different valid addresses for the same account
    pub fn unified_address(&self, diversifier_index: u64) -> Result<String, Error> {
        Ok(self
            .usk
            .to_unified_full_viewing_key()
            .address(
                DiversifierIndex::from(diversifier_index),
                UnifiedAddressRequest::all().unwrap(),
            )?
            .encode(&MAIN_NETWORK))
    }

    #[wasm_bindgen]
    /// Return the string encoded address for this accounts transparent address
    /// The diversifier index can be used to derive different valid addresses for the same account
    pub fn transparent_address(&self, diversifier_index: u64) -> Result<String, Error> {
        Ok(self
            .usk
            .to_unified_full_viewing_key()
            .address(
                DiversifierIndex::from(diversifier_index),
                UnifiedAddressRequest::new(false, false, true).unwrap(),
            )?
            .encode(&MAIN_NETWORK))
    }
 }
