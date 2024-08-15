// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! Traits used throughout the implementations in the wallet module

use crate::wallet::capability::WalletCapability;
use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use incrementalmerkletree::{Hashable, Level};
use orchard::tree::MerkleHashOrchard;
use std::io::{self, Read, Write};
use subtle::CtOption;

pub trait ToBytes<const N: usize> {
    fn to_bytes(&self) -> [u8; N];
}

impl ToBytes<32> for sapling_crypto::Nullifier {
    fn to_bytes(&self) -> [u8; 32] {
        self.0
    }
}

impl ToBytes<32> for orchard::note::Nullifier {
    fn to_bytes(&self) -> [u8; 32] {
        orchard::note::Nullifier::to_bytes(*self)
    }
}

impl ToBytes<11> for sapling_crypto::Diversifier {
    fn to_bytes(&self) -> [u8; 11] {
        self.0
    }
}

impl ToBytes<11> for orchard::keys::Diversifier {
    fn to_bytes(&self) -> [u8; 11] {
        *self.as_array()
    }
}

pub trait FromBytes<const N: usize> {
    fn from_bytes(bytes: [u8; N]) -> Self;
}

impl FromBytes<32> for sapling_crypto::Nullifier {
    fn from_bytes(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }
}

impl FromBytes<32> for orchard::note::Nullifier {
    fn from_bytes(bytes: [u8; 32]) -> Self {
        Option::from(orchard::note::Nullifier::from_bytes(&bytes))
            .unwrap_or_else(|| panic!("Invalid nullifier {:?}", bytes))
    }
}

impl FromBytes<11> for sapling_crypto::Diversifier {
    fn from_bytes(bytes: [u8; 11]) -> Self {
        sapling_crypto::Diversifier(bytes)
    }
}

impl FromBytes<11> for orchard::keys::Diversifier {
    fn from_bytes(bytes: [u8; 11]) -> Self {
        orchard::keys::Diversifier::from_bytes(bytes)
    }
}

pub trait ReadableWriteable<Input>: Sized {
    const VERSION: u8;

    fn read<R: Read>(reader: R, input: Input) -> io::Result<Self>;

    fn write<W: Write>(&self, writer: W) -> io::Result<()>;

    fn get_version<R: Read>(mut reader: R) -> io::Result<u8> {
        let external_version = reader.read_u8()?;
        if external_version > Self::VERSION {
            Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!(
                    "Wallet file version \"{}\" is from future version of zingo",
                    external_version,
                ),
            ))
        } else {
            Ok(external_version)
        }
    }
}

impl ReadableWriteable<(sapling_crypto::Diversifier, &WalletCapability)> for sapling_crypto::Note {
    const VERSION: u8 = 1;

    fn read<R: Read>(
        _reader: R,
        (_diversifier, _wallet_capability): (sapling_crypto::Diversifier, &WalletCapability),
    ) -> io::Result<Self> {
        todo!();
    }

    fn write<W: Write>(&self, _writer: W) -> io::Result<()> {
        todo!();
    }
}

impl ReadableWriteable<(orchard::keys::Diversifier, &WalletCapability)> for orchard::note::Note {
    const VERSION: u8 = 1;

    fn read<R: Read>(
        _reader: R,
        (_diversifier, _wallet_capability): (orchard::keys::Diversifier, &WalletCapability),
    ) -> io::Result<Self> {
        todo!();
    }

    fn write<W: Write>(&self, mut writer: W) -> io::Result<()> {
        writer.write_u8(Self::VERSION)?;
        writer.write_u64::<LittleEndian>(self.value().inner())?;
        writer.write_all(&self.rho().to_bytes())?;
        writer.write_all(self.rseed().as_bytes())?;
        Ok(())
    }
}

pub trait FromCommitment
where
    Self: Sized,
{
    fn from_commitment(from: &[u8; 32]) -> CtOption<Self>;
}

impl FromCommitment for sapling_crypto::Node {
    fn from_commitment(from: &[u8; 32]) -> CtOption<Self> {
        let maybe_node =
            <sapling_crypto::Node as zcash_primitives::merkle_tree::HashSer>::read(from.as_slice());
        match maybe_node {
            Ok(node) => CtOption::new(node, subtle::Choice::from(1)),
            Err(_) => CtOption::new(Self::empty_root(Level::from(0)), subtle::Choice::from(0)),
        }
    }
}
impl FromCommitment for MerkleHashOrchard {
    fn from_commitment(from: &[u8; 32]) -> CtOption<Self> {
        Self::from_bytes(from)
    }
}
