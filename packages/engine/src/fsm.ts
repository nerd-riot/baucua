import { RoundState } from '@bau-cua/types';

export class InvalidStateTransitionError extends Error {
  constructor(public from: RoundState, public to: RoundState) {
    super(`Cannot transition game round from state '${from}' to '${to}'`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class RoundLockedError extends Error {
  constructor(public currentState: RoundState) {
    super(`Action rejected: round is currently locked in state '${currentState}'`);
    this.name = 'RoundLockedError';
  }
}

export const VALID_TRANSITIONS: Record<RoundState, RoundState[]> = {
  WAITING: ['BETTING'],
  BETTING: ['ROLLING'],
  ROLLING: ['REVEALED'],
  REVEALED: ['BETTING', 'WAITING'],
};

export function isValidTransition(from: RoundState, to: RoundState): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertCanBet(state: RoundState): void {
  if (state !== 'BETTING') {
    throw new RoundLockedError(state);
  }
}
