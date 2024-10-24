import { InitOutput } from '@webzjs/webz-keys';
import { UnifiedFullViewingKey } from '@webzjs/webz-keys/webz-keys';
export declare const wasmExportsPromise: Promise<InitOutput>;
/**
 *
 * @param seed
 * @param account
 * @param network
 */
export declare function generateViewingKey(seed: Uint8Array, account: number, network?: string): Promise<UnifiedFullViewingKey>;
export * from '@webzjs/webz-keys/webz-keys';
