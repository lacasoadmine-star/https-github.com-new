# ZPLAY two-machine replacement

Current update: r7 restores existing symbol/logo/control artwork and cabinet sounds for Multi Hot 5 and Hot Foxy 20. Reels, wheels, paylines, controls and transitions remain live code. It adds hold-to-spin, Foxy turbo, zero-balance free-spin recovery, background audio suspension, static reduced-motion feedback and lower idle drawing cost. See [RELEASE-r7.md](RELEASE-r7.md) for scope, reference comparisons, validation and remaining visual differences.

The Player Worker, routes, backend, database, ledger, session boundaries and game mathematics stay in the existing architecture. Only `worker/machine-assets-20261106.mjs` changes at runtime; the other 111 modules and inherited settings are preserved and compared. No recorded page, video, recorder watermark, synthetic balance or production test account is bundled.

Run `npm run build` and `npm test` in this directory. `scripts/browser-fixture.mjs` produces disposable synthetic QA HTML for Browser Rendering and is never published. `scripts/render-local.mjs` renders the real Canvas implementation with decoded artwork. Browser fixtures verify receipts and retry tokens without contacting a production wallet. Existing release and rollback records remain under `worker/`.

The r7 update adds reference multiplier/collect states and Foxy win feedback, seamless phase-aware audio, complete AUTO win phrases, and validated round restoration. Local HTTP player QA is opt-in via scripts/player-qa-server.mjs --qa; run scripts/player-qa-browser.mjs --qa separately with Playwright/Chromium installed.
