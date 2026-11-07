# ZPLAY game construction

## Current continuation

The active scope and implementation are in [continuation/README.md](continuation/README.md) and [continuation/requested-list.json](continuation/requested-list.json). The latest direct instruction names23 new games and preserves the four existing MultiHot5/FoxyHot20 variants plus the already started JetX and Balloon. Only individually verified models become launchable. Unresolved official demo references are recorded explicitly.

Balloon was published as player version `0ceec21f-fb49-4109-a878-7f4e81778150`; its source and release evidence are in `games/balloon/`. Current continuation release evidence is in `continuation/evidence/`.

The older catalogue and batch25 files below are retained for their historical evidence. They do not replace the current23-name scope, and no readiness claim from them is automatically carried into this continuation.

## Historical JetX release record


JetX is the only game implemented in this release. It has its own `jetx_native` identity, public client assets, server API, room state, four independent betting positions, canonical wallet reservations, settlements, history and chat. The previous games are retained.

The remaining batch follows `catalog/latest-requested-queue.json`: all23 names in the user's replacement list, plus Balloon and FootballX from their earlier list, making25. The latest instruction supersedes the former sequential20-game limit. JetX was already being finished and is outside this batch. The25 will become available together after their separate references, engines, presentations and wallet behavior pass verification. The catalogue validator rejects partial batch publication.

## Reference and mathematical scope

Presentation assets and client code were captured from SmartSoft's official JetX demo. The original two/four-panel controls, scene animations, sounds, mobile layouts, preferences and onboarding are retained. Browser tests exercised queue/cancel, independent bets, manual collection, automatic collection and reload recovery.

The provider's private outcome distribution was not exposed by its demo. This is an independent Superwin server model, with a 97% survival return before rounding and maximum-win limits; it is not claimed to be the provider's RNG or a 100% mathematical replica. This distinction is also included in the game rules and API metadata. Observed public rules include truncation to santim, `5.50 × 1.01 → 5.55`, and the flight progression `floor(exp(step / 70) × 100)` with 150 ms steps.

## Preservation and finances

- The deployed native-family runtime is preserved byte for byte as a module body, SHA-256 `7e66f2f8d89a02abc287e0b38aff20d877482d9067e1023abf3db20d3f976491`. Its existing routes and game definitions are retained.
- New records use `sw_jetx_native`; canonical transfers, ledger entries, reservations, audit records and dashboard revisions use the existing wallet implementation. No production test account, invented production credit or production test wager was used.
- Each request is idempotent and bound to the existing authenticated player and browser session. The Worker uses the actual `/api/machine-session` contract and signs a cookie digest; the backend resolves it through canonical sessions. Client-supplied payouts, multipliers and identities are rejected.
- Four positions have separate stakes and liabilities. Pending liabilities are included in account-limit checks. Timers, restart recovery and reconciliation settle accepted auto cashouts even after disconnection.
- The published Worker adds three small modules and one Static Assets binding. All205 previous Worker modules were checked byte for byte after publication and all12 previous bindings are retained. Artwork/audio stay outside the Worker module-size budget. Downloaded JavaScript modules require their module MIME type when uploaded again; binary module bytes must never be decoded as text.

## Validation

`games/jetx/evidence/` contains reference hashes, played-demo arithmetic, browser checks and desktop/mobile captures. The isolated PostgreSQL suite verifies concurrent requests, duplicate replay, rollback, insufficient funds, reserve capacity, account caps, blocked-account settlement, ownership and timer recovery. The complete backend entry was also exercised against a disposable loopback database, including legacy receipt replay and the active-round guard.

Validation completed:32 JetX Node checks,9 original native browser scenarios,14 catalogue checks,9 platform pytest checks, and all three existing frontend builds. The authenticated HTTP regression uses the real machine-session middleware, presence gate, packaged backend and a disposable PostgreSQL database. A separate authenticated HTTPS browser loaded the native scene, opened four panels, accepted a native bet, confirmed a single wallet debit and loaded authenticated state after reload, with zero JavaScript errors, failed HTTP responses or external requests. Financial verification used an isolated database; no production test credit or wager was created.

The first publication's signed-out page check did not exercise authenticated startup. Its guessed `/api/native-families/state` identity route failed to provide a canonical account, and the sign-in button led to an absent `/account?view=login` page. Both are fixed: authentication now uses the deployed machine-session route; sign-in opens the original player login form and returns a successful session to JetX. The live login-form check passed. Return navigation was also checked with a browser-only simulated login response; no credentials were submitted to production.

For repeatable financial tests, start an isolated PostgreSQL container on loopback port 55439 with database `jetx_test`, install the JetX package, and run `npm run test:db`. Tests explicitly reject a different host, port or database. Browser fixtures require `JETX_LOCAL_BROWSER_FIXTURE=1` and never use a service `DATABASE_URL`.

## Deployment state

JetX is live at https://superwin-player.apdiy61.workers.dev/games/jetx_native.

Railway deployment `17c446a5-6593-4a99-adee-1aa21da17df6` is healthy and accepts JetX through its separate `JETX_NATIVE_ACCEPT_NEW_ROUNDS` flag. The legacy new-round flag remains false. Following the user's explicit Allow and instruction to fix internal play, the service-specific source update deployed the session fix. The tool's separate staged copy matches that live source.

Cloudflare version `8a64773a-46d2-423c-b5a7-f0b22084d2d7`, deployment `d42b0244-b32e-4e78-b34a-ac998dab5f33`, retains113 static paths (112 unique files,12,621,481 bytes). The208-module publication retains the prior205 modules containing64,104,721 bytes with zero hash mismatches. Existing games retain their original routes and identities.

`batch25/official-identities.json` supersedes the first SmartSoft-only audit:20 titles now match official pages across SmartSoft, Galaxsys, Amusnet, Pragmatic Play and Gaming Corps, plus the disclosed nearest-title mapping from MultiHotDeluxe to Multi Hot5 Deluxe. Moonstone, MagicGarden, DarkHorus and Assassins still need usable official references. Seven native SmartSoft demos were opened and played; their public paytables, limits and source inventories are extracted under `batch25/public-models/`. These25 are not yet implemented or published; reference metadata and extracted rules are not presented as completed machines. Their work is saved while the user's latest instruction prioritizes fixing JetX.

