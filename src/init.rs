// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

use wasm_bindgen::prelude::*;

use tracing::level_filters::LevelFilter;

use tracing_subscriber::prelude::*;
use tracing_subscriber::EnvFilter;

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
    #[cfg(not(feature = "wasm"))]
    let subscriber = {
        let filter_layer = EnvFilter::builder()
            .with_default_directive(LevelFilter::INFO.into())
            .from_env()
            .unwrap();
        let fmt_layer = tracing_subscriber::fmt::layer().with_ansi(true);
        tracing_subscriber::registry()
            .with(filter_layer)
            .with(fmt_layer)
    };

    #[cfg(feature = "wasm")]
    let subscriber = {
        use tracing_subscriber::fmt::format::Pretty;
        use tracing_web::{performance_layer, MakeWebConsoleWriter};

        // For WASM, we must set the directives here at compile time.
        let filter_layer = EnvFilter::default()
            .add_directive(LevelFilter::INFO.into())
            .add_directive("zcash_client_backend=debug".parse().unwrap());

        let fmt_layer = tracing_subscriber::fmt::layer()
            .with_ansi(false) // Only partially supported across browsers
            .without_time() // std::time is not available in browsers
            .with_writer(MakeWebConsoleWriter::new()); // write events to the console

        let perf_layer = performance_layer().with_details_from_fields(Pretty::default());

        tracing_subscriber::registry()
            .with(filter_layer)
            .with(fmt_layer)
            .with(perf_layer)
    };

    subscriber.init();
}

#[wasm_bindgen(start)]
pub fn start() {
    set_panic_hook();
    setup_tracing();
}
