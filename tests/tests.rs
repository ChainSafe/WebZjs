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

    let mut w = Wallet::new("test", "https://zcash-testnet.chainsafe.dev", 10, 1).unwrap();

    let id = w.create_account(SEED, HD_INDEX, BIRTHDAY).await.unwrap();
    tracing::info!("Created account with id: {}", id);

    tracing::info!("Syncing wallet");
    w.sync(&js_sys::Function::new_with_args(
        "scanned_to, tip",
        "console.log('Scanned: ', scanned_to, '/', tip)",
    ))
    .await
    .unwrap();
    tracing::info!("Syncing complete :)");

    let summary = w.get_wallet_summary().unwrap();
    tracing::info!("Wallet summary: {:?}", summary);

    tracing::info!("Proposing a transaction");
    w.propose(0, "u1etemssflf0zat7c0rd7myvyakm90rvdr6ytejtrz3n5d2yx20utmdyxcpdgasyrk98vls3vlfjet8kyekw9jc0dwn3jug860yquuz00fj2tpc0u7mnv2gtve4u7r5uktf26m40m57dp0vp5var22d0s5vfa9fsnp4e9puukdrrxgzp3wrujz2kdr6mamew8swhcqc8q8j7622r6mxty".to_string(), 1000).unwrap();
    tracing::info!("Transaction proposed");

    let summary = w.get_wallet_summary().unwrap();
    tracing::info!("Wallet summary: {:?}", summary);
}
