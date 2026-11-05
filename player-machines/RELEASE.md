# Production release 293 — two existing games

Production Worker: https://superwin-player.apdiy61.workers.dev/

- Version: `c3bba6be-370e-400c-b709-ae8af76cc7ca` (293)
- Deployment: `bee76880-6d41-454d-a6c9-8874e623500f`, 100% traffic, confirmed by Cloudflare.
- Runtime source commit: `9cde9e0869331583f87e0d39bce9c9f9c2ea0eeb`.
- Asset prefix: `/zplay-machines-20261106-r2/`.
- Rollback: `1470e81a-55b0-4669-98ae-7b5b2c1dec5b` (290).

Verified live routes:

- `/games/multi_hot_5_video` — 3×3, five paylines, side multiplier.
- `/games/hot_foxy_20` — 5×3, twenty paylines, top multiplier.

Both live pages were rendered by Cloudflare Browser Rendering at 360, 390 and 430 CSS pixels. Each displayed exactly one machine canvas and the signed-out state, with a login prompt and disabled financial controls. Screenshots were visually inspected for reel geometry, clipping and control overlap. One run used a Samsung S24 Ultra Android Chrome user-agent with touch enabled and DPR 3; the canvas remained capped at DPR 2. This was emulation, not a physical-device test.

225 Node tests passed. These include 100 isolated mathematical rounds per game against the unchanged deployed server-core snapshot, exact reel-strip/configuration comparisons, win/wild/scatter/cap validation, receipt validation, pending-token replay, simulated one-debit idempotency, double-click suppression, account-switch guards, presence expiry, unchanged unrelated routing, and audio resource lifecycle. Six local renders using the actual Canvas engine passed at 360/390/430, including sequential reel-stop/wheel-stop events and final-grid equality. These do not constitute an independent audit of the live ledger or RTP.

The first live release exposed an unbound browser `fetch` error. It was immediately rolled back (Cloudflare deployment `b68c0a9d-8709-4554-9070-a0b30413796a`). The fetch receiver was fixed, a regression test added, and asset URLs changed before release 293. Subsequent six live game-page checks passed.

Preservation: no database writes, production wagers, balance changes, account changes, Agent Worker deployments or Railway changes were made. All 108 unrelated original Worker modules were verified byte-for-byte unchanged; two original routers were replaced and two modules added. Worker bindings, secrets and Durable Object migration were retained. The existing Railway staged change was not applied.

## Remaining verification

- Full authenticated browser spin/gamble/history and real backend debit/credit/refund reconciliation in a disposable non-production database have not been run. No production test wager was placed.
- Audible playback and animation synchronization on a physical Samsung device, measured FPS/memory, and pixel-perfect video matching are not certified by these checks.
- Existing server mathematics and enabled flags were preserved; provider licensing, independent math certification and theoretical RTP were not newly verified or asserted.
- An isolated browser fixture upload was rejected by automatic approval review because it would disclose private frontend source and fixture data to Cloudflare Browser Rendering without sufficiently specific disclosure approval. It was not retried. Native local rendering and public live-page screenshots were used instead.
- The Worker preview requires Cloudflare Access authentication. The separate cloud browser could not initialize because of network-policy failures.
- Additional lobby/health smoke requests were stopped when Browser Rendering returned HTTP 429; automatic review rejected a subsequent health request. No rate-limit bypass was attempted. The six successful live game checks and Cloudflare deployment status are the confirmed live evidence.
- Multi Hot 100, Wild Multi Stars and Multi Hot 5 Super Wilds were deferred according to the user's latest narrowed scope.

This release publishes the two replacement presentation engines. It does not claim all A–Z acceptance conditions have been completed.
