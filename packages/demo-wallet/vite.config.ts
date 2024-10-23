import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // required to support web-workers spawning web-workers
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        worker: "node_modules/@webzjs/webz-wallet/snippets/wasm-bindgen-rayon-3e04391371ad0a8e/src/workerHelpers.worker.js",
      },
    },
    manifest: true,
  },
});
