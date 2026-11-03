import { LedgerEntry, LedgerEntryType } from '../types';

export class InsufficientPointsError extends Error {
  constructor(public required: number, public available: number) {
    super(`Insufficient points: required ${required}, but player only has ${available}`);
    this.name = 'InsufficientPointsError';
  }
}

export class DuplicateBetIdError extends Error {
  constructor(public clientBetId: string) {
    super(`Duplicate bet rejected: clientBetId '${clientBetId}' has already been processed`);
    this.name = 'DuplicateBetIdError';
  }
}

export interface BalanceLedgerState {
  points: number;
  entries: LedgerEntry[];
  processedBetIds: Set<string>;
}

export class LedgerManager {
  private accounts = new Map<string, BalanceLedgerState>();

  public getOrCreateAccount(playerId: string, initialBalance = 1000): BalanceLedgerState {
    let account = this.accounts.get(playerId);
    if (!account) {
      account = {
        points: initialBalance,
        entries: [
          {
            id: crypto.randomUUID(),
            playerId,
            type: 'INITIAL_GRANT',
            amount: initialBalance,
            balanceAfter: initialBalance,
            createdAt: Date.now(),
          },
        ],
        processedBetIds: new Set<string>(),
      };
      this.accounts.set(playerId, account);
    }
    return account;
  }

  public getBalance(playerId: string): number {
    return this.getOrCreateAccount(playerId).points;
  }

  /**
   * Reserves points for placing a bet.
   * Decrements player's available balance immediately.
   * Throws InsufficientPointsError if balance is too low.
   * Throws DuplicateBetIdError if clientBetId was already used.
   */
  public reserveBet(
    playerId: string,
    roomId: string,
    roundId: string,
    amount: number,
    clientBetId: string
  ): { newBalance: number; entry: LedgerEntry } {
    const account = this.getOrCreateAccount(playerId);

    if (account.processedBetIds.has(clientBetId)) {
      throw new DuplicateBetIdError(clientBetId);
    }

    if (account.points < amount) {
      throw new InsufficientPointsError(amount, account.points);
    }

    account.points -= amount;
    account.processedBetIds.add(clientBetId);

    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      playerId,
      roomId,
      roundId,
      type: 'BET_RESERVE',
      amount: -amount,
      balanceAfter: account.points,
      metadata: { clientBetId },
      createdAt: Date.now(),
    };

    account.entries.push(entry);
    return { newBalance: account.points, entry };
  }

  /**
   * Credits payout to a player after round settlement.
   */
  public creditPayout(
    playerId: string,
    roomId: string,
    roundId: string,
    grossPayout: number,
    netProfit: number
  ): { newBalance: number; entry?: LedgerEntry } {
    const account = this.getOrCreateAccount(playerId);

    if (grossPayout <= 0) {
      return { newBalance: account.points };
    }

    account.points += grossPayout;

    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      playerId,
      roomId,
      roundId,
      type: 'ROUND_PAYOUT',
      amount: grossPayout,
      balanceAfter: account.points,
      metadata: { netProfit },
      createdAt: Date.now(),
    };

    account.entries.push(entry);
    return { newBalance: account.points, entry };
  }

  /**
   * Reload bonus points for a player when their balance is low.
   */
  public reloadPoints(
    playerId: string,
    reloadAmount = 1000
  ): { newBalance: number; entry: LedgerEntry } {
    const account = this.getOrCreateAccount(playerId);
    account.points += reloadAmount;

    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      playerId,
      type: 'BONUS_RELOAD',
      amount: reloadAmount,
      balanceAfter: account.points,
      createdAt: Date.now(),
    };

    account.entries.push(entry);
    return { newBalance: account.points, entry };
  }
}
