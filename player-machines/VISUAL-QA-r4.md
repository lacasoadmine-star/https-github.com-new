# Two-game reference reconstruction, r4

The supplied recordings `42725.mp4`, `42729(4).mp4` and `42751(3).mp4` were inspected at full resolution. Their pictures are used only as QA references; no video frames, screenshots, provider logos, recorded music or remote provider code are embedded in the games.

The renderer now uses original procedural artwork for paired plums, cherries, oranges, lemon slices, watermelon slices, grapes, golden bells, winged bells, dollar symbols, sevens, the fox WILD and faceted star. Multi Hot 5 has a clover background, a gold cabinet and an animated pink/green multiplier column. Foxy has a darker teal forest, offset branches, a stacked title and a segmented top wheel. All symbols, particles, reels and wheel sectors remain independently controlled by code.

## Reference-driven changes

| Area | Reference evidence and change |
| --- | --- |
| Multi Hot 5 geometry | 3×3; reference cabinet measured near `(80,137,336,252)` in the 420×900 presentation space. Column width 112, row height 84. |
| Foxy geometry | 5×3; cabinet `(22,150,376,242)`. Column width 75.2, row height 80.67. Dark margins and a teal reel interior replace the prior dark green columns. |
| Multi Hot movement | Frame differences show sequential starts about 0.17–0.20 s apart. New starts are separated by 170 ms, stop times by 190 ms; first-reel duration is 950 ms. The multiplier completes at 480 ms, before the reels. |
| Foxy movement | Reels begin together and stop about 0.20 s apart. New duration is 1100 ms plus 200 ms per reel; the top wheel completes at 1150 ms. |
| Continuity | Reel presentation strips begin with the previously visible grid and end with the verified server grid. The frame at time zero is unchanged. STOP accelerates this presentation only. |
| Wheel | Visual multiplier strips reproduce the varied neighbouring values seen in the clips. These strips do not alter backend multiplier values, weights or probabilities. |
| Controls | Multi Hot's octagonal button, gold/green bar, hexagonal controls and separate stake control were adjusted. Mobile overlap between the stake control and plus button was found and fixed. |
| Audio | Original procedural reel noise, timed stop/tick tones and win notes. The reel loop ends at the last reel stop; wheel ticks follow actual sector crossings. Mute cancels all scheduled nodes. |

231 Node tests pass, including 100 mathematical rounds per game against the unchanged deployed server-core snapshot, strict result validation, session isolation and replay protection. Six actual-renderer native Canvas runs pass, including frame-zero continuity, final server grid equality, sequential sound events and DPR≤2.

Six isolated Chromium runs at 360/390/430 pixels pass: 99 assertions per Multi Hot 5 run and 65 per Foxy run, 492 assertions total. Checks cover bet locking, SPIN/STOP, AUTO cancellation, pending gamble recovery, rejected payout recovery, repeated request tokens, history, context/BFCache event handling, sound/mute/volume, rendered audio energy and bounded mixer output, and non-overlapping visible controls. Two runs use an Android/Samsung user-agent with touch and DPR 3; this is browser emulation, not a physical Samsung test. The canvas remains capped at DPR 2. Detailed results are in `test/browser-qa-r4.json`.

## Limits of the evidence

These results do not establish 100% pixel or sound equivalence. Artwork, font shapes and the procedural sound score are original reconstructions; the reference includes provider artwork and branding. The video recordings contain variable spin durations and user actions, so the timing profile is based on measured samples, not a claim that every recorded frame is reproduced.

The isolated browser uses synthetic accounts and fetch responses; it does not prove the live PostgreSQL wallet's debit/credit/refund reconciliation. Existing server mathematics, paytables, session guards, ledger endpoints and game availability flags are unchanged. Provider authorization, independent RNG/RTP certification and physical-device audio playback are not newly verified. No production test wager or account/balance/database change was made.
