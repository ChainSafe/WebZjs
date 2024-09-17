default:
    just --list

build:
    wasm-pack build -t web  --release --out-dir ./packages/webz-core -Z --no-default-features --features="wasm" build-std="panic_abort,std"

# All Wasm Tests
test-web *features:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features "wasm {{features}}" -Z build-std="panic_abort,std"

# sync message board in the web: addigional args: sync2
test-message-board-web *features:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features "wasm {{features}}" -Z build-std="panic_abort,std" --test message-board-sync

# simple example in the web: additional args: sync2
test-simple-web *features:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features "wasm {{features}}" -Z build-std="panic_abort,std" --test simple-sync-and-send


# simple example: additional args: sync2, sqlite-db
example-simple *features:
   RUST_LOG="info,zcash_client_backend::sync=debug" cargo run -r --example simple-sync --features "native {{features}}"

# sync the message board: additional args: sync2, sqlite-db
example-message-board *features:
  RUST_LOG=info,zcash_client_backend::sync=debug cargo run -r --example message-board-sync --features "native {{features}}"

check:
    cargo check 
