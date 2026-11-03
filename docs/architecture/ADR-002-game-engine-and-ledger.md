# ADR-002: Game State Authority, Point Ledger & Settlement Semantics

## Status
Accepted (Phase 0 Decision)

## Context
Bầu Cua Tôm Cá is a traditional Vietnamese social game of chance with 6 animal symbols. In multiplayer social play, the following risks must be prevented:
1. **Client Manipulation**: Clients attempting to modify their point balances, forge bets, or tamper with dice outcomes.
2. **Double Debit / Double Payout**: Duplicate requests caused by network retry or latency spikes.
3. **Ambiguity in Game Economy**: Confusion between gross payout (money returned to player) and net profit (profit earned above the original bet).
4. **Host Manipulation**: A rogue host forcing dice outcomes or settling rounds dishonestly.

## Decision

### 1. Six Animal Symbols
The game engine defines a strict enum for the 6 animal faces, indexed 0 to 5:
```typescript
export enum SymbolId {
  BAU = 'BAU', // 0: Bầu (Gourd)
  CUA = 'CUA', // 1: Cua (Crab)
  TOM = 'TOM', // 2: Tôm (Shrimp)
  CA  = 'CA',  // 3: Cá (Fish)
  GA  = 'GA',  // 4: Gà (Rooster)
  NAI = 'NAI', // 5: Nai (Stag)
}
```

### 2. Precise Payout Formula & Mathematical Specification
For every bet placed by player $P$ on symbol $S$ with amount $B$ ($B > 0$):
Let $M \in \{0, 1, 2, 3\}$ be the count of dice matching symbol $S$ in the 3-dice roll.

$$\text{Gross Payout} = \begin{cases} 0 & \text{if } M = 0 \\ B \times (1 + M) & \text{if } M \in \{1, 2, 3\} \end{cases}$$

$$\text{Net Profit} = \text{Gross Payout} - B = \begin{cases} -B & \text{if } M = 0 \\ B \times M & \text{if } M \in \{1, 2, 3\} \end{cases}$$

#### Verified Examples
| Bet Amount ($B$) | Match Count ($M$) | Gross Payout (Returned) | Net Profit | Player Balance Delta |
| :--- | :--- | :--- | :--- | :--- |
| 100 pts | 0 (No match) | 0 pts | -100 pts | -100 pts (initial reservation lost) |
| 100 pts | 1 (Single match) | 200 pts ($100 \times 2$) | +100 pts | +100 pts net (+200 credited at settlement) |
| 100 pts | 2 (Double match) | 300 pts ($100 \times 3$) | +200 pts | +200 pts net (+300 credited at settlement) |
| 100 pts | 3 (Triple match) | 400 pts ($100 \times 4$) | +300 pts | +300 pts net (+400 credited at settlement) |

### 3. Server Cryptographic RNG
Dice generation is strictly executed on the server using Node's cryptographic random generator:
```typescript
import crypto from 'node:crypto';

export function rollDice(): [SymbolId, SymbolId, SymbolId] {
  const symbols = [
    SymbolId.BAU, SymbolId.CUA, SymbolId.TOM,
    SymbolId.CA,  SymbolId.GA,  SymbolId.NAI
  ];
  return [
    symbols[crypto.randomInt(0, 6)],
    symbols[crypto.randomInt(0, 6)],
    symbols[crypto.randomInt(0, 6)],
  ];
}
```
Client code never has influence over or knowledge of the roll result until the server broadcasts the `ROUND_ROLLING` / `ROUND_REVEALED` event.

### 4. Deterministic State Machine (FSM)

```
                    +---------------------------+
                    |                           |
                    v                           |
            +---------------+                   |
            |    WAITING    |                   |
            +---------------+                   |
                    | (Host clicks Start /      |
                    |  Min 2 players ready)     |
                    v                           |
            +---------------+                   |
+---------> |    BETTING    | (Timer: 20-30s)   |
|           +---------------+                   |
|                   | (Timer expires or Host    |
|                   |  locks betting)           |
|                   v                           |
|           +---------------+                   |
|           |    ROLLING    | (Dice shaken,     |
|           +---------------+  Animation 3-5s)  |
|                   | (Roll completed &         |
|                   |  settled on server)       |
|                   v                           |
|           +---------------+                   |
|           |   REVEALED    | (Bowl opened,     |
|           +---------------+  Payouts shown)   |
|                   |                           |
|                   | (Host starts next round)  |
+-------------------+---------------------------+
```

#### State Transition Rules
1. `WAITING`: Players join, sit, prepare. Points can be replenished via guest daily/reset bonus.
2. `BETTING`: Bets accepted. Countdown runs (e.g. 25 seconds).
   - Locking constraint: At $T - 0$ seconds (or when Host clicks "Khóa cược"), state moves to `ROLLING`.
3. `ROLLING`: Server locks bets permanently. Server calls `rollDice()`. Server runs settlement logic and ledger commits in memory/database. Animation is broadcast to clients (`dice_rolling_group.png` & bát úp shaking).
4. `REVEALED`: Server reveals dice values and gross payouts per player. Win badges, sound effects, and confetti are displayed. Host or auto-timer triggers the next round.

### 5. Immutable Points Ledger & Point Reservation
Points are managed via an **Append-Only Ledger**:
```typescript
export interface LedgerEntry {
  id: string; // UUID v4
  playerId: string;
  roomId: string;
  roundId: string;
  type: 'INITIAL_GRANT' | 'BET_RESERVE' | 'BET_REFUND' | 'ROUND_PAYOUT' | 'BONUS_RELOAD';
  amount: number; // Positive for credits, negative for debits
  balanceAfter: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
}
```

#### Transactional Rules
1. **Reservation on Bet**: When player bets 100 on BẦU, an entry `BET_RESERVE` with `amount = -100` is recorded. The player's available balance is immediately deducted.
2. **Non-negative Invariant**: If `current_balance - bet_amount < 0`, the transaction fails with `INSUFFICIENT_FUNDS_ERROR`.
3. **Idempotency**: Every bet request contains a `clientBetId` (UUID). If a request with the same `clientBetId` is received twice, the second is safely ignored and returns the existing bet confirmation.
4. **Idempotent Settlement**: Settlement is tagged with `roundId`. A unique composite constraint `(roundId, playerId, type='ROUND_PAYOUT')` guarantees settlement can never be applied twice even under network re-broadcasts or server restarts.

## Consequences
- Impossible for client to alter dice outcomes or payouts.
- Guaranteed mathematical consistency: Total points in room remain closed and strictly tracked by the ledger.
- Clear separation between Game Engine logic (in `@bau-cua/engine`) and Transport / UI.
