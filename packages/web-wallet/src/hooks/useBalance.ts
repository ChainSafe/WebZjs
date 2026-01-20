import { useState, useEffect, useMemo } from 'react';
import { useWebZjsContext } from '../context/WebzjsContext';

type BalanceType = {
  shieldedBalance: number;
  unshieldedBalance: number;
  totalBalance: number;
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
};

const useBalance = () => {
  const { state } = useWebZjsContext();

  const [balances, setBalances] = useState<BalanceType>({
    shieldedBalance: 0,
    unshieldedBalance: 0,
    totalBalance: 0,
    saplingBalance: 0,
    orchardBalance: 0,
    pendingChange: 0,
    pendingSpendable: 0,
    totalPending: 0,
    hasPending: false,
    loading: true,
    error: null,
  });

  const activeBalanceReport = useMemo(() => {
    return state.summary?.account_balances.find(
      ([accountId]: [number]) => accountId === state.activeAccount,
    );
  }, [state.activeAccount, state.chainHeight, state.summary?.account_balances]);

  // Compute shielded, unshielded, pending, and total balances
  const {
    shieldedBalance,
    unshieldedBalance,
    totalBalance,
    saplingBalance,
    orchardBalance,
    pendingChange,
    pendingSpendable,
    totalPending,
    hasPending,
  } = useMemo(() => {
    const shielded = activeBalanceReport
      ? activeBalanceReport[1].sapling_balance +
        activeBalanceReport[1].orchard_balance
      : 0;

    const unshielded = activeBalanceReport?.[1]?.unshielded_balance || 0;
    const change = activeBalanceReport?.[1]?.pending_change || 0;
    const spendable = activeBalanceReport?.[1]?.pending_spendable || 0;
    const pending = change + spendable;

    return {
      shieldedBalance: shielded,
      unshieldedBalance: unshielded,
      totalBalance: shielded + unshielded,
      saplingBalance: activeBalanceReport?.[1]?.sapling_balance || 0,
      orchardBalance: activeBalanceReport?.[1]?.orchard_balance || 0,
      pendingChange: change,
      pendingSpendable: spendable,
      totalPending: pending,
      hasPending: pending > 0,
    };
  }, [activeBalanceReport]);

  useEffect(() => {
    setBalances({
      shieldedBalance,
      unshieldedBalance,
      totalBalance,
      saplingBalance,
      orchardBalance,
      pendingChange,
      pendingSpendable,
      totalPending,
      hasPending,
      loading: false,
      error: null,
    });
  }, [
    shieldedBalance,
    unshieldedBalance,
    totalBalance,
    saplingBalance,
    orchardBalance,
    pendingChange,
    pendingSpendable,
    totalPending,
    hasPending,
  ]);

  return balances;
};

export default useBalance;
