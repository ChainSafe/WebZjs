import { set } from 'idb-keyval';
import { useCallback } from 'react';
import { useWebZjsContext } from '../context/WebzjsContext';

interface WebzjsActions {
  getAccountData: () => Promise<
    { unifiedAddress: string; transparentAddress: string } | undefined
  >;
  triggerRescan: () => Promise<void>;
  flushDbToStore: () => Promise<void>;
  syncStateWithWallet: () => Promise<void>;
}

// Module-level variables to track sync state across all hook instances
// This prevents race conditions when multiple components call triggerRescan simultaneously
let syncInProgress = false;
let lastSyncTime = 0;
// Minimum time between rescans (5 seconds)
const MIN_SYNC_INTERVAL_MS = 5000;

export function useWebZjsActions(): WebzjsActions {
  const { state, dispatch } = useWebZjsContext();

  const getAccountData = useCallback(async () => {
    try {
      if (state.activeAccount === null || state.activeAccount === undefined) return; 
      
      const accountIndex = state.activeAccount;

      if (!state.webWallet) return;

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
      console.error(error);
    }
  }, [dispatch, state.activeAccount, state.webWallet]);

  const syncStateWithWallet = useCallback(async () => {
    if (!state.webWallet) {
      // dispatch({
      //   type: 'set-error',
      //   payload: new Error('Wallet not initialized'),
      // });
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
      // dispatch({
      //   type: 'set-error',
      //   payload: new Error('Wallet not initialized'),
      // });
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

  const triggerRescan = useCallback(async () => {
    if (state.loading) {
      dispatch({ type: 'set-error', payload: new Error('App not yet loaded') });
      return;
    }
    if (!state.webWallet) {
      // dispatch({
      //   type: 'set-error',
      //   payload: new Error('Wallet not initialized'),
      // });
      return;
    }
    if (state.activeAccount === undefined) {
      dispatch({ type: 'set-error', payload: new Error('No active account') });
      return;
    }
    
    // Check if sync is already in progress (atomic check using module-level variable)
    if (syncInProgress) {
      console.log('[triggerRescan] Sync already in progress, skipping...');
      return;
    }

    // Throttle: prevent rescans too close together
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTime;
    if (timeSinceLastSync < MIN_SYNC_INTERVAL_MS) {
      console.log(
        `[triggerRescan] Throttling: only ${timeSinceLastSync}ms since last sync (min ${MIN_SYNC_INTERVAL_MS}ms), skipping...`,
      );
      return;
    }

    // Set sync in progress atomically
    syncInProgress = true;
    lastSyncTime = now;
    dispatch({ type: 'set-sync-in-progress', payload: true });

    try {
      await state.webWallet.sync();
      await syncStateWithWallet();
      await flushDbToStore();
    } catch (err: unknown) {
      console.error('Error during rescan:', err);
      dispatch({ type: 'set-error', payload: String(err) });
    } finally {
      syncInProgress = false;
      dispatch({ type: 'set-sync-in-progress', payload: false });
    }
  }, [
    state.loading,
    state.webWallet,
    state.activeAccount,
    dispatch,
    syncStateWithWallet,
    flushDbToStore,
  ]);

  return {
    getAccountData,
    triggerRescan,
    flushDbToStore,
    syncStateWithWallet,
  };
}
