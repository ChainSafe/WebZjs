import { hexStringToUint8Array } from './hexStringToUint8Array';

export function ensureDerivationPath(path: string): void {
  if (!path || !path.startsWith('m/')) {
    throw new Error('Derivation path must start with m/');
  }
}

export function splitDerivationPath(path: string): string[] {
  ensureDerivationPath(path);
  return path.split('/').filter((segment) => segment.length > 0);
}

export async function requestPrivateKey(path: string[]): Promise<Uint8Array> {
  const entropyNode = (await snap.request({
    method: 'snap_getBip32Entropy',
    params: {
      path,
      curve: 'secp256k1',
    },
  })) as { privateKey: string };

  if (!entropyNode || typeof entropyNode.privateKey !== 'string') {
    throw new Error('MetaMask did not return a private key for the specified path');
  }

  return hexStringToUint8Array(entropyNode.privateKey);
}
