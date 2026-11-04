import { SymbolId } from './symbols';

export type RoundState =
  | 'WAITING'   // Waiting for host to initiate round
  | 'BETTING'   // Countdown active, players place bets
  | 'ROLLING'   // Bets locked, dice are being shaken (3D animation)
  | 'REVEALED'; // Bowl lifted, results and payouts shown

export type DiceResult = [SymbolId, SymbolId, SymbolId];

export interface PlayerSettlement {
  playerId: string;
  nickname: string;
  avatarId: string;
  totalBet: number;
  grossPayout: number;
  netProfit: number;
  winningSymbols: SymbolId[];
  newBalance: number;
  isDealer?: boolean;
}

export interface Round {
  id: string;
  roomId: string;
  roundNumber: number;
  state: RoundState;
  diceResult?: DiceResult;
  startedAt: number;
  bettingEndsAt?: number;
  settledAt?: number;
  totalBetsAmount: number;
  settlements?: PlayerSettlement[];
}
