// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

pub trait WalletStore {
    fn update(&mut self, key: &str, value: &[u8]);
    fn get(&self, key: &str) -> Vec<u8>;
    fn clear(&mut self, key: &str);
}
