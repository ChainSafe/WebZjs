# WebZjs

![GitHub License](https://img.shields.io/github/license/ChainSafe/WebZjs)

A javascript client library for building Zcash browser wallets

## Overview

WebZjs aims to make it simple to securely interact with Zcash from within the browser. This is primarily to support the development of web wallets and browser plugins. 

Being a private blockchain Zcash places a lot more demands on the wallet than a public blockchain like Ethereum. WebZjs uses everything at its disposal to give efficient sync times and a good user experience.

## Building

### Prerequisites

- [Rust and Cargo](https://www.rust-lang.org/tools/install)
- This repo uses [just](https://github.com/casey/just) as a command runner. Please install this first.
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- Requires clang 17 or later
    - On Mac this can be installed by updating LLVM using your preferred package manager (e.g. macports, brew)
- Tested with Rust nightly-2024-08-07

### Building WebZjs

This just script uses wasm-pack to build a web-ready copy of `webz-core` into the `packages` directory 

```shell
just build
```

### Building and running the demo-wallet

#### Prerequisites

[Install pnpm](https://pnpm.io/installation)

### Building

First build WebZjs with

```shell
just build
```

Install js dependencies with

```shell
pnpm i
```

Build the demo wallet with

```shell
pnpm build
```

Serve it with

```shell
pnpm serve
```

> [!IMPORTANT]  
> For unknown reasons it is currently not possible to use the parcel dev server to serve the demo-wallet hence the build and then serve steps

## Development

### Testing

Browser tests are run in a headless browser environment and can be run with

```shell
just test-web
```

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
