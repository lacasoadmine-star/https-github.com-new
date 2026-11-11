# Existing-wallet bridge for the 72 independent models

## Scope and current status

`existing-library74-adapter.mjs` connects all 72 non-protected official-catalogue IDs to the retained `LibraryService`. `existing-library74-service.mjs` installs that adapter into an **already initialized service instance** and exports an authenticated-user facade. `existing-library74-http.mjs` supplies the native signed HTTP transport. Nothing here initializes a production database, creates a separate house wallet, runs a migration, changes an account, replaces a financial class or deploys a worker.

The default adapter has no reviewed IDs or configured betting policy and rejects every new stake. An integration must explicitly supply reviewed IDs, an enabled release gate, and `gameLimits` (an ID map or synchronous server resolver). The retained service's own `accepting` gate must also be enabled. Recovery and replay of already accepted rounds do not depend on the new-round gate or newly lowered betting limits.

The 72 probability models are independently authored. Matching catalogue identity, public layout or a published feature does not establish the provider's private probability model, return distribution or complete visual/gameplay parity. Those verification flags remain false in the public definitions.

## Ownership of money and round state

The bridge owns game-state evaluation. The retained classes still own:

- Existing player and house wallets in `sw_rebuild.wallets`.
- Double-entry transfer records and ledger legs, balance/capacity checks, account caps, audit entries and ancestor dashboard revisions.
- Existing per-round reserve wallets, maximum liability and final release of unused reserves.
- The existing `sw_native_library` versioned rounds, request hashes, exact replay receipts and one-active-round constraint.
- Existing canonical history in `sw_rebuild.rounds`.
- Shared account transactions, row locks, scheduled recovery and reconciliation.

The standalone `PostgresRepository` in this checkpoint is not used by this bridge. Do not activate it as an alternative wallet path.

## Reviewable backend artifact

Run `node server/build-existing-library74.mjs` from the project directory. This writes `server/artifacts/existing-library74-installer.mjs` and its SHA-256/source manifest. The backend bundle contains the independent math, public catalogue data, adapter, facade and HTTP installer. It excludes financial implementation fixtures, database drivers, migrations, account data and secrets. The only runtime import is `node:crypto`; a Node data-URL import is checked during the build.

The existing backend bootstrap can import the ESM artifact or load its verified bytes as a data URL. Its integration has the following shape, with all dependencies taken from that bootstrap's existing initialized objects:

```js
import { installExistingLibrary74, installExistingLibrary74Http }
  from './existing-library74-installer.mjs';

const facade = installExistingLibrary74({ service: existingLibraryService });
const app = installExistingLibrary74Http(previousApp, {
  service: existingLibraryService,
  facade,
  verifyNative,
  readNativeBody,
  engineSecret,
  resolveSessionUser,
});
```

This example intentionally keeps new rounds disabled. It does not call `migrate`, instantiate a financial service or add another cross-active guard. Selecting reviewed IDs and enabling stakes is a separate integration decision after the retained bootstrap and session routing have been checked. The artifact is a backend installer, not a Cloudflare Worker entry point or standalone HTTP server. Target production loader compatibility remains to be verified before deployment.

### Money and randomness

The native request field `stake` is a canonical decimal ETB string, for example `"5.00"`. The native service converts it to integer minor units. Every adapter debit, payout and liability is a canonical integer string; no client-provided balance, multiplier, outcome, seed or payout is accepted. The retained service verifies that the first debit exactly equals the requested stake. Later round actions debit `"0"`.

Initial/test presets are 1–20 ETB. The obsolete 4,000 ETB cap is removed. Each enabled game now requires a server-supplied `gameLimits` map (or synchronous resolver) with canonical integer `maxBetMinor` and `maxWinMinor`. No policy is supplied by default: public maxima are `null` and new stakes remain disabled, even if the release gate and review IDs are supplied. A model's internal maximum is derived from the retained service's 15-digit integer-money storage contract and its worst-case multiplier, including the entire bounded gamble chain. That technical representation limit is not an account betting policy.

The configured game policy is enforced before RNG; a selected stake's maximum liability must fit its configured payout limit. Stakes and wins above 40,000 ETB are supported when that policy permits them. The retained LibraryService then checks the existing account `max_balance` against potential post-round balance and atomically funds the per-round reserve from the actual house. Those checks remain authoritative. The current production game policies, account caps and available house balance have not been verified, so no new live stakes are enabled. Fixture policy values are test data and must never be copied into production as verified limits.

Example shape, using values obtained from audited existing configuration rather than constants: `gameLimits: {[gameId]: {maxBetMinor: verifiedGameMaximumMinor, maxWinMinor: verifiedGamePayoutMaximumMinor}}`. Accepted-round actions retain their pinned liability and evaluator regardless of later policy changes.

`maximumPayoutMinor` computes the reserve for the accepted stake and options. The adapter pins that bound for the entire round and rejects a credited or pending award above it. The native service reserves it before accepting the round. This also covers the full bounded Multi Hot 100 gamble chain when `holdWin` is selected.

The native service supplies its existing per-round/per-version HMAC random stream. The bridge converts its 53-bit draws to the math engine's bounded integer contract using rejection sampling. It does not use browser randomness or a client seed. Active public snapshots omit private mine cells, future ladder outcomes, RNG state, seeds and the hidden crash deadline. A held slot win exposes its already resolved grid and revealed gamble history.

### Expiry

| Round | Expiry settlement |
| --- | --- |
| Crash | Resolve at the mathematically computed crash/automatic-collect time using the accepted hidden outcome. |
| Ladder or mines with progress | Collect the already earned award through the same reserve and ledger. |
| Mines before any reveal | Return the accepted stake through a balanced final settlement. |
| Held slot win | Collect the pending award; do not discard an already earned win. |

The inactivity deadline is fixed when the round is accepted. Actions do not extend it. Crash deadlines remain private because they encode a hidden result. Accepted reserves may settle after an account is blocked, a cap is lowered or new rounds are disabled, through the retained reconciliation path.

## Authentication and facade contract

`installExistingLibrary74({service, reviewedGameIds, allowNewRounds, gameLimits, activeTtlMs})` returns:

- `definitions()` — safe public game definitions, including exact limits, controls, geometry, paytables, public rules and model disclosures.
- `state(resolvedPlayerId, gameId)` — canonical account balance and current or latest round.
- `action(resolvedPlayerId, body)` — the retained idempotent native action contract.
- `history(resolvedPlayerId, gameId, {limit: 20})` — an atomic state/history snapshot, bounded to 50 rounds.
- `service`, `adapter` and `registry` — references for integration and recovery.

The player ID argument is trusted server context. It must come from the existing authenticated session resolver, never from a browser body or query parameter. The HTTP installer takes the retained `verifyNative`, `readNativeBody`, engine secret and `resolveSessionUser`. Player routes accept signed `@session:<64 hex>` subjects and resolve them through the existing account system. They do not accept raw user IDs or `@system`.

The HTTP paths are `GET /v2/independent74/state?game_id=…`, `GET /v2/independent74/history?game_id=…`, and `POST /v2/independent74/action`. Public health exposes readiness and definitions only. The gateway owns the same-origin player-cookie transport and its session guard.

```json
{
  "request_id": "valid-uuid",
  "type": "start",
  "game_id": "ind74_official_mineisland",
  "model_version": "library74-v1:<the returned math version>",
  "stake": "1.00",
  "options": {}
}
```

```json
{
  "request_id": "a-new-valid-uuid",
  "type": "action",
  "game_id": "ind74_official_mineisland",
  "model_version": "<the accepted round's model_version>",
  "round_id": "<the accepted round_id>",
  "expected_version": 0,
  "action": "reveal",
  "input": { "cell": 4 }
}
```

Supported options/actions follow each public definition. Ladder starts may select `mode`; dice starts may select `target`; mines and ladder reveal an unused `cell`; crash uses server-time `sync` or `collect`. Multi Hot 100, Multi Hot 5 Wild and Multi Hot 5 Burn Wilds may start with `holdWin: true` and then `gamble` with `color: "red"` or `"black"`, or `collect` the pending award. The optional feature is documented by their official public pages. The independent fair-card probabilities, pre-spin hold choice and three-successful-round cap are authored choices, not verified provider probabilities or limits. Maximum reservation includes the full 8× gamble chain.

For Plinko X Classic, the server selects a pink 1×, orange 5× or fire 10× ball. **The request stake is the one total debit, and the client cannot select the color or multiplier.** The final payout is the stake times the bucket multiplier times the server-selected ball multiplier. The bridge reserves the full 10000× maximum before acceptance. `ballMultiplier`, `ballType` and the bucket/total multipliers become public only with the immediately settled result. The independent color weights and path probabilities are operator choices; complete provider color semantics remain unverified because the observed demo and marketing description differ.

PopX uses a six-column, five-row board with eleven symbols. Each group of eight or more identical symbols anywhere is removed; surviving symbols fall in their columns and new symbols fill the holes. Successful cascades raise the confirmed multiplier; the first nonmatching board crashes the round. Its precomputed sequence and terminal timestamp stay private. The public snapshot includes only the current confirmed grid, matches, multiplier and regular next-cycle time. Collection uses server time and loses if the terminal crash has already occurred. The independent 1500-millisecond cadence, 12-stage schedule, conditional grid probabilities and 100× automatic cap are authored model parameters. The provider's shared session and private bonus behavior are not implemented or claimed as equivalent.

Responses retain the native `balance`, optional replay `current_balance`, game and model version, `round_id`, round version, state, payout and other-active-game indicator. Public monetary strings are exact. On replay, `balance` belongs to the original receipt; `current_balance` is the current canonical balance. A caller must reconcile state after an uncertain request and retry the **identical request ID and payload**, rather than inventing a replacement stake.

## Version retention and existing-game exclusion

Registry composition preserves all unrelated existing games and every older accepted model version. A changed evaluator must use a changed math or bridge version. Installing another evaluator with an already registered ID/version throws `DUPLICATE_LIBRARY74_MODEL`; this avoids silently changing the rules of accepted rounds. Install the new facade once per retained service instance and pass it to the HTTP installer.

The exact retained `library-backend.mjs` includes `installCrossActiveGuards(shared, service, {jetx})`. It runs inside the inherited shared account transaction. Fresh native-family starts and JetX bets call `service.assertNoActive`, while accepted request replays keep their original behavior. Conversely, `LibraryService` checks active native-family rounds and JetX bets before accepting a new independent round.

**Deployment integration requirement:** preserve the existing cross-active-guard installation and its connection to the actual retained JetX service. Do not install a second guard wrapper accidentally. This offline bridge does not prove the currently deployed bootstrap still invokes every retained guard or includes every retained game in mutual exclusion. That bootstrap wiring must be verified before enabling new production stakes. No production source/settings access or live wager is needed for the isolated build tests.

## Isolated evidence and its limits

`server/tests/support/retained-library/provenance.json` pins the exact retained `LibraryService`, shared-wallet source and cross-active guard to GitHub commit `a0dd6a5f842c9c0fbc92eaeb441a136f49a49d78`, with byte counts and SHA-256 hashes. These are test fixtures, not replacement production modules. The loader verifies their hashes and adds a class export only to a temporary test copy.

`createRetainedLibrary74Fixture({isolated: true})` creates a disposable in-memory PGlite database. It rejects `DATABASE_URL` and blocks construction of a network SQL client. All accounts, balances, requests and outcomes in this fixture are generated test data. The helper returns the facade, retained service/shared objects, exact signature/body-reader functions, fixture user ID and a close method for browser QA.

The ledger tests exercise all 72 model IDs through those real retained financial classes. Additional tests cover repeated concurrent request delivery, conflicting retries, one-active-round exclusion, stale versions, account ownership, account/house capacity, account caps, injected failures after reserve and payout moves, crash terminal settlement, mine refunds, blocked-account recovery, old-version recovery and reciprocal native-start exclusion. PopX tests exercise confirmed cascade collection, terminal loss, its automatic cap and JSONB object-key reordering. Held-slot gamble tests verify one debit and one settlement; server-selected Plinko colors verify full liability without an additional color charge. They verify balanced transfer legs, conserved wallet totals, exact canonical history, dashboard revisions and zero reserves after settlement.

PGlite serializes transactions on one connection. Concurrent promise tests establish application replay behavior and SQL constraints in that engine; they do not establish production PostgreSQL multi-process contention, transport behavior under live loss, production database performance or provider probability/visual equivalence. Those claims are outside this offline build's evidence.
