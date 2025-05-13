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
            <Text>{origin} needs access to the Viewing Key, approve this dialog to grant give permition.</Text>
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
    console.error('Error generating Viewing Key:', error);
    throw new Error('Failed to generate Viewing Key');
  }
}
