// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use crate::error::Error;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use zcash_primitives::consensus::{self, Parameters};

/// Enum representing the network type
/// This is used instead of the `consensus::Network` enum so we can derive
/// custom serialization and deserialization and from string impls
#[derive(Copy, Clone, Debug, Serialize, Deserialize)]
pub enum Network {
    MainNetwork,
    TestNetwork,
}

impl Default for Network {
    fn default() -> Self {
        Network::MainNetwork
    }
}

impl FromStr for Network {
    type Err = Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "main" => Ok(Network::MainNetwork),
            "test" => Ok(Network::TestNetwork),
            _ => Err(Error::InvalidNetwork(s.to_string())),
        }
    }
}

impl Parameters for Network {
    fn network_type(&self) -> zcash_address::Network {
        match self {
            Network::MainNetwork => zcash_address::Network::Main,
            Network::TestNetwork => zcash_address::Network::Test,
        }
    }

    fn activation_height(&self, nu: consensus::NetworkUpgrade) -> Option<consensus::BlockHeight> {
        match self {
            Network::MainNetwork => {
                zcash_primitives::consensus::Network::MainNetwork.activation_height(nu)
            }
            Network::TestNetwork => {
                zcash_primitives::consensus::Network::TestNetwork.activation_height(nu)
            }
        }
    }
}

impl From<Network> for consensus::Network {
    fn from(network: Network) -> Self {
        match network {
            Network::MainNetwork => consensus::Network::MainNetwork,
            Network::TestNetwork => consensus::Network::TestNetwork,
        }
    }
}
