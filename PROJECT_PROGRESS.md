# ZPLAY / Superwin — Project progress

Updated: 21 November 2026 (Africa/Addis_Ababa).

## Additive 72-game catalogue audit

See [NEW_GAMES_72_MATRIX.md](NEW_GAMES_72_MATRIX.md) for the November 21 comparison of the newly requested titles with the existing live catalogue.

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

## Publication and live deployment checkpoint

The reviewed public release artifact and progress checkpoint were published in commit `e60e4b0ed68c74e557dbba93580106306e47d957`. Exact artifact and progress readbacks were verified against that commit. The compact server package was then built using the actual immutable artifact URL, retaining the tested `c52af99` source and unchanged reconstruction checks. Publication contains the reviewed public source and CI evidence; private runtime and operational review records remain separate.

The actual `c52af99` browser report and selected screenshots have been reviewed. The five required evidence reviews and exact-source server package are complete offline. Fresh private inspection verified all 403 existing Player modules byte-for-byte and the unchanged 18 bindings.

All 24 additive Player KV records for this release have now been staged and read back successfully: 21 game files and three shell files, totaling 11,089,067 bytes. Each complete value and its metadata match the prepared hashes. The first immediate readback returned 404; the subsequent complete readback verified all 24 records. Existing release keys were not overwritten. Staging these files has not activated the new Worker or deployed the server.

The preparation-test fixture still described the older split-sprite package. It now uses eight source files and the current 13 media files. The corrected local preparation/transfer tests pass **11/11**, including all 21 missing-file cases, legacy/mixed-media rejection, version drift, retained routes and closed Burn behavior. This is a test-only working-copy correction, not a new deployed gameplay build. The accepted 19-source snapshot and sealed release inputs remain unchanged.

The desired compact server command is configured on the existing engine service. Two redeploy attempts reached platform `SUCCESS`, but the actual live health response still lacked the new release identity. A subsequent Function-update acknowledgement did not produce a verified new runtime. These acknowledgements do not establish that the accepted package is running. The desired command was retained, and the deployment investigation is recorded in the private continuation evidence.

Dashboard fallback reached sign-in, but authentication did not complete. No new Player activation or live wager was performed. The existing unrelated infrastructure changes were not committed.

The next exact step is to deploy the configured package on the existing engine service and verify its actual health response against the accepted release, source and acceptance hashes. Then activate the sealed content-only Player update after a fresh version/module/configuration guard, and verify the live game before marking Multi Hot 20 COMPLETED or advancing to Burn Wilds. Any new gameplay code correction requires verification of the resulting commit.

The new release is **not verified live** at this checkpoint. Opening Multi Hot 20's detail sheet on the live Player still shows `Diyaarin` and a disabled availability control. The current game remains **IN_PROGRESS**. No game is marked completed on the strength of source, screenshots or isolated tests alone. Continue from this checkpoint and the retained package; do not restart the project or skip to another game.
