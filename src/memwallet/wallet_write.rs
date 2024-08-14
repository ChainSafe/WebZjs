// #![allow(unused)]
use incrementalmerkletree::{Marking, Retention};
use secrecy::{ExposeSecret, SecretVec};
use std::collections::{BTreeMap, HashSet};
use zip32::{fingerprint::SeedFingerprint, Scope};

use zcash_primitives::{consensus::BlockHeight, transaction::TxId, zip32::AccountId};
use zcash_protocol::ShieldedProtocol::{Orchard, Sapling};

use zcash_client_backend::{
    address::UnifiedAddress,
    data_api::chain,
    keys::{UnifiedAddressRequest, UnifiedFullViewingKey, UnifiedSpendingKey},
    wallet::{Note, NoteId, Recipient, WalletTransparentOutput},
};

use zcash_client_backend::data_api::{
    chain::ChainState, Account, AccountBirthday, DecryptedTransaction, ScannedBlock,
    SentTransaction, WalletRead, WalletWrite,
};

use super::*;

impl WalletWrite for MemoryWalletDb {
    type UtxoRef = u32;

    fn create_account(
        &mut self,
        seed: &SecretVec<u8>,
        birthday: &AccountBirthday,
    ) -> Result<(Self::AccountId, UnifiedSpendingKey), Self::Error> {
        let seed_fingerprint =
            SeedFingerprint::from_seed(seed.expose_secret()).expect("Valid seed.");
        let account_id = self.accounts.last_key_value().map_or(0, |(id, _)| id + 1);
        let account_index = AccountId::try_from(account_id).unwrap();
        let usk =
            UnifiedSpendingKey::from_seed(&self.network, seed.expose_secret(), account_index)?;
        let ufvk = usk.to_unified_full_viewing_key();
        self.accounts.insert(
            account_id,
            MemoryWalletAccount {
                seed_fingerprint,
                account_id: account_index,
                ufvk,
                birthday: birthday.clone(),
                addresses: BTreeMap::new(),
                notes: BTreeSet::new(),
            },
        );

        Ok((account_id, usk))
    }

    fn get_next_available_address(
        &mut self,
        _account: Self::AccountId,
        _request: UnifiedAddressRequest,
    ) -> Result<Option<UnifiedAddress>, Self::Error> {
        todo!()
    }

    fn update_chain_tip(&mut self, tip_height: BlockHeight) -> Result<(), Self::Error> {
        self.chain_tip = tip_height;
        Ok(())
    }

    /// Adds a sequence of blocks to the data store.
    ///
    /// Assumes blocks will be here in order.
    fn put_blocks(
        &mut self,
        from_state: &ChainState,
        blocks: Vec<ScannedBlock<Self::AccountId>>,
    ) -> Result<(), Self::Error> {
        // TODO:
        // - Make sure blocks are coming in order.
        // - Make sure the first block in the sequence is tip + 1?
        // - Add a check to make sure the blocks are not already in the data store.
        for block in blocks.into_iter() {
            let mut transactions = BTreeMap::new();
            let mut memos = BTreeMap::new();
            for transaction in block.transactions().iter() {
                let txid = transaction.txid();
                for account_id in self.get_account_ids()? {
                    let ufvk = self
                        .get_account(account_id)?
                        .ok_or(Error::AccountUnknown(account_id))?
                        .ufvk()
                        .ok_or(Error::ViewingKeyNotFound(account_id))?
                        .clone();
                    let dfvk = ufvk
                        .sapling()
                        .ok_or(Error::ViewingKeyNotFound(account_id))?;
                    let nk = dfvk.to_nk(Scope::External);

                    for o in transaction.sapling_outputs().iter() {
                        // Insert the Sapling nullifiers of the spent notes into the `sapling_spends` map.
                        let nullifier = o.note().nf(&nk, o.note_commitment_tree_position().into());
                        self.sapling_spends
                            .entry(nullifier)
                            .or_insert((txid, false));

                        // Insert the memo into the `memos` map.
                        let note_id = NoteId::new(
                            txid,
                            Sapling,
                            u16::try_from(o.index())
                                .expect("output indices are representable as u16"),
                        );
                        if let Ok(Some(memo)) = self.get_memo(note_id) {
                            memos.insert(note_id, memo.encode());
                        }
                    }

                    for o in transaction.orchard_outputs().iter() {
                        // Insert the Orchard nullifiers of the spent notes into the `orchard_spends` map.
                        if let Some(nullifier) = o.nf() {
                            self.orchard_spends
                                .entry(*nullifier)
                                .or_insert((txid, false));
                        }

                        // Insert the memo into the `memos` map.
                        let note_id = NoteId::new(
                            txid,
                            Orchard,
                            u16::try_from(o.index())
                                .expect("output indices are representable as u16"),
                        );
                        if let Ok(Some(memo)) = self.get_memo(note_id) {
                            memos.insert(note_id, memo.encode());
                        }
                    }

                    // Add frontier to the sapling tree
                    self.sapling_tree.insert_frontier(
                        from_state.final_sapling_tree().clone(),
                        Retention::Checkpoint {
                            id: from_state.block_height(),
                            marking: Marking::Reference,
                        },
                    )?;

                    // Add frontier to the orchard tree
                    self.orchard_tree.insert_frontier(
                        from_state.final_orchard_tree().clone(),
                        Retention::Checkpoint {
                            id: from_state.block_height(),
                            marking: Marking::Reference,
                        },
                    )?;

                    // Mark the Sapling nullifiers of the spent notes as spent in the `sapling_spends` map.
                    for s in transaction.sapling_spends() {
                        let nullifier = s.nf();
                        if let Some((txid, spent)) = self.sapling_spends.get_mut(nullifier) {
                            *spent = true;
                        }
                    }

                    // Mark the Orchard nullifiers of the spent notes as spent in the `orchard_spends` map.
                    for s in transaction.orchard_spends() {
                        let nullifier = s.nf();
                        if let Some((txid, spent)) = self.orchard_spends.get_mut(nullifier) {
                            *spent = true;
                        }
                    }

                    self.tx_idx.insert(txid, block.height());
                    transactions.insert(txid, transaction.clone());
                }
            }

            let memory_block = MemoryWalletBlock {
                height: block.height(),
                hash: block.block_hash(),
                block_time: block.block_time(),
                transactions: transactions.keys().copied().collect(),
                memos,
            };

            self.blocks.insert(block.height(), memory_block);
            self.transactions.extend(transactions);

            // Add the Sapling commitments to the sapling tree.
            let block_commitments = block.into_commitments();
            let start_position = from_state
                .final_sapling_tree()
                .value()
                .map_or(0.into(), |t| t.position() + 1);
            self.sapling_tree
                .batch_insert(start_position, block_commitments.sapling.into_iter())?;

            {
                // Add the Orchard commitments to the orchard tree.
                let start_position = from_state
                    .final_orchard_tree()
                    .value()
                    .map_or(0.into(), |t| t.position() + 1);
                self.orchard_tree
                    .batch_insert(start_position, block_commitments.orchard.into_iter())?;
            }
        }

        Ok(())
    }

    /// Adds a transparent UTXO received by the wallet to the data store.
    fn put_received_transparent_utxo(
        &mut self,
        _output: &WalletTransparentOutput,
    ) -> Result<Self::UtxoRef, Self::Error> {
        todo!()
    }

    fn store_decrypted_tx(
        &mut self,
        _received_tx: DecryptedTransaction<Self::AccountId>,
    ) -> Result<(), Self::Error> {
        todo!()
    }

    fn truncate_to_height(&mut self, _block_height: BlockHeight) -> Result<(), Self::Error> {
        todo!()
    }

    fn import_account_hd(
        &mut self,
        seed: &SecretVec<u8>,
        account_index: zip32::AccountId,
        birthday: &AccountBirthday,
    ) -> Result<(Self::Account, UnifiedSpendingKey), Self::Error> {
        todo!()
    }

    fn import_account_ufvk(
        &mut self,
        unified_key: &UnifiedFullViewingKey,
        birthday: &AccountBirthday,
        purpose: zcash_client_backend::data_api::AccountPurpose,
    ) -> Result<Self::Account, Self::Error> {
        todo!()
    }

    fn store_transactions_to_be_sent(
        &mut self,
        transactions: &[SentTransaction<Self::AccountId>],
    ) -> Result<(), Self::Error> {
        for txns in transactions {
            // TODO: I think we need to save the transaciton somewhere
            // Mark sapling inputs as spent
            if let Some(bundle) = txns.tx().sapling_bundle() {
                for spend in bundle.shielded_spends() {
                    self.sapling_spends
                        .insert(*spend.nullifier(), (txns.tx().txid(), true));
                }
            }
            // Mark orchard inputs as spent
            if let Some(bundle) = txns.tx().orchard_bundle() {
                for action in bundle.actions() {
                    self.orchard_spends
                        .insert(*action.nullifier(), (txns.tx().txid(), true));
                }
            }
            // // Mark transparent inputs as spent
            // for outpoint in txns.utxos_spent() {
            //     self.transparent_spends
            //         .insert(outpoint.clone(), (txns.tx().txid(), true));
            // }

            // Save relevant output notes ids
            for output in txns.outputs() {
                let recipient = output.recipient();
                match recipient {
                    Recipient::InternalAccount {
                        receiving_account,
                        note: Note::Sapling(note),
                        ..
                    } => {
                        let note_id = NoteId::new(
                            txns.tx().txid(),
                            Sapling,
                            u16::try_from(output.output_index())
                                .expect("output indices are representable as u16"),
                        );
                        self.accounts
                            .get_mut(receiving_account.into())
                            .unwrap()
                            .notes
                            .insert(note_id);
                    }
                    Recipient::InternalAccount {
                        receiving_account,
                        note: Note::Orchard(note),
                        ..
                    } => {
                        let note_id = NoteId::new(
                            txns.tx().txid(),
                            Orchard,
                            u16::try_from(output.output_index())
                                .expect("output indices are representable as u16"),
                        );
                        self.accounts
                            .get_mut(receiving_account.into())
                            .unwrap()
                            .notes
                            .insert(note_id);
                    }
                    Recipient::EphemeralTransparent {
                        receiving_account,
                        ephemeral_address,
                        outpoint_metadata,
                    } => {
                        todo!("Dont know how to handle ephemeral transparent outputs");
                        // let note_id = NoteId::new(
                        //     txns.tx().txid(),
                        //     Transparent,
                        //     u16::try_from(output.output_index())
                        //         .expect("output indices are representable as u16"),
                        // );
                    }
                    _ => {}
                }
            }
        }
        // TODO: Add txns to be detected via scanning?
        Ok(())
    }

    fn set_transaction_status(
        &mut self,
        _txid: TxId,
        _status: zcash_client_backend::data_api::TransactionStatus,
    ) -> Result<(), Self::Error> {
        todo!()
    }
}

impl MemoryWalletDb {
    pub fn put_tx_data(&mut self, tx: &Transaction) -> Result<(), Error> {}
}
