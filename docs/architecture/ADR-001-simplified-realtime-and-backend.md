# ADR-001: Architecture Streamlining & Realtime Backend (Supabase-Deferred)

## Status
Accepted (Phase 0 Decision)

## Context
The original project specification targeted a full Vercel + Supabase deployment:
- Supabase PostgreSQL for persistent state and RLS
- Supabase Realtime (Broadcast + Presence) for multiplayer room synchronization
- Supabase Anonymous Auth for guest player identity

However, the user explicit requirement states:
> *"loại bỏ supabase trong scope này cũng được, config sau, make it simple first - run và deploy được trước - improve sau"*
> *(Removing Supabase in this initial scope is approved. Configure later, make it simple first: run locally and deploy immediately with zero friction, then improve later).*

### Challenges with Supabase in Early Milestones
1. **Developer Setup Friction**: Requires cloud project creation, API key provisioning, local CLI docker containers, and schema migrations before the core game engine and UI can even be tested locally.
2. **Cold Starts & Testing Complexity**: Automated unit and integration testing of game rooms becomes coupled to external Supabase endpoints or Docker containers.
3. **Serverless Realtime Limitations**: Supabase Broadcast requires an external client-side connection loop that makes server-side authoritative state management more fragmented between database triggers/RPC and edge functions.

## Decision

We adopt a **Decoupled Architecture with In-Memory/Lightweight Realtime Server First, Supabase-Ready Later**:

```
+-------------------------------------------------------------------+
|                        Client (Next.js Web)                       |
+-------------------------------------------------------------------+
                                  |
                   WebSocket (Socket.io) / REST API
                                  |
+-------------------------------------------------------------------+
|                   Multiplayer Game Server (Node.js)               |
|                                                                   |
|   +-----------------------------------------------------------+   |
|   |                  Authoritative Room Manager               |   |
|   |  - Room lifecycle (Create, Join, Leave, Host Migration)   |   |
|   |  - Presence & Heartbeat tracking                          |   |
|   |  - State snapshot & recovery buffer                       |   |
|   +-----------------------------------------------------------+   |
|                                 |                                 |
|   +-----------------------------------------------------------+   |
|   |          Pure Core Game Engine (@bau-cua/engine)          |   |
|   |  - Deterministic FSM: WAITING -> BETTING -> ROLLING       |   |
|   |  - Cryptographic server-side RNG                          |   |
|   |  - Point reservation, settlement & payout ledger          |   |
|   +-----------------------------------------------------------+   |
|                                 |                                 |
|   +-----------------------------------------------------------+   |
|   |                 Storage Repository Layer                  |   |
|   |                                                           |   |
|   |  [Active Initial]                 [Phase 7 Drop-in]       |   |
|   |  InMemoryRepository               SupabaseRepository      |   |
|   |  (Zero setup, instant run)        (PostgreSQL + RLS)      |   |
|   +-----------------------------------------------------------+   |
+-------------------------------------------------------------------+
```

### 1. Unified Monorepo with Standalone Fastify/Socket.io Server
- **Apps**:
  - `apps/web`: Next.js 14/15 React application (Lobby UI, Game Board, Animations, Sounds).
  - `apps/server`: Lightweight Node.js server powered by Fastify + Socket.io.
  - *Optionally for unified local dev*: Next.js custom server or concurrent dev script (`pnpm dev` spins up web on port 3000 and socket server on 3001, or single combined proxy).
- **Why Socket.io for Realtime**:
  - Built-in room multiplexing (`socket.join('room:' + roomId)`).
  - Built-in presence tracking and automated disconnect detection (`socket.on('disconnect')`).
  - Automatic fallback (WebSocket with HTTP long-polling fallback for constrained mobile networks).
  - Binary and JSON event serialization with built-in acknowledgment (`ack`) callbacks for reliable bet placement.

### 2. Hexagonal Repository Pattern (Pluggable Persistence)
All persistence operations are mediated by standard TypeScript interfaces:
- `IRoomRepository`: Find, list, create, update room meta and state.
- `IPlayerRepository`: Guest player profiles, session tokens, points balances.
- `ILedgerRepository`: Append-only transaction records of bets and payouts.

For Phase 1 through 6:
- We implement `InMemoryRepository` (with optional local SQLite persistence for persistence across server restarts).
- Zero external credentials, zero docker containers required to run `pnpm dev` or test the full multiplayer suite.

For Phase 7 (or when user requests Supabase):
- We swap `InMemoryRepository` with `SupabaseRepository` without touching a single line of game engine or UI code.

### 3. Deployment Strategy (Simple & Immediate)
- **Containerized / Node Deployment**:
  - Ready for 1-click deployment on **Render**, **Railway**, **Fly.io**, or **DigitalOcean App Platform** using a simple Dockerfile.
  - Can also run as a unified Next.js + Node server on any VPS or container host.
- **Vercel Path**:
  - The static/SSR frontend can be deployed to Vercel, pointing `NEXT_PUBLIC_SOCKET_URL` to the deployed realtime backend.

## Consequences

### Positive
- **Instant local setup**: Any developer or agent can run `git clone && pnpm install && pnpm dev` and have a working multiplayer game in under 60 seconds.
- **Rock-solid multiplayer synchronization**: Server-authoritative state in Node.js guarantees no race conditions or split-brain between database RPC and edge broadcast.
- **Fast test cycles**: Unit tests and multi-client simulation tests run in milliseconds using in-memory mocks without needing network mock servers.
- **Clean upgrade path**: Full database schema and migration scripts will still be authored in Phase 0/1, ready for Supabase drop-in.

### Trade-offs & Mitigations
- *Trade-off*: Running Socket.io requires a stateful Node.js container process rather than 100% serverless Vercel functions.
- *Mitigation*: Node server containerization is straightforward (provided Dockerfile), and free/low-cost tiers on Render, Railway, or Fly.io run it natively. When migrating to Supabase in Phase 7, Supabase Realtime + Vercel Edge can optionally replace the socket server if purely serverless hosting is desired.
