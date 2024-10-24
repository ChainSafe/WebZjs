/* tslint:disable */
/* eslint-disable */
/**
* Generate a new BIP39 24-word seed phrase
*
* IMPORTANT: This probably does not use secure randomness when used in the browser
* and should not be used for anything other than testing
*
* # Returns
*
* A string containing a 24-word seed phrase
* @returns {string}
*/
export function generate_seed_phrase(): string;
/**
*/
export function start(): void;
/**
* @param {number} _threads
*/
export function initThreadPool(_threads: number): void;
/**
*/
export class BlockRange {
  free(): void;
/**
*/
  0: number;
/**
*/
  1: number;
}
/**
* A Zcash viewing key
*
* This is a wrapper around the `zcash_keys::keys::ViewingKey` type.
* UFVKs should be generated from a spending key by calling `to_unified_full_viewing_key`
* They can also be encoded and decoded to a canonical string representation
*/
export class UnifiedFullViewingKey {
  free(): void;
/**
* Encode the UFVK to a string
*
* # Arguments
*
* * `network` - Must be either "main" or "test"
* @param {string} network
* @returns {string}
*/
  encode(network: string): string;
/**
* Construct a UFVK from its encoded string representation
*
* # Arguments
*
* * `network` - Must be either "main" or "test"
* * `encoding` - The encoded string representation of the UFVK
* @param {string} network
* @param {string} encoding
*/
  constructor(network: string, encoding: string);
}
/**
* A Zcash spending key
*
* This is a wrapper around the `zcash_keys::keys::SpendingKey` type. It can be created from at least 32 bytes of seed entropy
*/
export class UnifiedSpendingKey {
  free(): void;
/**
* Construct a new UnifiedSpendingKey
*
* # Arguments
*
* * `network` - Must be either "main" or "test"
* * `seed` - At least 32 bytes of entry. Care should be taken as to how this is derived
* * `hd_index` - [ZIP32](https://zips.z.cash/zip-0032) hierarchical deterministic index of the account
* @param {string} network
* @param {Uint8Array} seed
* @param {number} hd_index
*/
  constructor(network: string, seed: Uint8Array, hd_index: number);
/**
* Obtain the UFVK corresponding to this spending key
* @returns {UnifiedFullViewingKey}
*/
  to_unified_full_viewing_key(): UnifiedFullViewingKey;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly __wbg_unifiedspendingkey_free: (a: number, b: number) => void;
  readonly unifiedspendingkey_new: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly unifiedspendingkey_to_unified_full_viewing_key: (a: number) => number;
  readonly __wbg_unifiedfullviewingkey_free: (a: number, b: number) => void;
  readonly unifiedfullviewingkey_encode: (a: number, b: number, c: number, d: number) => void;
  readonly unifiedfullviewingkey_new: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly generate_seed_phrase: (a: number) => void;
  readonly start: () => void;
  readonly initThreadPool: (a: number) => void;
  readonly __wbg_blockrange_free: (a: number, b: number) => void;
  readonly __wbg_get_blockrange_0: (a: number) => number;
  readonly __wbg_set_blockrange_0: (a: number, b: number) => void;
  readonly __wbg_get_blockrange_1: (a: number) => number;
  readonly __wbg_set_blockrange_1: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_8_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_8_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_8_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_8_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly memory: WebAssembly.Memory;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void;
  readonly __wbindgen_start: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number }} module - Passing `SyncInitInput` directly is deprecated.
* @param {WebAssembly.Memory} memory - Deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number } | SyncInitInput, memory?: WebAssembly.Memory): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number }} module_or_path - Passing `InitInput` directly is deprecated.
* @param {WebAssembly.Memory} memory - Deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number } | InitInput | Promise<InitInput>, memory?: WebAssembly.Memory): Promise<InitOutput>;
