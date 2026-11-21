# Multi Hot 5 Deluxe — reference and deterministic payout arithmetic

New identity: `zplay72_multi_hot_5_deluxe_v1`. Reserved route: `/new-games72/multi-hot-5-deluxe/`.

Seven separate manual spins were completed in the current official demo on 21 November 2026. The public reference has seven result images, a live canvas recording, settings, the payline chart and the in-game version/RTP panel. The current-session history screenshot is preserved privately and excluded from the public tree. `evidence-index.json` pins the included files and explicitly lists that withheld image under `unpublishedFiles`; the public materializer does not restore it.

The media response for rounds 3–7 was lost after the provider had executed those actions. No extra spins were submitted to replace it. The original canvas recording was recovered in bounded chunks; result images 3–6 were decoded from that recording and are explicitly labelled as derivatives. Direct screenshots cover results 1, 2 and 7. The recording contains canvas motion; page CSS backgrounds are outside its capture surface, and no audio track was available. The recorded 20 FPS request is not a measured game-performance result.

The initial provider session expired before the remaining bet/AUTO/STOP/TURBO controls could be exercised. Preserve this completed evidence when resuming; record a new control-session boundary instead of fabricating missing actions. One native browser-launch attempt was unavailable because the local environment denied the socket operation; Cloudflare's existing authorized browser capability provided the actual demo capture.

## Recovered current-task evidence

The continuation recovered 22 existing desktop JPEGs from the same current-task research dated 21 November 2026. They are copied byte-for-byte into `evidence/supplemental-2026-11-21-desktop/`, with SHA-256 hashes in `evidence-index.json`. The supplemental `observations.json` records their provenance and limits. This reviewer inspected retained images; no provider input was performed during ingestion.

The desktop screenshots belong to a separate visible provider round/session sequence. Their original action log and exact capture timestamps are unavailable. Consequently their seven result images add **zero** to the canonical seven verified manual rounds. They do supply separately reviewable paytable, settings, bet-menu and AUTO-dialog states. Image dimensions are 1363×936; CSS viewport, device pixel ratio and audible sound are unverified.

## Resolved base-paytable scaling

The bound help display shows these three-identical-symbol awards before the multiplier:

| Symbol | At 0.05 DMO total bet | At 0.10 DMO total bet | Factor of total bet |
| --- | ---: | ---: | ---: |
| Double-seven artwork (`seven77`) | 0.75 | 1.50 | 15 |
| Dollar | 0.50 | 1.00 | 10 |
| Bell | 0.25 | 0.50 | 5 |
| Watermelon or grapes, each independently | 0.20 | 0.40 | 4 |
| Plum, lemon, orange or cherry, each independently | 0.10 | 0.20 | 2 |

`paytable-bound-values.jpg` and `paytable-bet-change.jpg` show the two bound values. Two independently captured wins corroborate the interpretation: the initial `spin-05.png` shows a grape line paying 0.20×2=0.40 at total bet 0.05; `spin-07.png` shows a lemon line paying 0.10×3=0.30 at the same bet. The earlier help screenshots with unbound examples remain retained but are excluded from numerical evaluator inputs.

`evaluator.mjs` calculates the three horizontal and two diagonal paylines shown in the current rules. It requires the row-major grid, total-round stake in integer minor units, and explicit multiplier 1–5. It sums each qualifying line once. Symbol groups share payout factors; differently named fruits do not substitute for one another. All intermediate arithmetic uses `BigInt`; invalid symbols, shapes, stakes, multipliers and overflowing payouts are rejected. Returned line coordinates and amounts are immutable.

`payout-fixtures.json` pins the observed bound tables and both captured winning grids. The 23 focused tests cover these examples, each line direction, shared-cell lines, all-line addition, multiplier scaling, nonwinning matches, bad input, overflow and immutability:

```sh
node --test codex-work/new-games72-20261121/games/multi-hot-5-deluxe/tests/evaluator.test.mjs
```

## Remaining limits

This is a deterministic arithmetic component, not a completed engine. It has no RNG, reel strips, probability weights, X2 settlement, renderer, live session route or wallet mutation. Every result has `settlementEligible: false` and `outcomeLegalityVerified: false`.

The same-version help displays maximum win 145×. Applying the observed line arithmetic to an arbitrary synthetic all-seven grid at 5× yields 375×; such a grid has not been shown to be a possible provider outcome. The evaluator flags amounts over the published demo maximum and does not silently clamp them or invent reel restrictions. Admissible outcomes, cap behavior and an independently verified probability model remain required before live settlement.

The displayed 96.39% RTP describes the provider demo and does not establish a ZPLAY RTP. Demo stake limits of 0.05–400 DMO are recorded as reference only; ETB limits remain the existing operator server's policy. The full bet ladder, AUTO start/cancel and threshold behavior, STOP/TURBO, X2 numeric limit, fullscreen, keyboard, sound and complete control lifecycle still require verification. The supplemental menu screenshots do not establish those actions.

The module remains reference-partial, cash disabled and not release-ready.

Research captures are not runtime game assets. No older game source, previous screenshots, provider engine code, accounts, sessions, operator balances or production rounds were changed.
