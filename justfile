default:
    just --list

build:
    wasm-pack build -t web  --release --out-dir ./packages/webz-core -Z --no-default-features --features="wasm" build-std="panic_abort,std"

test-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features="wasm" -Z build-std="panic_abort,std"

test-native:
    cargo test -r -- --nocapture

test-sqlite:
    cargo test -r --features="sqlite-db" -- --nocapture

check:
    cargo check 
