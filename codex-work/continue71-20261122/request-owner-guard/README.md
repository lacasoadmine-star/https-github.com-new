# Request ownership across the existing engine and new Multi Hot 10

This continuation fixes the one-way request-key collision check when the existing engine and the new deferred M10 journal are installed together. An accepted M10 key must not be treated as a new wager by an old-game adapter; an accepted old-game/action key must not become a new M10 action. The guard is implemented but **not mounted in production**.

## Implementation

`request-owner-guard.mjs` checks the fixed existing round/action journals and the proposed M10 request journal on the caller's **same PostgreSQL client and transaction**, after its existing wallet locks. It takes a shared transaction-scoped advisory lock for the player/key, checks the journal owner before calling the original adapter, and verifies the owner after the callback before commit.

The guard returns the original callback's result unchanged. That callback retains full session, game/stake/model fingerprint, receipt, release, balance, payout and ledger checks. A matching owner is permission to run those existing checks, not permission to debit again. Another game/kind/journal rejects with `409 / IDEMPOTENCY_PARAMETER_CONFLICT`. More than one historical owner fails closed for investigation. A callback that returns success without claiming its journal fails and must roll back in the existing transaction.

All SQL is fixed and identities are parameters. Legacy non-UUID keys keep their original lookup value and are never cast into the new UUID column. UUID case variants share a cross-journal owner lock; this prevents differing string/UUID storage representations from creating another charge. If old data already contains multiple case variants of the same UUID, the guard reports ambiguous ownership instead of selecting one receipt.

`adapter-seams.mjs` supplies actual dependency-injection wrappers for both adapter families:

- `createGuardedLegacyAction({createAction, dependencies, kind})` wraps the existing SPIN, GAMBLE or PICK adapter factory. The original factory receives unchanged dependencies except its transaction callback. Inside that existing transaction, the wrapper reuses the actual host authentication and wallet-lock callbacks before running the guard and the unchanged adapter.
- `createGuardedMultiHot10Lifecycle({createLifecycle, dependencies})` wraps the prepared PostgreSQL lifecycle factory's SPIN, TAKE and X2 paths. Its read-only `state` and identity `handles` methods are left intact. It requires the PostgreSQL factory that receives a real client, not the lower-level in-memory transaction interface.

Both families must be installed together for symmetric protection. The normal stable wallet-lock order must be the same as the host's other account operations. Original adapters may acquire those rows again on the same transaction client. Do not wrap a nested independent transaction or autocommit client: rollback and mutual exclusion depend on the existing transaction boundary.

When the new journal is not installed, guarded old actions continue through their existing journals and M10 actions fail before any mutation. This component does not create a table, request ownership record, wallet, endpoint or process. It changes no current database grants or production configuration, and installs no model, stake policy or payout probability.

## Local verification

```sh
node --test codex-work/continue71-20261122/request-owner-guard/request-owner-guard.test.mjs
```

The initial isolated run passed **15/15 tests**, with no failures/skips. It first reproduces the unguarded separate-journal defect, then verifies both directions, 20 concurrent mixed attempts, accepted replays, game/kind conflicts, TAKE/X2 seams, rollback, missing claims, ambiguous historical claims, uninstalled journal behavior, non-UUID legacy keys, UUID case variants and separate-player ownership. The adapters and transactions in this suite are synthetic; the SQL guard and integration seams are the actual component. These results do not prove PostgreSQL locking or production ledger settlement.

## Disposable PostgreSQL verification

`postgres/run-postgres-tests.mjs` executes the same guard and integration seams with real PostgreSQL transactions, row/advisory locks and unique constraints. The supplied schema is a minimal fixture with the relevant original column types/constraints. It is not a complete copy of the production ledger and is not a migration.

The runner accepts only a local PostgreSQL admin URL pointing to `/postgres`, and requires `REQUEST_OWNER_TEST_CREATE_DATABASE=disposable-database-only`. It creates a random `zplay_request_owner_test_*` database and drops only that database after closing its connections. It will not reset an existing database. It fails clearly if its environment or dependency is absent; it does not report unexecuted checks as passing.

Required environment variables are:

- `REQUEST_OWNER_TEST_POSTGRES_ADMIN_URL`: connection for the disposable local PostgreSQL service, kept outside source.
- `REQUEST_OWNER_TEST_CREATE_DATABASE`: the explicit disposable database opt-in above.
- `REQUEST_OWNER_TEST_NODE_MODULES`: optional directory containing the test-only `pg` package.

Then run:

```sh
node --test codex-work/continue71-20261122/request-owner-guard/postgres/run-postgres-tests.mjs
```

Six PostgreSQL scenarios cover both collision directions, a 20-attempt race, replay, rollback after an inserted row or missing claim, new action kinds, UUID case variants and non-UUID legacy keys. **This suite was prepared but not executed locally:** the current local environment does not have PostgreSQL tooling or the `pg` driver. It is ready for a disposable CI service. Production wallet integration and complete game math remain separate work.

## Dedicated continuation CI

`.github/workflows/continue71-request-owner-qa.yml` runs only on `work/continue71-20261122`, for changes to this component, the isolated M20/M100 component directories or the workflow itself. Manual runs are also restricted to that branch. Its first job runs the 15 guard tests, five M20 motion tests and seven M100 presentation tests; this combined **27/27 component suite has passed locally**. Its dependent database job runs the six PostgreSQL scenarios against a temporary localhost service with synthetic credentials and account rows.

The workflow reuses the existing disposable QA versions: `pg@8.16.3` and the digest-pinned PostgreSQL 17 image. It uses read-only repository permission, no stored production secrets, installs the driver outside the checkout with package scripts disabled, bounds the test commands and jobs, and retains TAP output for seven days. The PostgreSQL test runner still creates and drops only its own random database. The workflow is prepared; a passing remote CI run has not yet been observed.

## Remaining host work

Mount the two seams together in the existing engine's source, prove that both retain the same real transaction/locks, then run the disposable PostgreSQL suite and host-specific account/ledger tests. Deferred reserve transfers still need a compatible existing-ledger mapping: they must not be mislabeled as an immediately credited WIN or collide with `(round_id,type)` uniqueness. No such migration or mapping is introduced here. M10's sampler, legal-outcome/aggregate/cap/rounding rules, retained math versions, ETB stake policy and X2 model remain prerequisites for activating that game.
