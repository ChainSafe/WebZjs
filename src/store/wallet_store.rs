// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use crate::error::Error;

pub trait WalletStore {
    async fn update(&mut self, key: &str, value: &[u8]) -> Result<(), Error>;
    async fn get(&self, key: &str) -> Result<Option<Vec<u8>>, Error>;
    async fn clear(&mut self, key: &str) -> Result<(), Error>;
}
