// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use tracing::level_filters::LevelFilter;
use wasm_bindgen::prelude::*;

use tracing_subscriber::fmt::format::Pretty;
use tracing_subscriber::{prelude::*, EnvFilter};
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
    let filter = EnvFilter::default()
        .add_directive(LevelFilter::INFO.into()) // The default directive
        .add_directive("zcash_client_backend=debug".parse().unwrap());

    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_ansi(false) // Only partially supported across browsers
        .without_time() // std::time is not available in browsers
        .with_writer(MakeWebConsoleWriter::new()); // write events to the console
    let perf_layer = performance_layer().with_details_from_fields(Pretty::default());

    tracing_subscriber::registry()
        .with(filter)
        .with(fmt_layer)
        .with(perf_layer)
        .init();
}

#[wasm_bindgen(start)]
pub fn start() {
    set_panic_hook();
    setup_tracing();
}
