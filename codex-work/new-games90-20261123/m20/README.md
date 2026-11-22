# Multi Hot 20 continuation

This is the existing new M20 identity `zplay72_multi_hot_20_v1`. It continues its retained renderer rather than counting a second M20 or replacing an old live game. No existing source, routes, accounts, financial evaluator or production data changed.

`main.mjs` composes its native Canvas renderer, responsive controls, keyboard/touch routing, BET selection, separate paytable preview, twenty SVG line diagrams, effects/music/fullscreen settings and AUTO dialog. The entry accepts its own reviewed native atlas/background/art through `assets`; it never draws a screenshot as gameplay or borrows another title's assets. A visible preview has no fabricated balance. The own native control frames, when supplied, survive state/label updates. The main label remains HOLD & SPIN in QUICK mode.

`controller.mjs` connects externally accepted presentation receipts to the renderer. It does not generate an outcome, select a multiplier or compute a wallet balance. STOP accelerates presentation of the original request. Lost replies retain the original key and exact payload, with recovery using the host's recovery operation. AUTO stops at the selected count and is cancelled by manual stop, hiding, disconnect and disposal. Pending requests lock BET and cannot become independent wagers. This is a prepared host component, not a mounted ETB integration.

The continued AUTO dialog now binds all three controls documented in this title's own current `controls-state-spec.json`: “If a win reaches or exceeds”, “If balance decreases” and “If balance increases”. Enabled amounts are entered explicitly and normalized into integer minor units; an empty, zero, negative, exponent or overprecision value cannot silently start an unlimited sequence. Disabled fields are omitted. Count and limits survive reopening. Balance comparisons use only the supplied authoritative host balance and the balance at actual AUTO start. A balance guard cannot start without that balance, and AUTO stops if a later accepted receipt lacks it. The own official thresholds were visible but not exercised; these are tested component semantics, not a claim that provider threshold behavior or settlement was independently verified.

Recovery is now reachable from the mounted game: after a lost SPIN or TAKE reply the main control shows RECOVER and invokes the host's recovery method with the original pending request, without creating a new SPIN. Successful recovery clears the connection message. A queued AUTO callback is identity-bound, so stopping/restarting before an older callback executes cannot strand the replacement run. Manual TAKE cancels the next queued automatic wager before collection. No old source or wallet transaction is rewritten.

`audio.mjs` plays only explicitly supplied native audio URLs. One music/reel loop can run at once, renderer events play once per identity, suppressed events do not replay on unmute, and hidden/disposed state stops audio even when a play promise resolves late. Repeated visible events no longer invalidate a pending music start. No synthetic samples or audibility claim are introduced.

The adapted portrait layout crops the own scene and separates eight controls into two rows. Every target is at least 44 pixels, all targets are inside the layout, and no two targets overlap at 360,390,430 and1280 pixels. The retained desktop rectangular QUICK hitbox overlapped SPIN; the new composition moves its enlarged target outside SPIN. This is a responsive adaptation; no official portrait parity is claimed.

Held Space/Enter is consumed once for both the root and focused native buttons. The regression holds Enter across forty repeat events; it cannot start a second wager after presentation returns READY. Keyboard activation preserves artwork instead of replacing the complete button DOM with a text label. Dialogs trap focus, Escape closes, and focus returns to the original control.

## Fresh current reference result

The root agent reopened the exact current official MultiHot20 demo and observed a two-line winning result on23November2026. The retained screenshot was independently visually reviewed in this task and remains private. `current-winning-observation.json` contains the transcribed result without a balance or account identifier. At0.20DMO and5x, the grid gives line6 four bells=5.00 and line18 three bells=1.00, matching the displayed6.00WIN. A global-highest-only5.00 payout contradicts this observed result. This evidence establishes that particular result; it does not prove every aggregation/cap/reachability rule or an outcome distribution. Both tests retain the accepted canonical evaluator's unresolved aggregate rather than silently enabling settlement.

## Verification and remaining integration

Run from repository root:

```sh
node --test codex-work/new-games90-20261123/m20/*.test.mjs codex-work/new-games90-20261123/m20/render/motion.test.mjs
```

The45 component tests exercise actual retained renderer code, controls, host composition, audio lifecycles and keyboard routing with synthetic transport/Canvas fixtures. The nine continuation regressions cover the three AUTO limit inputs, exact limits, authoritative-balance requirements, queued start/stop, lost TAKE recovery and manual collection during AUTO. They are not real ETB rounds, browser screenshots, sound verification or a live deployment. The canonical evaluator and retained native renderer dependencies stay byte-identical; provenance identifies the controls continuation separately.

`browser-qa.mjs` additionally runs the actual mounted DOM/controller at360,390,430 and1280 pixels with blank synthetic Canvas assets and an in-memory receipt fixture. It checks AUTO limits and reopening, invalid-input prevention, TAKE and original-key SPIN recovery while rejecting external/financial network requests. Run `ZPLAY_M20_QA_OUTPUT=/absolute/scratch/path node codex-work/new-games90-20261123/m20/browser-qa.mjs` in an environment with Playwright Chromium. The initial local launch was denied by the execution environment at `socket()`, before any page loaded; that attempt is not reported as passing browser QA. Artwork, sound and actual production ledger behavior are outside this isolated fixture.

The previously assembled native asset manifest blob60661633c84df7cbd1ec7f48ba40d9cf46a0d5ab is not readable through GitHub: the current request returned404. The present checkout/archive does not contain that complete M20 native runtime. The official demo does load in the browser; a direct static-resource request returns a provider access denial. No alternative client fingerprint or bypass was attempted. Continue from the fresh own official source or a successfully recovered original native asset closure; do not fill the asset boundary with another game or screenshot.

Actual-browser QA, complete own native media/art publication, the authenticated host's final factory/state/ledger connections, production model/cap/rounding validation, deployment and live paid-round verification remain open. No new game is marked LIVE VERIFIED or cash-enabled by this package.
