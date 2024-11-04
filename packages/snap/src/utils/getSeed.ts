import { hexStringToUint8Array } from './hexStringToUint8Array';

export async function getSeed(): Promise<Uint8Array> {
  const entropyNode = await snap.request({
    method: 'snap_getBip44Entropy',
    params: { coinType: 133 }, // 133 is the coin type for Zcash https://github.com/satoshilabs/slips/blob/master/slip-0044.md
  });

  if (
    typeof entropyNode !== 'object' ||
    entropyNode === null ||
    !('privateKey' in entropyNode)
  ) {
    throw new Error('Invalid entropy structure received from MetaMask');
  }

  const { privateKey } = entropyNode;
  const validatedKey = validatePrivateKey(privateKey);
  const seed = hexStringToUint8Array(validatedKey);

  if (seed.length !== 32) {
    throw new Error(
      `Invalid seed length: expected 32 bytes, got ${seed.length} bytes`,
    );
  }

  return seed;
}

function validatePrivateKey(privateKey: string | undefined): string {
  if (typeof privateKey !== 'string') {
    throw new Error('privateKey must be a string');
  }

  // Check for '0x' prefix and remove it if present
  if (privateKey.startsWith('0x') || privateKey.startsWith('0X')) {
    privateKey = privateKey.slice(2);
  }

  // Validate the length of privateKey after removing '0x' prefix
  if (privateKey.length !== 64) {
    throw new Error(
      `Invalid privateKey length: expected 64 characters without prefix, got ${privateKey.length}`,
    );
  }

  // Validate that privateKey contains only valid hex characters
  if (!/^[0-9a-fA-F]+$/.test(privateKey)) {
    throw new Error('privateKey contains invalid characters');
  }

  return privateKey;
}
