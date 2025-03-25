import {
  SeedFingerprint,
} from '@webzjs/webz-keys';
import { getSeed } from '../utils/getSeed';

export async function getSeedFingerprint(): Promise<string> {

  const seed = await getSeed();

  const seedFingerprint = new SeedFingerprint(seed);

  const seedFingerprintUint8 = seedFingerprint.to_bytes();

  const seedFingerprintHexString = Buffer.from(seedFingerprintUint8).toString('hex');

  console.log("seedFingerprintHexString__________")
  console.log(seedFingerprintHexString)

  return seedFingerprintHexString;
}