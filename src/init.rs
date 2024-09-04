// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use wasm_bindgen::prelude::*;

use tracing_subscriber::fmt::format::Pretty;
use tracing_subscriber::prelude::*;
use tracing_web::{performance_layer, MakeWebConsoleWriter};

fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

fn setup_tracing() {
    let subscriber = tracing_subscriber::fmt()
        .with_ansi(false)
        .with_writer(MakeWebConsoleWriter::new())
        .finish();
    tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");
}

#[wasm_bindgen(start)]
pub fn start() {
    set_panic_hook();
    setup_tracing();
}
