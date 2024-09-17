default:
    just --list




build:
    wasm-pack build -t web  --release --out-dir ./packages/webz-core -Z --no-default-features --features="wasm-parallel,no-bundler" build-std="panic_abort,std"

## Wasm Tests
test-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features="wasm-parallel,no-bundler" -Z build-std="panic_abort,std"


test-message-board-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features="wasm-parallel,no-bundler" -Z build-std="panic_abort,std" --test message-board-sync
    
test-simple-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features="wasm-parallel,no-bundler" -Z build-std="panic_abort,std" --test simple-sync-and-send


## Native Examples
example-simple:
    cargo run -r --example simple-sync

example-simple-sqlite:
    cargo run -r --example simple-sync --features="sqlite-db"

example-message-board:
   cargo run -r --example message-board-sync

example-message-board-sqlite:
  cargo run -r --example message-board-sync --features="sqlite-db"

alias c := check

check:
    cargo check 

alias cw := check-wasm

check-wasm:
    cargo check --no-default-features --features="wasm-parallel,no-bundler" --target=wasm32-unknown-unknown

# run a local proxy to the lightwalletd server on port 443
run-proxy:
    grpcwebproxy  --backend_max_call_recv_msg_size=10485760 --server_http_max_write_timeout=1000s --server_http_max_read_timeout=1000s \
    --backend_addr=zec.rocks:443 --run_tls_server=false --backend_tls --allow_all_origins --server_http_debug_port 443
# run a local proxy to the lightwalletd server on port 443
run-test-proxy:
    grpcwebproxy  --backend_max_call_recv_msg_size=10485760 --server_http_max_write_timeout=1000s --server_http_max_read_timeout=1000s \
    --backend_addr=testnet.zec.rocks:443 --run_tls_server=false --backend_tls --allow_all_origins --server_http_debug_port 443
