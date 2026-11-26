# Multi Hot 5 retained-backend adapter

`retained-core-adapter.mjs` adds `special74_multi_hot_5_v1` to the existing versioned slot core. It leaves every existing model and financial helper intact. The new model uses the independently authored operator specification, not private provider probabilities.

`prepare-operator-runtime.mjs` accepts only the SHA-256-pinned deployed runtime inspected for this change. It adds the core wrapper, includes the new ID in the existing fresh-release hooks, and routes its color gamble through the operator model. The existing authentication, wallet locks, SQL transactions, ledger transfers, limits and idempotency storage remain in place. The candidate is disabled unless `SPECIAL74_RELEASE=all74-v1`; do not set that variable before the entire catalogue passes its release checks.

The original backend snapshot and generated candidate contain retained application source and belong in locally ignored `.local-backend/`, not in a source commit. This tool only prepares files. It never starts or deploys the runtime.

The browser selects `/api/slots/fresh-state?gameId=special74_multi_hot_5_v1`, then uses the existing spin and gamble endpoints. A spin receipt contains the credited payout. The retained backend has no separate collect endpoint: Take only closes the win display and does not perform another credit.

## Local verification

The normal Node tests exercise the adapter and account transport. `verify-retained-adapter.mjs` additionally executes the actual retrieved settlement functions against an in-memory SQL fixture, including rollback and retry paths.

For genuine SQL transactions, `verify-retained-postgres.mjs` requires `pg` and a fresh disposable PostgreSQL database, explicitly opted in through `SPECIAL74_DISPOSABLE_POSTGRES=1`. It accepts only `SPECIAL74_LOCAL_PG_URL=postgresql://postgres@127.0.0.1:55474/special74_qa` and refuses an existing `sw_rebuild` schema. It never reads `DATABASE_URL`.

Run a local PostgreSQL container on **127.0.0.1 only**, with ephemeral data, database name `special74_qa`, and host port `55474`. Pass the retrieved runtime path, compiled adapter bundle path, and desired report path to the verification tool. Stop/remove the disposable container after the run.

The verified run used PostgreSQL 17.12 with the exact retained `sw_nine` migration and a minimal compatible `sw_rebuild` fixture. Twelve simultaneous identical spins and twelve identical gambles each produced one durable result. Independent requests competing for the last balance could not spend it twice. The suite also verified rollback after debit/credit/before commit, changed-parameter conflicts, replay-only requests and state restoration.

These tests do not verify all live database triggers, the complete live schema or authenticated production gateway routing. Reports retain those limitations, and financial activation remains unverified.
