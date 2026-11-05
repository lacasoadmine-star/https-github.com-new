# Production release 295 — two reference-driven game reconstructions

Player: https://superwin-player.apdiy61.workers.dev/

- Version: `0bee5b4a-50eb-4189-952e-2cf559b9961a` (295).
- Deployment: `beb6e0a1-68d5-4094-9883-7b811241e115`, 100% traffic, confirmed by Cloudflare.
- Deployed: 6 November 2026, 02:35:30 Africa/Addis_Ababa (5 November 23:35:30 UTC).
- Runtime source commit: `7321bb1d1ef219c54dd11659784dd303c85449d6`.
- Asset prefix: `/zplay-machines-20261106-r4/`.
- Immediate rollback: `448c1302-a604-46c4-b8b8-e2e0cad7a227` (294); earlier versions 293 and 290 remain recorded.

Both published pages were loaded successfully after deployment with Cloudflare Browser Rendering:

- `/games/multi_hot_5_video` at 390×844 — correct new assets, one canvas, signed-out prompt, no video or iframe.
- `/games/hot_foxy_20` at 360×800 — correct new assets, one canvas, signed-out prompt, no video or iframe.

The screenshots were inspected. These were guest checks; financial controls remained disabled and balances displayed as unknown rather than fabricated. The public game models loaded and passed the frontend configuration validation before the signed-out state appeared.

## What changed

Original procedural symbols, clover/forest backgrounds, distinct palettes, gold cabinet proportions, multiplier highlighting and wheel sectors replace the earlier drawing code. Multi Hot 5 remains 3×3 with five lines; Foxy remains 5×3 with twenty lines. Reel timing follows measured samples from the supplied recordings: sequential starts for Multi Hot, staggered stops for both, and multiplier completion before the final reel. Initial reel motion preserves the visible grid and ends on the verified server result. New procedural reel noise, per-reel clicks, sector ticks, wheel stop and win sounds are event driven and share mute, volume and cleanup controls.

Multi Hot's lower control bar now has a separate stake button. An overlap found during interactive mobile QA was fixed before deployment. Existing AUTO cancellation, pending gamble recovery, session binding, strict result verification and no-second-wager STOP behavior remain in place.

## Validation and preservation

231 Node tests passed, including 100 isolated mathematical rounds per game against the unchanged deployed server-core snapshot. Six native Canvas runs passed, including initial-frame continuity and final server-grid equality. Six Chromium fixtures at 360/390/430 pixels passed 492 assertions, covering controls, wager replay, error recovery, gamble, history, audio generation, mixer bounds, mute, context/BFCache events and control layout. Two runs emulated an Android/Samsung user-agent with touch and DPR 3; canvas DPR stayed capped at 2.

The browser fixture uses synthetic accounts and fetch settlement responses; it is not bundled or deployed. The user's explicit authorization covered sending this frontend source and synthetic QA data to Cloudflare Browser Rendering. There was no approval rejection or rate-limit bypass in this release.

Only `machine-assets-20261106.mjs` changed from release 294. All 111 other Worker modules were verified byte-for-byte unchanged after upload. Bindings, secrets, runtime and Durable Object migration matched exactly. No database, balance, account, Agent Worker or Railway modification and no production wager was performed. Existing Railway staged changes were not applied.

## Remaining limits

This is not a claim of 100% pixel or audio equivalence to the videos. Artwork, typography and sound are original code-driven reconstructions; provider branding and recorded audio are not copied. See `VISUAL-QA-r4.md` for the measured reference work and its limits.

Authenticated live-wallet end-to-end debit/credit/refund reconciliation in an isolated PostgreSQL environment, physical Samsung audio/performance testing, independent math/RTP certification and provider authorization have not been newly verified. Existing server math and availability flags were preserved. Multi Hot 100, Wild Multi Stars and Multi Hot 5 Super Wilds remain deferred to the user's two-game scope.

The earlier release 293 guest QA passed after a fetch-receiver fix. Release 294 was deployed, but its post-deployment browser call was cancelled before results. This release completes fresh post-deployment guest QA for both routes.
