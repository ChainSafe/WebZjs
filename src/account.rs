// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use secrecy::{ExposeSecret as _, SecretVec};
use wasm_bindgen::prelude::*;
use zcash_client_backend::data_api::{
    Account as _, AccountBirthday, AccountPurpose, AccountSource,
};
use zcash_keys::keys::{UnifiedFullViewingKey, UnifiedIncomingViewingKey, UnifiedSpendingKey};
use zcash_protocol::consensus::Parameters;
use zip32::fingerprint::SeedFingerprint;

/// The ID type for accounts.
#[derive(Debug, Copy, Clone, PartialEq, Eq, Hash, Default)]
#[wasm_bindgen]
pub struct AccountId(u32);

/// The viewing key that an [`Account`] has available to it.
#[derive(Debug, Clone)]
pub(crate) enum ViewingKey {
    /// A full viewing key.
    ///
    /// This is available to derived accounts, as well as accounts directly imported as
    /// full viewing keys.
    Full(Box<UnifiedFullViewingKey>),

    /// An incoming viewing key.
    ///
    /// Accounts that have this kind of viewing key cannot be used in wallet contexts,
    /// because they are unable to maintain an accurate balance.
    Incoming(Box<UnifiedIncomingViewingKey>),
}

impl ViewingKey {
    fn ufvk(&self) -> Option<&UnifiedFullViewingKey> {
        match self {
            ViewingKey::Full(ufvk) => Some(ufvk),
            ViewingKey::Incoming(_) => None,
        }
    }

    fn uivk(&self) -> UnifiedIncomingViewingKey {
        match self {
            ViewingKey::Full(ufvk) => ufvk.as_ref().to_unified_incoming_viewing_key(),
            ViewingKey::Incoming(uivk) => uivk.as_ref().clone(),
        }
    }
}

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct Account {
    account_id: AccountId,
    kind: AccountSource,
    viewing_key: ViewingKey,
    birthday: AccountBirthday,
    purpose: AccountPurpose,
}

impl zcash_client_backend::data_api::Account<AccountId> for Account {
    fn id(&self) -> AccountId {
        self.account_id
    }

    fn source(&self) -> AccountSource {
        self.kind
    }

    fn ufvk(&self) -> Option<&UnifiedFullViewingKey> {
        self.viewing_key.ufvk()
    }

    fn uivk(&self) -> UnifiedIncomingViewingKey {
        self.viewing_key.uivk()
    }
}

pub struct MemoryAccountStore<P> {
    params: P,
    // AccountId is the index of the Vec
    accounts: Vec<Account>,
}

impl<P: Parameters> MemoryAccountStore<P> {
    pub fn new(params: P) -> Self {
        Self {
            params,
            accounts: Vec::new(),
        }
    }

    pub fn create_account(
        &mut self,
        seed: &SecretVec<u8>,
        birthday: AccountBirthday,
    ) -> Result<(AccountId, UnifiedSpendingKey), String> {
        let seed_fingerprint = SeedFingerprint::from_seed(seed.expose_secret())
            .ok_or_else(|| "Seed must be between 32 and 252 bytes in length.".to_owned())?;
        let account_index = self
            .max_zip32_account_index(&seed_fingerprint)?
            .map(|a| a.next().ok_or_else(|| "Account out of range".to_string()))
            .transpose()?
            .unwrap_or(zip32::AccountId::ZERO);

        let usk = UnifiedSpendingKey::from_seed(&self.params, seed.expose_secret(), account_index)
            .map_err(|_| "key derivation error".to_string())?;
        let ufvk = usk.to_unified_full_viewing_key();
        let account = Account {
            account_id: AccountId(self.accounts.len() as u32),
            kind: AccountSource::Derived {
                seed_fingerprint,
                account_index,
            },
            viewing_key: ViewingKey::Full(Box::new(ufvk)),
            birthday,
            purpose: AccountPurpose::Spending,
        };
        let id = account.id();
        self.accounts.push(account);

        Ok((id, usk))
    }

    pub fn import_account_ufvk(
        &mut self,
        ufvk: &UnifiedFullViewingKey,
        birthday: &AccountBirthday,
        purpose: AccountPurpose,
    ) -> Result<Account, String> {
        let account = Account {
            account_id: AccountId(self.accounts.len() as u32),
            kind: AccountSource::Imported { purpose },
            viewing_key: ViewingKey::Full(Box::new(ufvk.to_owned())),
            birthday: birthday.clone(),
            purpose,
        };
        Ok(account)
    }

    pub fn import_account_hd(
        &mut self,
        seed: &SecretVec<u8>,
        account_index: zip32::AccountId,
        birthday: &AccountBirthday,
    ) -> Result<(Account, UnifiedSpendingKey), String> {
        let seed_fingerprint = SeedFingerprint::from_seed(seed.expose_secret())
            .ok_or_else(|| "Seed must be between 32 and 252 bytes in length.".to_owned())?;

        let usk = UnifiedSpendingKey::from_seed(&self.params, seed.expose_secret(), account_index)
            .map_err(|_| "key derivation error".to_string())?;
        let ufvk = usk.to_unified_full_viewing_key();
        let account = Account {
            account_id: AccountId(self.accounts.len() as u32),
            kind: AccountSource::Derived {
                seed_fingerprint,
                account_index,
            },
            viewing_key: ViewingKey::Full(Box::new(ufvk)),
            birthday: birthday.clone(),
            purpose: AccountPurpose::Spending,
        };
        // TODO: Do we need to check if duplicate?
        self.accounts.push(account.clone());
        Ok((account, usk))
    }

    fn max_zip32_account_index(
        &self,
        seed_fingerprint: &SeedFingerprint,
    ) -> Result<Option<zip32::AccountId>, String> {
        Ok(self
            .accounts
            .iter()
            .filter_map(|a| match a.source() {
                AccountSource::Derived {
                    seed_fingerprint: sf,
                    account_index,
                } => {
                    if &sf == seed_fingerprint {
                        Some(account_index)
                    } else {
                        None
                    }
                }
                _ => None,
            })
            .max())
    }
}
