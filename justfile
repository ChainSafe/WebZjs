default:
    just --list

build:
    wasm-pack build -t web  --release --out-dir ./packages/webz-core

test-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox

check:
    cargo check
