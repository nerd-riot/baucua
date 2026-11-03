import { SymbolId } from './symbols.js';

export interface Bet {
  id: string;
  clientBetId: string;
  roomId: string;
  roundId: string;
  playerId: string;
  symbol: SymbolId;
  amount: number;
  payoutAmount: number; // Gross payout: 0 if no match; amount * (1 + matchCount) if match
  netProfit: number; // payoutAmount - amount
  createdAt: number;
}

export interface PlaceBetRequest {
  clientBetId: string;
  roomId: string;
  symbol: SymbolId;
  amount: number;
}

export interface BoardBetSummary {
  symbol: SymbolId;
  totalAmount: number;
  playerCount: number;
  myAmount: number;
}
