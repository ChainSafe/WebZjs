default:
    just --list

build:
    wasm-pack build -t web  --release --out-dir ./packages/webz-core -Z --no-default-features --features="wasm" build-std="panic_abort,std"

test-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features="wasm" -Z build-std="panic_abort,std"

run-example-native:
    cargo run -r --example simple-sync

run-example-sqlite:
    cargo run -r --example simple-sync --features="sqlite-db"

check:
    cargo check 
