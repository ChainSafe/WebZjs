import type { InitOutput } from '@chainsafe/webzjs-keys';
import { initSync } from '@chainsafe/webzjs-keys';
import wasmDataBase64 from '@chainsafe/webzjs-keys/webzjs_keys_bg.wasm';

export function initialiseWasm(): InitOutput {
  const base64String = wasmDataBase64 as unknown as string;
  // Check if the imported data is a data URL
  const base64Formatted = base64String.startsWith('data:')
    ? base64String.split(',')[1]
    : base64String;

  if (!base64Formatted) {
    throw new Error('Invalid WASM data');
  }

  const wasmData = Buffer.from(base64Formatted, 'base64');
  return initSync({ module: wasmData });
}
