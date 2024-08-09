use wasm_bindgen_test::*;
wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_browser);

use webz_core::account::Account;

#[wasm_bindgen_test]
fn test_account_from_seed() {
    let seed = [0; 32];
    let a = Account::from_seed(&seed, 0).unwrap();
}
