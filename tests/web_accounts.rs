use wasm_bindgen_test::*;
wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_browser);

use webz_core::account::Account;

#[wasm_bindgen_test]
fn test_unified_address_encoding() {
    let seed = [0; 32];
    let a = Account::from_seed(&seed, 0).unwrap();
    let address = a.unified_address(1).unwrap();
    assert_eq!(address.len(), 213);
}

#[wasm_bindgen_test]
fn test_transparent_address_encoding() {
    let seed = [0; 32];
    let a = Account::from_seed(&seed, 0).unwrap();
    let address = a.transparent_address().unwrap();
    assert_eq!(address.len(), 35);
}
