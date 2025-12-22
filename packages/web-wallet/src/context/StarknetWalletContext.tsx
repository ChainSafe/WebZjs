import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { disconnect } from '@starknet-io/get-starknet';
import { getStarknet } from '@starknet-io/get-starknet-core';
import type { StarknetWindowObject } from '@starknet-io/get-starknet-core';

// Lazy load starknet module - this function will be called at runtime
// Import from the ESM build explicitly to avoid Parcel using the global build
let starknetModulePromise: Promise<any> | null = null;
const getStarknetModule = async () => {
  if (!starknetModulePromise) {
    try {
      // Import from the ESM build path to ensure we get the full module with WalletAccount.connect
      // Parcel's browser field resolution uses index.global.js which may not have all exports
      starknetModulePromise = import('starknet/dist/index.mjs');
    } catch (error) {
      // Fallback to regular import if explicit path doesn't work
      console.warn('[StarknetWallet] Failed to import from .mjs, trying default:', error);
      starknetModulePromise = import('starknet');
    }
  }
  return starknetModulePromise;
};


type StarknetWalletContextType = {
  walletAccount: any | null;
  address: string | null;
  isConnected: boolean;
  connectWallet: (wallet?: StarknetWindowObject) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  getAvailableWalletsList: () => Promise<StarknetWindowObject[]>;
  error: Error | null;
};

const StarknetWalletContext = createContext<StarknetWalletContextType>({
  walletAccount: null,
  address: null,
  isConnected: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  getAvailableWalletsList: async () => [],
  error: null,
});

/**
 * Starknet wallet context provider to handle wallet connection.
 *
 * @param props - React Props.
 * @param props.children - React component to be wrapped by the Provider.
 * @returns JSX.
 */
export const StarknetWalletProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [walletAccount, setWalletAccount] = useState<any | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const connectWallet = useCallback(async (wallet?: StarknetWindowObject) => {
    try {
      setError(null);
      console.log('[StarknetWallet] Connecting wallet...');

      const { getAvailableWallets, enable } = getStarknet();
      
      let selectedWallet: StarknetWindowObject | null = null;
      
      if (wallet) {
        // Wallet was provided (user selected from list)
        selectedWallet = wallet;
      } else {
        // Get list of available wallets
        const availableWallets = await getAvailableWallets();
        
        if (availableWallets.length === 0) {
          throw new Error(
            'No wallets found. Please install a Starknet wallet extension (e.g., ArgentX, Braavos).',
          );
        }
        
        if (availableWallets.length === 1) {
          // Only one wallet available, use it directly
          selectedWallet = availableWallets[0];
        } else {
          // Multiple wallets available - this should be handled by the component
          // by calling getAvailableWalletsList first and showing a modal
          throw new Error(
            'Multiple wallets available. Please select a wallet from the list.',
          );
        }
      }
      
      if (!selectedWallet) {
        throw new Error('No wallet selected');
      }

      // Enable the wallet - this requests account access
      const connectedWallet = await enable(selectedWallet);
      
      // Request accounts to get the address
      const accounts = await connectedWallet.request({
        type: 'wallet_requestAccounts',
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      // Get RPC URL from environment variable
      const rpcUrl =
        import.meta.env?.VITE_STARKNET_RPC_URL ||
        'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_10/SZWlqYJpVfi7qIvBonk4C';

      if (!rpcUrl) {
        throw new Error('RPC URL not configured. Please set VITE_STARKNET_RPC_URL in .env');
      }

      // Get starknet module (lazy loaded, bundled by Parcel)
      const starknetModule = await getStarknetModule();
      
      // Access WalletAccount from the module - handle both default and named exports
      const WalletAccountClass = starknetModule.WalletAccount || starknetModule.default?.WalletAccount || starknetModule.default;
      
      if (!WalletAccountClass) {
        console.error('[StarknetWallet] Available keys:', Object.keys(starknetModule));
        throw new Error('WalletAccount not found in starknet module');
      }
      
      // Check if connect exists and is a function
      if (typeof WalletAccountClass.connect !== 'function') {
        console.error('[StarknetWallet] WalletAccount structure:', {
          hasConnect: 'connect' in WalletAccountClass,
          connectType: typeof WalletAccountClass.connect,
          keys: Object.keys(WalletAccountClass).slice(0, 10),
        });
        throw new Error('WalletAccount.connect is not a function');
      }

      // Use WalletAccount.connect as a static method (like in reference)
      const account = await WalletAccountClass.connect(
        { nodeUrl: rpcUrl },
        connectedWallet,
      );
      
      setWalletAccount(account);
      setAddress(account.address);

      setWalletAccount(account);
      setAddress(account.address);
      console.log('[StarknetWallet] Wallet connected:', account.address);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to connect wallet');
      console.error('[StarknetWallet] Error connecting wallet:', error);
      setError(error);
      throw error;
    }
  }, []);

  const getAvailableWalletsList = useCallback(async (): Promise<StarknetWindowObject[]> => {
    try {
      const { getAvailableWallets } = getStarknet();
      return await getAvailableWallets();
    } catch (err) {
      console.error('[StarknetWallet] Error getting available wallets:', err);
      return [];
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      console.log('[StarknetWallet] Disconnecting wallet...');
      await disconnect();
      setWalletAccount(null);
      setAddress(null);
      setError(null);
    } catch (err) {
      console.error('[StarknetWallet] Error disconnecting wallet:', err);
      // Still clear local state even if disconnect fails
      setWalletAccount(null);
      setAddress(null);
      setError(null);
    }
  }, []);

  return (
    <StarknetWalletContext.Provider
      value={{
        walletAccount,
        address,
        isConnected: walletAccount !== null,
        connectWallet,
        disconnectWallet,
        getAvailableWalletsList,
        error,
      }}
    >
      {children}
    </StarknetWalletContext.Provider>
  );
};

/**
 * Utility hook to consume the Starknet wallet context.
 *
 * @returns The Starknet wallet context.
 */
export function useStarknetWallet() {
  const context = useContext(StarknetWalletContext);

  if (context === undefined) {
    throw new Error(
      'useStarknetWallet must be called within a StarknetWalletProvider',
    );
  }

  return context;
}

