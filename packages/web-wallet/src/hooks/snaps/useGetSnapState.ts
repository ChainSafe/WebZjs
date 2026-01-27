import { useCallback } from 'react';
import { useInvokeSnap } from './useInvokeSnap';

/**
 * Cached balance stored in snap state for recovery after cookie/IndexedDB clears.
 */
export type LastKnownBalance = {
  shielded: number;     // sapling + orchard (in zats)
  unshielded: number;   // transparent (in zats)
  timestamp: number;    // When last updated (ms)
};

/**
 * Snap persistent state stored via snap_manageState.
 * Uses `| null` instead of optional to match snap's Json-compatible type.
 */
export interface SnapState {
  webWalletSyncStartBlock: string;
  lastKnownBalance: LastKnownBalance | null;
  hasPendingTx: boolean | null;
}

export const useGetSnapState = () => {
  const invokeSnap = useInvokeSnap();

  const getSnapState = useCallback(async () => {
    const snapStateHome = (await invokeSnap({
      method: 'getSnapStete',
    })) as unknown as SnapState;
    return snapStateHome;
  }, [invokeSnap]);

  return { getSnapState };
};
