# WebZjs Zcash Snap

## 🔐 Overview

WebZjs Zcash Snap is a MetaMask Snap that brings Zcash functionality directly into the MetaMask browser extension. WebZjs is the first JavaScript SDK for Zcash, enabling seamless integration of Zcash privacy features for web users.

## 📘 Project Description

Snap uses a Rust library [WebZjs](https://github.com/ChainSafe/WebZjs) compiled to WebAssembly (Wasm). It is meant to be used in conjunction with WebZjs web-wallet.

## 🛠 Prerequisites

[WebZjs](https://github.com/ChainSafe/WebZjs)

- Node.js
- Yarn
- MetaMask Browser Extension (Metamask Flask for development purposes) [Install MM Flask](https://docs.metamask.io/snaps/get-started/install-flask/)

## 🔨 Development

1. Install dependencies with `yarn install`
2. Build the project with `yarn build`
3. Host snap on localhost http://localhost:8080 `yarn serve`
