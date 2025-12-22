import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import { get, set, del } from 'idb-keyval';

import initWebzJSWallet, {
  initThreadPool,
  WalletSummary,
  WebWallet,
} from '@chainsafe/webzjs-wallet';
import initWebzJSKeys, { generate_seed_phrase } from '@chainsafe/webzjs-keys';
import { MAINNET_LIGHTWALLETD_PROXY } from '../config/constants';
import toast, { Toaster } from 'react-hot-toast';

const DEFAULT_ACCOUNT_INDEX = 0;
const STORAGE_KEY_SEED_PHRASE = 'seedPhrase';
const STORAGE_KEY_BIRTHDAY_HEIGHT = 'birthdayHeight';

export interface WebZjsState {
  webWallet: WebWallet | null;
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

const initialState: WebZjsState = {
  webWallet: null,
  error: null,
  summary: undefined,
  chainHeight: undefined,
  activeAccount: null,
  syncInProgress: false,
  loading: true,
};

function reducer(state: WebZjsState, action: Action): WebZjsState {
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
  state: WebZjsState;
  dispatch: React.Dispatch<Action>;
  getSeedForAccount: (accountIndex?: number) => Promise<{
    seedPhrase: string;
    accountIndex: number;
    birthdayHeight: number;
  }>;
}

const WebZjsContext = createContext<WebZjsContextType>({
  state: initialState,
  dispatch: () => {},
  getSeedForAccount: async () => {
    const seedPhrase = await get(STORAGE_KEY_SEED_PHRASE);
    const birthdayHeightStr = await get(STORAGE_KEY_BIRTHDAY_HEIGHT);
    return {
      seedPhrase: seedPhrase || '',
      accountIndex: DEFAULT_ACCOUNT_INDEX,
      birthdayHeight: birthdayHeightStr ? Number(birthdayHeightStr) : 0,
    };
  },
});

export function useWebZjsContext(): WebZjsContextType {
  return useContext(WebZjsContext);
}

export const WebZjsProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const initAll = useCallback(async () => {
    try {
      await initWebzJSWallet();
      await initWebzJSKeys();

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

      // Check for wallet DB and seed phrase in storage
      const bytes = await get('wallet');
      let seedPhrase = await get(STORAGE_KEY_SEED_PHRASE);
      let birthdayHeight: number;
      let wallet: WebWallet;

      if (bytes) {
        // Wallet DB exists - restore wallet
        console.info('Saved wallet detected. Restoring wallet from storage');
        wallet = new WebWallet(
          'main',
          MAINNET_LIGHTWALLETD_PROXY,
          1, // trusted confirmations
          1, // untrusted confirmations
          bytes,
        );

        // Edge case: Wallet DB exists but seed phrase missing
        if (!seedPhrase) {
          console.warn(
            'Wallet DB exists but seed phrase missing. This may cause issues with signing transactions. ' +
            'Generating new seed phrase, but it may not match the wallet. Consider deleting wallet DB to start fresh.'
          );
          seedPhrase = generate_seed_phrase();
          const chainHeight = await wallet.get_latest_block();
          birthdayHeight = Number(chainHeight);
          await set(STORAGE_KEY_SEED_PHRASE, seedPhrase);
          await set(STORAGE_KEY_BIRTHDAY_HEIGHT, birthdayHeight.toString());
        } else {
          // Retrieve birthday height from storage
          const birthdayHeightStr = await get(STORAGE_KEY_BIRTHDAY_HEIGHT);
          if (birthdayHeightStr) {
            birthdayHeight = Number(birthdayHeightStr);
          } else {
            // Edge case: seed phrase exists but birthday missing
            console.warn('Seed phrase found but birthday height missing. Using current chain height as fallback');
            const chainHeight = await wallet.get_latest_block();
            birthdayHeight = Number(chainHeight);
            await set(STORAGE_KEY_BIRTHDAY_HEIGHT, birthdayHeight.toString());
          }
          console.info('Retrieved seed phrase and birthday height from storage');
        }
      } else {
        // No wallet DB - need to create new wallet
        if (!seedPhrase) {
          // New user: generate seed phrase and get current chain height
          console.info('No seed phrase found. Generating new seed phrase for new user');
          seedPhrase = generate_seed_phrase();
          
          // Create a temporary wallet to get current chain height
          const tempWallet = new WebWallet(
            'main',
            MAINNET_LIGHTWALLETD_PROXY,
            1, // trusted confirmations
            1, // untrusted confirmations
          );
          const chainHeight = await tempWallet.get_latest_block();
          birthdayHeight = Number(chainHeight);
          
          // Store seed phrase and birthday height
          await set(STORAGE_KEY_SEED_PHRASE, seedPhrase);
          await set(STORAGE_KEY_BIRTHDAY_HEIGHT, birthdayHeight.toString());
          console.info(`Stored new seed phrase and birthday height: ${birthdayHeight}`);
        } else {
          // Returning user: seed phrase exists but wallet DB missing (user deleted it)
          console.info('Seed phrase found but wallet DB missing. Creating new wallet with existing seed phrase');
          const birthdayHeightStr = await get(STORAGE_KEY_BIRTHDAY_HEIGHT);
          if (birthdayHeightStr) {
            birthdayHeight = Number(birthdayHeightStr);
          } else {
            // Edge case: seed phrase exists but birthday missing
            console.warn('Seed phrase found but birthday height missing. Using current chain height as fallback');
            const tempWallet = new WebWallet(
              'main',
              MAINNET_LIGHTWALLETD_PROXY,
              1, // trusted confirmations
              1, // untrusted confirmations
            );
            const chainHeight = await tempWallet.get_latest_block();
            birthdayHeight = Number(chainHeight);
            await set(STORAGE_KEY_BIRTHDAY_HEIGHT, birthdayHeight.toString());
          }
        }

        console.info('No saved wallet detected. Creating new wallet');
        wallet = new WebWallet(
          'main',
          MAINNET_LIGHTWALLETD_PROXY,
          1, // trusted confirmations
          1, // untrusted confirmations
        );
        await wallet.create_account(
          'account-0',
          seedPhrase,
          DEFAULT_ACCOUNT_INDEX,
          birthdayHeight,
        );
        // Persist the newly created wallet immediately so reloads restore state.
        const serialized = await wallet.db_to_bytes();
        await set('wallet', serialized);
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


  const getSeedForAccount = useCallback(
    async (accountIndex = DEFAULT_ACCOUNT_INDEX) => {
      const seedPhrase = await get(STORAGE_KEY_SEED_PHRASE);
      const birthdayHeightStr = await get(STORAGE_KEY_BIRTHDAY_HEIGHT);
      
      if (!seedPhrase) {
        throw new Error('Seed phrase not found in storage. Wallet may not be initialized.');
      }
      
      return {
        seedPhrase,
        accountIndex,
        birthdayHeight: birthdayHeightStr ? Number(birthdayHeightStr) : 0,
      };
    },
    [],
  );

  return (
    <WebZjsContext.Provider value={{ state, dispatch, getSeedForAccount }}>
      <Toaster />
      {children}
    </WebZjsContext.Provider>
  );
};
