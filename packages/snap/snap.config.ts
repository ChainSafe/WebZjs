import type { SnapConfig } from '@metamask/snaps-cli';
import { resolve } from 'path';

const config: SnapConfig = {
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
