use wasm_bindgen_test::*;
wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_browser);

use webz_core::bindgen::wallet::Wallet;

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

#[wasm_bindgen_test]
async fn test_get_and_scan_range() {
    initialize();

    let mut w = Wallet::new("test", "https://zcash-testnet.chainsafe.dev", 10, 0).unwrap();

    let id = w.create_account(SEED, HD_INDEX, BIRTHDAY).await.unwrap();
    tracing::info!("Created account with id: {}", id);

    w.get_and_scan_range(2406739, 2983954).await.unwrap();

    let summary = w.get_wallet_summary().unwrap();
    tracing::info!("Wallet summary: {:?}", summary);
}
