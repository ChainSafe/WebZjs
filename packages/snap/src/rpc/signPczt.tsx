import { Box, Heading, Text } from '@metamask/snaps-sdk/jsx';
import {
  SeedFingerprint,
  UnifiedSpendingKey,
  pczt_sign,
  Pczt,
} from '@webzjs/webz-keys';
import { getSeed } from '../utils/getSeed';
import { NETWORK } from '../utils/getNetwork';

export async function signPczt(pczt: Pczt): Promise<Pczt> {
  let signedPczt: Pczt;

  const result = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: (
        <Box>
          <Heading>Are you sure you want to sign this PCZT?</Heading>
          <Text>{JSON.stringify(pczt.describe())}</Text>
        </Box>
      ),
    },
  });

  if (!result) {
    throw new Error('User rejected');
  }

  const seed = await getSeed();

  // Generate the UnifiedSpendingKey and obtain the Viewing Key
  const spendingKey = new UnifiedSpendingKey(NETWORK, seed, 0);
  const seedFp = new SeedFingerprint(seed);
  signedPczt = await pczt_sign(NETWORK, pczt, spendingKey, seedFp);

  console.log(signedPczt);

  return signedPczt;
}
