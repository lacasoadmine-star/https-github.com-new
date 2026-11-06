# ZPLAY player machines

Current work adds **two new native machines**, `foxy_hot_20_native` and `multi_hot_5_native`, beside the four existing local machines. See [RELEASE-native-r1.md](RELEASE-native-r1.md) for current scope, verification and publication status. The earlier replacement-r13 plan was stopped and never published.

Build the additive release with `npm run build:native`, then run `npm test`. Its separate asset manifest and routes reuse unchanged Worker308 binary assets where hashes match. Do not regenerate the old deployment bundle as part of a native build: all 156 original modules and old machine URLs must stay unchanged. New financial game IDs remain separate from artwork families.

## Historical r8 record

The following notes describe the earlier four-game release, not the current build or deployment status.

Current update: r8 extends the live Canvas/DOM player to Multi Hot 100 and Wild Multi Stars alongside Multi Hot 5 and Hot Foxy 20. Multi Hot 100 uses 5 reels × 4 rows and 100 fixed lines; Wild Multi Stars uses 5 × 3 and 20 lines. The new clients pin the already enabled authoritative models, reel strips, paytables and features. Reels, multiplier wheels, animations, win feedback and controls remain live code. See [RELEASE-r8.md](RELEASE-r8.md) for scope, verification and reference limits.

The existing Player Worker, backend, database, ledger, session boundaries and game mathematics remain in place. The runtime change targets two modules: `worker/machine-assets-20261106.mjs` and `worker/machine-routes.mjs`; the other 110 modules were compared byte for byte and inherited settings were identical. Version 299 is published at 100% traffic; rollback remains version 298. See worker/deployment-299.json and worker/live-qa-r8.json for the deployment and fresh guest checks.

Run `npm run build` and `npm test` here. `scripts/browser-fixture.mjs` produces disposable synthetic QA HTML for Cloudflare Browser Rendering and is never published. `scripts/render-local.mjs` renders the actual Canvas implementation with decoded artwork. The local HTTP player QA server requires `node scripts/player-qa-server.mjs --qa`, binds only to `127.0.0.1`, and uses disposable sessions, invented balances and an isolated in-memory ledger. Run `node scripts/player-qa-browser.mjs --qa` separately with Playwright/Chromium installed.

The frozen r8 source passed 460 Node tests, 12 native Canvas cases, 585 trusted browser checks in six real-localhost-HTTP cases, 188 API/model/math checks and 158 Cloudflare synthetic lifecycle checks for the two added games. The trusted cases settled 50 local rounds and 12 local gambles; the API cases settled another 56 local rounds. All QA ledgers balanced. Detailed checks, source hashes and preservation results are in [test/player-qa-r8.json](test/player-qa-r8.json). QA controls and synthetic data are excluded from `public/` and the production bundle.

Exact pixel/audio equivalence is not claimed. Two supplied ScreenRecording files exceeded the 32 MiB download limit and could not be inspected; the Wild Multi Stars reference is silent. Earlier release and rollback records remain under `worker/`.
