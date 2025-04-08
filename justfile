default:
    just --list

build:
    just build-wallet
    just build-keys
    just build-requests

build-wallet *features:
    cd crates/webzjs-wallet && wasm-pack build -t web --release --scope chainsafe --out-dir ../../packages/webzjs-wallet --no-default-features --features="wasm wasm-parallel {{features}}" -Z build-std="panic_abort,std"
    ./add-worker-module.sh

build-keys *features:
    cd crates/webzjs-keys && wasm-pack build -t web --release --scope chainsafe --out-dir ../../packages/webzjs-keys --no-default-features --features="{{features}}" -Z build-std="panic_abort,std"

build-requests *features:
    cd crates/webzjs-requests && wasm-pack build -t web --release --scope chainsafe --out-dir ../../packages/webzjs-requests --no-default-features --features="{{features}}" -Z build-std="panic_abort,std"

# All Wasm Tests
test-web *features:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features "wasm no-bundler {{features}}" -Z build-std="panic_abort,std"

# sync message board in the web: addigional args:
test-message-board-web *features:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --chrome --no-default-features --features "wasm no-bundler {{features}}" -Z build-std="panic_abort,std" --test message-board-sync

# simple example in the web: additional args:
test-simple-web *features:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --chrome --no-default-features --features "wasm no-bundler {{features}}" -Z build-std="panic_abort,std" --test simple-sync-and-send

# simple example: additional args:, sqlite-db
example-simple *features:
   RUST_LOG="info,zcash_client_backend::sync=debug" cargo run -r --example simple-sync --features "native {{features}}"

# sync the message board: additional args:, sqlite-db
example-message-board *features:
  RUST_LOG=info,zcash_client_backend::sync=debug cargo run -r --example message-board-sync --features "native {{features}}"

alias c := check

check:
    cargo check

lint:
    cargo clippy

alias cw := check-wasm

check-wasm:
    cargo check --no-default-features --features="wasm-parallel,no-bundler" --target=wasm32-unknown-unknown

# run a local proxy to the mainnet lightwalletd server on port 443
run-proxy:
    grpcwebproxy  --backend_max_call_recv_msg_size=10485760 --server_http_max_write_timeout=1000s --server_http_max_read_timeout=1000s \
    --backend_addr=zec.rocks:443 --run_tls_server=false --backend_tls --allow_all_origins --server_http_debug_port 443
# run a local proxy to the testnet lightwalletd server on port 443
run-test-proxy:
    grpcwebproxy  --backend_max_call_recv_msg_size=10485760 --server_http_max_write_timeout=1000s --server_http_max_read_timeout=1000s \
    --backend_addr=testnet.zec.rocks:443 --run_tls_server=false --backend_tls --allow_all_origins --server_http_debug_port 443
