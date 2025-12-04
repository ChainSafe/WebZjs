import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { etc } from '@noble/secp256k1';

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  if (arrays.length === 1) {
    return arrays[0];
  }
  const totalLength = arrays.reduce((sum, current) => sum + current.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((array) => {
    result.set(array, offset);
    offset += array.length;
  });
  return result;
}

export function ensureHmacSupport(): void {
  if (!etc.hmacSha256Sync) {
    etc.hmacSha256Sync = (key: Uint8Array, ...msgs: Uint8Array[]) => {
      const message = concatUint8Arrays(msgs);
      return hmac(sha256, key, message);
    };
  }
}
