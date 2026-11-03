import { Bet, BoardBetSummary, DiceResult, Player, PlayerSettlement, SymbolId, ALL_SYMBOLS } from '@bau-cua/types';

export interface SettlementOutcome {
  settledBets: Bet[];
  playerSettlements: PlayerSettlement[];
  boardSummary: BoardBetSummary[];
  totalPayoutDistributed: number;
}

/**
 * Counts occurrences of each symbol in the 3 rolled dice.
 */
export function countMatches(dice: DiceResult): Record<SymbolId, number> {
  const counts: Record<SymbolId, number> = {
    [SymbolId.BAU]: 0,
    [SymbolId.CUA]: 0,
    [SymbolId.TOM]: 0,
    [SymbolId.CA]:  0,
    [SymbolId.GA]:  0,
    [SymbolId.NAI]: 0,
  };

  for (const face of dice) {
    counts[face] = (counts[face] || 0) + 1;
  }
  return counts;
}

/**
 * Calculates payout and profit for a single bet.
 *
 * Rules:
 * - Match count M in {0, 1, 2, 3}
 * - If M == 0: Gross Payout = 0, Net Profit = -amount
 * - If M >= 1: Gross Payout = amount * (1 + M), Net Profit = amount * M
 *
 * Example (Bet 100):
 * - M = 0 -> Gross Payout: 0,   Net Profit: -100
 * - M = 1 -> Gross Payout: 200, Net Profit: +100 (100 stake returned + 100 reward)
 * - M = 2 -> Gross Payout: 300, Net Profit: +200 (100 stake returned + 200 reward)
 * - M = 3 -> Gross Payout: 400, Net Profit: +300 (100 stake returned + 300 reward)
 */
export function calculateBetPayout(betAmount: number, matchCount: number): {
  payoutAmount: number;
  netProfit: number;
} {
  if (betAmount <= 0) {
    return { payoutAmount: 0, netProfit: 0 };
  }

  if (matchCount === 0) {
    return {
      payoutAmount: 0,
      netProfit: -betAmount,
    };
  }

  const payoutAmount = betAmount * (1 + matchCount);
  const netProfit = betAmount * matchCount;

  return { payoutAmount, netProfit };
}

/**
 * Settles all bets in a round against the rolled dice.
 */
export function settleRound(
  dice: DiceResult,
  bets: Bet[],
  players: Record<string, Player>
): SettlementOutcome {
  const matches = countMatches(dice);
  let totalPayoutDistributed = 0;

  // Track per-player totals
  const playerStats: Record<
    string,
    {
      totalBet: number;
      grossPayout: number;
      netProfit: number;
      winningSymbols: Set<SymbolId>;
    }
  > = {};

  const settledBets: Bet[] = bets.map((bet) => {
    const matchCount = matches[bet.symbol] || 0;
    const { payoutAmount, netProfit } = calculateBetPayout(bet.amount, matchCount);

    totalPayoutDistributed += payoutAmount;

    if (!playerStats[bet.playerId]) {
      playerStats[bet.playerId] = {
        totalBet: 0,
        grossPayout: 0,
        netProfit: 0,
        winningSymbols: new Set<SymbolId>(),
      };
    }

    playerStats[bet.playerId].totalBet += bet.amount;
    playerStats[bet.playerId].grossPayout += payoutAmount;
    playerStats[bet.playerId].netProfit += netProfit;

    if (matchCount > 0) {
      playerStats[bet.playerId].winningSymbols.add(bet.symbol);
    }

    return {
      ...bet,
      payoutAmount,
      netProfit,
    };
  });

  // Build PlayerSettlement list
  const playerSettlements: PlayerSettlement[] = Object.entries(playerStats).map(
    ([playerId, stats]) => {
      const player = players[playerId];
      // Note: Player's balance was already deducted during BET_RESERVE,
      // so newBalance = currentBalance + grossPayout
      const currentBalance = player ? player.points : 0;
      const newBalance = currentBalance + stats.grossPayout;

      return {
        playerId,
        nickname: player ? player.nickname : 'Anonymous',
        avatarId: player ? player.avatarId : 'char_boy_ao_dai_xanh',
        totalBet: stats.totalBet,
        grossPayout: stats.grossPayout,
        netProfit: stats.netProfit,
        winningSymbols: Array.from(stats.winningSymbols),
        newBalance,
      };
    }
  );

  // Compute final board summary
  const boardSummary = summarizeBoardBets(settledBets);

  return {
    settledBets,
    playerSettlements,
    boardSummary,
    totalPayoutDistributed,
  };
}

/**
 * Summarizes total bets per symbol on the board.
 */
export function summarizeBoardBets(
  bets: Bet[],
  currentUserId?: string
): BoardBetSummary[] {
  const summaryMap: Record<
    SymbolId,
    { totalAmount: number; players: Set<string>; myAmount: number }
  > = {
    [SymbolId.BAU]: { totalAmount: 0, players: new Set(), myAmount: 0 },
    [SymbolId.CUA]: { totalAmount: 0, players: new Set(), myAmount: 0 },
    [SymbolId.TOM]: { totalAmount: 0, players: new Set(), myAmount: 0 },
    [SymbolId.CA]:  { totalAmount: 0, players: new Set(), myAmount: 0 },
    [SymbolId.GA]:  { totalAmount: 0, players: new Set(), myAmount: 0 },
    [SymbolId.NAI]: { totalAmount: 0, players: new Set(), myAmount: 0 },
  };

  for (const bet of bets) {
    const s = summaryMap[bet.symbol];
    if (s) {
      s.totalAmount += bet.amount;
      s.players.add(bet.playerId);
      if (currentUserId && bet.playerId === currentUserId) {
        s.myAmount += bet.amount;
      }
    }
  }

  return ALL_SYMBOLS.map((symbol) => ({
    symbol,
    totalAmount: summaryMap[symbol].totalAmount,
    playerCount: summaryMap[symbol].players.size,
    myAmount: summaryMap[symbol].myAmount,
  }));
}
