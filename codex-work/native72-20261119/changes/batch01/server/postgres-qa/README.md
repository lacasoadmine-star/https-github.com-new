# Disposable PostgreSQL acceptance

Run from this directory:

```sh
npm ci --ignore-scripts
npm test
```

Requires Node 22+ and Docker at `/var/run/docker.sock`. The runner creates its own randomly named PostgreSQL database in a temporary container, publishes PostgreSQL only on an ephemeral `127.0.0.1` port, and removes that container in `finally`. The database lives on tmpfs. It never reads `DATABASE_URL`, Railway credentials or production account data. Direct test invocation refuses any database except the runner's random loopback database.

The image is pinned to `postgres:17-bookworm@sha256:837bed18782820fe967067cb5328b02b0d9992c1be9a37ee0c9c492cfc03af3b`. The client is locked to `pg@8.16.3`.

The first 16 acceptance cases execute the actual batch01 adapter against PostgreSQL, including overlapping transactions from separate pool connections. They check exact integer cents and balanced ledger entries, eight concurrent same-token submissions per game producing one BET, rollback after payout and after a legacy-round insert error, auth/session revalidation, replay during profile failure, preflight rejection, active-game ownership, account limits, house reserve and release gates.

The runner then executes the 12 independent-model Session/route cases, 16 X2 cases and 8 M20 accepted-policy integration cases, sequentially against the same disposable database. The current defined total is 52 cases; this count is not a claim that a particular CI run has passed.

`existing-ledger.mjs` copies the deployed nine-engine authentication, ordered wallet locking, transaction settings, debit/credit CTE, and active-game/account-limit SQL observed read-only on 2026-11-21. `schema.sql` contains the deployed `sw_nine` migration. Its `sw_rebuild` and `sw_native_library` tables are **minimal QA fixtures for the columns used by those queries**, not the complete production DDL, whose runtime source was unavailable. This suite therefore establishes real PostgreSQL transaction behavior for that contract; it does not establish complete Railway integration or production-schema compatibility.

The synthetic all-seven reel profile, invented accounts and opening balances exist only inside this disposable test database. Its approval fields are QA inputs to exercise guarded code paths, not an operator certification or an RTP claim. No production wager, ETB account, deployment, live artwork/audio parity or completion gate is verified here.

## M20 accepted-policy integration

`m20-release-postgres.test.mjs` exercises `createNative72Batch01Binding()` with the actual immutable audited model and the explicit M20 release-policy verifier. It uses clearly synthetic acceptance attestations only as test inputs; it never edits the checked-in acceptance record or candidate approval fields. It verifies:

- A real Session's authenticated state, result grid, payline evaluation and integer PostgreSQL wallet debit/credit.
- Eight overlapping requests with one token produce one stored result and one BET.
- The existing global stop rejects new SPIN/X2 actions while permitting stored SPIN/X2 replay.
- Burn Wilds remains closed, and omitting acceptance keeps M20 closed.
- X2 uses the original ledger; Session TAKE WIN performs only a state read and cannot credit again.
- Failure after actual payout SQL rolls back the whole transaction.
- Reload/recovery after a committed response loss keeps the original token and one debit.
- In-transaction authentication, account capacity, house reserve and active-game ownership still reject before a debit.

After actual execution, this suite writes `reports/m20-release-postgres.json`, or writes into the directory named by the dedicated `ZPLAY_PG_QA_REPORT_DIR` variable. The report includes per-scenario outcomes, PostgreSQL version, actual application and QA source hashes, source-drift checks, and CI revision/run identifiers when available. It states `productionAcceptanceGranted: false` and identifies the synthetic-attestation scope.

Preserve that JSON file with CI artifacts. It reports only this eight-case suite, not the results of the preceding 44 cases. A missing, failed or skipped suite must not be normalized into successful release evidence. The complete CI logs and this hash-bound report are inputs to the subsequent release review.
