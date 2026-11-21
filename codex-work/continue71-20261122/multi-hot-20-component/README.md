# Multi Hot 20 — continued renderer component

This source-only checkpoint continues the retained current-task M20 renderer. It is the same new game identity, `zplay72_multi_hot_20_v1`, and does not add another game or replace its existing evaluator, route, assets or financial integration. It includes no private screenshots, observations, balances, provider program or copied artwork. The original M20 asset-frame references remain unchanged.

## Fixed and verified

The retained renderer jumped immediately to a different multiplier-wheel angle when a receipt arrived after motion had started. STOP also changed the drawn angle immediately. The regression measured a 2.479-radian receipt jump at 500 ms and a 0.930-radian STOP jump at 748 ms.

The renderer now captures its current wheel angle before accepting a result or accelerating STOP. A new settling segment begins from that angle and ends at the same receipt-selected sector. Normal immediate-delivery timing retains the existing 300 ms delay and 950 ms wheel settling interval. Delayed delivery rebases that settling interval; STOP uses the retained 120 ms wheel stop interval. This is a continuity correction for delivery and input timing, not a claim of exact official timing parity under network delay.

The five focused tests failed in three cases before the correction and now all pass. They exercise the actual renderer's Canvas rotation commands with a stub Canvas context, all five observed multipliers, delayed delivery, STOP before delivery, the existing normal reel stop sequence, unchanged receipt grids and replay rejection. Their synthetic no-win view is a presentation fixture, not a claimed reachable financial outcome.

```sh
node --test codex-work/continue71-20261122/multi-hot-20-component/render/motion.test.mjs
```

No actual-browser, official-demo, live-player or deployment verification was performed by this component test.

## Dependency and financial boundary

The four-file component closure is `render/renderer.mjs`, `render/layout.mjs`, `controls.mjs` and `presentation-quote.mjs`. The provenance file records hashes of the retained source files. Only the evaluator import name and the wheel transition were changed from that retained component. No shared runtime files were edited.

The retained renderer expects `quoteLineCandidates` and a summed presentation quote, while the accepted game evaluator exposes bounded line candidates and leaves aggregation unresolved. Its retained helper is therefore isolated as `presentation-quote.mjs`; the accepted evaluator and tests remain intact. Its returned amounts are explicitly reference-only. This closure has no transport, outcome generator or wallet access and must not authorize settlement.

## Next work

Integrate the retained M20 renderer and its own manifest through a reviewed adapter that preserves the accepted evaluator boundary. Recheck the actual title in a browser, then repair portrait layout and controls: the retained UI scales a 1363-pixel stage down as one image, making its 48-pixel sound control only about 13 pixels wide at a 360-pixel viewport. Confirm readable controls and matching hitboxes at 360, 390 and 430 pixels with actual browser measurements. This component contains no mobile-parity claim.

The financial implementation still needs the legal reel/outcome model; multiplier probabilities and any dependency on the grid; complete line aggregation and the declared 1000× maximum's scope; ETB rounding and allowed-stake policy; and the existing server's durable round, collection, retry/reconnect and ledger integration. Seven observed reference rounds and the displayed RTP cannot establish those rules. The current demo's 20-line chart versus the marketing page's 100-line description remains a recorded variant conflict.

Further presentation acceptance remains for the audible sound mapping, QUICK timing, NICE WIN counter/dwell/interruption, the rest of the observed bet ladder, HOLD/gamble/History behavior and fullscreen. Continue those tasks without relabeling this tested component as a completed or released game.

## Fresh QUICK label correction

A fresh official DMO controls inspection on 21 November 2026 UTC confirmed that enabling QUICK changes the spin-arrow and lightning artwork to yellow but leaves the idle label as `HOLD & SPIN`. The retained entry incorrectly shortened this label to `SPIN` in QUICK mode. The one-line correction is applied to that retained current-task entry and is preserved in `integration/m20-quick-idle-label.patch` for its eventual runtime integration. It keeps the existing STOP label and QUICK artwork choices. No other game supplied this observation.

This source component does not mount that entry, install its assets or claim a released M20 game. The exact patch and before/after hashes are recorded in `source-provenance.json`; private observations and DMO screenshots are kept separately. No additional test was created for this text-only correction.
