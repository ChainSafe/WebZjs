import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import { get, set } from 'idb-keyval';

import initWebzWallet, {
  initThreadPool,
  WalletSummary,
  WebWallet,
} from '@webzjs/webz-wallet';
import initWebzKeys from '@webzjs/webz-keys';
import { MAINNET_LIGHTWALLETD_PROXY } from '../config/constants';
import { Snap } from '../types';
import toast, { Toaster } from 'react-hot-toast';

interface State {
  webWallet: WebWallet | null;
  installedSnap: Snap | null;
  error: Error | null | string;
  summary?: WalletSummary;
  chainHeight?: bigint;
  activeAccount?: number | null;
  syncInProgress: boolean;
  loading: boolean;
}

type Action =
  | { type: 'set-web-wallet'; payload: WebWallet }
  | { type: 'set-error'; payload: Error | null | string }
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
  activeAccount: null,
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

export function useWebZjsContext(): WebZjsContextType {
  return useContext(WebZjsContext);
}

export const WebZjsProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const initAll = useCallback(async () => {
    try {
      await initWebzWallet();
      await initWebzKeys();

      try {
        const concurrency = navigator.hardwareConcurrency || 4;
        await initThreadPool(concurrency);
      } catch (err) {
        console.error('Unable to initialize Thread Pool:', err);
        dispatch({
          type: 'set-error',
          payload: new Error('Unable to initialize Thread Pool'),
        });
        return;
      }

      const bytes = await get('wallet');
      let wallet: WebWallet;

      if (bytes) {
        console.info('Saved wallet detected. Restoring wallet from storage');
        wallet = new WebWallet('main', MAINNET_LIGHTWALLETD_PROXY, 1, bytes);
      } else {
        console.info('No saved wallet detected. Creating new wallet');
        wallet = new WebWallet('main', MAINNET_LIGHTWALLETD_PROXY, 1);
      }

      dispatch({ type: 'set-web-wallet', payload: wallet });

      // Retrieve summary (accounts, balances, etc.)
      const summary = await wallet.get_wallet_summary();
      if (summary) {
        dispatch({ type: 'set-summary', payload: summary });
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
  }, []);

  useEffect(() => {
    initAll().catch(console.error);
  }, [initAll]);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error.toString());
    }
  }, [state.error, dispatch]);

  useEffect(() => {
    if (!state.webWallet) return;
    // If the wallet is not loading, not syncing, and is present, we flush it to store
    if (!state.loading && !state.syncInProgress) {
      flushDbToStore().catch(console.error);
    }

    async function flushDbToStore() {
      if (!(state.webWallet instanceof WebWallet)) return;
      console.info('Serializing wallet and dumping to IndexedDB store');
      const bytes = await state.webWallet.db_to_bytes();
      await set('wallet', bytes);
      console.info('Wallet saved to storage');
    }
  }, [state.webWallet, state.syncInProgress, state.loading]);

  return (
    <WebZjsContext.Provider value={{ state, dispatch }}>
      <Toaster />
      {children}
    </WebZjsContext.Provider>
  );
};
