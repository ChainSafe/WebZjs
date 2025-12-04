import { Box, Text } from '@metamask/snaps-sdk/jsx';
import { ensureDerivationPath, requestPrivateKey, splitDerivationPath } from '../utils/derivation';
import { getPublicKey } from '@noble/secp256k1';
import { snapConfirm } from '../utils/dialogs';

export async function getTransparentPublicKey({ derivationPath }: { derivationPath: string }, origin: string): Promise<string> {
  ensureDerivationPath(derivationPath);

  const confirmed = await snapConfirm({
    title: 'Access to ZIP-48 public key',
    prompt: (
      <Box>
        <Text>Origin: {origin}</Text>
        <Text>Derivation path: {derivationPath}</Text>
      </Box>
    )
  });

  if (!confirmed) {
    throw new Error('User rejected the request');
  }

  const pathSegments = splitDerivationPath(derivationPath);
  const privateKey = await requestPrivateKey(pathSegments);
  const publicKey = getPublicKey(privateKey, true);
  return uint8ArrayToHex(publicKey);
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

