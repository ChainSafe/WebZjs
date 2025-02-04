import { Pczt, WebWallet } from '@webzjs/webz-wallet';

import { Box, Heading, Text } from '@metamask/snaps-sdk/jsx';
import { SeedFingerprint, UnifiedSpendingKey } from '@webzjs/webz-keys';
import { getSeed } from '../utils/getSeed';

import { InitOutput } from '@webzjs/webz-wallet';
import { initSync } from '@webzjs/webz-wallet';
import wasmDataBase64 from '@webzjs/webz-wallet/webz_wallet_bg.wasm';

export const MAINNET_LIGHTWALLETD_PROXY = 'https://zcash-mainnet.chainsafe.dev';

export function initialiseWasm(): InitOutput {
  const base64String = wasmDataBase64 as any as string;
  // Check if the imported data is a data URL
  const base64Formatted = base64String.startsWith('data:')
    ? base64String.split(',')[1]
    : base64String;

  if (!base64Formatted) {
    throw new Error('Invalid WASM data');
  }

  const wasmData = Buffer.from(base64Formatted, 'base64');
  return initSync({ module: wasmData });
}

export async function signPczt(pczt: Pczt): Promise<Pczt> {
  let signedPczt: Pczt;

  initialiseWasm();

  const wallet = new WebWallet('main', MAINNET_LIGHTWALLETD_PROXY, 0);

  const result = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: (
        <Box>
          <Heading>Are you sure you want to sign this PCZT?</Heading>
          <Text>{pczt.describe().toString()}</Text>
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
  signedPczt = await wallet.pczt_sign(pczt, spendingKey, seedFp);

  return signedPczt;
}
