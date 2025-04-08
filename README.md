# WebZjs

![GitHub License](https://img.shields.io/github/license/ChainSafe/WebZjs)
![Static Badge](https://img.shields.io/badge/ReadTheDocs-green?link=https%3A%2F%2Fchainsafe.github.io%2FWebZjs%2F)

A javascript client library for building Zcash browser wallets

## Overview

WebZjs aims to make it simple to securely interact with Zcash from within the browser. This is primarily to support the development of web wallets and browser plugins. 

Being a private blockchain Zcash places a lot more demands on the wallet than a public blockchain like Ethereum. WebZjs uses everything at its disposal to give efficient sync times and a good user experience.

## Quickstart

Add the `@chainsafe/webzjs-wallet` package to your javascript project.

Before using the library it is important to initialize the Wasm module and the thread pool.

> [!IMPORTANT]
> Make sure you call these functions exactly once.
> Failing to call them or calling them more than once per page load will result in an error

```javascript
import initWasm, { initThreadPool, WebWallet } from "@chainsafe/webzjs-wallet";

initWasm();
initThreadPool(8); // can set any number of threads here, ideally match it to window.navigator.hardwareConcurrency
```

Once this has been done we can create a WebWallet instance. You can theoretically have multiple of these per application but most cases will only want one. A single wallet can handle multiple Zcash accounts.

> [!IMPORTANT]
> When constructing a WebWallet it requires a lightwalletd URL. To work in the web these need to be a special gRPC-web proxy to a regular lightwalletd instance. Using an unproxied URL (e.g. https://zec.rocks) will NOT work. ChainSafe currently hosts a gRPC-web lightwalletd proxy and it is easy to deploy more. You can also run your own proxy locally by running `docker-compose up` in this repo.

```javascript
let wallet = new WebWallet("main", "https://zcash-mainnet.chainsafe.dev", 1);
```

Once you have a wallet instance it needs an account. Accounts can be added in a number of different ways. Here an account will be added from a 24 word seed phrase

```javascript
await wallet.create_account("<24 words here>", 0, birthdayHeight);
```

and once an account is added the wallet can sync to the network.

```javascript
await wallet.sync();
```

The sync process can take a long time depending on the wallet age and usage. This runs in a webworker so will not block the main. It is safe to trigger the sync process and then interact with the wallet using other methods while the sync runs in the background.

For more details check out the hosted docs at https://chainsafe.github.io/WebZjs/

## Building

### Prerequisites

- [Rust and Cargo](https://www.rust-lang.org/tools/install)
- This repo uses [just](https://github.com/casey/just) as a command runner. Please install this first.
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- Requires clang 17 or later
    - On Mac this can be installed by updating LLVM using your preferred package manager (e.g. macports, brew)
- Tested with Rust nightly-2024-08-07

### Building WebZjs

This just script uses wasm-pack to build a web-ready copy of `webzjs-wallet` and `webzjs-keys` into the `packages` directory 

```shell
just build
```

#### Prerequisites

[Install yarn](https://yarnpkg.com/getting-started/install)

### Building

First build WebZjs with

```shell
just build
```

Install js dependencies with

```shell
yarn
```

## Development

### Building and running WebZjs Zcash Snap locally

```shell
cd packages/snap
yarn build
yarn serve
```

### Building and running WebZjs Web-wallet locally

```shell
cd packages/web-wallet
yarn build
yarn dev
```

### Testing

Browser tests are run in a headless browser environment and can be run with

```shell
just test-web
```

## Known Issues



## Security Warnings

These libraries are currently under development, have received no reviews or audit, and come with no guarantees whatsoever.

## License

All code in this workspace is licensed under either of

 * Apache License, Version 2.0, ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
 * MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally
submitted for inclusion in the work by you, as defined in the Apache-2.0
license, shall be dual licensed as above, without any additional terms or
conditions.
