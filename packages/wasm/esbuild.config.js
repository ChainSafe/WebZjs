import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import dts from 'esbuild-plugin-d.ts';

esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    outdir: 'lib',
    format: 'esm',
    sourcemap: false,
    target: 'es2020',
    platform: 'neutral',
    define: { globals: 'window'},
    plugins: [dts({ outDir: 'lib' })],
    loader: {
      '.ts': 'ts',
      '.js': 'js',
      '.wasm': 'binary',
    },
    logLevel: 'info',
  })
  .then(() => {
    // Ensure the .wasm file is in the lib directory
    fs.copyFileSync(
      path.resolve('src', 'webz-keys/webz-keys_bg.wasm'),
      path.resolve('lib', 'webz-keys_bg.wasm'),
    );
    // Copy declarations
    fs.copyFileSync(
      path.resolve('src', 'webz-keys/webz-keys.d.ts'),
      path.resolve('lib', 'webz-keys.d.ts'),
    );
  })
  .catch(() => process.exit(1));
