# Four-game player presentation update — r8

Status: prepared for deployment to the existing `superwin-player` Worker. This document does not claim upload, promotion or live-route verification. Rollback is version 298, `1ba3e1c8-c3b8-4ed2-b343-6298d1206f37`.

r8 adds complete player documents for Multi Hot 100 (`/games/multi_hot_100`) and Wild Multi Stars (`/games/wild_multi_stars`) beside Multi Hot 5 and Hot Foxy 20. Multi Hot 100 has a 5 × 4 reel grid, 100 fixed lines, a green/gold cabinet, multiplier wheel/shield and game-specific control and win positions. Wild Multi Stars has a 5 × 3 grid, 20 lines, a purple/gold cabinet, star symbols, multiplier wheel and matching win/control surfaces. Actual Canvas/DOM code owns reel motion, final grids, multiplier changes, paylines, win feedback, SPIN/STOP, HOLD, AUTO, bet controls, sound, history and recovery. No whole-page recording or screenshot runs as the game.

The clients pin the already enabled authoritative game configurations. Public HTTP models, legal bets, reel strips, line paths, payout receipts and final grids are checked against the existing engine. No game is enabled by this update and no server mathematics, payout rules, wallet adapter, payment code, database or authentication boundary changes. The new games retain the existing one-stage settlement model; presentation cannot create a payout.

Existing cabinet clips provide event-driven audio. The Wild Multi Stars reference recording is silent, so its sound is taken from existing cabinet clips and is not presented as a recording-derived waveform match. Mute/volume, seamless reel-loop handling, hidden-tab suspension, HOLD/modal cancellation, reduced-motion feedback and validated read-only round restoration remain in the shared player. Lost requests reuse their original tokens; STOP changes animation time only. QA sessions and fabricated balances remain isolated from production.

## Verification

- 460 Node tests passed; 12 native Canvas cases passed across all four games at 360/390/430 CSS pixels.
- Six frozen-source trusted browser cases passed 585/585 checks: all four games at 390 pixels and the two added games at 360 pixels. Trusted taps/keys made real localhost HTTP requests without browser fetch overrides. These cases settled 50 local rounds and 12 local gamble actions. All ledgers balanced, source hashes remained unchanged and no browser JavaScript errors occurred.
- 188/188 API/model/math checks passed across 56 additional local settlements, covering every allowed stake for all four games. Frontend pins, authoritative public engine models, reel strips, final grids and one-stage receipts matched.
- Two Cloudflare Browser Rendering fixtures for the added games passed 158/158 checks (79 each) at 390 × 844. They cover animation, sound/mute/volume, AUTO, HOLD/modal cancellation, gamble recovery, lost responses, corrupt receipts, hidden in-flight responses, reduced motion, BFCache and context events. They use explicitly synthetic self-contained responses and make no production wagers.
- The unchanged shared platform passed 9 backend tests on disposable SQLite, Player/Agent/Admin production builds and 10 portal regression tests. This preservation baseline is commit `6c6c5706ffef118cd5b1462cb61fc39afd6b8810`; r8 asset/route integration is checked separately.

Full per-check evidence and frozen public-source hashes are in [test/player-qa-r8.json](test/player-qa-r8.json). Local QA requires explicit `--qa`, binds to `127.0.0.1` and uses an isolated in-memory double-entry ledger. No production account was authenticated or wagered for these checks. The earlier development `390/` results are preliminary; the final evidence uses `final390/` and `final360/` only.

## Deployment preservation target

Replace only `machine-assets-20261106.mjs` and `machine-routes.mjs`. Compare the other 110 modules byte for byte and preserve bindings, secrets, runtime settings, main module and Durable Object migration. Guard against a changed live version before upload and promotion. Record the new version, source commit, traffic assignment and fresh guest route checks only after those operations succeed. Current rollback remains version 298.

## Reference limits

The available recordings and extracted components guided cabinet geometry, palette, symbols and feedback. Reconstructed details, typography and ornamentation remain; 100% pixel identity or audio-waveform identity is not established. Two supplied ScreenRecording files exceeded the 32 MiB download limit and were unavailable for inspection. Wild Multi Stars' supplied recording is silent. Physical-device listening/performance and authenticated production-wallet end-to-end settlement are not established by synthetic QA.
