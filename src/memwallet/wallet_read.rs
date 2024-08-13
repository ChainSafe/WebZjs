// #![allow(unused)]
use secrecy::SecretVec;
use std::{
    collections::HashMap,
    hash::Hash,
    num::NonZeroU32,
};
use zip32::fingerprint::SeedFingerprint;

use zcash_primitives::{
    block::BlockHash,
    consensus::BlockHeight,
    legacy::TransparentAddress,
    transaction::{Transaction, TxId},
};
use zcash_protocol::{
    memo::{Memo},
    value::Zatoshis,
};

use zcash_client_backend::{
    address::UnifiedAddress,
    keys::{UnifiedAddressRequest, UnifiedFullViewingKey},
    wallet::{NoteId, TransparentAddressMetadata},
};

use super::*;
use zcash_client_backend::data_api::{
    scanning::ScanRange, Account, BlockMetadata, NullifierQuery, SeedRelevance, WalletRead, WalletSummary,
};

impl WalletRead for MemoryWalletDb {
    type Error = Error;
    type AccountId = u32;
    type Account = MemAccount;

    fn get_account_ids(&self) -> Result<Vec<Self::AccountId>, Self::Error> {
        Ok(self.accounts.keys().copied().collect())
    }

    fn get_account(
        &self,
        account_id: Self::AccountId,
    ) -> Result<Option<Self::Account>, Self::Error> {
        Ok(self
            .accounts
            .get(&account_id)
            .map(|account| (account_id, account.ufvk.clone()).into()))
    }

    fn get_derived_account(
        &self,
        _seed: &SeedFingerprint,
        _account_id: zip32::AccountId,
    ) -> Result<Option<Self::Account>, Self::Error> {
        todo!()
    }

    fn validate_seed(
        &self,
        _account_id: Self::AccountId,
        _seed: &SecretVec<u8>,
    ) -> Result<bool, Self::Error> {
        todo!()
    }

    fn seed_relevance_to_derived_accounts(
        &self,
        seed: &SecretVec<u8>,
    ) -> Result<SeedRelevance<Self::AccountId>, Self::Error> {
        todo!()
    }

    fn get_account_for_ufvk(
        &self,
        ufvk: &UnifiedFullViewingKey,
    ) -> Result<Option<Self::Account>, Self::Error> {
        let ufvk_req =
            UnifiedAddressRequest::all().expect("At least one protocol should be enabled");
        Ok(self.accounts.iter().find_map(|(id, acct)| {
            if acct.ufvk.default_address(ufvk_req).unwrap()
                == ufvk.default_address(ufvk_req).unwrap()
            {
                Some((*id, acct.ufvk.clone()).into())
            } else {
                None
            }
        }))
    }

    fn get_current_address(
        &self,
        account: Self::AccountId,
    ) -> Result<Option<UnifiedAddress>, Self::Error> {
        self.accounts
            .get(&account)
            .map(|account| {
                account
                    .ufvk
                    .default_address(
                        UnifiedAddressRequest::all()
                            .expect("At least one protocol should be enabled."),
                    )
                    .map(|(addr, _)| addr)
            })
            .transpose()
            .map_err(|e| e.into())
    }

    fn get_account_birthday(&self, account: Self::AccountId) -> Result<BlockHeight, Self::Error> {
        self.accounts
            .get(&account)
            .map(|account| account.birthday.height())
            .ok_or(Error::AccountUnknown(account))
    }

    fn get_wallet_birthday(&self) -> Result<Option<BlockHeight>, Self::Error> {
        self.accounts
            .values()
            .map(|account| account.birthday.height())
            .min()
            .ok_or(Error::AccountUnknown(0))
            .map(Some)
    }

    fn get_wallet_summary(
        &self,
        _min_confirmations: u32,
    ) -> Result<Option<WalletSummary<Self::AccountId>>, Self::Error> {
        todo!()
    }

    fn chain_height(&self) -> Result<Option<BlockHeight>, Self::Error> {
        todo!()
    }

    fn get_block_hash(&self, block_height: BlockHeight) -> Result<Option<BlockHash>, Self::Error> {
        Ok(self.blocks.iter().find_map(|b| {
            if b.0 == &block_height {
                Some(b.1.hash)
            } else {
                None
            }
        }))
    }

    fn block_metadata(&self, _height: BlockHeight) -> Result<Option<BlockMetadata>, Self::Error> {
        todo!()
    }

    fn block_fully_scanned(&self) -> Result<Option<BlockMetadata>, Self::Error> {
        todo!()
    }

    fn get_max_height_hash(&self) -> Result<Option<(BlockHeight, BlockHash)>, Self::Error> {
        todo!()
    }

    fn block_max_scanned(&self) -> Result<Option<BlockMetadata>, Self::Error> {
        todo!()
    }

    fn suggest_scan_ranges(&self) -> Result<Vec<ScanRange>, Self::Error> {
        Ok(vec![])
    }

    fn get_target_and_anchor_heights(
        &self,
        _min_confirmations: NonZeroU32,
    ) -> Result<Option<(BlockHeight, BlockHeight)>, Self::Error> {
        todo!()
    }

    fn get_min_unspent_height(&self) -> Result<Option<BlockHeight>, Self::Error> {
        todo!()
    }

    fn get_tx_height(&self, txid: TxId) -> Result<Option<BlockHeight>, Self::Error> {
        self.tx_idx
            .get(&txid)
            .copied()
            .map(Some)
            .ok_or(Error::TxUnknown(txid))
    }

    fn get_unified_full_viewing_keys(
        &self,
    ) -> Result<HashMap<Self::AccountId, UnifiedFullViewingKey>, Self::Error> {
        Ok(HashMap::new())
    }

    fn get_memo(&self, id_note: NoteId) -> Result<Option<Memo>, Self::Error> {
        self.tx_idx
            .get(id_note.txid())
            .and_then(|height| self.blocks.get(height))
            .and_then(|block| block.memos.get(&id_note))
            .map(Memo::try_from)
            .transpose()
            .map_err(Error::from)
    }

    fn get_transaction(&self, _id_tx: TxId) -> Result<Option<Transaction>, Self::Error> {
        todo!()
    }

    fn get_sapling_nullifiers(
        &self,
        query: NullifierQuery,
    ) -> Result<Vec<(Self::AccountId, sapling::Nullifier)>, Self::Error> {
        // self.sapling_spends
        //     .iter()
        //     .filter(|s| match query {
        //         NullifierQuery::All => true,
        //         NullifierQuery::Unspent => !s.1 .1,
        //     })
        //     .map(|(nullifier, (txid, _))| {
        //         self.accounts.iter().find_map(|(id, acct)| {
        //             let dfvk = acct.ufvk.sapling().ok()?;
        //             let nk = dfvk.to_nk(Scope::External);
        //             let note = nk.to_note_from_nullifier(*nullifier);
        //             Some((*id, note))
        //         })
        //     })
        //     .collect()
        todo!()
    }

    fn get_orchard_nullifiers(
        &self,
        _query: NullifierQuery,
    ) -> Result<Vec<(Self::AccountId, orchard::note::Nullifier)>, Self::Error> {
        todo!()
    }

    fn get_transparent_receivers(
        &self,
        _account: Self::AccountId,
    ) -> Result<HashMap<TransparentAddress, Option<TransparentAddressMetadata>>, Self::Error> {
        todo!()
    }

    fn get_transparent_balances(
        &self,
        _account: Self::AccountId,
        _max_height: BlockHeight,
    ) -> Result<HashMap<TransparentAddress, Zatoshis>, Self::Error> {
        todo!()
    }

    fn transaction_data_requests(
        &self,
    ) -> Result<Vec<zcash_client_backend::data_api::TransactionDataRequest>, Self::Error> {
        todo!()
    }
}
