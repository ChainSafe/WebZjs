default:
    just --list

build:
    wasm-pack build -t web  --release --out-dir ./packages/webz

test-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999  wasm-pack test --release --headless --chrome
