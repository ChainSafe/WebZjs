default:
    just --list

build:
    wasm-pack build -t web  --release --out-dir ./packages/webz-core -Z --no-default-features --features="wasm" build-std="panic_abort,std"

test-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features="wasm" -Z build-std="panic_abort,std"

test-native:
    cargo test -r -- --nocapture

test-sqlite:
    cargo test -r --features="sqlite-db" test_get_and_scan_range_native_sqlite -- --nocapture

check:
    cargo check 
