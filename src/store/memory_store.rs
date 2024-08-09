// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use crate::store::WalletStore;

/// A simple in-memory store for wallet data. Useful for testing
pub struct MemoryStore {
    inner: std::collections::HashMap<String, Vec<u8>>,
}

impl WalletStore for MemoryStore {
    fn update(&mut self, key: &str, value: &[u8]) {
        self.inner.insert(key.to_string(), value.to_vec());
    }

    fn get(&self, key: &str) -> Vec<u8> {
        self.inner.get(key).unwrap().to_vec()
    }

    fn clear(&mut self, key: &str) {
        self.inner.remove(key);
    }
}
