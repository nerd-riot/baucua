import crypto from 'node:crypto';
import { ALL_SYMBOLS, DiceResult, SymbolId } from '../types';

/**
 * Cryptographically secure server-side dice roll.
 * Produces 3 uniformly distributed random symbols.
 */
export function rollDice(): DiceResult {
  const rollOne = (): SymbolId => {
    const idx = crypto.randomInt(0, ALL_SYMBOLS.length);
    return ALL_SYMBOLS[idx];
  };

  return [rollOne(), rollOne(), rollOne()];
}

/**
 * Deterministic dice roll for testing and replay.
 */
export function deterministicRoll(d1: SymbolId, d2: SymbolId, d3: SymbolId): DiceResult {
  return [d1, d2, d3];
}
