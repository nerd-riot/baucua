# Realtime Event Contracts & WebSocket API Specification

This document details the exact communication protocol between the Next.js client (`@bau-cua/web`) and the authoritative multiplayer server (`@bau-cua/server`).

## 1. Connection & Transport
- **Protocol**: WebSocket with HTTP long-polling fallback via Socket.io v4.
- **Port**: 3001 (default in development), configurable via `PORT` environment variable.
- **CORS**: Configurable via `CORS_ORIGIN`.

---

## 2. Client-to-Server Events (`ClientToServerEvents`)

### `guest:login`
Authenticates or registers a guest player profile.
- **Payload**:
  ```typescript
  {
    nickname: string;   // max 20 chars
    avatarId: string;   // 'char_boy_ao_dai_xanh' | 'char_girl_ao_dai_do' | ...
    deviceId: string;   // UUID stored in client localStorage
  }
  ```
- **Acknowledgment Callback**:
  ```typescript
  {
    success: boolean;
    player?: Player;
    error?: string;
  }
  ```

### `lobby:listRooms`
Requests the list of active public rooms.
- **Payload**: None
- **Acknowledgment Callback**:
  ```typescript
  {
    success: boolean;
    rooms: RoomSummary[];
  }
  ```

### `room:create`
Creates a new multiplayer game room. The creator automatically becomes Host.
- **Payload**:
  ```typescript
  {
    name: string;                // max 40 chars
    isPrivate: boolean;
    passcode?: string;
    maxPlayers?: number;         // 2 - 30 (default 30)
    betDurationSeconds?: number; // default 20s
  }
  ```
- **Acknowledgment Callback**:
  ```typescript
  {
    success: boolean;
    room?: Room;
    error?: string;
  }
  ```

### `room:join`
Joins an existing room by ID or 6-character room code.
- **Payload**:
  ```typescript
  {
    roomIdOrCode: string; // e.g. 'TET688'
    passcode?: string;
  }
  ```
- **Acknowledgment Callback**:
  ```typescript
  {
    success: boolean;
    room?: Room;
    error?: string;
  }
  ```

### `room:leave`
Leaves the current room. If host leaves, server automatically triggers host migration.
- **Payload**: None
- **Acknowledgment Callback**: `{ success: boolean }`

### `host:startRound`
Host starts the betting countdown for the next round.
- **Payload**: None
- **Acknowledgment Callback**: `{ success: boolean; error?: string }`

### `host:lockBetting`
Host immediately locks betting and triggers dice rolling.
- **Payload**: None
- **Acknowledgment Callback**: `{ success: boolean; error?: string }`

### `bet:place`
Places virtual points on one of the 6 animal symbols.
- **Payload**:
  ```typescript
  {
    clientBetId: string; // UUID v4 for idempotency
    roomId: string;
    symbol: 'BAU' | 'CUA' | 'TOM' | 'CA' | 'GA' | 'NAI';
    amount: number;      // positive integer
  }
  ```
- **Acknowledgment Callback**:
  ```typescript
  {
    success: boolean;
    bet?: Bet;
    newBalance?: number;
    error?: string;
  }
  ```

### `chat:send`
Broadcasts a chat message or sticker to room members.
- **Payload**:
  ```typescript
  {
    text?: string;
    stickerId?: string;
  }
  ```

---

## 3. Server-to-Client Events (`ServerToClientEvents`)

### `room:stateSync`
Full state snapshot delivered to reconcile desynchronized clients.
- **Payload**: `Room` object.

### `room:playerJoined`
Broadcast to room when a new player enters.
- **Payload**: `Player` object.

### `room:playerLeft`
Broadcast to room when a player disconnects or leaves.
- **Payload**: `{ playerId: string; newHostId?: string }`

### `round:started`
Signals beginning of betting countdown.
- **Payload**:
  ```typescript
  {
    roundId: string;
    roundNumber: number;
    bettingEndsAt: number; // Unix timestamp ms
    durationSeconds: number;
  }
  ```

### `round:betPlaced`
Broadcasts when any player successfully places a bet.
- **Payload**:
  ```typescript
  {
    bet: Bet;
    boardSummary: BoardBetSummary[];
  }
  ```

### `round:rolling`
Signals betting lock and initiates client-side 3D bowl shaking animation.
- **Payload**:
  ```typescript
  {
    roundId: string;
    shakingDurationMs: number; // e.g. 3500ms
  }
  ```

### `round:settled`
Delivered at conclusion of rolling animation with authoritative dice faces and settlements.
- **Payload**:
  ```typescript
  {
    roundId: string;
    diceResult: [SymbolId, SymbolId, SymbolId];
    settlements: PlayerSettlement[];
    boardSummary: BoardBetSummary[];
  }
  ```
