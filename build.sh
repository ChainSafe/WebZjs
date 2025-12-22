#!/bin/bash
set -e

echo "Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain nightly-2025-01-07
source "$HOME/.cargo/env"

echo "Installing wasm-pack..."
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

echo "Installing Just..."
cargo install just

echo "Installing Node.js dependencies..."
corepack enable

# Use immutable install for reproducible builds (warnings about peer deps are non-blocking)
yarn install --immutable || {
    echo "⚠️  Immutable install failed, trying regular install..."
    yarn install
}

echo "Building Rust WASM modules..."
just build

echo "Building web wallet..."
# Run build from the web-wallet directory to ensure proper module resolution
# This ensures Parcel resolves workspace dependencies correctly
(cd packages/web-wallet && yarn build)

echo "Build complete!"

