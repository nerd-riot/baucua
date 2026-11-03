import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SymbolId, Bet, Player } from '../src/types';
import { calculateBetPayout, countMatches, settleRound } from '../src/engine/settlement';

describe('Settlement Engine — Payout & Profit Rules', () => {
  it('correctly calculates 0 matches (Lost bet)', () => {
    const { payoutAmount, netProfit } = calculateBetPayout(100, 0);
    assert.strictEqual(payoutAmount, 0, 'Gross payout should be 0');
    assert.strictEqual(netProfit, -100, 'Net profit should be -100');
  });

  it('correctly calculates 1 match (Single win)', () => {
    // Bet 100 -> return 100 stake + 100 reward = 200 gross, +100 net
    const { payoutAmount, netProfit } = calculateBetPayout(100, 1);
    assert.strictEqual(payoutAmount, 200, 'Gross payout should be 200');
    assert.strictEqual(netProfit, 100, 'Net profit should be +100');
  });

  it('correctly calculates 2 matches (Double win)', () => {
    // Bet 100 -> return 100 stake + 200 reward = 300 gross, +200 net
    const { payoutAmount, netProfit } = calculateBetPayout(100, 2);
    assert.strictEqual(payoutAmount, 300, 'Gross payout should be 300');
    assert.strictEqual(netProfit, 200, 'Net profit should be +200');
  });

  it('correctly calculates 3 matches (Triple jackpot win)', () => {
    // Bet 100 -> return 100 stake + 300 reward = 400 gross, +300 net
    const { payoutAmount, netProfit } = calculateBetPayout(100, 3);
    assert.strictEqual(payoutAmount, 400, 'Gross payout should be 400');
    assert.strictEqual(netProfit, 300, 'Net profit should be +300');
  });

  it('accurately settles a multi-bet round with multiple players', () => {
    // Dice result: [BAU, BAU, GA] (2 Bầu, 1 Gà, 0 Cua)
    const dice: [SymbolId, SymbolId, SymbolId] = [SymbolId.BAU, SymbolId.BAU, SymbolId.GA];
    const matches = countMatches(dice);

    assert.strictEqual(matches[SymbolId.BAU], 2);
    assert.strictEqual(matches[SymbolId.GA], 1);
    assert.strictEqual(matches[SymbolId.CUA], 0);

    const players: Record<string, Player> = {
      p1: {
        id: 'p1',
        nickname: 'Khoa',
        avatarId: 'char_boy_ao_dai_xanh',
        points: 800, // already reserved 200
        deviceId: 'dev1',
        isReady: true,
        isHost: true,
        connected: true,
        joinedAt: 0,
        lastActiveAt: 0,
      },
    };

    const bets: Bet[] = [
      {
        id: 'b1',
        clientBetId: 'c1',
        roomId: 'r1',
        roundId: 'rnd1',
        playerId: 'p1',
        symbol: SymbolId.BAU, // 2 matches
        amount: 100,
        payoutAmount: 0,
        netProfit: 0,
        createdAt: 0,
      },
      {
        id: 'b2',
        clientBetId: 'c2',
        roomId: 'r1',
        roundId: 'rnd1',
        playerId: 'p1',
        symbol: SymbolId.CUA, // 0 matches (loss)
        amount: 100,
        payoutAmount: 0,
        netProfit: 0,
        createdAt: 0,
      },
    ];

    const outcome = settleRound(dice, bets, players);

    // b1 (BAU) with 2 matches: payout 300, profit +200
    // b2 (CUA) with 0 matches: payout 0, profit -100
    // Total gross payout = 300, total net profit = +100
    assert.strictEqual(outcome.totalPayoutDistributed, 300);

    const p1Settlement = outcome.playerSettlements.find((s) => s.playerId === 'p1');
    assert(p1Settlement);
    assert.strictEqual(p1Settlement.totalBet, 200);
    assert.strictEqual(p1Settlement.grossPayout, 300);
    assert.strictEqual(p1Settlement.netProfit, 100);
    // new balance = 800 (remaining) + 300 (gross payout) = 1100
    assert.strictEqual(p1Settlement.newBalance, 1100);
  });

  it('correctly provides bettor breakdown when multiple players bet on the same symbol', () => {
    const { summarizeBoardBets } = require('../src/engine/settlement');
    const players: Record<string, Player> = {
      p1: {
        id: 'p1',
        nickname: 'Khoa',
        avatarId: 'char_boy_ao_dai_xanh',
        points: 500,
        deviceId: 'd1',
        isReady: true,
        isHost: true,
        connected: true,
        joinedAt: 0,
        lastActiveAt: 0,
      },
      p2: {
        id: 'p2',
        nickname: 'Bé Trai',
        avatarId: 'char_boy_ao_dai_vang',
        points: 500,
        deviceId: 'd2',
        isReady: true,
        isHost: false,
        connected: true,
        joinedAt: 0,
        lastActiveAt: 0,
      },
    };

    const bets: Bet[] = [
      {
        id: 'b1',
        clientBetId: 'c1',
        roomId: 'r1',
        roundId: 'rnd1',
        playerId: 'p1',
        symbol: SymbolId.CUA,
        amount: 50,
        payoutAmount: 0,
        netProfit: 0,
        createdAt: 0,
      },
      {
        id: 'b2',
        clientBetId: 'c2',
        roomId: 'r1',
        roundId: 'rnd1',
        playerId: 'p2',
        symbol: SymbolId.CUA,
        amount: 100,
        payoutAmount: 0,
        netProfit: 0,
        createdAt: 0,
      },
    ];

    const summaries = summarizeBoardBets(bets, 'p1', players);
    const cuaSummary = summaries.find((s: any) => s.symbol === SymbolId.CUA);

    assert(cuaSummary);
    assert.strictEqual(cuaSummary.totalAmount, 150);
    assert.strictEqual(cuaSummary.playerCount, 2);
    assert.strictEqual(cuaSummary.myAmount, 50);
    assert.strictEqual(cuaSummary.bettors.length, 2);

    // Sorted descending by amount: p2 (100) first, p1 (50) second
    assert.strictEqual(cuaSummary.bettors[0].nickname, 'Bé Trai');
    assert.strictEqual(cuaSummary.bettors[0].amount, 100);
    assert.strictEqual(cuaSummary.bettors[1].nickname, 'Khoa');
    assert.strictEqual(cuaSummary.bettors[1].amount, 50);
    assert.strictEqual(cuaSummary.bettors[1].isMe, true);
  });
});
