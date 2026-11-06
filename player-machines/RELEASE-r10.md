# Player reference update r10

**Published: Player Worker version 304, 100% traffic, 2026-11-06T04:45:08.576526Z.** Source commit: `0b8944730fec2ff412b7f9072213da75b726853b`. Candidate 303 received no traffic and was superseded after the long browser tests exposed an AUTO cancellation defect.

This release updates Multi Hot 5, Hot Foxy 20, Multi Hot 100 and Wild Multi Stars. It changes their presentation and controls while retaining the existing server outcomes and wallet transport.

## Changes

- Foxy uses measured reel geometry `8/165/404/257` in its 420×900 layout, a larger multiplier wheel, lowercase x labels, emerald/gold frame, revised forest relief, white control glyphs and approximately 10px landing rebound. Its win panel and line caption follow the board.
- MH100 uses the measured 5×4 board `3/249/414/336`, a lower WIN panel and value-specific multiplier colors. Stars retains its purple/gold palette with clearer ready controls.
- MH5 displays previous/current/next legal stakes. The first SPIN after a fully finished win starts a new round, confirmed by a controlled official win followed by 10.002 seconds without input.
- The sound-choice card follows the reference. MH5 and MH100 can play the same short user-uploaded background segment after explicit consent. A 35ms overlap makes the approximately 1.465-second loop continuous; mute, visibility, sign-out, reauthentication and disposal stop or resume it appropriately.
- Active AUTO stays cancellable during a saved request and reel animation. Cancellation stops future rounds; an already submitted round completes normally. The earlier unconditional saved-request guard incorrectly disabled that button.
- Entry no longer asks for a deposit when a zero balance still has earned free spins.

The background segment comes from user-uploaded `VID_20261106_042200_788.mp4`, approximately 9.5–11.0s. The complete public 87-second soundtrack is comparison evidence only. Foxy and Stars have no newly invented background track.

## Verified scope

| Check | Result |
|---|---|
| Node tests on final controller | 469/469 |
| Native Canvas at 360/390/430px | 12/12 |
| Existing platform validation | 9 backend tests, 3 frontend builds and 10 frontend regressions |
| Background lifecycle | 72/72 local checks and 93/93 self-contained Cloudflare checks |
| Official public DMO | 30 completed rounds for each of four games; all four observation windows exceed 300 seconds |
| Local timed play | 30 primary rounds per game; MH5 301.383s, Foxy 338.422s, Stars 301.607s, final MH100 313.894s |
| Final-source lifecycle suites | 920/920 checks: MH100 548 plus three supplemental cases 372 |
| Final AUTO/free-spin regressions | 60/60 trusted browser checks on the final source |
| Final Cloudflare regression | 33/33 isolated synthetic checks on the final source |
| Worker preservation | 115 modules total; only machine-assets changed; 114 modules, 12 bindings and all checked settings preserved |
| Live guest/HTTP verification | 27/27 HTTP checks; portal57 and four guest games; no browser errors or production wagers |

The timed visual/source checkpoint is `c660014ece357d154c76293c641cbbc986673ce2062a04480d0dc9765ad932cb`. The final manifest is `85f31a6e5924d028ba12843eaa5d7e25993f194f2595e89458a71f05c970051c`. Only the two controller corrections above separate them; the other 28 public files are identical.

Original failed QA artifacts remain saved. They include an AUTO cancellation failure that exposed the disabled-button defect, a STOP helper that could tap after animation had finished, and a synthetic test-control connection reset. Final evidence must distinguish the passing primary rounds, affected control reruns and rejected sub-300-second MH100 attempt.

Local play uses disposable synthetic accounts and actual localhost HTTP receipts. Official play uses public DMO only, with uncontrolled outcomes. No production wager is used. Provider receipts, probabilities and RTP are not independently verified.

## Paytable evidence and remaining gaps

The fully loaded official MH5 help matches 9/9 ordinary award cells at numerical stake 2.00; Foxy matches 21/21. Three uploaded Foxy line examples also agree: lemons 0.50×1, oranges 0.50×3 and watermelons 1.00×2. These comparisons do not establish probability or full feature parity.

Official Stars has 10 bidirectional lines and expanding held wild reels with free respins. The current authoritative model has 20 left-to-right lines and a scatter/free-spin feature; 22 of 27 checked award cells differ. A separate preview implements verified portions and passes 33 tests, but blocks settlement where feature payout accumulation, retrigger termination, full-board payout or legacy symbol mapping is unverified.

The catalogue contains 57 titles. Thirty browser rounds on both sides are established for these four dedicated games only. Other counterpart and variant gaps remain listed in the r9 catalogue audit and [FIX-REGISTER-r10.md](FIX-REGISTER-r10.md). Exact pixel, waveform and all-catalogue identity are not established.

## Separate deployed backend correction

The zero-balance earned-free-spin fix is deployed on the existing Railway service: deployment `54095a6c-90e8-411c-9df8-6f99e68c16f3`, terminal SUCCESS at 2026-11-06T04:30:47.525Z. [PR 23](https://github.com/lacasoadmine-star/https-github.com-new/pull/23) contains complete source, rollback and 20 passing tests. It changes one balance predicate. Public health confirms database/Redis up, 11 models and unchanged math hash. Existing staged patch `e0a021d9-4b81-4699-9397-a8b2da932194` remains byte-identical and unaccepted; it must be rebased before a later publication to avoid restoring the bug.

## Reproduce local verification

From `player-machines`, run `npm test`; start the isolated server with `node scripts/player-qa-server.mjs --qa --port=8767`; then run `node scripts/player-qa-duration.mjs --qa --port=8767 --rounds=30 --duration-ms=300000`. The duration runner refuses a non-synthetic server. Financial requests remain local.

Publication records are saved under `worker/`; compact evidence is under `evidence/r10/`. Rollback for the Player is version 302, ID `a199bef5-8c1b-49af-a8e4-29c2c0a5cd7b`.

The initial live checker observed background audio while its lazy import was still loading. A minimal check reproduced this environment’s asynchronous polling defect: an async predicate returning false resolved immediately. The checker now imports the diagnostic module once and polls a synchronous predicate; all independent live audio/geometry assertions pass. The initial failed report is retained. No product change was required.
