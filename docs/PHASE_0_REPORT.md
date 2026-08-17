# Slime Hunter Phase 0 Report

## Executive summary

Phase 0 establishes the executable foundation for Slime Hunter as a typed pnpm monorepo. The repository now has validated runtime configuration, PostgreSQL and Redis adapters, a versioned network protocol, an authoritative Colyseus `foundation_room`, a Fastify smoke API, worker lifecycle skeletons, a pure shared game-core boundary, and a technical React + Phaser web shell.

The implementation deliberately stops short of gameplay simulation, movement, combat formulas, production art, and Echo/world behavior. Those concerns remain outside the Phase 0 acceptance surface.

## Implemented workspace

| Area           | Package or application      | Phase 0 responsibility                                                                      |
| -------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| Configuration  | `packages/config`           | Zod-validated environment schema and typed runtime config                                   |
| Database       | `packages/database`         | postgres.js lifecycle, health checks, migration discovery/runner, and proof migration       |
| Event bus      | `packages/event-bus`        | ioredis lifecycle, Redis Streams publish/consume, and typed event envelopes                 |
| Network        | `packages/network-protocol` | Versioned Zod C2S/S2C schemas and validation utilities                                      |
| Game core      | `packages/game-core`        | Pure `SlimeElement` value type and boundary proof                                           |
| Data           | `packages/game-data`        | Reserved shared data package skeleton                                                       |
| Test utilities | `packages/test-utils`       | Shared test utility package skeleton                                                        |
| API            | `apps/api`                  | Fastify `/health` and `/ready`, structured logging, and shutdown lifecycle                  |
| Realtime       | `apps/realtime`             | Colyseus `foundation_room`, authoritative player state, ping/pong, join/leave, and shutdown |
| Web            | `apps/web`                  | React 19 + Vite + Phaser technical shell, API polling, and realtime controls                |
| Echo worker    | `apps/echo-worker`          | Typed infrastructure startup/shutdown skeleton without Echo behavior                        |
| World worker   | `apps/world-worker`         | Typed infrastructure startup/shutdown skeleton without world simulation                     |
| Placeholders   | `apps/admin`, `packages/ai` | Reserved future application/package boundaries                                              |

## Technology stack

| Concern                   | Selected technology                          | Installed baseline                      |
| ------------------------- | -------------------------------------------- | --------------------------------------- |
| Runtime                   | Node.js                                      | 24.x via `.nvmrc`                       |
| Package manager           | pnpm                                         | 11.22.0                                 |
| Language                  | TypeScript                                   | 7.0.2                                   |
| Validation                | Zod                                          | 4.4.3                                   |
| API                       | Fastify                                      | 5.12.0                                  |
| Logging                   | Pino                                         | 10.3.1                                  |
| PostgreSQL client         | postgres.js                                  | 3.4.9                                   |
| Redis client              | ioredis                                      | 5.11.1                                  |
| Realtime server           | Colyseus                                     | 0.17.10                                 |
| Realtime transport/schema | `@colyseus/ws-transport`, `@colyseus/schema` | 0.17.13 / 3.0.76                        |
| Web client                | React, Vite, Phaser, Colyseus client         | 19.2.8 / 7.3.6 / 4.2.1 / 0.16.22        |
| Test runner               | Vitest                                       | 3.2.7                                   |
| Formatting                | Prettier                                     | 3.9.6                                   |
| Local infrastructure      | Docker Compose                               | PostgreSQL 17-alpine and Redis 7-alpine |
| CI infrastructure         | GitHub Actions services                      | PostgreSQL 18-alpine and Redis 8-alpine |

## Architecture decisions

The monorepo is organized around explicit package boundaries. Runtime configuration is centralized in `packages/config`, while database and Redis concerns are isolated behind `packages/database` and `packages/event-bus`. API, realtime, and workers depend on those adapters rather than duplicating connection logic.

The network protocol is versioned and validated at runtime so malformed messages are rejected at the boundary. The `foundation_room` is authoritative for participant membership and state synchronization. The web shell consumes the technical protocol and exposes infrastructure status without introducing gameplay behavior.

`packages/game-core` is intentionally pure. Its package manifest has no runtime dependencies, and a test rejects dependencies on React, Phaser, PostgreSQL, Redis, Fastify, Colyseus, or infrastructure workspace packages. This keeps future shared rules portable across server, worker, and client contexts.

CI uses a clean checkout, Node 24, pnpm 11.22.0, `pnpm install --frozen-lockfile`, PostgreSQL and Redis service containers, and sequential typecheck, formatting, test, and build gates. The lockfile is the source of truth for reproducible dependency installation.

## Quality gates and acceptance evidence

| Acceptance area                | Evidence                                                                                       | Status |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | -----: |
| Clean workspace install        | `pnpm install --frozen-lockfile` is configured in CI                                           |   PASS |
| Type safety                    | Workspace `pnpm typecheck` passes                                                              |   PASS |
| Static quality                 | Root `pnpm format:check` gate is configured                                                    |   PASS |
| Unit/integration tests         | Workspace `pnpm test` passes                                                                   |   PASS |
| Production build               | Workspace `pnpm build` passes                                                                  |   PASS |
| Configuration failure behavior | Valid, missing, invalid URL, and invalid port tests                                            |   PASS |
| PostgreSQL baseline            | Migration discovery, ordering, URL parsing, and connection failure tests                       |   PASS |
| Redis/event bus                | Envelope, stream key, serialization, and health failure tests                                  |   PASS |
| API smoke                      | `/health`, `/ready`, infrastructure failures, secret safety, and shutdown tests                |   PASS |
| Network protocol               | Versioned C2S/S2C parsing and invalid-payload rejection tests                                  |   PASS |
| Two-client realtime smoke      | Foundation-room two-client join/leave, ping/pong, and synchronized state tests                 |   PASS |
| Browser smoke                  | React shell and Phaser technical canvas rendered in Chromium without happy-path console errors |   PASS |
| Worker lifecycle               | Echo/world startup, shutdown, idempotency, and infrastructure failure tests                    |   PASS |
| Game-core boundary             | Pure value test and forbidden dependency manifest proof                                        |   PASS |
| Gameplay scope control         | No movement, combat, final art, Echo behavior, or world simulation added                       |   PASS |

The browser smoke was performed against the technical web shell with infrastructure services stopped; API and realtime controls correctly rendered offline/disconnected states while the React and Phaser surfaces mounted successfully. The realtime two-client evidence is represented by the foundation-room test suite, which exercises two simulated clients against the authoritative room logic.

## How to reproduce the gates locally

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24
pnpm install --frozen-lockfile
pnpm typecheck
pnpm format:check
pnpm test
pnpm build
```

For infrastructure-backed local development:

```bash
docker compose up -d
cp .env.example .env
pnpm --filter @slime-hunter/api dev
pnpm --filter @slime-hunter/realtime dev
pnpm --filter @slime-hunter/web dev
```

## Next step

Phase 0 is ready for review. **Phase 1 activation is pending review** of this report and confirmation of the next gameplay slice. The recommended next work should preserve the established boundaries: introduce gameplay rules only in `game-core`, evolve protocol messages through the versioned network package, and keep infrastructure access behind the existing adapters.
