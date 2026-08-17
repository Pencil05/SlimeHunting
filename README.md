# Slime Hunter

Slime Hunter is a pnpm monorepo foundation for an authoritative multiplayer game. Phase 0 establishes the shared runtime contracts, infrastructure adapters, API and realtime smoke services, worker lifecycles, and a technical React + Phaser web shell. Gameplay simulation, combat rules, and final art are intentionally deferred.

## Prerequisites

Use **Node.js 24** and **pnpm 11.22.0**. Docker with Docker Compose is required for the local PostgreSQL and Redis services.

## Getting started

```bash
git clone https://github.com/Pencil05/SlimeHunting.git
cd SlimeHunting
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d
pnpm typecheck
pnpm test
pnpm build
```

To start the technical web shell in development mode, run `pnpm --filter @slime-hunter/web dev`. The API, realtime server, and workers can be started individually through their application entrypoints after the local infrastructure is available. Stop local infrastructure with `docker compose down`.

## Available scripts

| Command             | Purpose                                                               |
| ------------------- | --------------------------------------------------------------------- |
| `pnpm dev`          | Starts application development scripts in parallel where available    |
| `pnpm build`        | Builds all buildable workspace packages and applications              |
| `pnpm typecheck`    | Runs TypeScript checks across the workspace                           |
| `pnpm test`         | Runs unit and integration-oriented Vitest suites across the workspace |
| `pnpm lint`         | Runs each workspace lint script                                       |
| `pnpm format`       | Formats repository files with Prettier                                |
| `pnpm format:check` | Verifies repository formatting without modifying files                |

## Project structure

```text
apps/
  api/          Fastify health and readiness API
  echo-worker/  Typed infrastructure worker skeleton
  realtime/     Colyseus foundation_room server
  web/          React + Phaser technical shell
  world-worker/ Typed infrastructure worker skeleton
packages/
  config/             Zod runtime configuration
  database/           PostgreSQL lifecycle and migrations
  event-bus/          Redis Streams adapter and event envelopes
  game-core/          Pure shared game values
  game-data/          Reserved game data package
  network-protocol/   Versioned C2S/S2C protocol schemas
  test-utils/         Shared test utilities package
```

## Phase 0 status

Phase 0 is implemented through P0.10. The repository has a clean-checkout CI workflow, frozen-lockfile installation, PostgreSQL and Redis CI services, typecheck, formatting, tests, and build gates. The acceptance evidence includes API health/readiness tests, Redis event-bus serialization and failure tests, database migration-runner tests, two-client foundation-room join/leave and state synchronization tests, protocol validation tests, worker lifecycle tests, and a browser smoke check for the technical web shell.

The next step is Phase 1 activation after review of the Phase 0 report in [`docs/PHASE_0_REPORT.md`](docs/PHASE_0_REPORT.md).
