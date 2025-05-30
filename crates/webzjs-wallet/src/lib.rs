// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! This is the top level documentation!

#[cfg(feature = "wasm")]
pub mod bindgen;

mod error;
pub mod init;

pub mod wallet;
pub use wallet::Wallet;

use wasm_bindgen::prelude::*;

/// The maximum number of checkpoints to store in each shard-tree
pub const PRUNING_DEPTH: usize = 100;

#[cfg(feature = "wasm-parallel")]
pub use wasm_bindgen_rayon::init_thread_pool;
// dummy NO-OP init_thread pool to maintain the same API between features
#[cfg(not(feature = "wasm-parallel"))]
#[wasm_bindgen(js_name = initThreadPool)]
pub fn init_thread_pool(_threads: usize) {}

#[wasm_bindgen]
pub struct BlockRange(pub u32, pub u32);
