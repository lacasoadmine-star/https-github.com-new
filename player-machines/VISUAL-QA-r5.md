# Two-game cabinet corrections, r5

Scope: replace the presentation of Multi Hot 5 and Hot Foxy 20 inside the existing `superwin-player` Worker. No new host, routes, wallet implementation or provider integration.

Full-resolution frames from `42725.mp4`, `42729(4).mp4` and `42751(3).mp4` were inspected again, including Multi Hot frames at 12/17/22 seconds and Foxy frames at 14/22 seconds. Reference images remain QA inputs only. The game contains no captured frames, videos or provider scripts.

| Observed discrepancy in 295 | Replacement in r5 |
| --- | --- |
| Thin, generic control borders | Four generated SVG surfaces with layered gold, pink, green bevels and procedural texture; actual DOM buttons retain all existing handlers. |
| Multi Hot lower stake bar missing behind the central button in the first r5 browser run | An isolated stacking context keeps the bar visible behind the button and above the game background. Rechecked in final runs. |
| Generic serif cabinet title and plain symbols | Block-capital gold title, independently drawn seven paths, more detailed plum shading, citrus lighting, leaf placement and winged bells. Foxy's title uses separate vector letter paths. |
| Flat backgrounds | Shaded clovers and stems, darker measured green palette, dimensional jungle foliage and curved teal branches. |
| Small text in Multi Hot's balance/win/bet strip | Separate wallet/trophy/medal icons, tabular values and ETB labels; all amounts still come from the existing controller and receipt. |
| Thick generic spin glyph and unrelated menu/sound characters | Vector arrows, AUTO/repeat and collect icons, speaker/mute state, two distinct spin surfaces. No extra event listeners. |
| Solid reel fills | Cached textured reel surfaces and layered gold/green frame paths. Texture is generated once, not per frame. |

The 3×3/five-line and 5×3/twenty-line geometry, server mathematics, motion timing, sound engine, session validation, wager adapter, idempotency and payout checks remain unchanged. Mute updates the existing speaker SVG state without replacing its DOM. The asset builder now serves SVG with the correct MIME type and immutable cache headers.

Validation: 232 Node tests passed; six actual-renderer native Canvas runs passed; six isolated touch Chromium runs at 360/390/430 pixels passed 516 assertions. The 360-pixel runs emulate Samsung/Android with DPR 3, while the canvas stays capped at DPR 2. New checks verify that vector control surfaces decode and every SVG URL is served by the existing Worker. Existing checks cover SPIN/STOP, sound generation/mixer bounds/mute, bet locking, history, pending round and gamble recovery, viewport bounds and overlap. No browser errors were reported.

The browser uses synthetic data and does not contact the production wallet. Tests do not establish live PostgreSQL reconciliation, physical Samsung performance or provider authorization. Visual inspection shows closer cabinet/color/control structure; it does not establish 100% pixel or audio equivalence. Original procedural symbols, typography and foliage still differ from provider artwork. No assertion of exact equivalence or new math certification is made.
