// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! This is the top level documentation!

pub mod bindgen;
pub mod error;
pub mod init;

pub use bindgen::wallet::Wallet;
use serde::{Deserialize, Serialize};
use zcash_primitives::consensus::{
    BlockHeight, NetworkType, NetworkUpgrade, Parameters, MAIN_NETWORK, TEST_NETWORK,
};

/// The enumeration of known Zcash networks.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
pub enum Network {
    /// Zcash Mainnet.
    MainNetwork,
    /// Zcash Testnet.
    #[default]
    TestNetwork,
}

impl Parameters for Network {
    fn network_type(&self) -> NetworkType {
        match self {
            Network::MainNetwork => NetworkType::Main,
            Network::TestNetwork => NetworkType::Test,
        }
    }

    fn activation_height(&self, nu: NetworkUpgrade) -> Option<BlockHeight> {
        match self {
            Network::MainNetwork => MAIN_NETWORK.activation_height(nu),
            Network::TestNetwork => TEST_NETWORK.activation_height(nu),
        }
    }
}
