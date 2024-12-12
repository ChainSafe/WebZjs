import React, { createContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import { get, set } from 'idb-keyval';

import initWebzWallet, {
  initThreadPool,
  WalletSummary,
  WebWallet,
} from '@webzjs/webz-wallet';
import initWebzKeys from '@webzjs/webz-keys';

import type { Snap } from '../types';
import { MAINNET_LIGHTWALLETD_PROXY } from '../config/constants.ts';

interface State {
  webWallet: WebWallet | null;
  installedSnap: Snap | null;
  error: Error | null;
  summary?: WalletSummary;
  chainHeight?: bigint;
  activeAccount?: number;
  syncInProgress: boolean;
  loading: boolean;
}

type Action =
  | { type: 'set-web-wallet'; payload: WebWallet }
  | { type: 'set-error'; payload: Error | null }
  | { type: 'set-summary'; payload: WalletSummary }
  | { type: 'set-chain-height'; payload: bigint }
  | { type: 'set-active-account'; payload: number }
  | { type: 'set-sync-in-progress'; payload: boolean }
  | { type: 'set-loading'; payload: boolean };

const initialState: State = {
  webWallet: null,
  installedSnap: null,
  error: null,
  summary: undefined,
  chainHeight: undefined,
  activeAccount: undefined,
  syncInProgress: false,
  loading: true,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set-web-wallet':
      return { ...state, webWallet: action.payload };
    case 'set-error':
      return { ...state, error: action.payload };
    case 'set-summary':
      return { ...state, summary: action.payload };
    case 'set-chain-height':
      return { ...state, chainHeight: action.payload };
    case 'set-active-account':
      return { ...state, activeAccount: action.payload };
    case 'set-sync-in-progress':
      return { ...state, syncInProgress: action.payload };
    case 'set-loading':
      return { ...state, loading: action.payload };

    default:
      return state;
  }
}

interface WebZjsContextType {
  state: State;
  dispatch: React.Dispatch<Action>;
}

const WebZjsContext = createContext<WebZjsContextType>({
  state: initialState,
  dispatch: () => {},
});

export const WebZjsProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Initialize provider and web wallet
  useEffect(() => {
    initAll();
  }, []);

  async function initAll() {
    try {
      await initWebzWallet();
      await initWebzKeys();
      try {
        await initThreadPool(10);
      } catch (err) {
        console.error(err);
        return Error('Unable to initialize Thread Pool');
      }

      const bytes = await get('wallet');
      let wallet;

      if (bytes) {
        console.info('Saved wallet detected. Restoring wallet from storage');
        wallet = new WebWallet('main', MAINNET_LIGHTWALLETD_PROXY, 1, bytes);
      } else {
        console.info('No saved wallet detected. Creating new wallet');
        wallet = new WebWallet('main', MAINNET_LIGHTWALLETD_PROXY, 1);
      }

      dispatch({ type: 'set-web-wallet', payload: wallet });

      const summary = await wallet.get_wallet_summary();
      if (summary) {
        dispatch({ type: 'set-summary', payload: summary });
        // Set an active account from summary if available
        if (summary.account_balances.length > 0) {
          dispatch({
            type: 'set-active-account',
            payload: summary.account_balances[0][0],
          });
        }
      }

      const chainHeight = await wallet.get_latest_block();
      if (chainHeight) {
        dispatch({ type: 'set-chain-height', payload: chainHeight });
      }

      dispatch({ type: 'set-loading', payload: false });
    } catch (err) {
      console.error('Initialization error:', err);
      dispatch({ type: 'set-error', payload: Error(String(err)) });
      dispatch({ type: 'set-loading', payload: false });
    }
  }

  // Clear error after 10 seconds if any
  useEffect(() => {
    if (state.error) {
      const timeout = setTimeout(() => {
        dispatch({ type: 'set-error', payload: null });
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [state.error]);

  // Persist changes to IndexedDB whenever relevant parts of state change
  useEffect(() => {
    if (!state.webWallet) return;

    async function flushDb() {
      console.info('Serializing wallet and dumping to IndexedDB store');

      if (state.webWallet instanceof WebWallet) {
        const bytes = await state.webWallet.db_to_bytes();
        await set('wallet', bytes);
        console.info('Wallet saved to storage');
      }
    }

    // Flush changes on these triggers:
    if (!state.loading && !state.syncInProgress && state.webWallet) {
      flushDb().catch(console.error);
    }
  }, [state.webWallet, state.syncInProgress, state.loading]);

  return (
    <WebZjsContext.Provider value={{ state, dispatch }}>
      {children}
    </WebZjsContext.Provider>
  );
};

export function useWebZjsContext(): WebZjsContextType {
  const context = React.useContext(WebZjsContext);

  if (context === undefined) {
    throw new Error('useWebZjsContext must be used within a WebZjsProvider');
  }
  return context;
}
