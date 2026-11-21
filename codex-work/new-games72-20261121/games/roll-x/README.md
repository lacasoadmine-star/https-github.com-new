# Roll X — additive new module

**Game ID:** `zplay72_roll_x_v1`  
**Reserved route:** `/new-games72/roll-x/`  
**Status:** partial reference verified; independent receipt renderer, controls and unreleased session adapter implemented and tested locally. **Cash play is disabled.** The route has not been activated. This is an implementation checkpoint, not a completed or released game.

This is new independent code for the requested additional-game release. No old game module, payout configuration, stored reference, provider source code, wallet or account was reused or modified.

## Fresh evidence and scope

The [current official Roll X page](https://www.smartsoftgaming.com/games/rollx) was opened, followed by its published demo. The capture ran on 21 November 2026, approximately 22:56–23:00 in Africa/Addis_Ababa. The browser viewport was 1363 × 936 with a portrait cabinet centered in the landscape page. The in-game mathematics panel identifies **v1.0.1** and displays **96% RTP**. These identify the observed provider version; they do not establish the mathematical model or RTP of this independent implementation.

Seven separately initiated manual rounds were captured as `spin-01.jpg` through `spin-07.jpg`. One additional AUTO round and one additional manual STOP test were recorded separately. The final visible own-history panel contained all nine rounds; its original screenshot is privately preserved and explicitly excluded from the public tree. Public captures, redacted action logs and six settled help panels are listed in `evidence-index.json` with SHA-256 digests, while the withheld history image is declared under `unpublishedFiles`. Those hashes detect evidence changes; they are not fairness proofs. Public action/rule records contain concise observable outcomes and paraphrased facts rather than raw accessibility snapshots. Their original-source hashes retain derivation provenance; the originals are preserved outside the repository. `evidence-verification-report.json` verifies this sanitization and the 32 public primary evidence hashes. The seven canonical result images remain unchanged; the public bundle does not restore the withheld history panel.

| Observation | Start action | Bet DMO | Target | Returned DMO | Closing demo balance |
|---|---|---:|---:|---:|---:|
| spin-01 | Manual SPIN | 0.20 | 1.4x | 0.28 | 20000.08 |
| spin-02 | Manual SPIN | 0.20 | 1.4x | 0.28 | 20000.16 |
| spin-03 | Manual SPIN | 0.20 | 1.4x | 0.28 | 20000.24 |
| spin-04 | Manual SPIN | 0.20 | 1.4x | 0.28 | 20000.32 |
| spin-05 | Manual SPIN | 0.20 | 1.4x | 0.00 | 20000.12 |
| spin-06 | Manual SPIN | 0.20 | 1.4x | 0.28 | 20000.20 |
| spin-07 | Manual SPIN | 0.20 | 1.4x | 0.00 | 20000.00 |
| control-auto-01 | AUTO, then cancel | 0.20 | 1.4x | 0.28 | 20000.08 |
| control-stop-01 | Manual SPIN then STOP | 0.50 | 2x | 1.00 | 20000.58 |

These are observations of provider demonstration credits only. They are not ZPLAY ledger transactions or newly created account balances. The short sample does not estimate winning probability.

One attempted text-locator click missed the transformed button. Balance and history remained unchanged. That failed attempt is separately retained and excluded from the round count; a subsequent native-coordinate click completed the intended action. Help-panel images were recaptured after their selected-tab state settled, avoiding transitional/duplicate panel captures.

## Verified behavior and unresolved rules

The in-game help explains choosing the stake and multiplier before starting the wheel and winning on green. Observed green results return the stake multiplied by the chosen target, including the stake in that returned total. Empty-sector observations return zero. The official page advertises up to 30x, but the complete selectable target schedule and minimum were not captured.

The new pure evaluator implements only the observed 1.4x and 2x arithmetic. It uses integer minor units and `BigInt`, returning decimal integer strings. If a potential payout would need rounding, it raises `ROUNDING_RULE_UNVERIFIED` for either outcome. It neither floors nor rounds an amount using an invented provider rule. Unknown targets are rejected, including 30x until the actual target schedule is verified. There is no RNG or probability model in this module.

STOP was clicked while its label was visible, and one further round settled with one history entry. This verifies the visible control's response in the captured run. It does not reveal the provider's internal result-selection timing. The ZPLAY controller now ensures STOP and Turbo alter presentation only: STOP never calls the session adapter, and repeated inputs cannot create another pending wager. These guarantees are covered by isolated controller tests; source animation timing has not been measured.

AUTO displayed 10/50/100/500/1000 choices, stake and target fields, and stop thresholds for a single win or balance movement. The 10-round option was started and cancelled after one completed round. Bet plus changed 0.2 to 0.5 DMO; dragging the multiplier changed 1.4x to 2x. Menu, help, history, Turbo state and the sound icon also responded. Sound was not audibly verified. Music, fullscreen, exit, touch, keyboard and the stake slider were not fully interaction-tested.

No bonus was observed or described in the captured help. This is not proof that an unobserved feature does not exist, and no bonus has been invented.

## Implemented frontend and session behavior

`index.html` and `style.css` provide an original portrait wheel cabinet, target and server-authorized bet controls, SPIN/STOP, AUTO confirmation/cancel, Turbo, menu/help/settings, mute, history, pending recovery and an explicit unreleased state. The wheel uses original SVG paths generated by `renderer.mjs`; it does not display a captured screen or play a reference video. The two decorative sector geometries approximate the observed two-tone layout. They are not a specification of sector probabilities or a verified visual match.

`controller.mjs` accepts an injected session adapter and renders only validated, immutable receipts. It keeps one financial action in progress, locks wager controls while the round is unresolved, stops AUTO during uncertainty, and asks the adapter to recover the same pending request. A recovered receipt restores its accepted bet and target. STOP, Turbo and reduced motion affect only presentation. AUTO uses editable bet/target fields, the observed finite counts, serial settlement and refresh, exact money thresholds, and cancellation that still permits its accepted in-flight round to finish. Repeated Enter/Space default actions are prevented on wagering controls. BFCache pagehide pauses the controller; persisted pageshow resumes with a guarded account refresh. Actual exit disposes its handlers. Receipt history never supplies the current balance: a separate confirmed account refresh does that. If presentation or refresh fails after acceptance, the controller retains the receipt and reports that the round was accepted.

`audio.mjs` maps button, spin, tick, stop, win, loss and error events to short original Web Audio cues. It lazily starts after a user gesture, ends and detaches nodes, cuts sound on mute/hide, and closes its context on exit. Those lifecycle functions are tested with an isolated AudioContext stand-in. No provider sounds were copied, no music has been invented, and audible output or provider sound parity is not yet verified.

`session.mjs` wraps the project's existing `RoundRecoveryClient`. It can read the existing same-origin account endpoint and retrieve already accepted receipts, but the release gate always reports `cashEnabled: false`, `canSpin: false` and `canAuto: false`. Every non-replay financial POST is rejected, including recovery's fallback after an authoritative replay miss. A server enable flag, URL query or local balance cannot open this module. Test receipts are also rejected by the production wrapper.

The shared request schema currently binds bet and math identity but has no Roll X target selection field. This module never silently drops the selected multiplier: it requires an explicit server-bound target/math identity, and remains unreleased. Future integration must persist the accepted target and retain the matching model for recovery, including after a rules update. No new wallet, authentication system, local production RNG, ledger or backend route was added.

Isolated fixtures live only in `tests/` and `qa/`. The fixture entry receives a predefined immutable receipt list and displays **ISOLATED TEST · NO REAL MONEY**. The runtime `main.mjs` does not import it, and no query flag enables fixtures or credits.

## Files

- `specification.json`: source-grounded mechanics, control evidence, implementation status and owned open work.
- `evaluator.mjs`: side-effect-free payout arithmetic for the verified subset.
- `receipt.mjs`, `session.mjs`: receipt validation and the hard-disabled wrapper around existing account/recovery routes.
- `controller.mjs`, `renderer.mjs`, `audio.mjs`: per-game state, original wheel animation and original sound-event mapping/cleanup.
- `index.html`, `style.css`, `app.mjs`, `main.mjs`: unreleased HTML entry, UI bindings and responsive styles.
- `tests/*.test.mjs`: arithmetic, immutable receipt/settlement validation, request races, recovery, AUTO, STOP, renderer and audio lifecycle checks.
- `round-observations.json`: seven reference rounds and two additional control rounds.
- `assets-manifest.json`: versioned original code-generated presentation assets; reference images are never gameplay assets.
- `evidence-index.json` and `evidence/2026-11-21/`: fresh official screenshots, sanitized action/rule records and SHA-256 evidence hashes.
- `evidence-verification-report.json`: public sanitization, original-seven preservation and both evidence-index checks.
- `evidence/follow-up-2026-11-21-motion/`: separate public-demo follow-up with its own index. The provider displayed a country restriction; no new round, motion recording or audio was captured.
- `test-report.json`: original arithmetic checkpoint; `frontend-test-report.json` records the current full local run and hashes.
- `qa/static-renderer.png`: inspected static SVG rendering of unreleased, green and empty fixture states. This is not an HTML page screenshot.
- `qa/browser-run.mjs`, `qa/prepare-browser.mjs`, `qa/browser-fixture.mjs`: prepared, fully intercepted browser QA workflow; no passing browser result is claimed.
- `qa/browser-attempt-01.json`, `qa/browser-attempt-02.json`: failed and approval-blocked remote browser attempts. `qa/browser-attempt-03-local.json` records the later installed-browser launch blocked by local socket permissions before any assertion. `qa/browser-attempt-04-github.json` records the first completed GitHub browser attempt and its diagnosed AUTO failure.

## Validation

From repository root:

```sh
node --test codex-work/new-games72-20261121/games/roll-x/tests/*.test.mjs
```

The full local run passes 58 tests, with no failures or skipped tests, using Node v24.22.3. It includes the 12 original arithmetic checks. The existing recovery adapter is exercised with in-memory requests/storage; no production account or ledger is touched. The static SVG renderer was rasterized with Sharp and visually inspected. A malformed XML boolean data attribute was found, fixed and successfully rerendered. This proves the static SVG output parses and renders, not that the HTML, touch controls, animation cadence or sound pass in a browser.

Browser acceptance is **FAILED_CI_PENDING_TIMER_FIX_RETEST**. The exact push run [44951228218](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/44951228218), commit `c743f8d2030eb1f6585ee4a5fa9f0aaca6274aa8`, passed 13 desktop checks, then AUTO stopped progressing after its first settled round with an `Illegal invocation` page error. The downloaded artifact digest and report were verified; `qa/browser-attempt-04-github.json` records the actual result. Native `setTimeout`/`clearTimeout` had been stored as methods and received the controller as their receiver. The defaults now invoke the global host correctly. A targeted host-timer regression failed before the fix and passed afterward, covering ten completed rounds and cancellation between rounds. The browser harness preserves error stacks and fixture state for subsequent failures. The next commit still requires a fresh browser run; remaining AUTO, held-key and mobile checks have not passed. The earlier local socket restriction and rejected external source upload remain historical attempts, with no retry of that rejected payload.

## Remaining work before activation

Continuous video and audio recording remain absent. Complete stake/target limits and rounding require fresh official verification. The independent probability model needs an explicit, tested specification. Artwork/audio reuse rights remain unverified; no provider runtime assets have been copied. Full source-control equivalence, native browser interaction, mobile/keyboard/touch, orientation, measured performance, audible sound, target-aware backend integration and isolated-ledger/end-to-end tests remain open. The AUTO dialog now includes editable bet and multiplier fields restricted to current server choices and the verified target subset. Isolated tests verify the selected wager remains bound across all ten actions, and stale or invalid selections cannot change state or submit. Native AUTO fields were reached in the first CI attempt; full continuation, cancellation and responsive interaction still require the next browser CI run. Music/fullscreen/source exit behavior remains unverified.

The account and financial integration must use the existing project services. Preserve one accepted request ID through recovery, stop AUTO while its state is uncertain, render the server's receipt and confirmed balance, and retain accepted rules/engine versions. Do not guess a refund or treat the provider help's disconnect wording as permission to invent a local settlement.

This module is `IMPLEMENTING`, with reference completeness and full rules verification still pending. It is not `REFERENCE_CAPTURED`, `RULES_VERIFIED`, `RELEASE_READY` or live. Its open work is retained in `specification.json`; the new 72-game release must remain closed until its actual release requirements pass.
