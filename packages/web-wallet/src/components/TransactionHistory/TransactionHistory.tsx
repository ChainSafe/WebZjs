import React from 'react';
import { useTransactionHistory } from '../../hooks/useTransactionHistory';
import { zatsToZec } from '../../utils';
import type { TransactionHistoryEntry, TransactionType, TransactionStatus } from '../../types/transaction';

interface TransactionRowProps {
  transaction: TransactionHistoryEntry;
}

function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) return 'Pending';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeLabel(type: TransactionType): string {
  switch (type) {
    case 'Received':
      return 'Received';
    case 'Sent':
      return 'Sent';
    case 'Shielded':
      return 'Shielded';
    default:
      return type;
  }
}

function getStatusBadge(status: TransactionStatus): { text: string; className: string } {
  switch (status) {
    case 'Confirmed':
      return { text: 'Confirmed', className: 'bg-green-100 text-green-800' };
    case 'Pending':
      return { text: 'Pending', className: 'bg-yellow-100 text-yellow-800' };
    case 'Expired':
      return { text: 'Expired', className: 'bg-red-100 text-red-800' };
    default:
      return { text: status, className: 'bg-gray-100 text-gray-800' };
  }
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const isPositive = transaction.value > 0;
  const valueColor = isPositive ? 'text-green-600' : 'text-red-600';
  const valuePrefix = isPositive ? '+' : '';
  const statusBadge = getStatusBadge(transaction.status);

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">
              {getTypeLabel(transaction.tx_type)}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge.className}`}>
              {statusBadge.text}
            </span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {transaction.pool}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {formatTimestamp(transaction.timestamp)}
          </div>
          {transaction.memo && (
            <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2 break-words">
              {transaction.memo}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className={`font-semibold ${valueColor}`}>
            {valuePrefix}{zatsToZec(Math.abs(transaction.value))} ZEC
          </div>
          {transaction.confirmations > 0 && (
            <div className="text-xs text-gray-500">
              {transaction.confirmations} confirmation{transaction.confirmations !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400 font-mono truncate" title={transaction.txid}>
        {transaction.txid}
      </div>
    </div>
  );
}

function TransactionHistory() {
  const {
    transactions,
    loading,
    error,
    totalCount,
    hasMore,
    loadMore,
    refresh,
  } = useTransactionHistory({ pageSize: 20 });

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Error loading transaction history: {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Transaction History
          {totalCount > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({totalCount} total)
            </span>
          )}
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {transactions.length === 0 && !loading ? (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
          No transactions found. Sync your wallet to see transaction history.
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <TransactionRow key={tx.txid} transaction={tx} />
          ))}
        </div>
      )}

      {loading && (
        <div className="p-4 text-center text-gray-500">
          Loading transactions...
        </div>
      )}

      {hasMore && !loading && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

export default TransactionHistory;
