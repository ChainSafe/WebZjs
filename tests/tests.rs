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

    let mut w = Wallet::new("test", "https://zcash-testnet.chainsafe.dev", 1).unwrap();

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
    w.transfer(SEED, 0, "utest1z00xn09t4eyeqw9zmjss75sf460423dymgyfjn8rtlj26cffy0yad3eea82xekk24s00wnm38cvyrm2c6x7fxlc0ns4a5j7utgl6lchvglfvl9g9p56fqwzvzvj9d3z6r6ft88j654d7dj0ep6myq5duz9s8x78fdzmtx04d2qn8ydkxr4lfdhlkx9ktrw98gd97dateegrr68vl8xu".to_string(), 1000).await.unwrap();
    tracing::info!("Transaction proposed");

    let summary = w.get_wallet_summary().unwrap();
    tracing::info!("Wallet summary: {:?}", summary);
}