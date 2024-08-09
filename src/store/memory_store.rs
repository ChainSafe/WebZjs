// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use crate::store::WalletStore;
use crate::error::Error;

/// A simple in-memory store for wallet data. Useful for testing
pub struct MemoryStore {
    inner: std::collections::HashMap<String, Vec<u8>>,
}

impl WalletStore for MemoryStore {
    async fn update(&mut self, key: &str, value: &[u8]) -> Result<(), Error> {
        self.inner.insert(key.to_string(), value.to_vec());
        Ok(())
    }

    async fn get(&self, key: &str) -> Result<Vec<u8>, Error> {
        Ok(self.inner.get(key).unwrap().to_vec())
    }

    async fn clear(&mut self, key: &str) -> Result<(), Error> {
        self.inner.remove(key);
        Ok(())
    }
}
