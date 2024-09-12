// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! This is the top level documentation!

pub mod bindgen;
pub mod error;
pub mod init;

pub use bindgen::wallet::WebWallet;

pub mod wallet;
pub use wallet::Wallet;

use wasm_bindgen::prelude::*;

#[cfg(all(feature = "wasm-parallel"))]
pub use wasm_bindgen_rayon::init_thread_pool;

#[wasm_bindgen]
pub struct BlockRange(pub u32, pub u32);
