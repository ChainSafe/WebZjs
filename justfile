default:
    just --list

build:
    wasm-pack build -t web  --release --out-dir ./packages/webz-core -Z build-std="panic_abort,std"

test-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox -Z build-std="panic_abort,std"

test-native:
    cargo test --no-default-features --features="native" -- --nocapture

check:
    cargo check 
