# ZPLAY / Superwin — Project progress

Updated: 21 November 2026 (Africa/Addis_Ababa).

## Continue the existing project

The scope remains 72 games, in the existing order: 1–10, 11–20, 21–30, 31–40, 41–50, 51–60, 61–70, and 71–72. Continue the existing source, routes and game modules. Preserve the existing Multi Hot 5, Foxy Hot 20 and Habesha Fortune.

**Current batch: games 1–10. Current game: #4 Multi Hot 20, IN_PROGRESS. Next named game: #8 Multi Hot 5 Burn Wilds, still closed. Completed against the full gameplay/live verification criteria: 0/10 in the current batch.** Do not advance while the current game has an unresolved completion requirement. The existing queue is unchanged.

This current checkpoint supersedes older next-step instructions. Earlier project history remains in Git history; no existing game implementation was restarted or removed.

## Current source

- Repository: `lacasoadmine-star/https-github.com-new`.
- Branch: `work/native72-session-presentation-20261119`.
- Current tested gameplay source: `c52af9955d831b6be636df64e106f959c8e4930c`.
- Previous source steps: `5a015c1` added fresh reference observations and receipt-driven presentation; `b77ef28` fixed hidden AUTO label sizing; `c52af99` corrected desktop composition and selected-win fire.
- Primary source directory: `codex-work/native72-20261119/changes/batch01/`.

## Multi Hot 20 implemented behavior

- Live Canvas code renders the wheel, reels, original symbol artwork, selected winning cells and full five-column paylines from the server receipt. Reference screenshots are not game frames or a five-round playback sequence.
- Winning lines repeat with the matching symbol caption and multiplier. The accepted round identity, grid, amount and multiplier stay unchanged throughout the presentation.
- The selected multiplier and winning cells have bounded, curved orange/gold fire animation. The animation is original ZPLAY drawing informed by the observed demo; provider animation code and exact timing are not claimed.
- Wide desktop layout places the original title left of the wheel, enlarges the reel area, and positions X2, AUTO, SPIN, BET and TAKE on the right. Mobile, tablet and short-landscape layouts retain their separate responsive rules.
- AUTO shows its remaining count on the large gold control. Pointer and keyboard STOP cancel future rounds without submitting an extra bet between settlements.
- MENU, TAKE, a new spin, blur/hide and reduced motion stop the appropriate result presentation. Historical restore does not restart a fresh win celebration. An already accepted round still settles once.
- Bottom SOUND toggles audio directly. Separate music/effects options remain in the menu. Sound events remain tied to the relevant gameplay events.
- Existing ETB account, session, server receipt and settlement behavior is retained. The demo balance is not used as an operator wallet. There is no limit of five server-generated rounds.

## Official reference observations

The official free demo was opened and five explicit SPIN activations were observed along with BET, TAKE WIN, MENU, paytable, settings, AUTO, QUICK and SOUND controls. The record is in:

`codex-work/native72-20261119/qa/evidence/m20-r7/official/observations.json`

The same directory contains 19 reference images. The observation record states its limits: HOLD/input latency can produce additional rounds, exact provider timing was not measured, and images do not prove audible sound parity. These references remain separate from the running game.

## Actual verification

Current exact-source workflow: [Native72 dedicated games QA, run 44913370726](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/44913370726).

- Unit tests: **505 passed**, 0 failed, 0 skipped, 0 cancelled.
- Disposable PostgreSQL tests: **52 passed**, 0 failed, 0 skipped, 0 cancelled. These include the eight accepted-policy cases. No production wagers were made.
- Focused scene/lifecycle tests: **56 passed**.
- Action/control tests: **63 passed**.
- Native Canvas observer wrapper tests: **6 passed**. These verify the observer itself; they are not browser acceptance.
- Browser verification: **115 checks passed across all seven viewports**, retaining all previous 114 checks and adding the desktop composition check. The report verifies 13 pinned media files, 39 reachable control states and zero unhandled page errors. The two expected 503 responses were deliberately injected to test recovery after an accepted spin or X2 action.
- The earlier `5a015c1` browser run failed the hidden AUTO label sizing assertion. The actual CSS was corrected; the assertion was retained. That failed source is not release-accepted.

The seven tested viewports are 390×844, 360×800, 412×915, 430×932, 768×1024, 1440×900 and 844×390. The browser harness uses an isolated loopback ledger. It does not establish actual authenticated live ETB settlement, provider sound parity or physical-device 60 FPS. Selected desktop, mobile, tablet and short-landscape screenshots were visually reviewed, including AUTO 24, NICE WIN and repeated winning lines. The original ZPLAY fire remains visibly different from the provider's flame artwork; exact provider visual parity is not claimed.

## Next exact step

The actual `c52af99` browser report and selected screenshots have been reviewed. Complete the required release review and exact-source release package, deploy through the existing infrastructure, and verify the resulting live game before marking Multi Hot 20 COMPLETED or advancing to Burn Wilds. Any new code correction requires verification of the resulting commit.

The new release is **not deployed** at this checkpoint. Deployment and live financial verification are pending; no game is marked completed on the strength of source, screenshots or isolated tests alone. Keep private deployment material and operator review records outside this public progress file.
