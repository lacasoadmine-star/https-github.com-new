# Current continuation — renderer, controls and hosted AUTO

Updated: 22 November 2026, Africa/Addis_Ababa. This section records the current continuation; the evaluator-only checkpoint below is retained as history. The new identity remains `zplay72_multi_hot_10_v1`, with the reserved game route `/new-games72/multi-hot-10/`. Existing games and account/ledger records are unchanged.

## Implemented source

The current module now contains its original Canvas renderer, responsive portrait layout, sprite-atlas reader, title-data reader, audio-event handler, controls/dialog state, application entry and dedicated deferred-receipt client/controller. Its current-game artwork/audio files are supplied through the exact preview asset manifest. These files are individually rendered assets; reference screenshots and recordings do not serve as gameplay or as a sequence of outcomes.

The hosted AUTO entry now closes the selected AUTO dialog before checking authenticated SPIN authority. Each original SPIN consumes one AUTO slot, while presentation STOP and receipt retries consume none. BET and a new AUTO selection are disabled during pending/animating results. AUTO stops on uncertainty, session change, disconnect, page hiding, blur and page exit; returning to the page does not silently restart it. An uncertain round keeps its original request key for replay-first recovery. Preview mode cannot accept a financial host or outcome transport and cannot start rounds.

The renderer continuation fixes first-render restoration of a retained winning receipt, native animation-frame receiver binding, portrait control geometry, retained result identity during settlement/orientation changes, and wheel continuity after a late receipt or STOP. The 360/390/430px geometry checks require at least 44px visible control targets. Device-pixel scaling is bounded to two. These statements describe implementation and component checks, not a measured physical-device frame rate or verified provider visual/audio parity.

The BET picker now uses five native artwork-backed rows with separate upper/lower caret targets. Fresh observations confirmed movement by five entries, a final window clamped to the last five values, UP from the final window returning to offset 21, and retention of the current window after backdrop close/reopen. Choosing a visible value uses the existing control selection and closes the picker. Only the non-financial visual preview receives the 31 freshly observed DMO values; authenticated host defaults and supplied controls retain their existing ladders. No intermediate value such as 0.90 is inferred. The eight new fixture checks cover these transitions and preview/ETB separation; the next browser check still needs to verify the updated hitboxes and appearance in its actual viewport.

## Verification at this checkpoint

`node --test codex-work/new-games72-20261121/games/multi-hot-10/*.test.mjs` passed **62/62 component and fixture tests**, with zero failures/skips: 34 retained evaluator checks, 10 actual-entry/deferred-controller checks, 10 responsive renderer checks and eight BET dialog/entry checks. The entry checks execute the real application action code, controls, deferred client and controller against an isolated synthetic transport; drawing/audio are stubbed for those checks. They verify exactly 25 accepted fixture rounds with distinct original keys and no 26th request, STOP without another wager, lost-reply replay, pending controls and session/visibility behavior. They are not live account settlement, PostgreSQL concurrency, native browser acceptance or whole-game completion.

## Exact server integration still to complete

The carried-forward backend files in this module are `contract.mjs`, `deferred-protocol.mjs`, `deferred-client.mjs` and `deferred-controller.mjs`. They specify and validate the authenticated deferred SPIN/TAKE/X2 receipt boundary. **No PostgreSQL migration, journal implementation, reserve-wallet callback or new endpoint has been installed by this source continuation.** The existing shared recovery and old game routes remain unchanged.

1. Bind the new game to the existing engine's authenticated transaction and ledger closures. SPIN must debit once and reserve a positive win; TAKE or the next SPIN must collect that same reserved win once. The existing immediate-credit receipt equation must not be substituted for this deferred contract. The prepared lifecycle/journal work from the ongoing project must be integrated and tested in a disposable PostgreSQL database before deployment, including concurrent retry, TAKE/SPIN contention, rollback and cross-game active-round ownership.
2. Install the trusted game-specific model identified by `mathVersion`, `engineVersion` and `mathSha256`, with retained versions for accepted receipts. The current evaluator supplies exact per-line quotes only. Full outcome probabilities, legal outcome restrictions, multiplier distribution/dependence, aggregate payout, the displayed 1000x maximum rule, and fractional-minor-unit rounding are not established by the observed rounds. No guessed sampler or round total is provided.
3. Bind an explicit ETB stake policy and maximum-liability calculation from that approved model. The provider's displayed DMO choices are not automatically the operator's ETB policy.
4. Finish X2 eligibility, attempt/time/amount limits, outcome distribution and accepted-action history. The frontend's X2 presentation is not activated by the existence of a receipt type. Keep an already accepted pending win collectable when future wagering is disabled or a model is retired.
5. Register the reviewed new-game state/SPIN dispatch and the reserved collection/gamble routes in the existing server, preserve origin/body/rate/session controls, then verify the exact authenticated live release. Keep the new-game release disabled until these prerequisites and its gameplay verification are satisfied.

**This checkpoint does not enable production wagers or declare Multi Hot 10 complete.** The current preview is presentation-only, and the host defaults to new rounds disabled. The following section describes the earlier evaluator-only source and its evidence limits at that earlier time.

---

# Multi Hot 10 — confirmed line arithmetic, fresh reference and state specification

This independent additive module uses only the current official Multi Hot 10 reference captured on 21 November 2026. It preserves game ID `zplay72_multi_hot_10_v1` and route `/new-games72/multi-hot-10/`. No old live game implementation, gameplay, symbols or artwork was borrowed.

The implemented component evaluates **ten distinct line candidates** on a 5 × 3 grid and quotes the observed paytable with exact integer/rational arithmetic. It is **not a complete game or round-settlement engine**. Every output remains settlement-ineligible. No aggregate payout, RNG, wallet request, renderer, substitute artwork or synthesized audio is present.

## Implemented and tested

`evaluator.mjs` exports two operations:

- `quoteSymbolWin({symbol, matchCount, totalBetMinor, multiplier})` binds the eight observed symbol identities and match lengths 3/4/5 to the 0.10 and 0.20 DMO paytable observations. BigInt arithmetic retains exact fractions. No rounding or operator stake limits are invented.
- `evaluateLineCandidates({grid, totalBetMinor, multiplier})` scans the ten numbered official line paths. Inputs are row-major: three rows, five reels per row. Only an identical adjacent prefix starting on the first reel qualifies. The longest qualifying prefix produces one candidate; shorter prefixes are not stacked.

The evaluator accepts arbitrary validated fixture grids; it does not replay or generate only the seven captured rounds. The seven observations are independent regression fixtures, not production outcomes or an RNG distribution. Synthetic winning fixtures verify documented line arithmetic without claiming those arbitrary grids are legal or probable provider outcomes.

For example, at displayed total bet 10 minor units, three sevens quote 50 minor units before the supplied multiplier. A multiplier of 3 quotes 150 minor units. These are per-line table quotes, not a wallet credit or a total round receipt.

If a stake produces a fractional minor unit, the result carries reduced numerator/denominator strings and `exactMinor: null`. A fractional base stage remains flagged even if multiplication yields a whole minor unit. Unsafe numeric inputs and monetary overflow are rejected; floating-point multiplication, string coercion and rounding are not used.

The recorded isolated run passed **34/34 tests** on Node v24.22.3. Coverage includes both bound tables, multipliers, all ten independently constructed line fixtures, all seven newly observed loss boards, leftmost/adjacent matching, mixed-fruit rejection, longest-prefix selection, separate multiple-line candidates, fractional units, invalid inputs, overflow and immutability. The tests make no live request or real wager.

Run from the repository root:

```sh
node --test codex-work/new-games72-20261121/games/multi-hot-10/evaluator.test.mjs
```

`evaluator-test-report.json` records the actual first execution and source hashes. It is local component verification, not browser or deployment verification.

## Evidence-backed specification

`specification.json` was written before implementation. Its line geometry, paytable amounts, multiplier values and limitations bind to exact screenshot SHA-256 hashes in `evidence-index.json`:

| Fact | Fresh reference |
| --- | --- |
| 5 × 3 grid, wheel above reels, control placement | `fresh-before-spin.jpg` |
| Numbered line geometry, lines 1–10 | `paylines.jpg` |
| Displayed 0.10 DMO table | `menu.jpg` |
| Displayed 0.20 DMO table | `paytable-020.jpg` |
| Shared low-fruit amounts and multiplier documentation | `paytable-low-fruits-multiplier.jpg` |
| Seven settled manual results | `spin-01.jpg` through `spin-07.jpg` |
| Pending button presentation | `spin-02-pressed.jpg` and other pressed frames |
| Settings, auto selector and bet selector | Corresponding retained control screenshots |

The shared low-fruit paytable does not make lemon/plum/orange/cherry interchangeable wild symbols. The observed first and third rounds include mixed low-fruit prefixes with zero win. The implementation therefore does not introduce mixed-fruit substitution or unobserved wild/scatter symbols. Unsupported symbols are rejected, not declared nonexistent in all possible provider behavior.

`controls-state-spec.json` records observed states/transitions and documented-only behavior. **No control runtime is implemented in this checkpoint.** Pending STOP presentation is observed, but STOP action is not. Auto choices are 25/50/100/500/1000, with 100 initially selected; execution was not started. The paytable preview changed from 0.10 to 0.20 without changing the actual bet. Sound settings were visually inspected/toggled, but no audible sound is claimed.

## Remaining rule and release gaps

1. **Line aggregation:** the provider's highest-payline wording does not establish whether qualifying candidates are summed or whether only a global maximum is paid. Seven losses cannot resolve this. `aggregatePayoutMinor` is always `null`.
2. **Legal outcomes and probability:** reel strips, weights, multiplier probabilities and a legal-outcome model are unavailable. No RNG or RTP model is implemented.
3. **Maximum win:** the provider displays 1000×. An unrestricted synthetic all-seven board produces ten separate 500× candidates at multiplier 5; this does not prove summation or a legal outcome. No cap or exclusion is invented to force agreement.
4. **Rounding:** fractional minor-unit behavior and its ordering relative to multipliers remain unspecified.
5. **Presentation:** the text mentions a left-side multiplier reel, while the current UI has a wheel above the reels. This contradiction is preserved. Timing, acceleration, stop sequence and winning animation were not captured continuously.
6. **Controls and sound:** STOP, HOLD repetition, autoplay execution/stop, TURBO, fullscreen, win collection/X2, mobile, keyboard repeat and symbol taps remain unverified. Sound-event mapping and audible output remain unverified.
7. **Assets:** no authorized renderer atlas, individual symbol artwork or audio files are supplied. `assets-manifest.json` therefore has no runtime assets. Reference screenshots are never rendered as playable rounds.

Provider DMO min/max stakes, max win and RTP are observed claims, not ETB operator policy or independently validated math. Cash activation, server integration and release remain closed.

## Public evidence retained for publication

Thirty original non-history JPEGs are copied under `evidence/2026-11-21/`, with byte hashes and dimensions. They include the seven settled rounds and two initial expired-session observations. The failed first click is excluded from the seven completed rounds. No other outcomes were forced and autoplay was not run.

The two history screenshots and raw history/action exports are excluded. These are public DMO demo screenshots, not production account data. Some non-history provider dialog headers visibly contain a demo spin identifier; the original screenshot bytes are retained without retouching. No runtime launch token is copied into source text.

`evidence-verification-report.json` confirms all 30 image hashes/dimensions. A separate publication ZIP and manifest are prepared outside the repository for the release coordinator, avoiding duplicate or repeated binary uploads. The files here are source evidence, not a claim that the ZIP has been uploaded or published.
