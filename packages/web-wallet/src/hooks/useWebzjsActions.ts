import { set, del } from 'idb-keyval';
import { useCallback } from 'react';
import { useWebZjsContext } from '../context/WebzjsContext';
import { useMetaMaskContext } from '../context/MetamaskContext';
import { useMetaMask } from './snaps/useMetaMask';
import { useInvokeSnap } from './snaps/useInvokeSnap';
import { useRequestSnap } from './snaps/useRequestSnap';
import { SeedFingerprint, WebWallet } from '@chainsafe/webzjs-wallet';
import { MAINNET_LIGHTWALLETD_PROXY } from '../config/constants';
import { SnapState } from '../types/snap';

interface SyncOptions {
  skipBalanceCache?: boolean;
}

interface WebzjsActions {
  getAccountData: () => Promise<
    { unifiedAddress: string; transparentAddress: string } | undefined
  >;
  triggerRescan: () => Promise<void>;
  flushDbToStore: () => Promise<void>;
  syncStateWithWallet: (options?: SyncOptions) => Promise<void>;
  connectWebZjsSnap: () => Promise<void>;
  fullResync: (customBirthday?: number) => Promise<void>;
  recoverWallet: () => Promise<void>;
}

export function useWebZjsActions(): WebzjsActions {
  const { state, dispatch } = useWebZjsContext();
  const { installedSnap } = useMetaMask();
  const { refreshSnapState } = useMetaMaskContext();
  const invokeSnap = useInvokeSnap();
  const requestSnap = useRequestSnap();

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

  /**
   * Caches the current total balance (confirmed + pending) in snap state for recovery
   * after cookie/IndexedDB clears. Since totalBalance now includes pending amounts
   * (per ZIP 315), the cache always reflects the correct total — no flags needed.
   *
   * Zero-protection: won't overwrite a positive cache with zeros (wallet may be
   * recovering). Pass force=true to bypass (used by fullResync).
   */
  const cacheBalanceInSnap = useCallback(async (balanceReport: {
    sapling_balance?: number;
    orchard_balance?: number;
    unshielded_balance?: number;
    pending_change?: number;
    pending_spendable?: number;
  } | null, force = false) => {
    if (!balanceReport) return;

    const confirmed = (balanceReport.sapling_balance ?? 0) + (balanceReport.orchard_balance ?? 0);
    const unshielded = balanceReport.unshielded_balance ?? 0;
    const pending = (balanceReport.pending_change ?? 0) + (balanceReport.pending_spendable ?? 0);
    const total = confirmed + unshielded + pending;

    try {
      const existingState = await invokeSnap({ method: 'getSnapStete' }) as SnapState | null;

      // Don't overwrite positive cache with zeros (wallet may be recovering)
      // fullResync passes force=true to bypass this
      if (!force && total === 0 && existingState?.lastKnownBalance) {
        const existingTotal = existingState.lastKnownBalance.shielded + existingState.lastKnownBalance.unshielded;
        if (existingTotal > 0) {
          console.info('Skipping balance cache: not replacing positive cache with zeros');
          return;
        }
      }

      // Cache: shielded = confirmed shielded + all pending (pending resolves to shielded)
      await invokeSnap({
        method: 'setSnapStete',
        params: {
          webWalletSyncStartBlock: existingState?.webWalletSyncStartBlock ?? '',
          hasPendingTx: null, // No longer used, kept for snap state compatibility
          lastKnownBalance: {
            shielded: confirmed + pending,
            unshielded,
            timestamp: Date.now(),
          },
        },
      });
      await refreshSnapState();
      console.info('Cached balance in snap state:', { shielded: confirmed + pending, unshielded, total });
    } catch (error) {
      console.warn('Failed to cache balance in snap state:', error);
    }
  }, [invokeSnap, refreshSnapState]);

  const syncStateWithWallet = useCallback(async (options?: SyncOptions) => {
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

        // Cache balance in snap state for recovery after cookie clears
        if (summary.account_balances?.length > 0 && !options?.skipBalanceCache) {
          const [, balanceReport] = summary.account_balances[0];
          await cacheBalanceInSnap(balanceReport);
        } else if (options?.skipBalanceCache) {
          console.info('Skipping balance cache update (transaction in progress)');
        }
      }
      const chainHeight = await state.webWallet.get_latest_block();
      if (chainHeight) {
        dispatch({ type: 'set-chain-height', payload: chainHeight });
      }
    } catch (error) {
      console.error('Error syncing state with wallet:', error);
      dispatch({ type: 'set-error', payload: String(error) });
    }
  }, [state.webWallet, dispatch, cacheBalanceInSnap]);

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

  const connectWebZjsSnap = useCallback(async () => {
    try {
      await requestSnap();

      if (state.webWallet === null) {
        // dispatch({
        //   type: 'set-error',
        //   payload: new Error('Wallet not initialized'),
        // });
        return;
      }

      // Check if wallet already has accounts (restored from IndexedDB)
      const existingSummary = await state.webWallet.get_wallet_summary();
      if (existingSummary && existingSummary.account_balances.length > 0) {
        // Account already exists - just set it as active and sync
        const existingAccountId = existingSummary.account_balances[0][0];
        dispatch({ type: 'set-active-account', payload: existingAccountId });
        await syncStateWithWallet();
        return;
      }

      // No existing account - create one
      const latestBlockBigInt = await state.webWallet.get_latest_block();
      const latestBlock = Number(latestBlockBigInt);

      let birthdayBlock = (await invokeSnap({
        method: 'setBirthdayBlock',
        params: { latestBlock },
      })) as number | null;

      // in case user pressed "Close" instead of "Continue to wallet" on prompt, still allow account creation with latest block
      if (birthdayBlock === null) {
        await invokeSnap({
          method: 'setSnapStete',
          params: { webWalletSyncStartBlock: latestBlock },
        });
        await refreshSnapState();
        birthdayBlock = latestBlock;
      }

      const viewingKey = (await invokeSnap({
        method: 'getViewingKey',
      })) as string;

      const seedFingerprintResult = await invokeSnap({
        method: 'getSeedFingerprint',
      });

      const hexString = typeof seedFingerprintResult === 'string'
        ? seedFingerprintResult
        : typeof seedFingerprintResult === 'object' && seedFingerprintResult !== null && 'data' in seedFingerprintResult
          ? Array.from(seedFingerprintResult.data as number[]).map((b: number) => b.toString(16).padStart(2, '0')).join('')
          : String(seedFingerprintResult);

      const seedFingerprintUint8Array = new Uint8Array(
        (hexString.match(/.{1,2}/g) || []).map((byte: string) => parseInt(byte, 16)),
      );

      const seedFingerprint = SeedFingerprint.from_bytes(
        seedFingerprintUint8Array,
      );

      const account_id = await state.webWallet.create_account_ufvk(
        'account-0',
        viewingKey,
        seedFingerprint,
        0,
        birthdayBlock,
      );

      dispatch({ type: 'set-active-account', payload: account_id });

      await syncStateWithWallet();

      await flushDbToStore();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const fullMessage = `Failed to connect to MetaMask Snap and create account: ${errorMsg}`;
      dispatch({
        type: 'set-error',
        payload: new Error(fullMessage),
      });
      throw error;
    }
  }, [
    state.webWallet,
    invokeSnap,
    dispatch,
    syncStateWithWallet,
    flushDbToStore,
    refreshSnapState,
    requestSnap,
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
      // dispatch({
      //   type: 'set-error',
      //   payload: new Error('Wallet not initialized'),
      // });
      return;
    }
    if (state.activeAccount === undefined || state.activeAccount === null) {
      // No account yet - user needs to connect first. Not an error.
      return;
    }
    if (state.syncInProgress) {
      return;
    }

    // Check if we're already at chain tip - skip redundant syncs
    // Allow a small buffer (2 blocks) for network propagation
    const fullySyncedHeight = state.summary?.fully_scanned_height;
    const chainHeight = state.chainHeight ? Number(state.chainHeight) : 0;
    if (fullySyncedHeight && chainHeight && fullySyncedHeight >= chainHeight - 2) {
      // Already synced to chain tip, just refresh the chain height
      try {
        const latestBlock = await state.webWallet.get_latest_block();
        if (latestBlock && latestBlock !== state.chainHeight) {
          dispatch({ type: 'set-chain-height', payload: latestBlock });
          // Only sync if chain has advanced
          if (fullySyncedHeight < Number(latestBlock)) {
            dispatch({ type: 'set-sync-in-progress', payload: true });
            try {
              await state.webWallet.sync();
              await syncStateWithWallet();
              await flushDbToStore();
            } finally {
              dispatch({ type: 'set-sync-in-progress', payload: false });
            }
          }
        }
      } catch (err) {
        console.error('Error checking chain height:', err);
      }
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
    installedSnap,
    state.loading,
    state.webWallet,
    state.activeAccount,
    state.syncInProgress,
    state.summary?.fully_scanned_height,
    state.chainHeight,
    dispatch,
    syncStateWithWallet,
    flushDbToStore,
  ]);

  /**
   * Performs a full wallet resync by:
   * 1. Clearing the cached wallet data from IndexedDB
   * 2. Creating a fresh wallet instance
   * 3. Re-importing the account with the original birthday
   * 4. Triggering a full sync from birthday
   *
   * This is a user-initiated action for recovering from sync issues.
   */
  const fullResync = useCallback(async (customBirthday?: number) => {
    if (!installedSnap) {
      dispatch({ type: 'set-error', payload: new Error('Snap not installed') });
      return;
    }
    if (state.syncInProgress) {
      dispatch({ type: 'set-error', payload: new Error('Sync already in progress') });
      return;
    }

    dispatch({ type: 'set-sync-in-progress', payload: true });

    try {
      // 1. Get the stored birthday from snap state
      const snapState = (await invokeSnap({
        method: 'getSnapStete',
      })) as SnapState | null;

      // Use custom birthday if provided, otherwise fall back to stored value
      const birthdayBlock = customBirthday ?? (snapState?.webWalletSyncStartBlock
        ? Number(snapState.webWalletSyncStartBlock)
        : undefined);

      // Save the new birthday to snap state if custom one was provided
      if (customBirthday) {
        await invokeSnap({
          method: 'setSnapStete',
          params: { webWalletSyncStartBlock: customBirthday },
        });
        await refreshSnapState();
      }

      // 2. Get credentials from snap
      const viewingKey = (await invokeSnap({
        method: 'getViewingKey',
      })) as string;

      const seedFingerprintResult = await invokeSnap({
        method: 'getSeedFingerprint',
      });

      const hexString = typeof seedFingerprintResult === 'string'
        ? seedFingerprintResult
        : typeof seedFingerprintResult === 'object' && seedFingerprintResult !== null && 'data' in seedFingerprintResult
          ? Array.from(seedFingerprintResult.data as number[]).map((b: number) => b.toString(16).padStart(2, '0')).join('')
          : String(seedFingerprintResult);

      const seedFingerprintUint8Array = new Uint8Array(
        (hexString.match(/.{1,2}/g) || []).map((byte: string) => parseInt(byte, 16)),
      );
      const seedFingerprint = SeedFingerprint.from_bytes(seedFingerprintUint8Array);

      // 3. Clear the cached wallet from IndexedDB
      console.info('Full resync: Clearing wallet from IndexedDB');
      await del('wallet');

      // 4. Create a fresh wallet instance
      console.info('Full resync: Creating fresh wallet');
      const freshWallet = new WebWallet('main', MAINNET_LIGHTWALLETD_PROXY, 1, 1, null);
      dispatch({ type: 'set-web-wallet', payload: freshWallet });

      // 5. Re-import the account with the original birthday
      console.info(`Full resync: Re-importing account with birthday ${birthdayBlock}`);
      const accountId = await freshWallet.create_account_ufvk(
        'account-0',
        viewingKey,
        seedFingerprint,
        0,
        birthdayBlock,
      );
      dispatch({ type: 'set-active-account', payload: accountId });

      // 6. Sync from birthday
      console.info('Full resync: Starting sync from birthday');
      await freshWallet.sync();

      // 7. Update state and persist
      const summary = await freshWallet.get_wallet_summary();
      if (summary) {
        dispatch({ type: 'set-summary', payload: summary });

        // Cache balance in snap state — force update after full resync
        if (summary.account_balances?.length > 0) {
          const [, balanceReport] = summary.account_balances[0];
          await cacheBalanceInSnap(balanceReport, true);
        }
      }

      const chainHeight = await freshWallet.get_latest_block();
      if (chainHeight) {
        dispatch({ type: 'set-chain-height', payload: chainHeight });
      }

      // 8. Persist the fresh wallet state
      const bytes = await freshWallet.db_to_bytes();
      await set('wallet', bytes);

      console.info('Full resync: Complete');
    } catch (err: unknown) {
      console.error('Full resync failed:', err);
      dispatch({ type: 'set-error', payload: String(err) });
    } finally {
      dispatch({ type: 'set-sync-in-progress', payload: false });
    }
  }, [installedSnap, state.syncInProgress, invokeSnap, dispatch, refreshSnapState, cacheBalanceInSnap]);

  /**
   * Recovers the wallet from snap credentials when IndexedDB data is empty or incompatible.
   * This is used for auto-recovery when the snap is reinstalled or upgraded.
   *
   * Key insight: Snap credentials (viewing key, seed fingerprint) are derived from
   * MetaMask's BIP44 seed - they survive reinstallation.
   */
  const recoverWallet = useCallback(async () => {
    if (!state.webWallet) {
      throw new Error('Wallet not initialized');
    }

    console.info('Auto-recovery: Attempting to recover wallet from snap credentials');

    // 1. Get credentials from snap (derived from MetaMask seed)
    const viewingKey = (await invokeSnap({ method: 'getViewingKey' })) as string;
    const seedFingerprintResult = await invokeSnap({ method: 'getSeedFingerprint' });

    const seedFingerprintHex = typeof seedFingerprintResult === 'string'
      ? seedFingerprintResult
      : typeof seedFingerprintResult === 'object' && seedFingerprintResult !== null && 'data' in seedFingerprintResult
        ? Array.from(seedFingerprintResult.data as number[]).map((b: number) => b.toString(16).padStart(2, '0')).join('')
        : String(seedFingerprintResult);

    const seedFingerprint = SeedFingerprint.from_bytes(new Uint8Array(
      (seedFingerprintHex.match(/.{1,2}/g) || []).map((byte: string) => parseInt(byte, 16)),
    ));

    // 2. Get birthday from snap state, or use latest block as fallback
    const snapState = (await invokeSnap({ method: 'getSnapStete' })) as SnapState | null;

    let birthdayBlock = snapState?.webWalletSyncStartBlock
      ? Number(snapState.webWalletSyncStartBlock)
      : undefined;

    if (!birthdayBlock) {
      console.info('Auto-recovery: No stored birthday, using latest block');
      const latestBlock = await state.webWallet.get_latest_block();
      birthdayBlock = Number(latestBlock);

      // Store for future
      await invokeSnap({
        method: 'setSnapStete',
        params: { webWalletSyncStartBlock: birthdayBlock },
      });
      await refreshSnapState();
    }

    // 3. Create account with recovered credentials
    const accountId = await state.webWallet.create_account_ufvk(
      'account-0',
      viewingKey,
      seedFingerprint,
      0,
      birthdayBlock,
    );

    dispatch({ type: 'set-active-account', payload: accountId });

    // 4. Sync state and persist
    await syncStateWithWallet();
    await flushDbToStore();

    console.info('Auto-recovery: Wallet recovered successfully');
  }, [state.webWallet, invokeSnap, dispatch, syncStateWithWallet, flushDbToStore, refreshSnapState]);

  return {
    getAccountData,
    triggerRescan,
    flushDbToStore,
    syncStateWithWallet,
    connectWebZjsSnap,
    fullResync,
    recoverWallet,
  };
}
