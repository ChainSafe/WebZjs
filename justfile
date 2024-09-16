default:
    just --list

build:
    wasm-pack build -t web  --release --out-dir ./packages/webz-core -Z --no-default-features --features="wasm" build-std="panic_abort,std"

test-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features="wasm" -Z build-std="panic_abort,std"

example-native:
    cargo run -r --example simple-sync

example-sqlite:
    cargo run -r --example simple-sync --features="sqlite-db"

example-message-board:
   cargo run -r --example message-board-sync

example-message-board-sqlite:
  cargo run -r --example message-board-sync --features="sqlite-db"

check:
    cargo check 
