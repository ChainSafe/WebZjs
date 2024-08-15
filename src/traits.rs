use crate::wallet_capability::WalletCapability;
use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use incrementalmerkletree::{Hashable, Level};
use orchard::{note_encryption::OrchardDomain, tree::MerkleHashOrchard};
use sapling_crypto::note_encryption::SaplingDomain;
use std::io::{self, Read, Write};
use subtle::CtOption;

pub trait ToBytes<const N: usize> {
    /// TODO: Add Doc Comment Here!
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
    /// TODO: Add Doc Comment Here!
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
    /// TODO: Add Doc Comment Here!
    const VERSION: u8;

    /// TODO: Add Doc Comment Here!
    fn read<R: Read>(reader: R, input: Input) -> io::Result<Self>;

    /// TODO: Add Doc Comment Here!
    fn write<W: Write>(&self, writer: W) -> io::Result<()>;

    /// TODO: Add Doc Comment Here!
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
        mut reader: R,
        (diversifier, wallet_capability): (sapling_crypto::Diversifier, &WalletCapability),
    ) -> io::Result<Self> {
        todo!();

        // let _version = Self::get_version(&mut reader)?;
        // let value = reader.read_u64::<LittleEndian>()?;
        // let rseed = super::data::read_sapling_rseed(&mut reader)?;

        // Ok(
        //     <SaplingDomain as DomainWalletExt>::wc_to_fvk(wallet_capability)
        //         .expect("to get an fvk from a wc")
        //         .fvk()
        //         .vk
        //         .to_payment_address(diversifier)
        //         .unwrap()
        //         .create_note(sapling_crypto::value::NoteValue::from_raw(value), rseed),
        // )
    }

    fn write<W: Write>(&self, mut writer: W) -> io::Result<()> {
        todo!();
        // writer.write_u8(Self::VERSION)?;
        // writer.write_u64::<LittleEndian>(self.value().inner())?;
        // super::data::write_sapling_rseed(&mut writer, self.rseed())?;
        // Ok(())
    }
}

impl ReadableWriteable<(orchard::keys::Diversifier, &WalletCapability)> for orchard::note::Note {
    const VERSION: u8 = 1;

    fn read<R: Read>(
        mut reader: R,
        (diversifier, wallet_capability): (orchard::keys::Diversifier, &WalletCapability),
    ) -> io::Result<Self> {
        todo!();
        // let _version = Self::get_version(&mut reader)?;
        // let value = reader.read_u64::<LittleEndian>()?;
        // let mut nullifier_bytes = [0; 32];
        // reader.read_exact(&mut nullifier_bytes)?;
        // let rho_nullifier = Option::from(orchard::note::Rho::from_bytes(&nullifier_bytes))
        //     .ok_or(io::Error::new(io::ErrorKind::InvalidInput, "Bad Nullifier"))?;

        // let mut random_seed_bytes = [0; 32];
        // reader.read_exact(&mut random_seed_bytes)?;
        // let random_seed = Option::from(orchard::note::RandomSeed::from_bytes(
        //     random_seed_bytes,
        //     &rho_nullifier,
        // ))
        // .ok_or(io::Error::new(
        //     io::ErrorKind::InvalidInput,
        //     "Nullifier not for note",
        // ))?;

        // let fvk = <OrchardDomain as DomainWalletExt>::wc_to_fvk(wallet_capability)
        //     .expect("to get an fvk from a wc");
        // Option::from(orchard::note::Note::from_parts(
        //     fvk.address(diversifier, orchard::keys::Scope::External),
        //     orchard::value::NoteValue::from_raw(value),
        //     rho_nullifier,
        //     random_seed,
        // ))
        // .ok_or(io::Error::new(io::ErrorKind::InvalidInput, "Invalid note"))
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
    /// TODO: Add Doc Comment Here!
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
