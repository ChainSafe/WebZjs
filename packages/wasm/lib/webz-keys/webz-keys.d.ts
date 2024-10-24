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
    __destroy_into_raw(): number | undefined;
    __wbg_ptr: number | undefined;
    free(): void;
    /**
    * @param {number} arg0
    */
    set 0(arg0: number);
    /**
    * @returns {number}
    */
    get 0(): number;
    /**
    * @param {number} arg0
    */
    set 1(arg0: number);
    /**
    * @returns {number}
    */
    get 1(): number;
}
/**
* A Zcash viewing key
*
* This is a wrapper around the `zcash_keys::keys::ViewingKey` type.
* UFVKs should be generated from a spending key by calling `to_unified_full_viewing_key`
* They can also be encoded and decoded to a canonical string representation
*/
export class UnifiedFullViewingKey {
    static __wrap(ptr: any): any;
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
    __destroy_into_raw(): number;
    __wbg_ptr: number;
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
}
/**
* A Zcash spending key
*
* This is a wrapper around the `zcash_keys::keys::SpendingKey` type. It can be created from at least 32 bytes of seed entropy
*/
export class UnifiedSpendingKey {
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
    __destroy_into_raw(): number;
    __wbg_ptr: number;
    free(): void;
    /**
    * Obtain the UFVK corresponding to this spending key
    * @returns {UnifiedFullViewingKey}
    */
    to_unified_full_viewing_key(): UnifiedFullViewingKey;
}
export default __wbg_init;
export function initSync(module: any, memory: any): any;
declare function __wbg_init(module_or_path: any, memory: any): Promise<any>;
