import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LedgerManager, InsufficientPointsError, DuplicateBetIdError } from '../src/ledger.js';

describe('Ledger Engine — Account Balances & Invariants', () => {
  it('initializes account with default 1000 points', () => {
    const ledger = new LedgerManager();
    const balance = ledger.getBalance('player_1');
    assert.strictEqual(balance, 1000);
  });

  it('reserves points correctly on bet placement', () => {
    const ledger = new LedgerManager();
    const { newBalance, entry } = ledger.reserveBet('p1', 'r1', 'rnd1', 200, 'bet_uuid_1');
    assert.strictEqual(newBalance, 800);
    assert.strictEqual(entry.amount, -200);
    assert.strictEqual(entry.type, 'BET_RESERVE');
    assert.strictEqual(ledger.getBalance('p1'), 800);
  });

  it('rejects bet when points are insufficient', () => {
    const ledger = new LedgerManager();
    assert.throws(
      () => {
        ledger.reserveBet('p1', 'r1', 'rnd1', 1500, 'bet_uuid_too_large');
      },
      InsufficientPointsError,
      'Should throw InsufficientPointsError'
    );
    assert.strictEqual(ledger.getBalance('p1'), 1000, 'Balance must remain unchanged');
  });

  it('rejects duplicate clientBetId (idempotency check)', () => {
    const ledger = new LedgerManager();
    ledger.reserveBet('p1', 'r1', 'rnd1', 100, 'same_id_123');

    assert.throws(
      () => {
        ledger.reserveBet('p1', 'r1', 'rnd1', 100, 'same_id_123');
      },
      DuplicateBetIdError,
      'Duplicate clientBetId must throw error and not deduct twice'
    );
    assert.strictEqual(ledger.getBalance('p1'), 900);
  });

  it('correctly credits payout', () => {
    const ledger = new LedgerManager();
    ledger.reserveBet('p1', 'r1', 'rnd1', 100, 'id_1'); // 1000 -> 900
    // Gross payout 200 (net profit +100)
    const { newBalance } = ledger.creditPayout('p1', 'r1', 'rnd1', 200, 100);
    assert.strictEqual(newBalance, 1100);
    assert.strictEqual(ledger.getBalance('p1'), 1100);
  });
});
