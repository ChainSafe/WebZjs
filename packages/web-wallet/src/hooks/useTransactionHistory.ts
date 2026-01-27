import { useState, useEffect, useCallback } from 'react';
import { useWebZjsContext } from '../context/WebzjsContext';
import type { TransactionHistoryEntry, TransactionHistoryResponse } from '../types/transaction';

interface UseTransactionHistoryOptions {
  pageSize?: number;
}

interface UseTransactionHistoryResult {
  transactions: TransactionHistoryEntry[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 50;

export function useTransactionHistory(
  options: UseTransactionHistoryOptions = {}
): UseTransactionHistoryResult {
  const { pageSize = DEFAULT_PAGE_SIZE } = options;
  const { state } = useWebZjsContext();

  const [transactions, setTransactions] = useState<TransactionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchTransactions = useCallback(async (newOffset: number, append: boolean = false) => {
    if (!state.webWallet || state.activeAccount === null || state.activeAccount === undefined) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response: TransactionHistoryResponse = await state.webWallet.get_transaction_history(
        state.activeAccount,
        pageSize,
        newOffset
      );

      if (append) {
        setTransactions(prev => [...prev, ...response.transactions]);
      } else {
        setTransactions(response.transactions);
      }

      setTotalCount(response.total_count);
      setHasMore(response.has_more);
      setOffset(newOffset + response.transactions.length);
    } catch (err) {
      console.error('Failed to fetch transaction history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction history');
    } finally {
      setLoading(false);
    }
  }, [state.webWallet, state.activeAccount, pageSize]);

  // Initial load and refresh on sync completion
  useEffect(() => {
    if (state.webWallet && state.activeAccount !== null && state.activeAccount !== undefined) {
      fetchTransactions(0, false);
    }
  }, [state.webWallet, state.activeAccount, state.chainHeight, fetchTransactions]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchTransactions(offset, true);
    }
  }, [loading, hasMore, offset, fetchTransactions]);

  const refresh = useCallback(async () => {
    setOffset(0);
    await fetchTransactions(0, false);
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    totalCount,
    hasMore,
    loadMore,
    refresh,
  };
}

export default useTransactionHistory;
