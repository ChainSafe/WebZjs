import { useEffect, useState } from 'react';

import { useMetaMaskContext } from '../../context/MetamaskContext.tsx';
import { useRequest } from './useRequest.ts';
import { GetSnapsResponse } from '../../types';
import { defaultSnapOrigin } from '../../config';

/**
 * A Hook to retrieve useful data from MetaMask.
 * @returns The information.
 */
export const useMetaMask = () => {
  const { provider, setInstalledSnap, installedSnap } = useMetaMaskContext();
  const request = useRequest();
  const [isFlask, setIsFlask] = useState(false);

  const snapsDetected = provider !== null;

  /**
   * Detect if the version of MetaMask is Flask.
   */
  const detectFlask = async () => {
    const clientVersion = await request({
      method: 'web3_clientVersion',
    });

    const isFlaskDetected = (clientVersion as string[])?.includes('flask');

    setIsFlask(isFlaskDetected);
  };

  /**
   * Get the Snap informations from MetaMask.
   */
  const getSnap = async () => {
    const snaps = (await request({
      method: 'wallet_getSnaps',
    })) as GetSnapsResponse;

    setInstalledSnap(snaps[defaultSnapOrigin] ?? null);
  };

  useEffect(() => {
    const detect = async () => {
      if (provider) {
        await detectFlask();
        await getSnap();
      }
    };

    detect().catch(console.error);
  }, [detectFlask, getSnap, provider]);

  return { isFlask, snapsDetected, installedSnap, getSnap };
};
