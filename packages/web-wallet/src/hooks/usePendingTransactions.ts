import { useState, useEffect, useCallback } from 'react';
import { useWebZjsContext } from '../context/WebzjsContext';
import type { TransactionHistoryEntry } from '../types/transaction';

interface PendingTransaction {
  txid: string;
  value: number;
  tx_type: string;
}

interface UsePendingTransactionsResult {
  pendingTxs: PendingTransaction[];
  totalPending: number;
  hasPending: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function usePendingTransactions(): UsePendingTransactionsResult {
  const { state } = useWebZjsContext();
  const [pendingTxs, setPendingTxs] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const checkPendingTransactions = useCallback(async () => {
    if (!state.webWallet || state.activeAccount === null || state.activeAccount === undefined) {
      setPendingTxs([]);
      setLoading(false);
      return;
    }

    try {
      const response = await state.webWallet.get_transaction_history(
        state.activeAccount,
        20, // Check recent txs
        0
      );

      const pending = response.transactions
        .filter((tx: TransactionHistoryEntry) => tx.status === 'Pending')
        .map((tx: TransactionHistoryEntry) => ({
          txid: tx.txid,
          value: Math.abs(tx.value),
          tx_type: tx.tx_type,
        }));

      setPendingTxs(pending);
    } catch (err) {
      console.error('Error checking pending transactions:', err);
      setPendingTxs([]);
    } finally {
      setLoading(false);
    }
  }, [state.webWallet, state.activeAccount]);

  // Check on mount, when wallet/account changes, or when summary updates (after transactions)
  // Skip during active sync — data is stale mid-sync and the WASM call competes with sync() for CPU
  useEffect(() => {
    if (!state.syncInProgress) {
      checkPendingTransactions();
    }
  }, [checkPendingTransactions, state.summary?.fully_scanned_height, state.syncInProgress]);

  const totalPending = pendingTxs.reduce((sum, tx) => sum + tx.value, 0);
  const hasPending = pendingTxs.length > 0;

  return {
    pendingTxs,
    totalPending,
    hasPending,
    loading,
    refresh: checkPendingTransactions,
  };
}

export default usePendingTransactions;
