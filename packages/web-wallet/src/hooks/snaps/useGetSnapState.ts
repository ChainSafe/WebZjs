import { useCallback } from 'react';
import { useInvokeSnap } from './useInvokeSnap';

export interface SnapState {
  webWalletSyncStartBlock: string;
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
