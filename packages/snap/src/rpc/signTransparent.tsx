import { Box, Divider, Heading, Text } from '@metamask/snaps-sdk/jsx';
import { SignTransparentParams } from '../types';
import { hexStringToUint8Array } from '../utils/hexStringToUint8Array';
import { snapConfirm } from '../utils/dialogs';
import { assert, array, object, optional, string } from 'superstruct';
import { Signature, sign } from '@noble/secp256k1';
import { ensureDerivationPath, requestPrivateKey, splitDerivationPath } from '../utils/derivation';
import { ensureHmacSupport } from '../utils/secp256k1';

const SIGHASH_ALL = 0x01;

const SignTransparentStruct = object({
  derivationPath: string(),
  sighashes: array(string()),
  details: object({
    toAddress: string(),
    amount: string(),
    network: string()
  }),
  metadata: optional(
    object({
      redeemScript: optional(string())
    })
  )
});

export async function signTransparent(params: SignTransparentParams, origin: string): Promise<string[]> {
  ensureHmacSupport();
  assert(params, SignTransparentStruct);
  ensureDerivationPath(params.derivationPath);

  const confirmed = await snapConfirm({
    title: 'Transparent transaction signing',
    prompt: (
      <Box>
        <Heading>Transparent Multisig</Heading>
        <Divider />
        <Text>Origin: {origin}</Text>
        <Text>Recipient: {params.details.toAddress}</Text>
        <Text>Amount: {params.details.amount} ZEC</Text>
        <Text>Network: {params.details.network}</Text>
      </Box>
    )
  });

  if (!confirmed) {
    throw new Error('User rejected signing');
  }

  const derivationPathSegments = splitDerivationPath(params.derivationPath);
  const privateKey = await requestPrivateKey(derivationPathSegments);

  const signatures = params.sighashes.map((hashHex) => {
    if (typeof hashHex !== 'string' || hashHex.length !== 64) {
      throw new Error('Invalid sighash');
    }
    const digest = hexStringToUint8Array(hashHex);
    const signature = sign(digest, privateKey);
    const derSignature = signatureToDer(signature);
    const fullSignature = new Uint8Array(derSignature.length + 1);
    fullSignature.set(derSignature, 0);
    fullSignature[derSignature.length] = SIGHASH_ALL;
    return uint8ArrayToHex(fullSignature);
  });

  return signatures;
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function signatureToDer(signature: Signature): Uint8Array {
  const r = normalizeDerComponent(signature.r);
  const s = normalizeDerComponent(signature.s);
  const length = 2 + r.length + 2 + s.length;
  const result = new Uint8Array(2 + length);
  let offset = 0;
  result[offset++] = 0x30;
  result[offset++] = length;
  result[offset++] = 0x02;
  result[offset++] = r.length;
  result.set(r, offset);
  offset += r.length;
  result[offset++] = 0x02;
  result[offset++] = s.length;
  result.set(s, offset);
  return result;
}

function normalizeDerComponent(value: bigint): Uint8Array {
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = `0${hex}`;
  }
  const bytes = hexStringToUint8Array(hex);
  let sliceIndex = 0;
  while (
    sliceIndex < bytes.length - 1 &&
    bytes[sliceIndex] === 0x00 &&
    (bytes[sliceIndex + 1] & 0x80) === 0
  ) {
    sliceIndex += 1;
  }
  const trimmed = bytes.slice(sliceIndex);
  if ((trimmed[0] & 0x80) !== 0) {
    const prefixed = new Uint8Array(trimmed.length + 1);
    prefixed[0] = 0x00;
    prefixed.set(trimmed, 1);
    return prefixed;
  }
  return trimmed;
}

