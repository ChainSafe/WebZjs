import { set } from 'idb-keyval';
import { useCallback } from 'react';
import { useWebZjsContext } from '../context/WebzjsContext.tsx';

interface UseWebzjsActions {
  addNewAccountFromUfvk: (
    ufvk: string,
    birthdayHeight: number,
  ) => Promise<void>;
  triggerRescan: () => Promise<void>;
  flushDbToStore: () => Promise<void>;
  syncStateWithWallet: () => Promise<void>;
}

export function useWebZjsActions(): UseWebzjsActions {
  const { state, dispatch } = useWebZjsContext();

  const syncStateWithWallet = useCallback(async () => {
    if (!state.webWallet) {
      dispatch({
        type: 'set-error',
        payload: new Error('Wallet not initialized'),
      });
      return;
    }
    try {
      const summary = await state.webWallet.get_wallet_summary();
      if (summary) {
        dispatch({ type: 'set-summary', payload: summary });
      }
      const chainHeight = await state.webWallet.get_latest_block();
      if (chainHeight) {
        dispatch({ type: 'set-chain-height', payload: chainHeight });
      }
    } catch (error) {
      console.error('Error syncing state with wallet:', error);
      dispatch({ type: 'set-error', payload: error });
    }
  }, [state.webWallet, dispatch]);

  const addNewAccountFromUfvk = useCallback(
    async (ufvk: string, birthdayHeight: number) => {
      const account_id =
        (await state.webWallet?.create_account_ufvk(ufvk, birthdayHeight)) || 0;
      dispatch({ type: 'set-active-account', payload: account_id });

      if (state.webWallet) {
        const summary = await state.webWallet.get_wallet_summary();
        console.log(summary?.account_balances.length);
      }
      await syncStateWithWallet();
    },
    [dispatch, state.webWallet, syncStateWithWallet],
  );

  const flushDbToStore = useCallback(async () => {
    if (!state.webWallet) {
      dispatch({
        type: 'set-error',
        payload: new Error('Wallet not initialized'),
      });
      return;
    }
    try {
      console.info('Serializing wallet and dumping to IndexedDB store');
      const bytes = await state.webWallet.db_to_bytes();
      await set('wallet', bytes);
      console.info('Wallet saved to storage');
    } catch (error) {
      console.error('Error flushing DB to store:', error);
      dispatch({ type: 'set-error', payload: error });
    }
  }, [state.webWallet, dispatch]);

  const triggerRescan = useCallback(async () => {
    if (state.loading) {
      dispatch({ type: 'set-error', payload: new Error('App not yet loaded') });
      return;
    }
    if (!state.webWallet) {
      dispatch({
        type: 'set-error',
        payload: new Error('Wallet not initialized'),
      });
      return;
    }
    if (state.activeAccount === undefined) {
      dispatch({ type: 'set-error', payload: new Error('No active account') });
      return;
    }
    if (state.syncInProgress) {
      dispatch({
        type: 'set-error',
        payload: new Error('Sync already in progress'),
      });
      return;
    }

    dispatch({ type: 'set-sync-in-progress', payload: true });

    try {
      await state.webWallet.sync();
      await syncStateWithWallet();
      await flushDbToStore();
    } catch (err: any) {
      console.error('Error during rescan:', err);
      dispatch({ type: 'set-error', payload: err });
    } finally {
      dispatch({ type: 'set-sync-in-progress', payload: false });
    }
  }, [
    state.loading,
    state.webWallet,
    state.activeAccount,
    state.syncInProgress,
    dispatch,
    syncStateWithWallet,
    flushDbToStore,
  ]);

  return {
    addNewAccountFromUfvk,
    triggerRescan,
    flushDbToStore,
    syncStateWithWallet,
  };
}
