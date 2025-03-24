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
  const spendingKey = new UnifiedSpendingKey('main', seed, 1);
  const seedFp = new SeedFingerprint(seed);

  console.log("pcztHexTring")
  console.log(pcztHexTring)
 
  const pcztBuffer = Buffer.from(pcztHexTring, 'hex');


  const pcztUint8Array = new Uint8Array(pcztBuffer);

  console.log("pcztUint8Array")
  console.log(typeof pcztUint8Array)
  console.log(pcztUint8Array)

  const pczt = Pczt.from_bytes(pcztUint8Array)

  console.log("pczt")
  console.log(pczt)

  const pcztSigned = await pczt_sign('main', pczt, spendingKey, seedFp);


  console.log("pcztSigned")
  console.log(pcztSigned)

  const pcztUint8Signed = pcztSigned.serialize();

  console.log("pcztUint8Signed")
  console.log(pcztUint8Signed)

  const pcztHexStringSigned = Buffer.from(pcztUint8Signed).toString('hex');


  return pcztHexStringSigned;
}