import { getSeed } from '../utils/getSeed';
import { generateViewingKey } from '@chainsafe/webzjs-wasm';

type Network = 'main' | 'test';

export async function getViewingKey() {
  try {
    // Retrieve the BIP-44 entropy from MetaMask
    const seed = await getSeed();

    // Define the account index and network
    const accountIndex = 0;
    const network = 'main' as Network;

    // Generate the UnifiedSpendingKey and obtain the Viewing Key
    const viewingKey = await generateViewingKey(seed, accountIndex, network);

    console.log('viewingKey', viewingKey);
    // Return the Viewing Key to the dApp
    return viewingKey.encode(network);
  } catch (error) {
    console.error('Error generating Viewing Key:', error);
    throw new Error('Failed to generate Viewing Key');
  }
}
