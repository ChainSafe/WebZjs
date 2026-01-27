import type { MetaMaskInpageProvider } from '@metamask/providers';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { Snap } from '../types';
import { getSnapsProvider } from '../utils';
import { SnapState } from 'src/hooks/snaps/useGetSnapState';
import { defaultSnapOrigin } from '../config';

type MetaMaskContextType = {
  provider: MetaMaskInpageProvider | null;
  installedSnap: Snap | null;
  error: Error | null;
  isPendingRequest: boolean;
  snapState: SnapState | null;
  setSnapState: (SnapState: SnapState) => void;
  setInstalledSnap: (snap: Snap | null) => void;
  setError: (error: Error) => void;
  setIsPendingRequest: (isPending: boolean) => void;
  refreshSnapState: () => Promise<void>;
};

const MetaMaskContext = createContext<MetaMaskContextType>({
  provider: null,
  installedSnap: null,
  error: null,
  isPendingRequest: false,
  snapState: null,
  setSnapState: () => {},
  setInstalledSnap: () => {},
  setError: () => {},
  setIsPendingRequest: () => {},
  refreshSnapState: async () => {},
});

/**
 * MetaMask context provider to handle MetaMask and snap status.
 *
 * @param props - React Props.
 * @param props.children - React component to be wrapped by the Provider.
 * @returns JSX.
 */
export const MetaMaskProvider = ({ children }: { children: ReactNode }) => {
  // const { getSnapState } = useGetSnapState();

  const [provider, setProvider] = useState<MetaMaskInpageProvider | null>(null);
  const [installedSnap, setInstalledSnap] = useState<Snap | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPendingRequest, setIsPendingRequest] = useState<boolean>(false);
  const [snapState, setSnapState] = useState<SnapState | null>(null);

  const refreshSnapState = useCallback(async () => {
    if (!installedSnap || !provider) return;
    try {
      const state = await provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: defaultSnapOrigin,
          request: { method: 'getSnapStete' },
        },
      });
      if (state) {
        setSnapState(state as SnapState);
      }
    } catch (err) {
      console.error('Failed to refresh snap state:', err);
    }
  }, [installedSnap, provider]);

  useEffect(() => {
    getSnapsProvider().then(setProvider).catch(console.error);
  }, []);

  // Fetch snap state when snap is installed (for birthday block display)
  useEffect(() => {
    if (installedSnap && provider) {
      provider.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: defaultSnapOrigin,
          request: { method: 'getSnapStete' },
        },
      }).then((state) => {
        if (state) {
          setSnapState(state as SnapState);
        }
      }).catch((err) => {
        console.warn('Could not fetch snap state:', err);
      });
    }
  }, [installedSnap, provider]);

  useEffect(() => {
    if (error) {
      // Track if this is a pending request error
      const isPending = (error as any)?.code === -32002 || (error as any)?.isPendingRequest === true;
      setIsPendingRequest(isPending);

      const timeout = setTimeout(() => {
        setError(null);
        setIsPendingRequest(false);
      }, 10000);

      return () => {
        clearTimeout(timeout);
      };
    } else {
      setIsPendingRequest(false);
    }

    return undefined;
  }, [error]);

  return (
    <MetaMaskContext.Provider
      value={{
        provider,
        error,
        isPendingRequest,
        snapState,
        setSnapState,
        setError,
        setIsPendingRequest,
        installedSnap,
        setInstalledSnap,
        refreshSnapState,
      }}
    >
      {children}
    </MetaMaskContext.Provider>
  );
};

/**
 * Utility hook to consume the MetaMask context.
 *
 * @returns The MetaMask context.
 */
export function useMetaMaskContext() {
  const context = useContext(MetaMaskContext);

  if (context === undefined) {
    throw new Error(
      'useMetaMaskContext must be called within a MetaMaskProvider',
    );
  }

  return context;
}
