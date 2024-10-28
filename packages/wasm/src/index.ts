import init, { UnifiedSpendingKey } from '@webzjs/webz-keys/webz-keys';
import wasmBinary from '@webzjs/webz-keys/webz-keys_bg.wasm';
import { InitOutput } from '@webzjs/webz-keys';
import { UnifiedFullViewingKey } from '@webzjs/webz-keys/webz-keys';

/**
 *
 */
async function initializeWasm(): Promise<InitOutput> {
  // Initialize the module with the binary data
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const wasmModule = await WebAssembly.compile(wasmBinary);
    return await init(wasmModule);
  } catch (error) {
    console.error('WASM Init failed', error);
    throw error;
  }
}

// Export the initialized module
export const wasmExportsPromise: Promise<InitOutput> = initializeWasm();

/**
 *
 * @param seed
 * @param account
 * @param network
 */
export async function generateViewingKey(
  seed: Uint8Array,
  account: number,
  network = 'test',
): Promise<UnifiedFullViewingKey> {
  if (!(await wasmExportsPromise)) {
    throw new Error('WASM module not initialized');
  }
  const spendingKey = new UnifiedSpendingKey(network, seed, account);
  return spendingKey.to_unified_full_viewing_key();
}

// Export the initialized WASM module
export * from '@webzjs/webz-keys/webz-keys';
