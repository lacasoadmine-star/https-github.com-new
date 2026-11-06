# Native visible-rule corrections for Foxy Hot20 and Multi Hot5

This changes the two target games' new paid-round models. Foxy uses its eight visible symbols, twenty authored payline paths, no scatter/free-spin award, twenty wager levels and five gamble attempts. Multi Hot5 uses its authored five-line numbering, twenty-nine wager levels, 145× maximum win and five gamble attempts. The official demo's numeric wager ladders are adopted as an ETB operator profile; this is not a DMO-to-ETB conversion.

The provider's private reel-strip probabilities, wheel weighting and authoritative RNG are not available. Existing non-scatter Foxy strip entries keep their order and multiplicities; Multi Hot5's strips and both games' wheel weights remain unchanged. No claim is made that the resulting probability distribution or RTP matches the provider.

The new local ETB operator profile limits a gamble stake to500.00ETB. Provider public settings specify `DoublingMaxWin=500`, and observed official wins above500DMO did not offer Double. Whether the provider applies its ceiling to the current stake or potential doubled payout in the250–500 interval remains unverified. This implementation allows a500ETB stake, blocks a stake above500 before debit, and does not claim provider-equivalent behavior within that unverified interval. Existing legacy receipt entitlements are unaffected.

## Financial and release boundaries

- The original core is retained byte-for-byte. The other nine games keep the original public models and settlement results.
- No balances, stored receipts, history or free-spin rows are migrated. Existing Foxy free spins use the complete legacy model, locked wager and retrigger behavior until depleted. Free spins remain playable at zero balance.
- A settled request replays its original result before current-model checks. Old action replays likewise resolve before parent-model validation.
- New paid target requests must pin the current `mathVersion`; optional engine/hash pins are checked when present. A stale or absent pin receives `409 GAME_RULES_UPDATED_RELOAD` before any debit.
- A new gamble selects its limit from its parent receipt's exact game/version/engine/hash. Legacy parents retain three attempts. Unknown identities cannot authorize new gambles.
- Gamble requests can pin `expectedStake` (up to four decimal places) and `expectedAttempt`. Each supplied guard is checked under the existing transaction and wallet lock against the actual next action, after replay lookup and before debit. A mismatch returns `409 GAMBLE_STATE_CHANGED`; clients must stop and refresh rather than silently wager the changed amount. Old unguarded requests and accepted request replays retain their behavior.
- A saved legacy gamble missing either expected field is recovered with `replayOnly:true`. An existing accepted key returns its original receipt. An unsettled key is rejected with `409 GAMBLE_STATE_CHANGED` before parent lookup or new settlement, so recovery cannot risk a larger wager from another tab. Requests that omit `replayOnly` retain legacy compatibility.
- `/api/state/:gameId` exposes both the next-round model and the current paid model, including when no recent history exists. `/api/rounds/:roundId` already provides authenticated exact receipt recovery.
- Publish the compatible frontend before the backend. Do not roll back the frontend to an implementation that cannot render or validate current receipts after backend activation.

## Reproduction and evidence

Run `npm run build && npm test` in this directory. The builder verifies captured source hashes before generating the deployable `source/runtime-after.mjs`, client pins/strips in `artifacts/client-models.json`, and the build manifest. It extracts the exact production settlement/action/state bodies for tests; only their synthetic dependencies are replaced. Tests do not connect to production wallets or databases.

`evidence/provenance.json` records the captured Railway deployment, exact legacy hashes and the staged state-endpoint work preserved by this replacement. `evidence/verified-linepaths-gamble.json` records the verified public rules and local wager profile. `evidence/review.json` records an independent read-only review.

The tests cover all nine unaffected models and 360 seeded settlements, the twenty-five authored paths, unchanged paytables, new strip geometry/absence of scatter awards, legacy free-spin retriggers and old maximum wagers, exact-model parent gamble limits, stale-pin rejection, idempotent replay, concurrent duplicate calls, zero-balance free spins, reserve checks, rollback at three injected fault points, and authoritative next-model state. Synthetic transaction tests verify branching and double-entry conservation; they do not replace a real PostgreSQL/Redis integration test or deployment health checks.
