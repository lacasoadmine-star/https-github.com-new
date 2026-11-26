# ZPLAY — 72-game Seasons progress

Date: 2026-11-26
Source branch: `zplay/seasons72-20261126-r1`
PR: https://github.com/lacasoadmine-star/https-github.com-new/pull/38

## Explicit scope and safety

- This branch is an additive rebuild queue, **not** a replacement for the running Player site.
- Seasons: 1–15, 16–36, 37–56, 57–72.
- Existing Habesha Fortune 5, Multi Hot 5, and Foxy Hot 20 live code is unchanged.
- `referenceHint` is **not** an interchangeable mechanic/payout template.
  Crash, Plinko, Mines, Tower and Road require their own rules and engines.
- The existing Player wallet/ETB ledger and server receipt remain authoritative.
  No independent wallet, RNG, or payout logic was introduced.
- The submitted generic `X-Wallet-Mode: DEMO` approach is not authenticated
  against the actual backend contract. No DEMO wager will be forwarded to ETB.
- A game must not be shown as Play Now until per-game renderer, mechanics,
  receipt validator, launch route, authentication, QA and deployment have all
  been verified. A 200 HTML page or test count alone does not suffice.

## Progress in this branch

| Item | State | Evidence |
| --- | --- | --- |
| Complete 72-game named queue | TESTED (offline) | `tests/zplay-seasons72.test.mjs` |
| Four Seasons boundaries | TESTED (offline) | 15 / 21 / 20 / 16 |
| Safe game lookup / proposed URLs | TESTED (offline) | `seasons-player-registry.mjs` |
| Player API bridge | TESTED (offline), release-gated | Existing slots fresh-state/spin; no production spin executed |
| Persisted round token / replay-only handling | TESTED (offline) for basic controls | Per-session reconciliation still needs authenticated QA |
| Per-game receipt validators | MISSING_PARTS | Multi Hot 20 validator only, still needs live receipt comparison |
| DEMO settlement separation | MISSING_PARTS | Explicitly disabled to prevent real ETB charging |
| Site wiring and Play Now | NOT_STARTED in this branch | No Worker deployment, no live release |
| 72 dedicated game renderers | NOT_STARTED in this branch | Do not convert generic artwork into false gameplay |
| 72 per-game rules, odds, audited RNG | NOT_STARTED in this branch | Provider's hidden RNG is unavailable; owner math must be audited |
| Real Player ETB spin QA | NOT_STARTED in this branch | Never infer success from anonymous GET requests |

## Reference evidence already located (not a production-ready certification)

- Cloudflare KV `smartsoft-official-reference-20261111` holds
  `native72/batch01-20261121-r7/multihot20/` modules and assets.
- Anonymous browser `/new-games72/multi-hot-20/` returned HTTP 200 but
  `/api/slots/fresh-state?gameId=fresh_multihot20` returned HTTP 401.
  This means the isolated QA browser lacked a Player session; it does **not**
  prove that the signed-in player's session is invalid.
- Earlier `/games/multihot20_native` returned a Game unavailable shell.
  It is separate from the `/new-games72/multi-hot-20/` build.
- Railway staging `superwin-nine-slot-engine` previously had a successful
  deployment; this is not a current live end-to-end receipt confirmation.

## Launch gate for each game

1. Confirm official reference and game-specific controls / animations / sounds.
2. Build a dedicated renderer + controller and a correct rules / engine model.
3. Register an exact game ID with the **existing** backend and Worker, not a
   guessed name or a detached API.
4. Verify authenticated session, server-allowed stake and unique round token.
5. Verify server-signed/authoritative results and ETB debit-credit arithmetic;
   replay the same round token without a second wager after network loss.
6. Test mobile 360/390/430, desktop 1280, SPIN, STOP, AUTO START PLAY,
   hidden audio pause, reconnect, win/lose and controls.
7. Confirm DEMO is sandboxed from the real ledger, or keep DEMO disabled.
8. Deploy only after tests, then check actual live route, screenshots,
   API receipts, balance sync and regression of protected games.
9. Mark COMPLETED only after every gate passes.

## Current per-game progress declaration

- #1 Habesha Fortune 5: existing working game preserved, **not retested** here.
- #5 Multi Hot 20: **IN_PROGRESS** — original r7 sources observed; release not certified.
- #2–4 and #6–72: **NOT_STARTED within this new branch**. Prior live/source
  artifacts may exist; they require reconciliation before replacing any code.

This document intentionally does not claim the 72 games are live.
