# Current 60-game work — 25 November 2026

Actual implementation and fresh demo evidence are recorded here. This is a partial
delivery, not a claim that 60 games have been identified, built or deployed.

## Current verified state

| Measure | Result |
| --- | --- |
| Requested new games | 60 |
| Fresh names and routes verified in the current ZPLAY lobby | 0 — lobby did not render |
| Official provider demos freshly exercised | 1 — Multi Hot 5 Burn Wilds |
| Completed official demo rounds | 7 manual + 2 automatic, all DMO |
| Completed new native games | 0 |
| Newly LIVE VERIFIED games | 0 |
| New production deployments in this task | 0 |

The connected local Chrome extension could not obtain its originating browser
context. The available cloud Chrome loaded the requested ZPLAY lobby as a blank
view with Support; one reload did not resolve it. This does not establish that
ZPLAY is down or that the user's local session is invalid. Historical 82/90-game
catalogues are retained in the repository but are not relabelled as the current 60.
Burn Wilds is an official reference candidate; its membership in the currently
requested ZPLAY list was not freshly confirmed.

## Source baseline and preservation

The branch starts at `47b783f6615e2159c5909cc5e663c297754323ca`, the source
commit identified by the active Player deployment, version 476, rather than the
older repository `main` prototype. Player deployment ID:
`21291842-90aa-48c8-982a-e7e7ac09ba5d`; version ID:
`55e5e48b-66a5-480a-8985-63a9f11c38d7`.

Only additive source, tests and observation records plus the current directive in
`AGENTS.md` are changed. Existing games, Agent Portal, authentication, database,
accounts, ledger and balances were not mutated. No production wallet was used.
The Railway environment named `staging` serves the active Player API and must not
be treated as an isolated test environment because of its name. Unrelated pending
Railway changes were not applied.

## Implemented code

### Burn Wilds observed payline quote

`multi-hot-5-burn-wilds/` contains a native JavaScript module and immutable factual
configuration for the five observed paylines. It accepts the two independently
observed DMO bets, a supplied final expanded grid and a supplied multiplier. It
rejects ETB and cannot generate an outcome, aggregate concurrent line wins or
settle a wallet. The official spin 04 fixture checks the displayed single-line
result: three cherries, base `0.10 DMO`, multiplier 4, win `0.40 DMO`.

This is a working partial component. A renderer, audio implementation, original
or licensed asset manifest, production route, backend outcome model and dashboard
PLAY entry have not been added. No screenshots or video are used as gameplay.

### Account-bound round transport

`apps/player/src/games/runtime/round-client.mjs` preserves one pending request
token across uncertain responses and same-account authentication refreshes. It
requires a stable account identity; prevents retrying another account's pending
round; retains unowned legacy entries for reconciliation; and prevents a delayed
response from erasing a newer pending request.

The client is not wired to a production caller. Its default future endpoint,
`/api/player/game-rounds`, is not implemented in this branch. These tests establish
client recovery behavior, not server idempotency, unique server Round IDs or
correct ETB settlement. STOP does not call this client in any existing game.

### Official-demo observation utility

`tools/smartsoft_demo_audit.py` permits interactive clicks only on the freshly
observed official demo origins and routes, rechecks the owning frame before each
action, rejects ambiguous controls and preserves uncertain click counts. It omits
potentially sensitive page titles and sanitizes failure output. It records clicks
separately from completed rounds and cannot assert LIVE VERIFIED.

The utility's tests are offline mocks. The fresh interactive observation in this
delivery was performed separately in the available cloud Chrome using documented
browser/Playwright controls and screenshot-based Canvas interaction. The Python
utility was not represented as having driven those nine settled rounds.

## Validation

| Check | Result | Scope |
| --- | --- | --- |
| Burn Wilds quote | 8 passed | Includes actual official spin 04 fixture |
| Round transport | 11 passed | Offline client behavior and account changes |
| Demo observation utility | 20 passed | Offline URL, frame, click and report checks |
| Existing backend platform suite | 9 passed | Disposable local SQLite; test signing keys |
| Player build | Passed | TypeScript and Vite |
| Agent build | Passed | TypeScript and Vite |
| Admin build | Passed | TypeScript and Vite |

Total: **48 passing tests and three passing application builds**. No production
database credentials, reset scripts, live end-to-end wagers or real funds were
used. Component success is not equivalent to acceptance of a finished game.

## Evidence and remaining gates

See `observations.json` for the seven manual results, two automatic results,
control observations and exact limits. Original screenshots and a short silent
sequence of 14 sampled screenshots are supplied separately as a private evidence
archive. That sequence is observation evidence, not a renderer FPS measurement.

Before this candidate can become a production game, the remaining substantive
requirements are: confirm the requested current catalogue and route; obtain an
authoritative outcome model, probabilities and expansion/aggregation rules;
establish commercial media rights; implement the actual renderer, controls and
Web Audio; integrate an isolated server-authoritative test wallet; then verify
reconnect, retry, STOP, settlement, mobile/tablet/desktop and frame timing.

The displayed provider RTP of 96.55% is recorded as a provider claim. It is not
assigned to this partial implementation. Production remains disabled because the
user's required technical and rights conditions have not yet been met.

Official sources:

- <https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds>
- <https://www.smartsoftgaming.com/legal/terms>
