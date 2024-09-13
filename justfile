default:
    just --list




build:
    wasm-pack build -t web  --release --out-dir ./packages/webz-core -Z --no-default-features --features="wasm-parallel,no-bundler" build-std="panic_abort,std"

test-web:
    WASM_BINDGEN_TEST_TIMEOUT=99999 wasm-pack test --release --firefox --no-default-features --features="wasm-parallel,no-bundler" -Z build-std="panic_abort,std"

test-native:
    cargo test -r -- --nocapture

alias c := check

check:
    cargo check 

alias cw := check-wasm

check-wasm:
    cargo check --no-default-features --features="wasm-parallel,no-bundler" --target=wasm32-unknown-unknown

