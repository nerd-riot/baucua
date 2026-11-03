# System Architecture — Bầu Cua Online

## 1. High-Level Architecture Overview

```mermaid
graph TD
    subgraph Client ["Client Layer (apps/web)"]
        UI["Next.js 15 UI (React 19)"]
        Sound["Web Audio Synthesizer (sound.ts)"]
        Framer["Framer Motion (Animations)"]
        SocketClient["Socket.io Client (@bau-cua/types)"]
    end

    subgraph Server ["Multiplayer Server (apps/server)"]
        SocketServer["Socket.io Server (Port 3001)"]
        RoomMgr["RoomManager (Presence & Lifecycle)"]
        LedgerMgr["LedgerManager (Reservation & Balance)"]
    end

    subgraph Engine ["Domain Engine (packages/engine)"]
        FSM["Game Round FSM"]
        RNG["Cryptographic RNG (rollDice)"]
        Settler["Settlement Calculator (settleRound)"]
    end

    UI --> SocketClient
    SocketClient <-->|WebSocket / Polling| SocketServer
    SocketServer --> RoomMgr
    RoomMgr --> FSM
    RoomMgr --> RNG
    RoomMgr --> Settler
    RoomMgr --> LedgerMgr
```

---

## 2. Round Lifecycle State Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Host
    actor Player
    participant Server as Socket Server (RoomManager)
    participant Engine as Game Engine

    Host->>Server: host:startRound
    Server->>Server: Init round (state: BETTING, duration: 25s)
    Server-->>Host: round:started
    Server-->>Player: round:started

    loop Betting Window (25s)
        Player->>Server: bet:place (symbol: BAU, amount: 100, clientBetId)
        Server->>Engine: LedgerManager.reserveBet()
        Server-->>Player: bet:place callback (newBalance: 900)
        Server-->>Host: round:betPlaced (boardSummary)
    end

    Note over Server: Countdown expires or Host clicks 'Khóa Cược'
    Server->>Server: State -> ROLLING
    Server-->>Host: round:rolling (duration: 3500ms)
    Server-->>Player: round:rolling (Play Shake Animation & Sound)

    Note over Server: Wait 3.5s for visual roll animation
    Server->>Engine: rollDice() -> [BAU, BAU, GA]
    Server->>Engine: settleRound(dice, bets)
    Server->>Engine: LedgerManager.creditPayout()
    Server-->>Host: round:settled (diceResult, settlements)
    Server-->>Player: round:settled (Show Bowl Reveal, Win Modal & Confetti)
```

---

## 3. Host Migration Strategy
If the active Host disconnects or leaves:
1. Socket server detects `disconnect` or `room:leave`.
2. `RoomManager.leaveRoom()` identifies if the leaving player is the room host.
3. The server queries the oldest remaining active player in `room.players`.
4. The remaining player is promoted to Host (`isHost: true`).
5. Server emits `room:hostChanged` to all remaining clients in the room.
6. The new host UI immediately gains round start and lock controls.
