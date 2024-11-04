import { getSeed } from '../utils/getSeed';
import { UnifiedSpendingKey } from '@webzjs/webz-keys';

type Network = 'main' | 'test';

export async function getViewingKey() {
  try {
    // Retrieve the BIP-44 entropy from MetaMask
    const seed = await getSeed();

    // Define the account index and network
    const accountIndex = 0;
    const network = 'main' as Network;

    // Generate the UnifiedSpendingKey and obtain the Viewing Key
    let spendingKey = new UnifiedSpendingKey(network, seed, accountIndex);
    let viewingKey = spendingKey.to_unified_full_viewing_key();

    return viewingKey.encode(network);
  } catch (error) {
    console.error('Error generating Viewing Key:', error);
    throw new Error('Failed to generate Viewing Key');
  }
}
