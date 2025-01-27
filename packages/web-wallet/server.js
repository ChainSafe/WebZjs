import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Parcel } from '@parcel/core';
import history from 'connect-history-api-fallback';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  console.log('Starting server...', process.env.SNAP_ORIGIN);

  const bundler = new Parcel({
    entries: 'index.html',
    defaultConfig: '@parcel/config-default',
    sourceMaps: true,
    mode: 'development',
    defaultTargetOptions: {
      distDir: 'dist',
    },
  });

  // Watch in background
  await bundler.watch((err) => {
    if (err) {
      console.error('Build error:', err.diagnostics);
    } else {
      console.log('Parcel build successful');
    }
  });

  const app = express();

  // Set custom headers (for WASM multi-threading)
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
  });

  app.use(history());
  app.use(express.static(join(__dirname, 'dist')));

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
