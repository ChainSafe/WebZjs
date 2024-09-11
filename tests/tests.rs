use wasm_bindgen_test::*;
wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_browser);

use webz_core::{bindgen::wallet::Wallet, Network};
use zcash_client_memory::MemoryWalletDb;

const SEED: &str = "visit armed kite pen cradle toward reward clay marble oil write dove blind oyster silk oyster original message skate bench tone enable stadium element";
const HD_INDEX: u32 = 0;
const BIRTHDAY: Option<u32> = Some(2577329);

// Required to initialize the logger and panic hooks only once
use std::sync::Once;
static INIT: Once = Once::new();
pub fn initialize() {
    INIT.call_once(|| {
        webz_core::init::start();
    });
}

#[wasm_bindgen_test]
fn tests_working() {
    initialize();
    assert!(true);
}

use indexed_db_futures::prelude::*;
use js_sys::Uint8Array;
use wasm_bindgen::JsValue;

static DB_NAME: &str = "test_db";
static KV_STORE: &str = "kv_store";
/// A simple IndexedDb store for wallet data
pub struct IdbStore {
    pub inner: indexed_db_futures::IdbDatabase,
}

impl IdbStore {
    async fn update(&mut self, key: &str, value: &[u8]) -> Result<(), JsValue> {
        let tx = self
            .inner
            .transaction_on_one_with_mode(KV_STORE, IdbTransactionMode::Readwrite)?;
        let store = tx.object_store(KV_STORE)?;

        store.put_key_val_owned(JsValue::from_str(key), &Uint8Array::from(value))?;
        tx.await.into_result()?;
        Ok(())
    }

    async fn get(&self, key: &str) -> Result<Option<Vec<u8>>, JsValue> {
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

    async fn clear(&mut self, key: &str) -> Result<(), JsValue> {
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
    pub async fn new() -> Result<Self, JsValue> {
        let mut db_req = IdbDatabase::open_u32(DB_NAME, 1)?;
        db_req.set_on_upgrade_needed(Some(|evt: &IdbVersionChangeEvent| -> Result<(), JsValue> {
            let create_store_if_needed =
                |evt: &IdbVersionChangeEvent, store_key: &'static str| -> Result<(), JsValue> {
                    if !evt.db().object_store_names().any(|n| n == store_key) {
                        tracing::info!("Created object store: {}", store_key);
                        evt.db().create_object_store(store_key)?;
                    }
                    tracing::info!("Object store already exists: {}", store_key);
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

const WALLET_KEY: &str = "my_wallet";

#[wasm_bindgen_test]
async fn test_get_and_scan_range() {
    initialize();
    let mut idb = IdbStore::new().await.unwrap();

    let mut w = if let Some(store_data) = idb.get(WALLET_KEY).await.unwrap() {
        tracing::info!(
            "Wallet found in IndexedDb! Loading {} bytes from it...",
            store_data.len()
        );
        let wallet_db: MemoryWalletDb<Network> =
            postcard::from_bytes(store_data.as_slice()).unwrap();
        Wallet::load("https://zcash-testnet.chainsafe.dev", 1, wallet_db).unwrap()
    } else {
        tracing::info!("Wallet not found in IndexedDb! Creating a new one...");
        let mut w = Wallet::new("test", "https://zcash-testnet.chainsafe.dev", 1).unwrap();
        let id = w.create_account(SEED, HD_INDEX, BIRTHDAY).await.unwrap();
        tracing::info!("Created account with id: {}", id);
        let store_data = postcard::to_allocvec(w.db()).unwrap();
        tracing::info!(
            "Wallet serialized: {} bytes. Saving newly created wallet to persistant store.",
            store_data.len()
        );
        idb.update(WALLET_KEY, &store_data).await.unwrap();
        w
    };

    tracing::info!("Syncing wallet");
    w.sync(&js_sys::Function::new_with_args(
        "scanned_to, tip",
        "console.log('Scanned: ', scanned_to, '/', tip)",
    ))
    .await
    .unwrap();
    tracing::info!("Syncing complete :)");

    tracing::info!("Serializing wallet");
    let store_data = postcard::to_allocvec(w.db()).unwrap();
    tracing::info!(
        "Wallet serialized: {} bytes. Saving to persistant store.",
        store_data.len()
    );
    idb.update(WALLET_KEY, &store_data).await.unwrap();

    let summary = w.get_wallet_summary().unwrap();
    tracing::info!("Wallet summary: {:?}", summary);

    tracing::info!("Proposing a transaction");
    w.transfer(SEED, 0, "utest1z00xn09t4eyeqw9zmjss75sf460423dymgyfjn8rtlj26cffy0yad3eea82xekk24s00wnm38cvyrm2c6x7fxlc0ns4a5j7utgl6lchvglfvl9g9p56fqwzvzvj9d3z6r6ft88j654d7dj0ep6myq5duz9s8x78fdzmtx04d2qn8ydkxr4lfdhlkx9ktrw98gd97dateegrr68vl8xu".to_string(), 1000).await.unwrap();
    tracing::info!("Transaction proposed");

    let summary = w.get_wallet_summary().unwrap();
    tracing::info!("Wallet summary: {:?}", summary);

    let store_data = postcard::to_allocvec(w.db()).unwrap();
    tracing::info!(
        "Wallet serialized: {} bytes. Saving to persistant store since test done.",
        store_data.len()
    );
    idb.update(WALLET_KEY, &store_data).await.unwrap();

    tracing::info!("Done!");
}
