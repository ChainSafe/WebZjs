use wasm_bindgen_test::*;

use webz_core::{bindgen::wallet::WebWallet, Wallet};
use zcash_address::ZcashAddress;
use zcash_primitives::consensus::Network;

wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_browser);
macro_rules! console_log {
    ($($t:tt)*) => (web_sys::console::log_1(&format!($($t)*).into()))
}
const SEED: &str = "visit armed kite pen cradle toward reward clay marble oil write dove blind oyster silk oyster original message skate bench tone enable stadium element";
const HD_INDEX: u32 = 0;
const BIRTHDAY: Option<u32> = Some(2577329);

const THREADS: usize = 5;
use tokio_with_wasm::alias as tokio;

static INIT: Once = Once::new();
// Required to initialize the logger and panic hooks only once
use std::{num::NonZeroU32, sync::Once};
pub fn initialize() {
    console_log!("Calling initialize");
    INIT.call_once(|| {
        webz_core::init::start();
    });
}
#[cfg(all(feature = "wasm-parallel"))]
async fn init_threadpool(threads: usize) -> wasm_bindgen_futures::JsFuture {
    console_log!("Initializing thread pool with {} threads", threads);
    wasm_bindgen_futures::JsFuture::from(wasm_bindgen_rayon::init_thread_pool(threads))
}

#[wasm_bindgen_test]
async fn test_get_and_scan_range() {
    initialize();

    #[cfg(all(feature = "wasm-parallel"))]
    init_threadpool(THREADS).await;

    let mut w = WebWallet::new("test", "https://zcash-testnet.chainsafe.dev", 1).unwrap();

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
    let handle = tokio::task::spawn_blocking(|| {
        rayon::scope(|s| {
            s.spawn(|_| {
                let num_parallel = rayon::current_num_threads();
                tracing::info!("WASM rayon has {} threads", num_parallel);
            })
        });
    });
    w.transfer(SEED, 0, "utest1z00xn09t4eyeqw9zmjss75sf460423dymgyfjn8rtlj26cffy0yad3eea82xekk24s00wnm38cvyrm2c6x7fxlc0ns4a5j7utgl6lchvglfvl9g9p56fqwzvzvj9d3z6r6ft88j654d7dj0ep6myq5duz9s8x78fdzmtx04d2qn8ydkxr4lfdhlkx9ktrw98gd97dateegrr68vl8xu".to_string(), 1000).await.unwrap();
    tracing::info!("Transaction proposed");

    let summary = w.get_wallet_summary().unwrap();
    tracing::info!("Wallet summary: {:?}", summary);

    handle.await.unwrap();
}

#[cfg(feature = "native")]
#[tokio::test]
async fn test_get_and_scan_range_native() {
    initialize();

    rayon::spawn(|| {
        let num_parallel = rayon::current_num_threads();
        tracing::info!("Native rayon has {} threads", num_parallel);
    });

    let url = "https://testnet.zec.rocks:443";
    let c = tonic::transport::Channel::from_shared(url).unwrap();

    let tls = tonic::transport::ClientTlsConfig::new()
        .domain_name("testnet.zec.rocks")
        .with_webpki_roots();
    let channel = c.tls_config(tls).unwrap();
    let mut w = Wallet::new(
        channel.connect().await.unwrap(),
        Network::TestNetwork,
        NonZeroU32::try_from(1).unwrap(),
    )
    .unwrap();

    let id = w.create_account(SEED, HD_INDEX, BIRTHDAY).await.unwrap();
    tracing::info!("Created account with id: {}", id);

    tracing::info!("Syncing wallet");
    w.sync(|scanned_to, tip| {
        println!("Scanned: {}/{}", scanned_to, tip);
    })
    .await
    .unwrap();

    tracing::info!("Syncing complete :)");

    let summary = w.get_wallet_summary().unwrap();
    tracing::info!("Wallet summary: {:?}", summary);

    tracing::info!("Proposing a transaction");
    let addr = ZcashAddress::try_from_encoded("utest1z00xn09t4eyeqw9zmjss75sf460423dymgyfjn8rtlj26cffy0yad3eea82xekk24s00wnm38cvyrm2c6x7fxlc0ns4a5j7utgl6lchvglfvl9g9p56fqwzvzvj9d3z6r6ft88j654d7dj0ep6myq5duz9s8x78fdzmtx04d2qn8ydkxr4lfdhlkx9ktrw98gd97dateegrr68vl8xu");

    w.transfer(SEED, 0, addr.unwrap(), 1000).await.unwrap();
    tracing::info!("Transaction proposed");

    let summary = w.get_wallet_summary().unwrap();
    tracing::info!("Wallet summary: {:?}", summary);
}
