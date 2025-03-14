import type { SnapConfig } from '@metamask/snaps-cli';
import { resolve } from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const config: SnapConfig = {
  environment: {
    SNAP_ENV: process.env.SNAP_ENV,
  },
  bundler: 'webpack',
  customizeWebpackConfig: (config) => {
    config.module?.rules?.push({
      test: /\.wasm$/,
      type: 'asset/inline',
    });
    return config;
  },
  input: resolve(__dirname, 'src/index.tsx'),
  server: {
    port: 8080,
  },
  polyfills: {
    buffer: true,
  },
};

export default config;
