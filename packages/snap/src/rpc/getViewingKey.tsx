import { UnifiedSpendingKey } from '@chainsafe/webzjs-keys';
import { getSeed } from '../utils/getSeed';
import { Box, Copyable, Divider, Heading, Text } from '@metamask/snaps-sdk/jsx';

type Network = 'main' | 'test';

export async function getViewingKey(
  origin: string,
  network: Network = 'main',
  accountIndex: number = 0,
) {

  try {
    // Retrieve the BIP-44 entropy from MetaMask
    const seed = await getSeed();

    // Generate the UnifiedSpendingKey and obtain the Viewing Key
    const spendingKey = new UnifiedSpendingKey(network, seed, accountIndex);
    const viewingKey = spendingKey.to_unified_full_viewing_key().encode(network);

    const dialogApproved = await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'confirmation',
        content: (
          <Box>
            <Heading>Reveal Viewing Key to the {origin}</Heading>
            <Divider />
            <Text>Web wallet {origin} needs access to the Viewing Key, approve this dialog to give permission.</Text>
            <Text>Viewing Key is used to create a new account in the Zcash Web Wallet. Web wallet account is serialized and stored only locally. Viewing Key is not sent, logged or stored in any way.</Text>
            <Divider />
            <Copyable value={viewingKey} />
          </Box>
        ),
      },
    });

    if (!dialogApproved) {
      throw new Error('User rejected');
    }

    return viewingKey
  } catch (error) {
    throw new Error('Failed to generate Viewing Key');
  }
}
