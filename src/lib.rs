// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! This is the top level documentation!

pub mod bindgen;
pub mod error;
pub mod init;

use std::collections::HashMap;

pub use bindgen::wallet::Wallet;

pub mod wallet;
pub use wallet::Wallet as WalletInner;

use wasm_bindgen::prelude::*;

pub(crate) type Proposal = zcash_client_backend::proposal::Proposal<
    zcash_primitives::transaction::fees::zip317::FeeRule,
    zcash_client_backend::wallet::NoteId,
>;
#[wasm_bindgen]
pub struct BlockRange(pub u32, pub u32);
