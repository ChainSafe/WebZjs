// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! All things needed to create, manage, and use notes

pub mod interface;
pub use interface::OutputInterface;
pub use interface::ShieldedNoteInterface;
pub mod transparent;
pub use transparent::TransparentOutput;
pub mod sapling;
pub use sapling::SaplingNote;
pub mod orchard;
pub use orchard::OrchardNote;
pub mod nullifier;
pub mod query;
