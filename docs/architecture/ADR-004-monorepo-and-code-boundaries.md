# ADR-004: Monorepo Structure & Package Isolation

## Status
Accepted (Phase 0 Decision)

## Context
A real-time multiplayer application requires coordination between:
- Domain business logic (rules, RNG, math, ledger)
- Realtime network protocol and room management
- Client-side reactive UI, rendering, animations, and sound

If these layers are coupled in a single monolithic Next.js directory, business logic becomes entangled with React component lifecycles, and backend testing requires booting React or mock HTTP environments.

## Decision
We enforce strict package boundaries via pnpm workspaces and Turborepo:

```
bau-cua/
├── apps/
│   ├── web/                    # Next.js 15 App Router (UI, Board, Animations, Sounds)
│   └── server/                 # Fastify / Node http + Socket.io Server (Room Authority)
├── packages/
│   ├── types/                  # Domain DTOs, Enums, Socket Event Contracts
│   └── engine/                 # Pure TypeScript Game Rules, FSM, Dice RNG, Settlement Math
├── public/
│   └── assets/                 # Shared visual and audio assets
├── docs/
│   ├── architecture/           # ADR-001 through ADR-004, system diagrams
│   └── implementation/         # Master implementation plan, contracts, asset mapping
└── turbo.json                  # Turborepo task orchestrator
```

### Dependency Graph & Rules
- `packages/types`: Zero external runtime dependencies. Leaf package.
- `packages/engine`: Depends only on `packages/types`. Zero DOM or Node HTTP dependencies. 100% testable in pure Node.
- `apps/server`: Depends on `packages/types` and `packages/engine`. Has zero Next.js or React dependencies.
- `apps/web`: Depends on `packages/types` (and optionally pure functions from `engine`). Communicates with `server` strictly over typed Socket.io events.

## Consequences
- Single command `pnpm dev` starts the entire full-stack multiplayer environment.
- Any game rule or payout calculation change in `engine` is immediately verified via unit tests without touching UI.
- Enables multi-agent parallelization: Backend and Frontend agents work against static contracts in `packages/types` without merge collisions.
