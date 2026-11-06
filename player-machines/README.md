# ZPLAY two-machine replacement

This release replaces the existing Multi Hot 5 (3×3, five lines) and Hot Foxy 20 (5×3, twenty lines) documents. The other games, Agent Worker, Railway deployments, database and ledger are outside this release.

`public/` contains one Canvas renderer, vector artwork, independent reel/wheel timing, particles, procedural audio, controls, recovery storage and read-only result verification. `registry.mjs` pins the two already enabled server configurations. It does not enable a game or alter its mathematics. `contract.mjs` validates the deployed server's strips, lines, multipliers, payout, version hash and wallet receipt. This is not independent certification of RNG, RTP, licensing or provider authorization.

`worker/player-router-v236.mjs` dispatches the selected game routes to complete replacement documents before legacy transforms run. `worker/mh5-42726-router-v233.mjs` removes the older duplicate lobby loader. The new read-only `/api/machine-session` endpoint validates the existing session and reads the existing ETB balance; it never creates or changes balances. A session-bound header on this client’s spin/gamble requests prevents an account-switch race. Existing presence, authorization and financial endpoints remain in force.

Pending round requests are saved before submission and reused after errors. STOP changes presentation time only. Legacy pending records without a session identity are retained and block new wagers pending review. No local wallet or fallback payout exists. Auto spins stop on errors, tab exit or cancellation. Winnings are credited by the existing backend before presentation; COLLECT only acknowledges the display.

Run `npm test` and `npm run build` here; no package installation is required. `test/server-core-snapshot.mjs` is the unchanged runtime extracted from the currently deployed nine-game Railway engine and is only used in isolated tests. `scripts/browser-fixture.mjs` creates an isolated, disposable QA document and is never bundled or published.

The replacement integrates through four Worker modules: `machine-routes.mjs`, `machine-assets-20261106.mjs`, `player-router-v236.mjs`, `mh5-42726-router-v233.mjs`. All other module bytes, the main module, bindings, secrets and Durable Object migration remain unchanged. `worker/rollback-point.json` records the original production version; `worker/rollback-295.json` records the immediately preceding release. The r5 update replaces only the generated asset module; the other 111 Worker modules are retained byte for byte.

The r5 acceptance run passed 232 Node tests and six interactive Chromium fixtures at 360/390/430 CSS pixels. The fixtures exercise spin/STOP, bet locking, procedural audio, AUTO cancellation, win/loss gamble controls, lost-response replay, corrupt-receipt rejection, BFCache events and canvas recovery events. See `test/browser-qa-r5.json`. They use synthetic accounts and fetch responses, not production or a full PostgreSQL ledger. A physical Samsung and independent provider/math certification remain unverified.

See `RELEASE.md` for confirmed production version 296 and live-route checks, and `VISUAL-QA-r5.md` for reference measurements and limits.
