default:
    just --list

build:
    wasm-pack build -t web  --release --out-dir ./packages/webz-core -Z --no-default-features --features="wasm" build-std="panic_abort,std"

## Wasm Tests
test-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features="wasm" -Z build-std="panic_abort,std"

test-message-board-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features="wasm" -Z build-std="panic_abort,std" --test message-board-sync

test-simple-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features="wasm" -Z build-std="panic_abort,std" --test simple-sync-and-send


## Native Examples
example-simple:
    cargo run -r --example simple-sync

example-simple-sqlite:
    cargo run -r --example simple-sync --features="sqlite-db"

example-message-board:
   cargo run -r --example message-board-sync

example-message-board-sqlite:
  cargo run -r --example message-board-sync --features="sqlite-db"

example-batchrunner:
  RUST_LOG=info,zcash_client_backend::sync cargo run -r --example batchrunner

example-batchrunner-sqlite:
  RUST_LOG=info,zcash_client_backend::sync cargo run -r --features="sqlite-db" --example batchrunner

check:
    cargo check 
