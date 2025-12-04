import { Box, Divider, Heading, Text } from '@metamask/snaps-sdk/jsx';
import { snapConfirm } from '../utils/dialogs';
import {
  SignTransparentMessageParams,
  SignTransparentMessageResult,
  TransparentNetwork,
} from '../types';
import { ensureDerivationPath, requestPrivateKey, splitDerivationPath } from '../utils/derivation';
import { ensureHmacSupport } from '../utils/secp256k1';
import { getPublicKey, sign, verify } from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import bs58check from 'bs58check';
import { Buffer } from 'buffer';

const MESSAGE_MAGIC = 'Zcash Signed Message:\n';
const COMPRESSED_KEY_FLAG = 4;
const NETWORK_ORDER: TransparentNetwork[] = ['mainnet', 'testnet'];

const P2PKH_PREFIX: Record<TransparentNetwork, number> = {
  mainnet: 0x1cb8,
  testnet: 0x1d25,
};

const textEncoder = new TextEncoder();

export async function signTransparentMessage(
  params: SignTransparentMessageParams,
  origin: string,
): Promise<SignTransparentMessageResult> {
  ensureHmacSupport();
  ensureDerivationPath(params.derivationPath);

  const message = params.message ?? '';
  if (message.length === 0) {
    throw new Error('Message is empty; nothing to sign');
  }

  const network = normalizeNetwork(params.network);

  const confirmed = await snapConfirm({
    title: 'Sign message (transparent)',
    prompt: (
      <Box>
        <Heading>Transparent Message Signing</Heading>
        <Divider />
        <Text>Origin: {origin}</Text>
        <Text>Network: {network}</Text>
        <Text>Derivation path: {params.derivationPath}</Text>
        <Divider />
        <Text>Message:</Text>
        <Text>{truncateMultiline(message, 180)}</Text>
      </Box>
    ),
  });

  if (!confirmed) {
    throw new Error('User rejected message signing');
  }

  const derivationPathSegments = splitDerivationPath(params.derivationPath);
  const privateKey = await requestPrivateKey(derivationPathSegments);
  const digest = buildMessageDigest(message);
  const signature = sign(digest, privateKey);
  const compactSignature = signature.toCompactRawBytes();
  const recovery = signature.recovery ?? 0;

  const signatureWithHeader = new Uint8Array(65);
  signatureWithHeader[0] = 27 + recovery + COMPRESSED_KEY_FLAG;
  signatureWithHeader.set(compactSignature, 1);

  const publicKey = getPublicKey(privateKey, true);
  const derivedAddress = deriveP2pkhAddress(publicKey, network);
  console.log('derivedAddress SNAP', publicKey,derivedAddress);
  const normalizedExpected = params.expectedAddress?.trim();
  if (normalizedExpected && normalizedExpected !== derivedAddress) {
    throw new Error('Derived address does not match the provided expectedAddress');
  }
  const onDeviceVerification = verify(signature, digest, publicKey);
  console.log(
    `[snap] Message signature verification for PK ${bytesToHex(publicKey)}: ${onDeviceVerification}`,
  );

  return {
    signature: bytesToBase64(signatureWithHeader),
    address: derivedAddress,
    publicKey: bytesToHex(publicKey),
    message,
    derivationPath: params.derivationPath,
    network,
  };
}

function buildMessageDigest(message: string): Uint8Array {
  const magicBytes = textEncoder.encode(MESSAGE_MAGIC);
  const messageBytes = textEncoder.encode(message);
  const payload = concatBytes([
    encodeCompactSize(magicBytes.length),
    magicBytes,
    encodeCompactSize(messageBytes.length),
    messageBytes,
  ]);
  return sha256(sha256(payload));
}

function encodeCompactSize(value: number): Uint8Array {
  if (value < 0xfd) {
    return Uint8Array.of(value);
  }
  if (value <= 0xffff) {
    return Uint8Array.of(0xfd, value & 0xff, (value >> 8) & 0xff);
  }
  if (value <= 0xffffffff) {
    return Uint8Array.of(
      0xfe,
      value & 0xff,
      (value >> 8) & 0xff,
      (value >> 16) & 0xff,
      (value >> 24) & 0xff,
    );
  }
  const big = BigInt(value);
  const result = new Uint8Array(9);
  result[0] = 0xff;
  for (let i = 0; i < 8; i += 1) {
    result[i + 1] = Number((big >> BigInt(8 * i)) & 0xffn);
  }
  return result;
}

function concatBytes(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, current) => sum + current.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((array) => {
    result.set(array, offset);
    offset += array.length;
  });
  return result;
}

function deriveP2pkhAddress(publicKey: Uint8Array, network: TransparentNetwork): string {
  const prefix = P2PKH_PREFIX[network];
  const hash = ripemd160(sha256(publicKey));
  const payload = Buffer.allocUnsafe(2 + hash.length);
  payload.writeUInt16BE(prefix, 0);
  Buffer.from(hash).copy(payload, 2);
  return bs58check.encode(payload);
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function truncateMultiline(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function normalizeNetwork(network?: TransparentNetwork): TransparentNetwork {
  if (network && NETWORK_ORDER.includes(network)) {
    return network;
  }
  return 'testnet';
}


