export type TransactionType = 'Received' | 'Sent' | 'Shielded';
export type TransactionStatus = 'Confirmed' | 'Pending' | 'Expired';

export interface TransactionHistoryEntry {
  txid: string;
  tx_type: TransactionType;
  value: number;
  fee: number | null;
  block_height: number | null;
  confirmations: number;
  status: TransactionStatus;
  memo: string | null;
  timestamp: number | null;
  pool: string;
}

export interface TransactionHistoryResponse {
  transactions: TransactionHistoryEntry[];
  total_count: number;
  has_more: boolean;
}
