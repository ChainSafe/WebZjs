import { set } from 'idb-keyval';
import { useCallback } from 'react';
import { useWebZjsContext } from '../context/WebzjsContext';
import { useMetaMask } from './snaps/useMetaMask';
import { useInvokeSnap } from './snaps/useInvokeSnap';
import { useRequestSnap } from './snaps/useRequestSnap';

interface WebzjsActions {
  getAccountData: () => Promise<
    { unifiedAddress: string; transparentAddress: string } | undefined
  >;
  triggerRescan: () => Promise<void>;
  flushDbToStore: () => Promise<void>;
  syncStateWithWallet: () => Promise<void>;
  connectWebZjsSnap: () => Promise<void>;
}

export function useWebZjsActions(): WebzjsActions {
  const { state, dispatch } = useWebZjsContext();
  const { installedSnap } = useMetaMask();
  const invokeSnap = useInvokeSnap();
  const requestSnap = useRequestSnap();

  const getAccountData = useCallback(async () => {
    try {
      const accountIndex = state.activeAccount ?? 0;

      if(!state.webWallet) return

      const unifiedAddress =
        await state.webWallet.get_current_address(accountIndex);

      const transparentAddress =
        await state.webWallet.get_current_address_transparent(accountIndex);

      return {
        unifiedAddress,
        transparentAddress,
      };
      
      
    } catch (error) {
      dispatch({
        type: 'set-error',
        payload: 'Cannot get active account data',
      });
    }
  }, [dispatch, state.activeAccount, state.webWallet]);

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
      dispatch({ type: 'set-error', payload: String(error) });
    }
  }, [state.webWallet, dispatch]);

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
      dispatch({ type: 'set-error', payload: String(error) });
    }
  }, [state.webWallet, dispatch]);

  const connectWebZjsSnap = useCallback(async () => {
    try {
      await requestSnap();

      if (state.webWallet === null) {
        dispatch({
          type: 'set-error',
          payload: new Error('Wallet not initialized'),
        });
        return;
      }

      const latestBlockBigInt = await state.webWallet.get_latest_block();
      const latestBlock = Number(latestBlockBigInt);

      let birthdayBlock = (await invokeSnap({
        method: 'setBirthdayBlock',
        params: { latestBlock },
      })) as number | null;


      // in case user pressed "Close" instead of "Continue to wallet" on prompt, still allow account creation with latest block
      if(birthdayBlock === null) {
        await invokeSnap({
          method: 'setSnapStete',
          params: { webWalletSyncStartBlock: latestBlock },
        });
        birthdayBlock = latestBlock
      }

      const viewingKey = (await invokeSnap({
        method: 'getViewingKey',
      })) as string;

      const account_id = await state.webWallet.create_account_ufvk(
        'account-0',
        viewingKey,
        birthdayBlock,
      );

      dispatch({ type: 'set-active-account', payload: account_id });
      if (state.webWallet) {
        const summary = await state.webWallet.get_wallet_summary();
        console.log('account_balances', summary?.account_balances.length);
      }
      await syncStateWithWallet();

      await flushDbToStore();
    } catch (error) {
      console.error(error);
      dispatch({
        type: 'set-error',
        payload: new Error(
          'Failed to connect to MetaMask Snap and create account',
        ),
      });
      throw error;
    }
  }, [
    state.webWallet,
    invokeSnap,
    dispatch,
    syncStateWithWallet,
    flushDbToStore,
  ]);

  const triggerRescan = useCallback(async () => {
    if (!installedSnap) {
      return;
    }

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

      return;
    }

    dispatch({ type: 'set-sync-in-progress', payload: true });

    try {
      await state.webWallet.sync();
      await syncStateWithWallet();
      await flushDbToStore();
    } catch (err: unknown) {
      console.error('Error during rescan:', err);
      dispatch({ type: 'set-error', payload: String(err) });
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
    getAccountData,
    triggerRescan,
    flushDbToStore,
    syncStateWithWallet,
    connectWebZjsSnap,
  };
}
