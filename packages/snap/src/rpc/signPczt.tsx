import { Box, Heading, Text } from '@metamask/snaps-sdk/jsx';
import {
  SeedFingerprint,
  UnifiedSpendingKey,
  pczt_sign,
  Pczt,
} from '@webzjs/webz-keys';
import { getSeed } from '../utils/getSeed';
import { Json } from '@metamask/snaps-sdk';
import { SignPcztParams } from 'src/types';



export async function signPczt({ pcztJsonStringified }: SignPcztParams): Promise<Json> {

  const result = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: (
        <Box>
          <Heading>Are you sure you want to sign this PCZT?</Heading>
          <Text>{pcztJsonStringified}</Text>
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

  console.log("pcztJsonStringified")
  console.log(pcztJsonStringified)

  const pcztJsonObject = JSON.parse(pcztJsonStringified, (value) => JSON.parse(JSON.stringify(value, (key, value) =>
    typeof value === 'bigint'
      ? value.toString()
      : value // return everything else unchanged
  )))

  console.log("pcztJsonObject")
  console.log(pcztJsonObject)

  const unsignedPczt = Pczt.from_json(pcztJsonObject);

  console.log("unsignedPczt")
  console.log(unsignedPczt)

  const signedPczt = await pczt_sign('main', unsignedPczt, spendingKey, seedFp);

  console.log("signedPczt")
  console.log(signedPczt)

  const signedPcztJson = signedPczt.to_json();

  console.log("signedPcztJson")
  console.log(signedPcztJson)

  console.log("signedPcztJson in snap____");
  console.log(signedPcztJson);

  return signedPcztJson;
}