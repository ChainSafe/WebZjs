use wasm_bindgen_test::*;
wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_browser);

use std::sync::Once;
use webz_core::bindgen::wallet::WebWallet;
use zcash_keys::keys::UnifiedFullViewingKey;
use zcash_primitives::consensus::Network;
use zcash_primitives::constants;

use wasm_thread as thread;

// Required to initialize the logger and panic hooks only once
static INIT: Once = Once::new();
pub fn initialize() {
    INIT.call_once(|| {
        webz_core::init::start();
    });
}
const SAPLING_EFVK: &str = "zxviews1q0duytgcqqqqpqre26wkl45gvwwwd706xw608hucmvfalr759ejwf7qshjf5r9aa7323zulvz6plhttp5mltqcgs9t039cx2d09mgq05ts63n8u35hyv6h9nc9ctqqtue2u7cer2mqegunuulq2luhq3ywjcz35yyljewa4mgkgjzyfwh6fr6jd0dzd44ghk0nxdv2hnv4j5nxfwv24rwdmgllhe0p8568sgqt9ckt02v2kxf5ahtql6s0ltjpkckw8gtymxtxuu9gcr0swvz";

#[wasm_bindgen_test]
async fn test_message_board() {
    initialize();
    #[cfg(feature = "wasm-parallel")]
    let _ = wasm_bindgen_futures::JsFuture::from(wasm_bindgen_rayon::init_thread_pool(10)).await;
    let w = WebWallet::new("main", "http://localhost:1234/mainnet", 1).unwrap();
    let w_clone = w.clone();
    let main_handler = thread::Builder::new()
        .spawn_async(move || async {
            let w = w_clone;
            let s = zcash_keys::encoding::decode_extended_full_viewing_key(
                constants::mainnet::HRP_SAPLING_EXTENDED_FULL_VIEWING_KEY,
                SAPLING_EFVK.trim(),
            )
            .unwrap();

            let ufvk = UnifiedFullViewingKey::from_sapling_extended_full_viewing_key(s).unwrap();
            let ufvk_str = ufvk.encode(&Network::MainNetwork);
            let id = w.import_ufvk(&ufvk_str, Some(2477329)).await.unwrap();
            tracing::info!("Created account with id: {}", id);

            tracing::info!("Syncing wallet with our sync impl");
            w.sync().await.unwrap();

            tracing::info!("Syncing complete :)");

            let summary = w.get_wallet_summary().await.unwrap();
            tracing::info!("Wallet summary: {:?}", summary);
        })
        .unwrap()
        .join_async();

    main_handler.await.unwrap();
}
