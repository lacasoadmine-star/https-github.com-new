# Production release 296 — two-game cabinet correction

Historical release record. The current additive native-machine work and its publication status are documented in [RELEASE-native-r1.md](RELEASE-native-r1.md).

Player: https://superwin-player.apdiy61.workers.dev/

- Version: `58886e06-6bbd-4dcd-baba-3aaa3992dcfd` (296).
- Deployment: `40227402-e7e2-43e2-88b0-dd2b9ee297e2`; Cloudflare confirmed 100% traffic.
- Deployed: 6 November 2026, 00:02:10 UTC.
- Runtime source: `02f05da6e932ecd2fdbc31057a6dc73b1c71fd1c`.
- Assets: `/zplay-machines-20261106-r5/`.
- Immediate rollback: `0bee5b4a-50eb-4189-952e-2cf559b9961a` (295).

Both live routes passed fresh Cloudflare Browser Rendering checks after deployment:

- `/games/multi_hot_5_video` at 390×844.
- `/games/hot_foxy_20` at 360×800.

Both displayed the new r5 assets and vector control surfaces, one canvas, the signed-out prompt and no fabricated balance. No video or iframe was present. Screenshots were inspected after publication. The server model was loaded and validated before the signed-out state appeared. These were guest checks, not authenticated financial transactions.

## Changes

Replaced the prior artwork, cabinet typography, reel surfaces, backgrounds and control styling. New code draws shaded fruit, separate straight/curved seven symbols, clover stems, forest foliage, gold frame layers and the Foxy lettering. Four generated SVG control surfaces give Multi Hot its pink/gold spin frame, hexagonal controls and lower stake bar, and Foxy its green circular spin control. Balance/win/bet panels use separate icons and ETB labels. Existing buttons and handlers own the new visuals; no second game or visual screenshot overlay runs underneath.

Modified sources: `art.mjs`, `renderer.mjs`, `style.css`, `index.html`, `controller.mjs`, `registry.mjs`; added `cabinet.mjs`, four SVG surfaces and `scripts/make-skins.mjs`. Build and isolated-browser scripts now handle SVG assets. Mute preserves the speaker SVG and updates its state. Server mathematics, reel/wheel timing, the existing sound engine, wallet adapter and result verification remain unchanged in this release.

## Checks and preservation

232 Node tests passed, including 100 isolated math rounds per game and a new test proving all SVG surfaces are served with the correct MIME type. Six native Canvas runs confirmed frame-zero continuity, authoritative final grids, reel/wheel stop events and DPR limits. Six touch Chromium runs at 360/390/430 pixels passed 516 assertions, including decoded control surfaces, non-overlapping bounds, SPIN/STOP, audio output/mute, bet locks, history and idempotent recovery. No browser errors were reported. The 360-pixel runs used Android/Samsung emulation with DPR 3; canvas DPR remained capped at 2.

Only `machine-assets-20261106.mjs` changed in the uploaded Worker. All 111 other modules were verified byte-for-byte unchanged. Bindings, secrets, runtime and the Durable Object migration remained identical. The upload guard verified version 295 was still live; a second guard checked it again before promotion. No accounts, balances, database, Agent Worker or Railway service was changed. No production wager was made.

## Evidence limits

Full-resolution reference frames were used to correct the cabinet, palette, controls and symbols. This is closer to the references, but it is not a claim of 100% pixel or audio equivalence: procedural artwork, font details and foliage still differ. See `VISUAL-QA-r5.md`.

The six interactive browser runs use synthetic accounts and fetch responses, never live wallet data. Physical Samsung audio/performance, authenticated live-wallet end-to-end reconciliation, independent RTP certification and provider authorization remain unverified. Existing backend availability flags and math were preserved. The other three requested games remain deferred to the user's two-game scope.
