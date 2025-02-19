import { useState, useEffect, useMemo } from 'react';
import { useWebZjsContext } from '../context/WebzjsContext';

type BalanceType = {
  shieldedBalance: number;
  unshieldedBalance: number;
  totalBalance: number;
  saplingBalance: number;
  orchardBalance: number;
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
    loading: true,
    error: null,
  });

  const activeBalanceReport = useMemo(() => {
    return state.summary?.account_balances.find(
      ([accountId]: [number]) => accountId === state.activeAccount,
    );
  }, [state.activeAccount, state.chainHeight, state.summary?.account_balances]);

  // Compute shielded, unshielded, and total balances
  const {
    shieldedBalance,
    unshieldedBalance,
    totalBalance,
    saplingBalance,
    orchardBalance,
  } = useMemo(() => {
    const shielded = activeBalanceReport
      ? activeBalanceReport[1].sapling_balance +
        activeBalanceReport[1].orchard_balance
      : 0;

    const unshielded = activeBalanceReport?.[1]?.unshielded_balance || 0;

    return {
      shieldedBalance: shielded,
      unshieldedBalance: unshielded,
      totalBalance: shielded + unshielded,
      saplingBalance: activeBalanceReport?.[1]?.sapling_balance || 0,
      orchardBalance: activeBalanceReport?.[1]?.orchard_balance || 0,
    };
  }, [activeBalanceReport]);

  useEffect(() => {
    setBalances({
      shieldedBalance,
      unshieldedBalance,
      totalBalance,
      saplingBalance,
      orchardBalance,
      loading: false,
      error: null,
    });
  }, [
    shieldedBalance,
    unshieldedBalance,
    totalBalance,
    saplingBalance,
    orchardBalance,
  ]);

  return balances;
};

export default useBalance;
