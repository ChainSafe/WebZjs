#!/bin/bash

# Find the wasm_thread directory regardless of the hash
WASM_THREAD_DIR=$(find packages/webzjs-wallet/snippets -type d -name "wasm_thread-*" | head -n 1)

if [ -z "$WASM_THREAD_DIR" ]; then
    echo "Error: Could not find wasm_thread directory"
    exit 1
fi

# Create the directory structure
mkdir -p "$WASM_THREAD_DIR/src/wasm32/js"

# Create the worker module file
cat > "$WASM_THREAD_DIR/src/wasm32/js/web_worker_module.bundler.js" << 'EOL'
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

echo "Added worker module to: $WASM_THREAD_DIR/src/wasm32/js/web_worker_module.bundler.js"
