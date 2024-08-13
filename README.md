# WebZjs

![GitHub License](https://img.shields.io/github/license/ChainSafe/WebZjs)

A performant javascript client library for building Zcash browser wallets

## Overview

WebZjs aims to make it simple to securely interact with Zcash from within the browser. This is primarily to support the development of web wallets and browser plugins. 

Being a private blockchain Zcash places a lot more demands on the wallet than a public blockchain like Ethereum. WebZjs uses everything at its disposal to give efficient sync times and a good user experience.

## Usage

```typescript
// TODO
```

## Building

### Prerequisites

- This repo uses [just](https://github.com/casey/just) as a command runner. Please install this first.
- Install [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- Requires clang 17 or later
    - On Mac this can be installed by updating LLVM using your preferred package manager (e.g. macports, brew)
- Tested with Rust nightly-2024-08-07

### Building for Browser

This just script uses wasm-pack to build a web-ready javascript library.

```shell
just build-web
```

After building the resulting lib can be found in `packages/webz-core`.

## Development

The [`.cargo/config.toml`](./.cargo/config.toml) file sets the build target to `wasm32-unknown-unknown` so the regular cargo commands (e.g. `check`, `build`) will run against this target.

### Testing

Tests are run in a headless browser environment and can be run with

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
