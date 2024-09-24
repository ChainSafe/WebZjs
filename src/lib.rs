// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! This is the top level documentation!

#[cfg(feature = "wasm-parallel")]
pub mod bindgen;
#[cfg(feature = "wasm-parallel")]
pub use bindgen::wallet::WebWallet;


pub mod error;
pub mod init;


pub mod wallet;
pub use wallet::Wallet;

use wasm_bindgen::prelude::*;
use zcash_client_memory::MemoryWalletDb;
use zcash_primitives::consensus;

/// The maximum number of checkpoints to store in each shard-tree
pub const PRUNING_DEPTH: usize = 100;

#[cfg(feature = "wasm-parallel")]
pub use wasm_bindgen_rayon::init_thread_pool;

#[wasm_bindgen]
pub struct BlockRange(pub u32, pub u32);

pub type MemoryWallet<T> = Wallet<MemoryWalletDb<consensus::Network>, T>;
