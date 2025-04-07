#!/bin/bash

# Create the directory if it doesn't exist
mkdir -p packages/webz-wallet/snippets/wasm_thread-8ee53d0673203880/src/wasm32/js

# Create the worker module file
cat > packages/webz-wallet/snippets/wasm_thread-8ee53d0673203880/src/wasm32/js/web_worker_module.bundler.js << 'EOL'
// synchronously, using the browser, import wasm_bindgen shim JS scripts
import init, { wasm_thread_entry_point } from "../../../../../";
// Wait for the main thread to send us the shared module/memory and work context.
// Once we've got it, initialize it all with the `wasm_bindgen` global we imported via
// `importScripts`.
self.onmessage = event => {
     let [ module, memory, work, thread_key ] = event.data;
    init(module, memory).catch(err => {
        console.log(err);
        const error = new Error(err.message);
        error.customProperty = "This error right here!";
        // Propagate to main `onerror`:
        setTimeout(() => {
            throw error;
        });
        // Rethrow to keep promise rejected and prevent execution of further commands:
        throw error;
    }).then(() => {
        // Enter rust code by calling entry point defined in `lib.rs`.
        // This executes closure defined by work context.
        wasm_thread_entry_point(work);
    });
};
self.onunhandledrejection = function(e) {
    console.error('Worker unhandled rejection:', e.reason);
    throw e.reason;
};
self.onerror = function(e) {
    console.error('Worker error:', e.message);
    throw e;
};

self.onended = function(e) {
    console.error('Worker ended:', e.message);
    throw e;
}
EOL