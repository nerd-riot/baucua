# ADR-003: Data Schema, Repository Abstraction & Supabase Migration Path

## Status
Accepted (Phase 0 Decision)

## Context
The project requires robust state management for guest accounts, game rooms, active rounds, player bets, and point ledgers.
Per user guidance to simplify early development and deployment without external Supabase dependencies, we employ the **Repository Pattern**:
- An **In-Memory / SQLite Repository** for Phases 1-6 (enables instant local development, fast integration tests, and zero-setup deployment).
- A **PostgreSQL / Supabase Schema & Migration Suite** authored and maintained in parallel, ensuring a 1-to-1 drop-in replacement in Phase 7.

## Decision

### 1. Core Domain Models

```typescript
export interface Player {
  id: string; // nanoid or uuid
  nickname: string;
  avatarId: string; // 'char_boy_ao_dai_xanh' | 'char_girl_ao_dai_do' | ...
  points: number; // Virtual points balance
  deviceId: string; // Persistent guest identifier in localStorage
  sessionToken: string; // Token for reconnect validation
  createdAt: number;
  lastActiveAt: number;
}

export interface Room {
  id: string; // UUID
  code: string; // 6-character room code (e.g. 'TET888')
  name: string;
  hostId: string;
  isPrivate: boolean;
  passcode?: string;
  maxPlayers: number; // Default 30, min 2
  playerIds: string[];
  status: 'WAITING' | 'BETTING' | 'ROLLING' | 'REVEALED';
  currentRoundId?: string;
  roundCountdown: number; // in seconds
  createdAt: number;
  updatedAt: number;
}

export interface Round {
  id: string;
  roomId: string;
  roundNumber: number;
  state: 'BETTING' | 'ROLLING' | 'REVEALED';
  diceResult?: [SymbolId, SymbolId, SymbolId];
  totalBetsAmount: number;
  startedAt: number;
  settledAt?: number;
}

export interface Bet {
  id: string;
  clientBetId: string; // For idempotency
  roundId: string;
  roomId: string;
  playerId: string;
  symbol: SymbolId;
  amount: number;
  payoutAmount: number; // Gross payout calculated at settlement
  netProfit: number; // Calculated at settlement
  createdAt: number;
}
```

### 2. Repository Interface Contracts
All persistent interactions across the application layer depend strictly on these abstract interfaces:

```typescript
export interface IPlayerRepository {
  findById(id: string): Promise<Player | null>;
  findByDeviceId(deviceId: string): Promise<Player | null>;
  create(player: Omit<Player, 'createdAt' | 'lastActiveAt'>): Promise<Player>;
  updatePoints(playerId: string, delta: number): Promise<number>;
  touchActive(playerId: string): Promise<void>;
}

export interface IRoomRepository {
  findById(id: string): Promise<Room | null>;
  findByCode(code: string): Promise<Room | null>;
  listPublicRooms(limit?: number): Promise<Room[]>;
  create(room: Omit<Room, 'createdAt' | 'updatedAt' | 'playerIds'>): Promise<Room>;
  updateStatus(roomId: string, status: Room['status'], roundId?: string): Promise<void>;
  addPlayer(roomId: string, playerId: string): Promise<boolean>;
  removePlayer(roomId: string, playerId: string): Promise<{ newHostId?: string; remainingCount: number }>;
  deleteRoom(roomId: string): Promise<void>;
}

export interface IRoundRepository {
  findById(id: string): Promise<Round | null>;
  findActiveByRoomId(roomId: string): Promise<Round | null>;
  create(round: Omit<Round, 'startedAt'>): Promise<Round>;
  saveDiceResult(roundId: string, dice: [SymbolId, SymbolId, SymbolId]): Promise<void>;
  markSettled(roundId: string, timestamp: number): Promise<void>;
}

export interface IBetRepository {
  placeBet(bet: Omit<Bet, 'id' | 'payoutAmount' | 'netProfit' | 'createdAt'>): Promise<Bet>;
  findByRound(roundId: string): Promise<Bet[]>;
  findByPlayerAndRound(playerId: string, roundId: string): Promise<Bet[]>;
  updateSettlement(betId: string, payoutAmount: number, netProfit: number): Promise<void>;
}

export interface ILedgerRepository {
  recordEntry(entry: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<LedgerEntry>;
  getHistoryByPlayer(playerId: string, limit?: number): Promise<LedgerEntry[]>;
}
```

### 3. Production PostgreSQL / Supabase Schema (Phase 7 Ready)
The SQL migrations will be preserved in `supabase/migrations/20261103000001_initial_schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(128) UNIQUE NOT NULL,
    nickname VARCHAR(64) NOT NULL,
    avatar_id VARCHAR(64) NOT NULL DEFAULT 'char_boy_ao_dai_xanh',
    points BIGINT NOT NULL DEFAULT 1000 CHECK (points >= 0),
    session_token VARCHAR(256) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(8) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    host_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    passcode VARCHAR(32),
    max_players INT NOT NULL DEFAULT 30 CHECK (max_players BETWEEN 2 AND 30),
    status VARCHAR(32) NOT NULL DEFAULT 'WAITING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Active Rounds
CREATE TABLE rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    round_number INT NOT NULL DEFAULT 1,
    state VARCHAR(32) NOT NULL DEFAULT 'BETTING',
    dice_1 VARCHAR(16),
    dice_2 VARCHAR(16),
    dice_3 VARCHAR(16),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

-- Bets
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_bet_id UUID UNIQUE NOT NULL,
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    symbol VARCHAR(16) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    payout_amount BIGINT NOT NULL DEFAULT 0,
    net_profit BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable Points Ledger
CREATE TABLE points_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    round_id UUID REFERENCES rounds(id) ON DELETE SET NULL,
    entry_type VARCHAR(32) NOT NULL,
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_bets_round ON bets(round_id);
CREATE INDEX idx_ledger_player ON points_ledger(player_id);
```

## Consequences
- Decouples development entirely from external cloud infrastructure in Phase 1-6.
- The entire game engine and storage logic can be verified with 100% in-memory deterministic tests in seconds.
- Guarantees seamless transition to Supabase PostgreSQL when moving to Phase 7.
