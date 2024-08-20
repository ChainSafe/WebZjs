//! General library utilities such as parsing and conversions.

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ChainType {
    /// Public testnet
    Testnet,
    /// Local testnet
    Regtest(RegtestNetwork),
    /// Mainnet
    Mainnet,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct RegtestNetwork {
    activation_heights: ActivationHeights,
}

impl RegtestNetwork {
    pub fn new(
        overwinter_activation_height: u64,
        sapling_activation_height: u64,
        blossom_activation_height: u64,
        heartwood_activation_height: u64,
        canopy_activation_height: u64,
        orchard_activation_height: u64,
    ) -> Self {
        Self {
            activation_heights: ActivationHeights::new(
                overwinter_activation_height,
                sapling_activation_height,
                blossom_activation_height,
                heartwood_activation_height,
                canopy_activation_height,
                orchard_activation_height,
            ),
        }
    }

    pub fn all_upgrades_active() -> Self {
        Self {
            activation_heights: ActivationHeights::new(1, 1, 1, 1, 1, 1),
        }
    }
}

/// TODO: Add Doc Comment Here!
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ActivationHeights {
    overwinter: BlockHeight,
    sapling: BlockHeight,
    blossom: BlockHeight,
    heartwood: BlockHeight,
    canopy: BlockHeight,
    orchard: BlockHeight,
}

impl ActivationHeights {
    pub fn new(
        overwinter: u64,
        sapling: u64,
        blossom: u64,
        heartwood: u64,
        canopy: u64,
        orchard: u64,
    ) -> Self {
        Self {
            overwinter: BlockHeight::from_u32(overwinter as u32),
            sapling: BlockHeight::from_u32(sapling as u32),
            blossom: BlockHeight::from_u32(blossom as u32),
            heartwood: BlockHeight::from_u32(heartwood as u32),
            canopy: BlockHeight::from_u32(canopy as u32),
            orchard: BlockHeight::from_u32(orchard as u32),
        }
    }
}

macro_rules! build_method {
    ($name:ident, $localtype:ty) => {
        #[doc = "Set the $name field of the builder."]
        pub fn $name(&mut self, $name: $localtype) -> &mut Self {
            self.$name = Some($name);
            self
        }
    };
}
#[cfg(test)] // temporary test gate as no production builders use this macros yet
macro_rules! build_method_push {
    ($name:ident, $localtype:ty) => {
        #[doc = "Push a $ty to the builder."]
        pub fn $name(&mut self, $name: $localtype) -> &mut Self {
            self.$name.push($name);
            self
        }
    };
}
#[cfg(test)] // temporary test gate as no production builders use this macros yet
macro_rules! build_push_list {
    ($name:ident, $builder:ident, $struct:ident) => {
        for i in &$builder.$name {
            $struct.$name.push(i.build());
        }
    };
}

pub(crate) use build_method;
#[cfg(test)]
pub(crate) use build_method_push;
#[cfg(test)]
pub(crate) use build_push_list;

use zcash_protocol::consensus::BlockHeight;

pub mod conversions {
    //! Conversion specific utilities

    use thiserror::Error;

    use zcash_address::ZcashAddress;
    use zcash_client_backend::address::Address;
    use zcash_primitives::transaction::{components::amount::NonNegativeAmount, TxId};

    use super::ChainType;

    use super::error::ConversionError;

    #[allow(missing_docs)] // error types document themselves
    #[derive(Debug, Error)]
    pub enum TxIdFromHexEncodedStrError {
        #[error("{0}")]
        Decode(hex::FromHexError),
        #[error("{0:?}")]
        Code(Vec<u8>),
    }

    /// Converts txid from hex-encoded `&str` to `zcash_primitives::transaction::TxId`.
    ///
    /// TxId byte order is displayed in the reverse order to how it's encoded.
    pub fn txid_from_hex_encoded_str(txid: &str) -> Result<TxId, TxIdFromHexEncodedStrError> {
        let txid_bytes = hex::decode(txid).map_err(TxIdFromHexEncodedStrError::Decode)?;
        let mut txid_bytes =
            <[u8; 32]>::try_from(txid_bytes).map_err(TxIdFromHexEncodedStrError::Code)?;
        txid_bytes.reverse();
        Ok(TxId::from_bytes(txid_bytes))
    }

    /// Convert a &str to an Address
    pub fn address_from_str(
        address: &str,
        chain: &ChainType,
    ) -> Result<ZcashAddress, ConversionError> {
        ZcashAddress::try_from_encoded(address)
            .map_err(|_e| ConversionError::InvalidAddress(address.to_string()))
    }

    /// Convert a valid u64 into Zatoshis.
    pub fn zatoshis_from_u64(amount: u64) -> Result<NonNegativeAmount, ConversionError> {
        NonNegativeAmount::from_u64(amount).map_err(|_e| ConversionError::OutsideValidRange)
    }
}

pub mod error {
    //! Error sub-module for utils module.

    use std::fmt;

    /// The error type for conversion errors.
    #[derive(Debug, Clone, PartialEq)]
    pub enum ConversionError {
        /// Failed to decode hex
        DecodeHexFailed(hex::FromHexError),
        /// Invalid string length
        InvalidStringLength,
        /// Invalid recipient address
        InvalidAddress(String),
        /// Amount is outside the valid range of zatoshis
        OutsideValidRange,
    }

    impl std::error::Error for ConversionError {}

    impl fmt::Display for ConversionError {
        fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
            match self {
                ConversionError::DecodeHexFailed(e) => write!(f, "failed to decode hex. {}", e),
                ConversionError::InvalidStringLength => write!(f, "invalid string length"),
                ConversionError::InvalidAddress(address) => {
                    write!(f, "invalid recipient address. {}", address)
                }
                ConversionError::OutsideValidRange => {
                    write!(f, "amount is outside the valid range of zatoshis")
                }
            }
        }
    }
}
