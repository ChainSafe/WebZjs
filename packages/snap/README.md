# WebZjs Zcash Snap

## 🔐 Overview

WebZjs Zcash Snap is a MetaMask Snap that brings Zcash functionality directly into the MetaMask browser extension. WebZjs is the first JavaScript SDK for Zcash, enabling seamless integration of Zcash privacy features for web users.

## 📘 Project Description

Snap uses a Rust library [WebZjs](https://github.com/ChainSafe/WebZjs) compiled to WebAssembly (Wasm). It is meant to be used in conjunction with WebZjs web-wallet.

## 🛠 Prerequisites

[WebZjs](https://github.com/ChainSafe/WebZjs)

- Node.js
- Yarn
- MetaMask Browser Extension (MetaMask Flask for development purposes) [Install MM Flask](https://docs.metamask.io/snaps/get-started/install-flask/)

## 🔨 Development

For local development, you need to add `http://localhost:3000` to the `allowedOrigins` in `snap.manifest.json`. The `endowment:rpc` section should look like this:

```json
"endowment:rpc": {
  "allowedOrigins": ["https://webzjs.chainsafe.dev", "http://localhost:3000"]
}
```

### Build Scripts

- **`yarn build`** - Standard build for production (only allows production origins)
- **`yarn build:local`** - Build for local development (automatically adds localhost:3000 to allowedOrigins)
- **`yarn build:prePublish`** - Pre-publish build that ensures `allowedOrigins` is reset to `["https://webzjs.chainsafe.dev"]` and then runs `mm-snap build`

The `build:local` script will:
1. Create a backup of the original `snap.manifest.json`
2. Modify the manifest to include `http://localhost:3000` in allowedOrigins
3. Run the build process

The `build:prePublish` script will:
1. Overwrite `allowedOrigins` in `snap.manifest.json` to only `["https://webzjs.chainsafe.dev"]`
2. Run the production build via `mm-snap build`

### Development Steps

1. Install dependencies with `yarn install`
2. For local development: Build with `yarn build:local`
3. For production: Build with `yarn build`
4. Host snap on localhost http://localhost:8080 `yarn serve`
