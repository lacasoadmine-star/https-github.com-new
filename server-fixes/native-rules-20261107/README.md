# Two additive native machines

This adds `foxy_hot_20_native` and `multi_hot_5_native` alongside all eleven existing machines. The original Foxy (`hot_foxy_20`) and Multi Hot5 (`multi_hot_5_video`) remain available with their original rules, wager ladders, receipt identities and free-spin obligations. The two new machines use the same existing wallet and ledger, with separate game IDs. No balances, history, stored receipts or free-spin rows are migrated.

New Foxy uses eight visible symbols, twenty authored payline paths, no scatter/free-spin award, twenty wager levels and five gamble attempts. New Multi Hot5 uses its authored five-line numbering, twenty-nine wager levels, 145× maximum win and five gamble attempts. The official demo's numeric wager ladders are adopted as an ETB operator profile; this is not a DMO-to-ETB conversion. Client model artifacts identify each new machine's presentation family separately from its financial game ID.

The provider's private reel-strip probabilities, wheel weighting and authoritative RNG are not available. Existing non-scatter Foxy strip entries keep their order and multiplicities; Multi Hot5's strips and both games' wheel weights remain unchanged. No claim is made that the resulting probability distribution or RTP matches the provider.

The new local ETB operator profile limits a gamble stake to 500.00 ETB. Provider public settings specify `DoublingMaxWin=500`, and observed official wins above 500 DMO did not offer Double. Whether the provider applies its ceiling to the current stake or potential doubled payout in the 250–500 interval remains unverified. This implementation allows a 500 ETB stake and blocks a stake above 500 before debit. It does not claim provider-equivalent behavior within that unverified interval. Legacy parent receipts retain their original gamble limits.

## Financial and release boundaries

- The original core is retained byte-for-byte. Every original game ID routes exclusively to it. All eleven original public models and seeded settlement outcomes remain exact.
- The combined game allowlist and public catalog expose thirteen games. Native IDs cannot select the legacy core through a `legacy` option or accept a legacy identity as their parent receipt.
- Free-spin rows remain keyed by user and game ID. Old Foxy free spins retain their original locked wager and retrigger behavior, and remain playable at zero balance. Their completion does not convert the old machine into a new machine.
- A settled request replays its original result before native-model checks. An idempotency token cannot be reused to move a receipt to another game ID. Old action replays resolve before parent-model validation.
- New paid native requests must pin the current `mathVersion`; optional engine/hash pins are checked when present. A stale or absent pin receives `409 GAME_RULES_UPDATED_RELOAD` before debit. Original machines retain their original request contract and wager ladder, including 4000 ETB.
- A new native gamble requires its parent receipt's exact game/version/engine/hash and allows five attempts. Original parents retain three attempts and their original unsupported-version rejection.
- New native gamble requests can pin `expectedStake` (up to four decimal places) and `expectedAttempt`. Each supplied guard is checked under the existing transaction and wallet lock against the actual next action, after replay lookup and before debit. A mismatch returns `409 GAMBLE_STATE_CHANGED`. Every original game ignores these additional fields as before; accepted request replays retain their behavior.
- `replayOnly:true` can recover an accepted native gamble key, but cannot create a new native gamble. Accepted replay is resolved first; after the authenticated parent lookup, an unsettled native recovery key is rejected before movement. Original games ignore this field as before; an unknown parent retains the original `ROUND_NOT_FOUND` behavior.
- `/api/state/:gameId` exposes the authenticated machine's next and current model identities and its own outstanding free spins. `/api/rounds/:roundId` provides authenticated exact receipt recovery.
- No schema migration is added. The captured `sw_nine` migration stores game IDs in unrestricted `VARCHAR(64)` or `TEXT` columns. The existing `sw_rebuild.rounds.game` mirror column's live constraints require release preflight confirmation because its creation SQL is not part of the captured source.
- The existing `/health` response adds `nativeSchemaCompatibility`. A startup probe asynchronously reads only `pg_catalog` metadata for `sw_rebuild.rounds.game`, with a two-second query timeout. Status is `pending`, `compatible`, `review_required`, or `unavailable`. Relevant CHECK/FK constraints, enabled INSERT triggers, INSERT rules, RLS, unsupported types or short columns require review. Query failure reports no database error details and does not disable legacy games or change normal health checks. A `compatible` result confirms this metadata check, not an executed financial transaction.
- Publish the additive backend first: all eleven old IDs and their request contracts remain unchanged. Verify health, live schema compatibility metadata and all thirteen public models before publishing the two new frontend routes and catalog cards. Retain support for every model that has already settled a receipt.

## Reproduction and evidence

Run `npm run build && npm test` in this directory. The builder verifies captured source hashes before generating `source/runtime-after.mjs`, client pins/strips in `artifacts/client-models.json`, and the build manifest. It extracts the exact production settlement/action/state bodies for tests; only synthetic dependencies are replaced. Tests do not connect to production wallets or databases.

`src/schema-probe.mjs` and `evidence/native-health-schema-query.sql` contain the exact readable health metadata query.

`evidence/schema-compatibility.json` distinguishes captured DDL compatibility from unverified live mirror constraints; `evidence/schema-compatibility-readonly.sql` provides metadata-only preflight queries.

`evidence/provenance.json` records the captured Railway deployment and exact legacy hashes. `evidence/verified-linepaths-gamble.json` records the verified public rules and local wager profile. `evidence/review.json` records the earlier replacement-scope review and explicitly marks its scope as superseded; the additive release requires its own preflight review.

All 54 tests pass locally, including catalog-result and query-failure mocks plus the exact production health route while metadata is pending/unavailable. The tests cover all eleven preserved models and 440 seeded settlements, twenty-five authored paths, unchanged paytables, new Foxy wild substitution and absence of scatter awards, legacy free-spin retriggers and old maximum wagers, model identity isolation, shared-wallet conservation, exact parent gamble limits, stale-pin rejection, idempotent replay, concurrent duplicate calls, zero-balance free spins, reserve checks, rollback at three injected fault points, and authoritative state for all thirteen machines. Synthetic transaction tests do not replace a real PostgreSQL/Redis integration test or deployment health checks.

## Compact Railway loader

`artifacts/deployment-wrapper.mjs` contains a gzip/base64 copy of the exact reviewed runtime, declares direct `pg` and `ioredis` imports for Railway dependency discovery, verifies the decompressed byte length and SHA256, writes `native-slot-runtime.mjs` beside the wrapper, then imports that file. The runtime therefore resolves the same installed packages as `index.tsx`. `scripts/build-deployment-wrapper.mjs` regenerates it after the runtime build and refuses an encoded wrapper argument at or above Linux's 131072-byte per-argument bound. No runtime code is changed by packaging.

The current wrapper's base64 argument is 110480 bytes. Tests execute a real local subprocess with that complete argument and verify decoded identity. An additional smoke check with actual locally installed `pg`/`ioredis` loaded the exact runtime until its missing-configuration guard, with database/Redis/origin variables absent; no live connection was attempted. A tampered expected hash was rejected before file creation. The saved proof is `evidence/deployment-wrapper-verification.json`.
