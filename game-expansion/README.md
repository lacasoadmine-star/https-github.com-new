# Native JetX release and the next25 machines

JetX is the only game implemented in this release. It has its own `jetx_native` identity, public client assets, server API, room state, four independent betting positions, canonical wallet reservations, settlements, history and chat. The previous games are retained.

The remaining batch follows `catalog/latest-requested-queue.json`: all23 names in the user's replacement list, plus Balloon and FootballX from their earlier list, making25. The latest instruction supersedes the former sequential20-game limit. JetX was already being finished and is outside this batch. The25 will become available together after their separate references, engines, presentations and wallet behavior pass verification. The catalogue validator rejects partial batch publication.

## Reference and mathematical scope

Presentation assets and client code were captured from SmartSoft's official JetX demo. The original two/four-panel controls, scene animations, sounds, mobile layouts, preferences and onboarding are retained. Browser tests exercised queue/cancel, independent bets, manual collection, automatic collection and reload recovery.

The provider's private outcome distribution was not exposed by its demo. This is an independent Superwin server model, with a 97% survival return before rounding and maximum-win limits; it is not claimed to be the provider's RNG or a 100% mathematical replica. This distinction is also included in the game rules and API metadata. Observed public rules include truncation to santim, `5.50 × 1.01 → 5.55`, and the flight progression `floor(exp(step / 70) × 100)` with 150 ms steps.

## Preservation and finances

- The deployed native-family runtime is preserved byte for byte as a module body, SHA-256 `7e66f2f8d89a02abc287e0b38aff20d877482d9067e1023abf3db20d3f976491`. Its existing routes and game definitions are retained.
- New records use `sw_jetx_native`; canonical transfers, ledger entries, reservations, audit records and dashboard revisions use the existing wallet implementation. No production test account, invented production credit or production test wager was used.
- Each request is idempotent and bound to the existing authenticated player and browser session. Client-supplied payouts, multipliers and identities are rejected.
- Four positions have separate stakes and liabilities. Pending liabilities are included in account-limit checks. Timers, restart recovery and reconciliation settle accepted auto cashouts even after disconnection.
- The published Worker adds two small modules and one Static Assets binding. All205 previous Worker modules were checked byte for byte after publication and all12 previous bindings are retained. Artwork/audio stay outside the Worker module-size budget. Downloaded JavaScript modules require their module MIME type when uploaded again; binary module bytes must never be decoded as text.

## Validation

`games/jetx/evidence/` contains reference hashes, played-demo arithmetic, browser checks and desktop/mobile captures. The isolated PostgreSQL suite verifies concurrent requests, duplicate replay, rollback, insufficient funds, reserve capacity, account caps, blocked-account settlement, ownership and timer recovery. The complete backend entry was also exercised against a disposable loopback database, including legacy receipt replay and the active-round guard.

Validation completed:28 JetX Node checks,9 native browser scenarios,14 catalogue checks,9 platform pytest checks, and all three existing frontend builds. A live signed-out browser also loaded the native scene and sign-in control with zero JavaScript errors, failed assets or external requests. Financial verification used an isolated database; no production test credit or wager was created.

For repeatable financial tests, start an isolated PostgreSQL container on loopback port 55439 with database `jetx_test`, install the JetX package, and run `npm run test:db`. Tests explicitly reject a different host, port or database. Browser fixtures require `JETX_LOCAL_BROWSER_FIXTURE=1` and never use a service `DATABASE_URL`.

## Deployment state

JetX is live at https://superwin-player.apdiy61.workers.dev/games/jetx_native.

Railway deployment `dcd92fd9-ed1e-4c07-b3ba-f0448f0076c5` is healthy and accepts JetX through its separate `JETX_NATIVE_ACCEPT_NEW_ROUNDS` flag. The legacy new-round flag remains false. Following the user's explicit Allow, the service-specific source update deployed the approved code. The tool's separate staged copy matches that live source.

Cloudflare version `fec03561-d706-4450-af82-578780d5c479`, deployment `88049a89-b7d0-455b-896e-2830c9c6b2f8`, binds113 static paths (112 unique files,12,621,481 bytes). The prior205 modules contain64,104,721 bytes with zero hash mismatches. Existing games retain their original routes and identities.

`batch25/official-reference-status.json` records the current remaining-game reference audit.15 requested entries have a matching current SmartSoft page, including the disclosed nearest-title mapping from MultiHotDeluxe to Multi Hot5 Deluxe. The other10 did not match the current index and their direct SmartSoft launcher probes returned HTTP500. That is an unresolved identity/runtime check, not proof the games never existed. These25 are not yet implemented or published; reference metadata is not presented as completed games.
