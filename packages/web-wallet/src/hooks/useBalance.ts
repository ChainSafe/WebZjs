import { useMemo } from 'react';
import { useWebZjsContext } from '../context/WebzjsContext';
import { useMetaMaskContext } from '../context/MetamaskContext';

type BalanceType = {
  /** Confirmed shielded balance (sapling + orchard) */
  shieldedBalance: number;
  /** Confirmed unshielded (transparent) balance */
  unshieldedBalance: number;
  /** Total balance including pending (ZIP 315 "total balance") */
  totalBalance: number;
  /** Confirmed-only spendable balance (excludes pending) */
  spendableBalance: number;
  saplingBalance: number;
  orchardBalance: number;
  /** Change from sent transactions waiting for mining confirmation */
  pendingChange: number;
  /** Received notes waiting for required confirmations to become spendable */
  pendingSpendable: number;
  /** Total pending amount (change + pending spendable) */
  totalPending: number;
  /** True if there are any pending transactions */
  hasPending: boolean;
  loading: boolean;
  error: string | null;
  /** True if this balance is from snap cache (during recovery) */
  isCached: boolean;
  /** Age of cached balance in milliseconds (only set if isCached is true) */
  cacheAge: number | null;
};

const useBalance = () => {
  const { state } = useWebZjsContext();
  const { snapState } = useMetaMaskContext();

  const activeBalanceReport = useMemo(() => {
    return state.summary?.account_balances.find(
      ([accountId]: [number]) => accountId === state.activeAccount,
    );
  }, [state.activeAccount, state.summary?.account_balances]);

  // Compute balances following ZIP 315:
  // - totalBalance = confirmed + pending (what the user "has")
  // - spendableBalance = confirmed only (what they can spend right now)
  // Falls back to snap cache when wallet hasn't loaded yet (e.g. page refresh)
  // Returns directly from useMemo — no useState/useEffect copy to avoid extra render cycle.
  const balances = useMemo((): BalanceType => {
    // Calculate live wallet balances if available
    let confirmedShielded = 0;
    let confirmedUnshielded = 0;
    let livePendingChange = 0;
    let livePendingSpendable = 0;
    let liveSapling = 0;
    let liveOrchard = 0;

    if (activeBalanceReport) {
      liveSapling = activeBalanceReport[1].sapling_balance || 0;
      liveOrchard = activeBalanceReport[1].orchard_balance || 0;
      confirmedShielded = liveSapling + liveOrchard;
      confirmedUnshielded = activeBalanceReport[1].unshielded_balance || 0;
      livePendingChange = activeBalanceReport[1].pending_change || 0;
      livePendingSpendable = activeBalanceReport[1].pending_spendable || 0;
    }

    const confirmedTotal = confirmedShielded + confirmedUnshielded;
    const pendingTotal = livePendingChange + livePendingSpendable;
    // ZIP 315: total = confirmed + pending
    const liveTotal = confirmedTotal + pendingTotal;

    // Check if we have cached balance from snap state
    const cached = snapState?.lastKnownBalance;
    const cachedTotal = cached ? cached.shielded + cached.unshielded : 0;

    // 1. Live data available with non-zero total — use live
    if (activeBalanceReport && liveTotal > 0) {
      return {
        shieldedBalance: confirmedShielded,
        unshieldedBalance: confirmedUnshielded,
        totalBalance: liveTotal,
        spendableBalance: confirmedTotal,
        saplingBalance: liveSapling,
        orchardBalance: liveOrchard,
        pendingChange: livePendingChange,
        pendingSpendable: livePendingSpendable,
        totalPending: pendingTotal,
        hasPending: pendingTotal > 0,
        loading: false,
        error: null,
        isCached: false,
        cacheAge: null,
      };
    }

    // 2. Live is zero but cache has values — show cache (recovery protection)
    if (cached && cachedTotal > 0) {
      const age = Date.now() - cached.timestamp;
      return {
        shieldedBalance: cached.shielded,
        unshieldedBalance: cached.unshielded,
        totalBalance: cachedTotal,
        spendableBalance: cachedTotal, // cache is from last known state
        saplingBalance: 0,
        orchardBalance: 0,
        pendingChange: livePendingChange,
        pendingSpendable: livePendingSpendable,
        totalPending: pendingTotal,
        hasPending: pendingTotal > 0,
        loading: false,
        error: null,
        isCached: true,
        cacheAge: age,
      };
    }

    // 3. Live exists but is zero, no cache — show live zeros
    if (activeBalanceReport) {
      return {
        shieldedBalance: confirmedShielded,
        unshieldedBalance: confirmedUnshielded,
        totalBalance: liveTotal,
        spendableBalance: confirmedTotal,
        saplingBalance: liveSapling,
        orchardBalance: liveOrchard,
        pendingChange: livePendingChange,
        pendingSpendable: livePendingSpendable,
        totalPending: pendingTotal,
        hasPending: pendingTotal > 0,
        loading: false,
        error: null,
        isCached: false,
        cacheAge: null,
      };
    }

    // 4. No data at all — loading if wallet hasn't initialized yet
    return {
      shieldedBalance: 0,
      unshieldedBalance: 0,
      totalBalance: 0,
      spendableBalance: 0,
      saplingBalance: 0,
      orchardBalance: 0,
      pendingChange: 0,
      pendingSpendable: 0,
      totalPending: 0,
      hasPending: false,
      loading: !state.webWallet,
      error: null,
      isCached: false,
      cacheAge: null,
    };
  }, [activeBalanceReport, snapState?.lastKnownBalance, state.webWallet]);

  return balances;
};

export default useBalance;
