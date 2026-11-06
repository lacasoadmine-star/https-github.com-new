# Earned free spins at zero balance

The live settlement function rejects every request when the player's balance is zero, even when an already-awarded free spin has a zero charge. This change checks `balanceBefore < charge`, so earned free spins can settle at zero while paid spins still require their full stake.

Only that predicate changes. Accounts, authentication, Redis token locks, PostgreSQL wallet locks and transactions, bet validation, house reserve checks, math, reel strips, existing free-spin rules, historical results, idempotency fingerprints and ledger SQL remain byte-for-byte unchanged. The new Wild Multi Stars rule candidate is separate and is not part of this release.

## Source and validation

- `source/runtime-before.mjs` is the exact deployed Railway Function source, read through `get_service_config` and independently confirmed through `get_function_source_code.deployedCode` on 2026-11-06. It is 72,915 bytes, without an added trailing newline.
- `source/runtime-after.mjs` is the complete deployable function, with one predicate replacement. It includes the original compressed math core and original-game runtime. It is not a shortened extract.
- `provenance.json` pins original/fixed source and encoded command hashes, current deployment, and existing pending patch.
- `credential-scan.json` records a targeted scan of the outer runtime and decompressed math core. No literal credentials were found. Credential values were never fetched; the runtime uses `DATABASE_URL` and `REDIS_URL` environment references.
- `npm test` requires Node 20 or newer and has no package dependencies. Tests load only the embedded pure math core; they do not start Bun, PostgreSQL, Redis, an HTTP server, or production wagers.

The financial tests execute the exact extracted production settlement body and exact receipt/cents helpers. They cover the reproduced failure, winning/losing free spins at zero, negative/insufficient/exact balances, invalid bets, bet lock and legacy retriggers, double-entry deltas, floor-to-cents settlement, duplicate receipt recovery, token conflicts, and injected rollback after debit, after credit and before commit. PostgreSQL and Redis are represented by a synthetic transaction adapter: these tests do **not** prove actual database locking, Redis availability, or serialization of different tokens. SQL/locking code is unchanged by the patch.

## Deployment guard

Target only existing project `5e2d5a78-b695-4d10-a0f1-7d7ded24b7f7`, environment `7ae2354a-69f3-4214-8b95-bcd276a84b89` (named staging but serving the Player), service `f3ac4415-260f-46f4-95b8-3c12eac83616` (`superwin-nine-slot-engine`). Baseline deployment: `009d0db9-dfe0-4db2-b36e-cbf113a10436`.

1. Source-control and review this release, run the tests, then read `get_function_source_code` and `get_service_config` again. Verify **deployedCode**, not `code`: `code` includes unrelated pending changes. Verify its SHA-256 matches `provenance.json`; stop on drift and rebase the one-line patch.
2. Capture the complete staged patch object and live configuration in private orchestration memory. Existing patch `e0a021d9-4b81-4699-9397-a8b2da932194` contains an unrelated `/api/state/` endpoint in the function command. Do not accept, delete, overwrite or publish it.
3. The Function-specific supported operation is `update_function_source_code` with the complete `runtime-after.mjs`, explicit IDs above, and `staged:false`. Its documented behavior updates and deploys this function directly. **Do not call `accept_deploy`**, which commits every pending change in the environment. An alternative is `update_service(startCommand,staged:false)` plus a redeploy using the existing build; the Function operation avoids manipulating the wrapper manually.
4. Poll the matching new deployment to terminal `SUCCESS`. Confirm `get_function_source_code.deployedCode` matches the reviewed after hash and compare the staged patch object with the preflight snapshot. The pending code must remain unchanged. Confirm public `/health` and Player game models still report 11 games, math hash `9bc6cfaad2fa6558882bc88a3eb78514f1432ab1c11a52217a427d1f383ba8e7`, engine `superwin-slot-runtime-reference-v3000`, and enabled state unchanged.
5. Rollback, if required, uses the complete `runtime-before.mjs` through the same function update operation, then verifies a successful deployment and matching source hash. It does not accept staged changes or alter data.

The pre-existing staged source still contains the old predicate. Preserving that pending edit is intentional; a future owner who chooses to publish it must first rebase it onto this fix. Otherwise that later deployment would restore the zero-balance bug. This release does not silently modify the pending edit.

## Runtime dependencies

The existing Railway Function runtime supplies Bun and resolves the existing `pg` and `ioredis` imports. Keep its source image, runtime version, `./run.sh` wrapper, environment bindings, healthcheck, replicas, networking and all other settings. This package does not create a service, move the backend, run a migration independently, or add new runtime dependencies.
