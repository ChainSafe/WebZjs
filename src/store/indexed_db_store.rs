// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use crate::error::Error;
use crate::store::WalletStore;
use indexed_db_futures::prelude::*;
use js_sys::Uint8Array;
use wasm_bindgen::JsValue;

static DB_NAME: &str = "test_db";
static KV_STORE: &str = "kv_store";
/// A simple IndexedDb store for wallet data
pub struct IdbStore {
    pub inner: indexed_db_futures::IdbDatabase,
}

impl WalletStore for IdbStore {
    async fn update(&mut self, key: &str, value: &[u8]) -> Result<(), Error> {
        let tx = self
            .inner
            .transaction_on_one_with_mode(KV_STORE, IdbTransactionMode::Readwrite)?;
        let store = tx.object_store(KV_STORE)?;

        store.put_key_val_owned(JsValue::from_str(key), &Uint8Array::from(value))?;
        tx.await.into_result()?;
        Ok(())
    }

    async fn get(&self, key: &str) -> Result<Option<Vec<u8>>, Error> {
        let tx = self
            .inner
            .transaction_on_one_with_mode(KV_STORE, IdbTransactionMode::Readonly)?;
        let store = tx.object_store(KV_STORE)?;
        match store.get(&JsValue::from_str(key))?.await? {
            Some(v) => {
                let v = Uint8Array::from(v);
                Ok(Some(v.to_vec()))
            }
            None => Ok(None),
        }
    }

    async fn clear(&mut self, key: &str) -> Result<(), Error> {
        let tx = self
            .inner
            .transaction_on_one_with_mode(KV_STORE, IdbTransactionMode::Readwrite)?;
        let store = tx.object_store(KV_STORE)?;
        store.delete_owned(JsValue::from_str(key))?;
        tx.await.into_result()?;
        Ok(())
    }
}

impl IdbStore {
    pub async fn new() -> Result<Self, Error> {
        let mut db_req = IdbDatabase::open_u32(DB_NAME, 1)?;
        // let db = open.await?;
        db_req.set_on_upgrade_needed(Some(|evt: &IdbVersionChangeEvent| -> Result<(), JsValue> {
            let create_store_if_needed =
                |evt: &IdbVersionChangeEvent, store_key: &'static str| -> Result<(), JsValue> {
                    if !evt.db().object_store_names().any(|n| n == store_key) {
                        evt.db().create_object_store(store_key)?;
                    }
                    Ok(())
                };
            create_store_if_needed(evt, KV_STORE)?;
            Ok(())
        }));
        Ok(Self {
            inner: db_req.await?,
        })
    }
}
