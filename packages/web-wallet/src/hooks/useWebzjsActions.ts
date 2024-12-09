import { set } from 'idb-keyval';
import { useWebZjsContext } from '../context/WebzjsContext.tsx';

export function useWebZjsActions() {
  const { state, dispatch } = useWebZjsContext();
  console.log('state', state);

  async function syncStateWithWallet() {
    if (!state.webWallet) {
      dispatch({
        type: 'set-error',
        payload: new Error('Wallet not initialized'),
      });
      return;
    }
    const summary = await state.webWallet.get_wallet_summary();
    if (summary) {
      dispatch({ type: 'set-summary', payload: summary });
    }
    const chainHeight = await state.webWallet.get_latest_block();
    if (chainHeight) {
      dispatch({ type: 'set-chain-height', payload: chainHeight });
    }
  }

  async function flushDbToStore() {
    if (!state.webWallet) {
      dispatch({
        type: 'set-error',
        payload: new Error('Wallet not initialized'),
      });
      return;
    }
    console.info('Serializing wallet and dumping to IndexedDB store');
    const bytes = await state.webWallet.db_to_bytes();
    await set('wallet', bytes);
    console.info('Wallet saved to storage');
  }

  async function triggerRescan() {
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
    if (state.activeAccount == undefined) {
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
  }

  return {
    triggerRescan,
    syncStateWithWallet,
  };
}
