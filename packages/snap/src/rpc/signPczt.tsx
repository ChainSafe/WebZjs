import { Box, Heading, Text } from '@metamask/snaps-sdk/jsx';
import {
  SeedFingerprint,
  UnifiedSpendingKey,
  pczt_sign,
  Pczt,
} from '@webzjs/webz-keys';
import { getSeed } from '../utils/getSeed';
import { SignPcztParams } from 'src/types';



export async function signPczt({ pcztHexTring }: SignPcztParams): Promise<string> {

  const result = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: (
        <Box>
          <Heading>Are you sure you want to sign this PCZT?</Heading>
          <Text>Description</Text>
        </Box>
      ),
    },
  });

  if (!result) {
    throw new Error('User rejected');
  }

  const seed = await getSeed();

  // Generate the UnifiedSpendingKey and obtain the Viewing Key
  const spendingKey = new UnifiedSpendingKey('main', seed, 0);
  const seedFp = new SeedFingerprint(seed);
 
  const pcztBuffer = Buffer.from(pcztHexTring, 'hex');


  const pcztUint8Array = new Uint8Array(pcztBuffer);

  const pczt = Pczt.from_bytes(pcztUint8Array)

  const pcztSigned = await pczt_sign('main', pczt, spendingKey, seedFp);

  const pcztUint8Signed = pcztSigned.serialize();

  const pcztHexStringSigned = Buffer.from(pcztUint8Signed).toString('hex');


  return pcztHexStringSigned;
}