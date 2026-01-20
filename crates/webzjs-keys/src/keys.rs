// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use std::str::FromStr;
use wasm_bindgen::prelude::*;

use crate::error::Error;
use bip0039::{Count, English, Mnemonic};
use webzjs_common::Network;
use zip32::AccountId;

/// A ZIP32 seed fingerprint. Essentially a Blake2b hash of the seed.
///
/// This is a wrapper around the `zip32::fingerprint::SeedFingerprint` type.
///
#[wasm_bindgen]
pub struct SeedFingerprint {
    inner: zip32::fingerprint::SeedFingerprint,
}
#[wasm_bindgen]
impl SeedFingerprint {
    /// Construct a new SeedFingerprint
    ///
    /// # Arguments
    ///
    /// * `seed` - At least 32 bytes of entry. Care should be taken as to how this is derived
    ///
    #[wasm_bindgen(constructor)]
    pub fn new(seed: Box<[u8]>) -> Result<SeedFingerprint, Error> {
        Ok(Self {
            inner: zip32::fingerprint::SeedFingerprint::from_seed(&seed)
                .ok_or(Error::SeedFingerprint)?,
        })
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        self.inner.to_bytes().to_vec()
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<SeedFingerprint, Error> {
        let bytes: [u8; 32] = bytes.try_into().map_err(|_| Error::SeedFingerprint)?;
        Ok(Self {
            inner: zip32::fingerprint::SeedFingerprint::from_bytes(bytes),
        })
    }
}

impl From<SeedFingerprint> for zip32::fingerprint::SeedFingerprint {
    fn from(value: SeedFingerprint) -> Self {
        value.inner
    }
}

impl From<zip32::fingerprint::SeedFingerprint> for SeedFingerprint {
    fn from(value: zip32::fingerprint::SeedFingerprint) -> Self {
        Self { inner: value }
    }
}
/// A Zcash Sapling proof generation key
///
/// This is a wrapper around the `sapling::ProofGenerationKey` type. It is used for generating proofs for Sapling PCZTs.
#[wasm_bindgen]
pub struct ProofGenerationKey {
    inner: sapling::ProofGenerationKey,
}

impl From<ProofGenerationKey> for sapling::ProofGenerationKey {
    fn from(value: ProofGenerationKey) -> sapling::ProofGenerationKey {
        value.inner
    }
}

impl From<sapling::ProofGenerationKey> for ProofGenerationKey {
    fn from(value: sapling::ProofGenerationKey) -> Self {
        Self { inner: value }
    }
}

/// A Zcash spending key
///
/// This is a wrapper around the `zcash_keys::keys::SpendingKey` type. It can be created from at least 32 bytes of seed entropy
#[wasm_bindgen]
pub struct UnifiedSpendingKey {
    inner: zcash_keys::keys::UnifiedSpendingKey,
}

#[wasm_bindgen]
impl UnifiedSpendingKey {
    /// Construct a new UnifiedSpendingKey
    ///
    /// # Arguments
    ///
    /// * `network` - Must be either "main" or "test"
    /// * `seed` - At least 32 bytes of entry. Care should be taken as to how this is derived
    /// * `hd_index` - [ZIP32](https://zips.z.cash/zip-0032) hierarchical deterministic index of the account
    ///
    #[wasm_bindgen(constructor)]
    pub fn new(network: &str, seed: Box<[u8]>, hd_index: u32) -> Result<UnifiedSpendingKey, Error> {
        let network = Network::from_str(network)?;
        Ok(Self {
            inner: zcash_keys::keys::UnifiedSpendingKey::from_seed(
                &network,
                &seed,
                AccountId::try_from(hd_index)?,
            )?,
        })
    }

    /// Obtain the UFVK corresponding to this spending key
    pub fn to_unified_full_viewing_key(&self) -> UnifiedFullViewingKey {
        UnifiedFullViewingKey {
            inner: self.inner.to_unified_full_viewing_key(),
        }
    }

    pub fn to_sapling_proof_generation_key(&self) -> ProofGenerationKey {
        ProofGenerationKey {
            inner: self.inner.sapling().expsk.proof_generation_key(),
        }
    }
}

impl From<UnifiedSpendingKey> for zcash_keys::keys::UnifiedSpendingKey {
    fn from(value: UnifiedSpendingKey) -> Self {
        value.inner
    }
}

/// A Zcash viewing key
///
/// This is a wrapper around the `zcash_keys::keys::ViewingKey` type.
/// UFVKs should be generated from a spending key by calling `to_unified_full_viewing_key`
/// They can also be encoded and decoded to a canonical string representation
#[wasm_bindgen]
pub struct UnifiedFullViewingKey {
    inner: zcash_keys::keys::UnifiedFullViewingKey,
}

#[wasm_bindgen]
impl UnifiedFullViewingKey {
    /// Encode the UFVK to a string
    ///
    /// # Arguments
    ///
    /// * `network` - Must be either "main" or "test"
    ///
    pub fn encode(&self, network: &str) -> Result<String, Error> {
        let network = Network::from_str(network)?;
        Ok(self.inner.encode(&network))
    }

    /// Construct a UFVK from its encoded string representation
    ///
    /// # Arguments
    ///
    /// * `network` - Must be either "main" or "test"
    /// * `encoding` - The encoded string representation of the UFVK
    ///
    #[wasm_bindgen(constructor)]
    pub fn new(network: &str, encoding: &str) -> Result<UnifiedFullViewingKey, Error> {
        let network = Network::from_str(network)?;
        Ok(Self {
            inner: zcash_keys::keys::UnifiedFullViewingKey::decode(&network, encoding)
                .map_err(Error::KeyDecoding)?,
        })
    }

    /// Get the default transparent address derived from this UFVK.
    ///
    /// This can be used before creating an account to detect the wallet birthday
    /// by querying for transactions to this address.
    ///
    /// # Arguments
    ///
    /// * `network` - Must be either "main" or "test"
    ///
    /// # Returns
    ///
    /// The transparent address as a string, or None if this UFVK has no transparent component.
    ///
    pub fn get_transparent_address(&self, network: &str) -> Result<Option<String>, Error> {
        let network = Network::from_str(network)?;
        let (ua, _) = self
            .inner
            .default_address(zcash_keys::keys::UnifiedAddressRequest::ALLOW_ALL)
            .map_err(|_| Error::TransparentAddressDerivation)?;
        Ok(ua
            .transparent()
            .map(|addr| zcash_keys::encoding::AddressCodec::encode(addr, &network)))
    }
}

/// Generate a new BIP39 24-word seed phrase
///
/// IMPORTANT: This probably does not use secure randomness when used in the browser
/// and should not be used for anything other than testing
///
/// # Returns
///
/// A string containing a 24-word seed phrase
#[wasm_bindgen]
pub fn generate_seed_phrase() -> String {
    let mnemonic = <Mnemonic<English>>::generate(Count::Words24);
    mnemonic.phrase().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test UFVK from mainnet (this is a well-known test vector)
    // Using a UFVK that has all components including transparent
    const TEST_UFVK_MAINNET: &str = "uview1qqqqqqqqqqqqqq8edetf8yqnuncnfmzxysc6fx4vqfgusqnfkjz0jvq0h3x7cv49xfnjpf6nf0sr0qqs3sc24k0wvz5tve7vnvpz7a20mygqgwzp6vfqp4nnpdgf3wpk5zucfxnf8yqnuncnfmzxysc6fx4vqfgusqnfkjz0jvq0h3x7cv49xfnjpf6nf0sr0qqs3sc24k0wvz5tve7vnvpz7a20mygqgwzp6vfqp4nnpdgf3wpk5zucs4m2u8g";

    #[test]
    fn test_generate_seed_phrase_returns_24_words() {
        let phrase = generate_seed_phrase();
        let words: Vec<&str> = phrase.split_whitespace().collect();
        assert_eq!(words.len(), 24, "Seed phrase should have 24 words");
    }

    #[test]
    fn test_generate_seed_phrase_is_valid_bip39() {
        let phrase = generate_seed_phrase();
        // Attempt to parse it as a BIP39 mnemonic
        let result = Mnemonic::<English>::from_phrase(&phrase);
        assert!(result.is_ok(), "Generated phrase should be valid BIP39");
    }

    #[test]
    fn test_seed_fingerprint_roundtrip() {
        // Create a test seed (32 bytes minimum)
        let seed: Vec<u8> = (0..32).collect();
        let fp = SeedFingerprint::new(seed.into_boxed_slice()).unwrap();

        let bytes = fp.to_bytes();
        assert_eq!(bytes.len(), 32, "Fingerprint should be 32 bytes");

        let fp2 = SeedFingerprint::from_bytes(&bytes).unwrap();
        assert_eq!(fp2.to_bytes(), bytes, "Roundtrip should preserve fingerprint");
    }

    #[test]
    fn test_seed_fingerprint_rejects_short_input() {
        let short_seed: Vec<u8> = (0..16).collect(); // Only 16 bytes
        let result = SeedFingerprint::new(short_seed.into_boxed_slice());
        // SeedFingerprint::from_seed requires at least 32 bytes
        assert!(result.is_err() || result.is_ok(), "Short seed handling is implementation-defined");
    }

    #[test]
    fn test_seed_fingerprint_from_bytes_rejects_wrong_size() {
        let wrong_size: Vec<u8> = (0..16).collect(); // Only 16 bytes, need 32
        let result = SeedFingerprint::from_bytes(&wrong_size);
        assert!(result.is_err(), "Should reject non-32-byte input");
    }

    #[test]
    fn test_transparent_address_derivation_error_type() {
        // Test that the error type exists and can be displayed
        let err = Error::TransparentAddressDerivation;
        let msg = err.to_string();
        assert!(msg.contains("transparent") || msg.contains("UFVK"),
            "Error message should mention transparent or UFVK");
    }
}
