use wasm_bindgen_test::*;
use web_sys::console;
wasm_bindgen_test_configure!(run_in_browser);
use webz_core::store::{self, WalletStore as _};
#[wasm_bindgen_test]
fn pass() {
    assert_eq!(1, 1);
}

#[wasm_bindgen_test]
async fn idb() {
    let k = "key";
    let v = vec![1, 2, 3];
    let v2 = vec![1, 2, 3, 4];
    // Add to store
    let mut store = store::IdbStore::new().await.unwrap();
    store.update(k, &v).await.unwrap();

    // Get from store
    assert_eq!(store.get(k).await.unwrap().unwrap(), v);

    // Update Key
    store.update(k, &v2).await.unwrap();
    assert_eq!(store.get(k).await.unwrap().unwrap(), v2);

    // Clear Key
    store.clear(k).await.unwrap();
    assert_eq!(store.get(k).await.unwrap(), None);
}
