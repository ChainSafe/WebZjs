// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! This is the top level documentation!

pub mod bindgen;
pub mod error;
pub mod init;

pub use bindgen::wallet::Wallet;

pub mod wallet;
pub use wallet::Wallet as WalletInner;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct BlockRange(pub u32, pub u32);
