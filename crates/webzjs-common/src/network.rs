// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use crate::error::Error;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use zcash_protocol::consensus::{self, Parameters};

/// Enum representing the network type
/// This is used instead of the `consensus::Network` enum so we can derive
/// custom serialization and deserialization and from string impls
#[derive(Copy, Clone, Debug, Default, Serialize, Deserialize)]
pub enum Network {
    #[default]
    MainNetwork,
    TestNetwork,
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
    fn network_type(&self) -> zcash_protocol::consensus::NetworkType {
        match self {
            Network::MainNetwork => zcash_protocol::consensus::NetworkType::Main,
            Network::TestNetwork => zcash_protocol::consensus::NetworkType::Test,
        }
    }

    fn activation_height(&self, nu: consensus::NetworkUpgrade) -> Option<consensus::BlockHeight> {
        match self {
            Network::MainNetwork => {
                zcash_protocol::consensus::Network::MainNetwork.activation_height(nu)
            }
            Network::TestNetwork => {
                zcash_protocol::consensus::Network::TestNetwork.activation_height(nu)
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
