import { UnifiedSpendingKey } from '@webzjs/webz-keys';
import { getSeed } from '../utils/getSeed';
import { NETWORK } from '../utils/getNetwork';

export async function getViewingKey(accountIndex: number = 0) {
  try {
    // Retrieve the BIP-44 entropy from MetaMask
    const seed = await getSeed();
    console.log('getViewingKe,', NETWORK);
    // Generate the UnifiedSpendingKey and obtain the Viewing Key
    const spendingKey = new UnifiedSpendingKey(NETWORK, seed, accountIndex);
    const viewingKey = spendingKey
      .to_unified_full_viewing_key()
      .encode(NETWORK);

    return viewingKey;
  } catch (error) {
    console.error('Error generating Viewing Key:', error);
    throw new Error('Failed to generate Viewing Key');
  }
}
