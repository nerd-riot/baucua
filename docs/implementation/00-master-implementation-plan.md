# Bầu Cua Online — Master Implementation Plan & Progress

## 1. Project Overview & Strategy
- **Product**: Bầu Cua Online — Trò chơi dân gian Tết Giáp Thìn.
- **Audience**: Guest multiplayer (no registration, deviceId persistence).
- **Architecture**: Monorepo with Turborepo & pnpm.
  - `@bau-cua/types`: Domain types, event protocols, DTOs.
  - `@bau-cua/engine`: Pure deterministic game engine, cryptographic RNG, settlement math, points ledger.
  - `@bau-cua/server`: Node.js + Socket.io authoritative multiplayer server with room manager and presence.
  - `@bau-cua/web`: Next.js 15 App Router, React 19, Tailwind CSS, Framer Motion, Web Audio API sound synthesizer.
- **Simplification Strategy (Supabase-deferred)**:
  - Eliminated external Supabase dependency for initial phases per user directive: *"loại bỏ supabase trong scope này cũng được, config sau, make it simple first - run và deploy được trước - improve sau"*.
  - Full PostgreSQL / Supabase DDL schema authored and ready in `docs/architecture/ADR-003-data-schema-and-persistence.md` for seamless Phase 7 drop-in.

---

## 2. Milestone Execution Status

| Phase | Milestone | Status | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Discovery, Planning & ADRs | **DONE** | ADR-001, ADR-002, ADR-003, ADR-004, API & Event Contracts |
| **Phase 1** | Monorepo & Packages | **DONE** | Turborepo, `@bau-cua/types`, `@bau-cua/engine`, `@bau-cua/server`, `@bau-cua/web` |
| **Phase 2** | Lobby & Room Management | **DONE** | Guest nickname onboarding, public room discovery, create/join room, 6-char room code, 2-30 capacity, host migration |
| **Phase 3** | Game Engine & Economy | **DONE** | 6 animals, cryptographic RNG, exact gross payout vs net profit, ledger reservation, unit test suite (10/10 passing) |
| **Phase 4** | Realtime Multiplayer | **DONE** | Socket.io server, presence, countdown sync, live bets summary, end-to-end integration test passing |
| **Phase 5** | Visual, UX & Animations | **DONE** | High-res 3D mascots (1024x1024), Bát úp & Đĩa sứ, ceramic shaking physics, smooth reveal, chip selector, Web Audio API sounds, confetti |
| **Phase 6** | Hardening & Build Verification | **DONE** | Turborepo build 4/4 packages passing, zero TypeScript errors, end-to-end multi-client test |
| **Phase 7** | Deployment Readiness | **READY** | Standalone server scripts, Dockerfile, zero-config local run |

---

## 3. Verified Game Economy Rules
- **Bet Amount**: $B$ virtual points on symbol $S$.
- **Match Count**: $M \in \{0, 1, 2, 3\}$.
- **Gross Payout**:
  $$\text{Gross Payout} = \begin{cases} 0 & M = 0 \\ B \times (1 + M) & M \ge 1 \end{cases}$$
- **Net Profit**:
  $$\text{Net Profit} = \text{Gross Payout} - B$$
- **Account Invariants**: Available points immediately reserved on bet (`BET_RESERVE`); no balance underflow; duplicate `clientBetId` rejected via idempotency tracking.
