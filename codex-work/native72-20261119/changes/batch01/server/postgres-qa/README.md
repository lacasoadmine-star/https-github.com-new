# Disposable PostgreSQL acceptance

Run from this directory:

```sh
npm ci --ignore-scripts
npm test
```

Requires Node 22+ and Docker at `/var/run/docker.sock`. The runner creates its own randomly named PostgreSQL database in a temporary container, publishes PostgreSQL only on an ephemeral `127.0.0.1` port, and removes that container in `finally`. The database lives on tmpfs. It never reads `DATABASE_URL`, Railway credentials or production account data. Direct test invocation refuses any database except the runner's random loopback database.

The image is pinned to `postgres:17-bookworm@sha256:837bed18782820fe967067cb5328b02b0d9992c1be9a37ee0c9c492cfc03af3b`. The client is locked to `pg@8.16.3`.

The 16 acceptance cases execute the actual batch01 adapter against PostgreSQL, including overlapping transactions from separate pool connections. They check exact integer cents and balanced ledger entries, eight concurrent same-token submissions per game producing one BET, rollback after payout and after a legacy-round insert error, auth/session revalidation, replay during profile failure, preflight rejection, active-game ownership, account limits, house reserve and release gates.

`existing-ledger.mjs` copies the deployed nine-engine authentication, ordered wallet locking, transaction settings, debit/credit CTE, and active-game/account-limit SQL observed read-only on 2026-11-21. `schema.sql` contains the deployed `sw_nine` migration. Its `sw_rebuild` and `sw_native_library` tables are **minimal QA fixtures for the columns used by those queries**, not the complete production DDL, whose runtime source was unavailable. This suite therefore establishes real PostgreSQL transaction behavior for that contract; it does not establish complete Railway integration or production-schema compatibility.

The synthetic all-seven reel profile, invented accounts and opening balances exist only inside this disposable test database. Its approval fields are QA inputs to exercise guarded code paths, not an operator certification or an RTP claim. No production wager, ETB account, deployment, live artwork/audio parity or completion gate is verified here.
