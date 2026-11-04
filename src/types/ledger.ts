export type LedgerEntryType =
  | 'INITIAL_GRANT'
  | 'BET_RESERVE'
  | 'BET_REFUND'
  | 'ROUND_PAYOUT'
  | 'DEALER_SETTLEMENT'
  | 'BONUS_RELOAD';

export interface LedgerEntry {
  id: string;
  playerId: string;
  roomId?: string;
  roundId?: string;
  type: LedgerEntryType;
  amount: number; // Negative for debits, positive for credits
  balanceAfter: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
}
