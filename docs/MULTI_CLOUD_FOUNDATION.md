# Superwin Multi-Cloud Foundation

## Purpose

Add independent delivery and recovery locations without replacing the currently live player site, API, database, game catalog, or wallet ledger.

## Existing production baseline

- Player, Agent, and Admin are separate frontends.
- They share one FastAPI backend, one PostgreSQL database, and one wallet ledger.
- Railway currently hosts the production backend services and PostgreSQL.
- Cloudflare Worker player URL is already in use.
- The current GitHub Actions workflow contains Vercel deployment jobs for the three frontends.

## Target provider roles

| Provider | Intended role | Initial mode |
| --- | --- | --- |
| Cloudflare | DNS, edge routing, static asset cache, Worker entry point, WAF/rate limits | Active edge |
| Vercel | Player/Agent/Admin frontend builds and preview deployments | Preview first |
| Railway | Existing API and primary PostgreSQL | Keep production primary |
| Render | Independent API standby and health-check target | Standby; no writes until DB replication is designed |
| Fly.io | Regional read-only/API edge workloads and game catalog delivery | Standby/read-only first |
| S3-compatible object storage | Versioned game assets, images, and backup artifacts | Add after credentials and restore test |

## Non-negotiable data safety rules

1. Do not change the live Cloudflare Worker route or production DNS during the foundation phase.
2. Do not move or duplicate wallet writes to a second API/database.
3. PostgreSQL remains the single source of truth for balances, ledger entries, bets, and account state until a tested replication and failover design exists.
4. A standby API must be read-only or disabled for money-moving routes until it is explicitly promoted.
5. Never deploy a second writable casino/game settlement engine against the same player session without idempotency and a single-writer lock.
6. Never run `setup_and_run.sh` against an existing production database: it contains a DROP DATABASE operation for the local database named `igaming`.
7. Do not commit secrets, provider tokens, database URLs, JWT secrets, HMAC secrets, or player session credentials.
8. Preserve all existing game records and IDs. Quarantine only the failing game route/configuration; do not delete the game.

## Rollout stages

### Stage 0 — Inventory and protection

- Record live domains, service IDs, deployment IDs, database attachment, object storage use, and current DNS.
- Confirm the live API and player health endpoints.
- Back up database and game assets; perform a restore test before any data migration.
- Review the current Railway staged patch. Do not accept or discard unrelated staged changes.

### Stage 1 — Non-production provider validation

- Create isolated preview projects/environments on Vercel, Render, and Fly.io.
- Deploy frontends and a non-production API only.
- Run frontend build, API health, catalog, game-launch, session, and payment-webhook tests.
- Keep all preview endpoints disconnected from production player traffic and wallets.

### Stage 2 — Asset delivery

- Move only immutable/versioned static game assets to object storage.
- Verify checksums and origin fallback.
- Use Cloudflare cache with explicit versioned asset paths.
- Do not remove existing assets until every game passes launch tests through the new origin.

### Stage 3 — Regional read-only services

- Add regional catalog/config/read-only endpoints.
- Route health checks and read-only traffic only after parity checks.
- Keep balance, bet placement, settlement, deposits, withdrawals, and ledger writes on the primary backend.

### Stage 4 — Controlled failover

- Define a single-writer promotion procedure for API and database.
- Test restore, replay/idempotency, DNS/edge failover, and rollback in staging.
- Enable production failover only after recovery objectives and data consistency are verified.

## Required secrets (configure in provider secret stores only)

- Vercel: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, three project IDs.
- Render: service deploy token and private API URL.
- Fly.io: scoped deploy token and app names.
- Cloudflare: scoped API token and zone/account identifiers.
- Storage: endpoint, bucket, access key, secret key.
- Database replication: dedicated least-privilege replication credentials, only after design approval.

## Acceptance criteria

- Existing live player URL remains available throughout.
- All existing games remain in the catalog and retain their identifiers.
- No wallet or ledger writes are accepted by standby services.
- All game launch routes pass smoke tests before asset cutover.
- Database backup restoration is demonstrated, not merely reported.
- Each provider deployment reports a terminal healthy state.
- Rollback to the existing Cloudflare/Railway path is documented and tested.
