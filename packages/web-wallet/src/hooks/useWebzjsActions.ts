import { set, get } from 'idb-keyval';
import { useCallback, useRef } from 'react';
import { useWebZjsContext } from '../context/WebzjsContext';
import { useMetaMaskContext } from '../context/MetamaskContext';
import { useMetaMask } from './snaps/useMetaMask';
import { useInvokeSnap } from './snaps/useInvokeSnap';
import { useRequestSnap } from './snaps/useRequestSnap';
import { SeedFingerprint, WebWallet } from '@chainsafe/webzjs-wallet';
import { MAINNET_LIGHTWALLETD_PROXY } from '../config/constants';
import { SnapState } from '../types/snap';

// Synchronous guard: prevents triggerRescan from overlapping with fullResync.
// Module-level so it's shared across all hook instances and immune to stale closures.
let _fullResyncActive = false;

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

async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, baseDelay = 2000, label = 'operation' } = {}
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`${label} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms:`, err);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}

export function useWebZjsActions(): WebzjsActions {
  const { state, dispatch } = useWebZjsContext();
  const { installedSnap } = useMetaMask();
  const { refreshSnapState } = useMetaMaskContext();
  const invokeSnap = useInvokeSnap();
  const requestSnap = useRequestSnap();

  // Refs for values read inside triggerRescan but that shouldn't cause it to be recreated
  const fullySyncedRef = useRef(state.summary?.fully_scanned_height);
  const chainHeightRef = useRef(state.chainHeight);
  fullySyncedRef.current = state.summary?.fully_scanned_height;
  chainHeightRef.current = state.chainHeight;

  /**
   * Read-merge-write helper for snap state. Always reads existing state first,
   * merges the partial update, then writes the complete object back.
   * This prevents partial writes from wiping unrelated fields.
   *
   * If snap state lost webWalletSyncStartBlock (e.g. snap reinstall), restores
   * it from IndexedDB where it's also persisted.
   */
  const updateSnapState = useCallback(async (partial: Partial<SnapState>) => {
    const existing = await invokeSnap({ method: 'getSnapStete' }) as SnapState | null;

    // Restore birthday from IndexedDB if snap state lost it (e.g. snap reinstall)
    let birthday = existing?.webWalletSyncStartBlock;
    if (!birthday && !partial.webWalletSyncStartBlock) {
      const idbBirthday = await get('birthdayBlock') as string | undefined;
      if (idbBirthday) {
        birthday = idbBirthday;
      }
    }

    const merged: SnapState = {
      webWalletSyncStartBlock: birthday ?? '',
      lastKnownBalance: existing?.lastKnownBalance ?? null,
      hasPendingTx: existing?.hasPendingTx ?? null,
      ...partial,
    };

    // Also persist birthday to IndexedDB whenever it's being written to snap
    if (merged.webWalletSyncStartBlock) {
      await set('birthdayBlock', String(merged.webWalletSyncStartBlock));
    }

    await invokeSnap({ method: 'setSnapStete', params: merged });
    await refreshSnapState();
  }, [invokeSnap, refreshSnapState]);

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
   *
   * Dedup: skips snap IPC when shielded/unshielded haven't changed since last cache
   * (common at chain tip during repeated syncs with no new transactions).
   */
  const lastCachedBalanceRef = useRef<{ shielded: number; unshielded: number } | null>(null);

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

    // Don't overwrite cache with zeros (wallet may be recovering)
    // fullResync passes force=true to bypass this
    if (!force && total === 0) {
      console.info('Skipping balance cache: not caching zero balance (pass force=true to override)');
      return;
    }

    // Skip snap IPC if balance hasn't changed (avoids 3 round-trips + context re-render)
    const shieldedForCache = confirmed + pending;
    if (!force && lastCachedBalanceRef.current &&
        lastCachedBalanceRef.current.shielded === shieldedForCache &&
        lastCachedBalanceRef.current.unshielded === unshielded) {
      return;
    }

    try {
      // Cache: shielded = confirmed shielded + all pending (pending resolves to shielded)
      await updateSnapState({
        lastKnownBalance: {
          shielded: shieldedForCache,
          unshielded,
          timestamp: Date.now(),
        },
      });
      lastCachedBalanceRef.current = { shielded: shieldedForCache, unshielded };
      console.info('Cached balance in snap state:', { shielded: shieldedForCache, unshielded, total });
    } catch (error) {
      console.warn('Failed to cache balance in snap state:', error);
    }
  }, [updateSnapState]);

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
    } catch (error) {
      console.warn('Failed to sync state (will retry next interval):', error);
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

      // No existing account - create one using latest block as birthday
      // Users can do a full resync from the app if they need an earlier birthday
      const latestBlockBigInt = await state.webWallet.get_latest_block();
      const latestBlock = Number(latestBlockBigInt);
      const birthdayBlock = latestBlock;

      await set('birthdayBlock', String(birthdayBlock));
      await updateSnapState({ webWalletSyncStartBlock: String(latestBlock) });

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
    updateSnapState,
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
    if (state.syncInProgress || _fullResyncActive) {
      return;
    }

    // Check if we're already at chain tip - skip redundant syncs
    // Allow a small buffer (2 blocks) for network propagation
    const fullySyncedHeight = fullySyncedRef.current;
    const chainHeight = chainHeightRef.current ? Number(chainHeightRef.current) : 0;
    if (fullySyncedHeight && chainHeight && fullySyncedHeight >= chainHeight - 2) {
      // Already synced to chain tip, just refresh the chain height
      try {
        const latestBlock = await state.webWallet.get_latest_block();
        if (latestBlock && latestBlock !== chainHeightRef.current) {
          dispatch({ type: 'set-chain-height', payload: latestBlock });
          // Only sync if chain has advanced
          if (fullySyncedHeight < Number(latestBlock)) {
            dispatch({ type: 'set-sync-in-progress', payload: true });
            try {
              await withRetry(() => state.webWallet!.sync(), { label: 'sync', retries: 2, baseDelay: 3000 });
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
      await withRetry(() => state.webWallet!.sync(), { label: 'sync', retries: 2, baseDelay: 3000 });
      await syncStateWithWallet();
      await flushDbToStore();
    } catch (err: unknown) {
      console.warn('Sync failed (will retry next interval):', err);
    } finally {
      dispatch({ type: 'set-sync-in-progress', payload: false });
    }
  }, [
    installedSnap,
    state.loading,
    state.webWallet,
    state.activeAccount,
    state.syncInProgress,
    dispatch,
    syncStateWithWallet,
    flushDbToStore,
  ]);

  /**
   * Performs a full wallet resync by:
   * 1. Creating a fresh wallet in a local variable (old wallet stays in state)
   * 2. Re-importing the account with the original birthday
   * 3. Syncing from birthday with retry
   * 4. Only on success: swapping the new wallet into state + IndexedDB
   *
   * If any gRPC call fails, the old wallet remains untouched in state and IndexedDB.
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

    _fullResyncActive = true;
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
        await updateSnapState({ webWalletSyncStartBlock: String(customBirthday) });
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

      // 3. Create fresh wallet in LOCAL variable — old wallet stays in React state + IndexedDB
      console.info('Full resync: Creating fresh wallet (old wallet preserved as fallback)');
      const freshWallet = new WebWallet('main', MAINNET_LIGHTWALLETD_PROXY, 1, 1, null);

      // 4. Re-import the account with retry (makes GetTreeState gRPC call)
      console.info(`Full resync: Re-importing account with birthday ${birthdayBlock}`);
      const accountId = await withRetry(
        () => freshWallet.create_account_ufvk('account-0', viewingKey, seedFingerprint, 0, birthdayBlock),
        { label: 'create_account_ufvk', retries: 3, baseDelay: 2000 },
      );

      // 5. Sync from birthday in a loop — each sync() makes incremental progress
      //    The Rust WASM wallet resumes from where it left off on each call.
      //    With many blocks to scan, one sync() call can't finish before the
      //    lightwalletd proxy drops the connection, so we keep calling it.
      console.info('Full resync: Starting sync from birthday');
      const MAX_SYNC_ROUNDS = 20;
      const SYNC_ROUND_DELAY = 2000; // ms between rounds to let proxy recover
      let consecutiveFailures = 0;
      const MAX_CONSECUTIVE_FAILURES = 4;

      for (let round = 1; round <= MAX_SYNC_ROUNDS; round++) {
        try {
          console.info(`Full resync: sync round ${round}/${MAX_SYNC_ROUNDS}`);
          await freshWallet.sync();
          consecutiveFailures = 0;

          // Check if fully synced
          const summary = await freshWallet.get_wallet_summary();
          const chainTip = Number(await freshWallet.get_latest_block());
          const scannedHeight = summary?.fully_scanned_height ?? 0;

          console.info(`Full resync: scanned to ${scannedHeight} / ${chainTip}`);

          if (scannedHeight >= chainTip - 2) {
            console.info('Full resync: Fully synced');
            break;
          }

          // Not done yet — pause before next round
          if (round < MAX_SYNC_ROUNDS) {
            await new Promise(r => setTimeout(r, SYNC_ROUND_DELAY));
          }
        } catch (syncErr) {
          consecutiveFailures++;
          console.warn(`Full resync: sync round ${round} failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, syncErr);

          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            throw syncErr; // give up after too many consecutive failures
          }

          // Back off longer after failures
          const backoff = SYNC_ROUND_DELAY * Math.pow(2, consecutiveFailures - 1);
          console.info(`Full resync: backing off ${backoff}ms before retry`);
          await new Promise(r => setTimeout(r, backoff));
        }
      }

      // 6. SUCCESS — now swap the fresh wallet into state and IndexedDB
      console.info('Full resync: Sync succeeded, swapping wallet into state');
      dispatch({ type: 'set-web-wallet', payload: freshWallet });
      dispatch({ type: 'set-active-account', payload: accountId });

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

      // 7. Persist — overwrites old data (no need to del() first)
      const bytes = await freshWallet.db_to_bytes();
      await set('wallet', bytes);

      console.info('Full resync: Complete');
    } catch (err: unknown) {
      // FAILURE — old wallet remains in state + IndexedDB, user sees last known balances
      console.error('Full resync failed (old wallet preserved):', err);
      dispatch({ type: 'set-error', payload: String(err) });
    } finally {
      _fullResyncActive = false;
      dispatch({ type: 'set-sync-in-progress', payload: false });
    }
  }, [installedSnap, state.syncInProgress, invokeSnap, dispatch, updateSnapState, cacheBalanceInSnap]);

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

      // Store for future (read-merge-write preserves lastKnownBalance)
      await updateSnapState({ webWalletSyncStartBlock: String(birthdayBlock) });
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

    // 4. Sync state and persist (skip balance cache — wallet hasn't synced, balance is 0)
    await syncStateWithWallet({ skipBalanceCache: true });
    await flushDbToStore();

    console.info('Auto-recovery: Wallet recovered successfully');
  }, [state.webWallet, invokeSnap, dispatch, syncStateWithWallet, flushDbToStore, updateSnapState]);

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
