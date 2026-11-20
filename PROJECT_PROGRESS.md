# ZPLAY / Superwinbet — PROJECT_PROGRESS

**Last verified:** 2026-11-21 (Africa/Addis_Ababa)  
**Source of truth:** GitHub repository `lacasoadmine-star/https-github.com-new`, branch `work/native72-session-presentation-20261119`.  
**Live site:** https://superwin-player.apdiy61.workers.dev/  
**Existing infrastructure ONLY:** Cloudflare Worker `superwin-player`, Railway project `superwinbet-platform`, existing Player authentication/session, existing ETB wallet ledger and Worker/Railway bindings.  
**Scope:** 72 independent game packages. **Batch in progress: #1–#10.** Never restart from zero, rename the queue, substitute screenshot-only games, create detached wallets/engines/APIs, or mix original artwork/models between games. Preserve existing Multi Hot 5 and Foxy Hot 20.

> This is a continuity checkpoint, NOT evidence of production release. Work has been committed to the work branch; neither the staged patches nor the two missing-game controllers are verified deployed to the public Worker. A working unauthenticated page, a mocked browser spin, and a successful official demo are three distinct kinds of evidence. Do not claim real authenticated ETB settlement from mock results.

## 2026-11-21 — latest continuation checkpoint

User reconfirmed **ten games at a time in original order**. Continue batch #1–10, never restart. Retain Multi Hot 5 / Foxy Hot 20 and existing ZPLAY Player / Railway / Cloudflare Worker + 18 bindings. No new wallet, detached backend, API or Worker.

- **Public live verification:** Cloudflare Browser Rendering using `page.goto` returned **200** for `/`, `/games/multihot40_native`, and `/zplay74/multi-hot-10/`; `/api/slots/fresh-state` returned 401 without authentication. The two NEW `/new74/multi-hot-20/` and `/new74/multi-hot-5-burn-wilds/` paths returned 404 because their routes are not yet deployed. A separate `page.request.get` method returned a synthetic 404 even for example.com; **do not report it as production downtime**.
- **Code staged:** dedicated per-game `app.mjs`, `index.html`, `style.css`, `controller.mjs`, `scene.mjs`, `session.mjs`, `assets.mjs`, and `assets.json`, with authenticated existing Player session ownership, server-side receipt projection, persisted idempotency token, replay-only after ambiguous failure, and a requestAnimationFrame scene. No client-side payouts, demo balances or alternative backend.
- **Verified existing KV:** release `batch01-20261120-r1` in `SSG_OFFICIAL_REFERENCES`: **27** Multi Hot 20 and **30** Burn Wilds pinned assets/source files, including per-game wheel, sprites, logo/controls, background and captured audio. `player-route-pins.json` contains all **57** hashes and byte counts. Release flags are **published:false**, so **not production released**.
- **KV QA:** 26/26 critical files (16 source modules plus 10 selected game assets) read back and SHA-256 checked. **Browser router QA:** 20/20 representative immutable routes returned 200 in QA mode with correct MIME/CSP; unapproved Player route 503, mutation 405, corrupt data 503, and wallet API delegation unchanged.
- **Frontend QA (not actual ETB):** Multi Hot 20 mocked browser SPIN→STOP→five-reel result updated the mocked balance once with exactly one POST; BET/AUTO/MENU/SOUND responded without page errors. Burn Wilds mock recovered ambiguous 503 using **the same saved round token** without initiating a different wager. Zero live ETB charges were made.
- **Still gated:** authoritative approved server math/paytable, real authenticated Player receipt/ledger correctness, complete official graphics and sound parity, successful real Node CI, and safe production deployment. The older `/games/zplay_multi_hot_20_native` page is visibly labeled **ETB Tijaabo**, not proof of this new Player launch.
- **Commits:** `ee13dba2764588975f2b4c8cfa96c85540a44f17` (M20 pins), `77412af53573990978856204905b82d406e506ae` (Burn Wilds pins), `6a7fe50a2e388ff3f480ecf7926b51556dadffc7` (57-file route tests), `4e42d037e8f43181a781eb02c816d8dd22a7aef2` (readiness ledger). Last commit combined-status query returned no check statuses; do not claim CI passed.

- **2026-11-21 follow-up mobile QA:** Both game pages used actual committed HTML/CSS under Playwright at 320/350/360/390/412/440/768/1440px; **16/16** non-overlapping touch-control layouts passed, minimum controls 74×58px at 320px, no horizontal scroll. CSS fixed on both games, staged in same KV, and the 57-entry release pin manifest repinned at commit `52feb4092cdeec59b1086f0b3c23fb81816ea79d`.
- **2026-11-21 complete KV readback:** all **57/57** official-capture assets/source files were read from existing Cloudflare KV and verified for SHA-256 and size (26 critical source/media plus 31 other media). Two final CSS writes were separately verified; no different/new KV namespace created.
- **2026-11-21 Player authorization bugfix:** Both controllers now keep SPIN and AUTO disabled when existing Player `fresh-state` indicates `blockedByActiveGame`, `wagerAvailability === 'house_capacity'`, or `Session.phase === 'UNAVAILABLE'`; after a settled round they stop autoplay instead of submitting another wager. Both modules passed direct browser-imported, non-money gate QA. Regression tests appended to `batch01/new-games-session.test.mjs` commit `dc406bb99f13895fac1cf1335517666ffe36be8d`. Latest controller code staged to existing KV and hashes read back; pins repinned with commit `7e1a4c635bf5e88fb941bf340b6c31d1f86bdebd`. Production `published:false` retained.
- **Existing Railway backend check:** Decompressed the deployed `superwin-nine-slot-engine` Function source in the existing `superwinbet-platform` staging environment. `fresh_multihot20` and `fresh_multihot5burnwilds` occur as game catalogue entries only, **not as demonstrated certified payout engines**; no live wager/math launch gate may be relaxed on this basis. No Railway service or environment changed.

**Next exact work:** complete #4 Multi Hot 20 and #8 Burn Wilds with real approved server game model and settlement rules; run all Node/GitHub Actions QA and mobile timing/sound comparison; add only the verified router into existing Player Worker preserving all 18 bindings and old games; inspect actual live route after deployment. Never mark any game `COMPLETED` until all required tests pass. Batch **COMPLETED: 0/10**.

---

## The exact next step, for any next AI/session

1. Read **this file**, `codex-work/native72-20261119/changes/batch01/release-readiness.json`, `codex-work/native72-20261119/qa/remaining71-readiness.json`, and the branch's newest commits **before** writing or deploying. These reflect previously staged work; do not overwrite from older screenshots or instructions.
2. **Continue batch 1, not batch 2**. Earliest unresolved live release is **#1 Multi Hot 40**: existing Play Now route and native reel code exist, but authoritative production paytable/math and real authenticated session settlement remain unverified; the production wager/launchability gate must not be bypassed. Fix/test other independent graphics, touch, audio, recovery issues without touching the payout model.
3. In this batch, **#4 Multi Hot 20** and **#8 Multi Hot 5 Burn Wilds** now have isolated frontend, 5x3 Canvas scenes, existing-session adapters, official-capture assets and an additive Worker KV router staged. They do not have activated public Play Now routes or approved server game math/ETB settlement. The release map is `changes/batch01/player-route-pins.json` with 57 hash-pinned files (27+30) and `published:false` for both. Continue in the existing Worker/Railway services; never create a detached wallet or bypass wager gates.
4. Run local Node tests or GitHub Actions and inspect **actual** exit codes and logs. The workflow file exists, but a GitHub commit with zero status contexts or no run is **NOT** a passing CI result. Fix failures, then verify browser visuals and 360/390/412px pointer targets, real official demo timing and sound before release.
5. Check Cloudflare Worker deployment bindings and preserve their current version. Ship only independently verified changes after pre-production acceptance and observe live HTTP/Play Now. **Do not blindly redeploy the entire Worker** or replace old handlers/assets. Never send an actual ETB wager as a mock test.
6. Keep updating this file and the JSON readiness ledger after each code, test, deployment or blocker discovery. Mark `COMPLETED` only after gameplay, artwork, sound, bottom controls, real server-authenticated transaction/ledger recovery, error states, and live deploy are all verified.

## Batch plan

- Batch 1: games **1–10**, **IN_PROGRESS**.
- Batch 2: games **11–20**, NOT_STARTED.
- Batch 3: games **21–30**, NOT_STARTED.
- Batch 4: games **31–40**, NOT_STARTED.
- Batch 5: games **41–50**, NOT_STARTED.
- Batch 6: games **51–60**, NOT_STARTED.
- Batch 7: games **61–70**, NOT_STARTED.
- Batch 8: games **71–72**, NOT_STARTED.

### Batch 1 game-by-game checkpoint

| # | Game | Current status | Verified/staged work | Not yet finished |
|---|---|---|---|---|
| 1 | Multi Hot 40 | **FIXED_PENDING_TEST** | Existing `/games/multihot40_native`; official demo spun; mock SPIN → STOP, 5×4 reels, 503 replay/request ID, logout UI and 44px mobile targets verified; patched app/controller staged | Authoritative production math/paytable, true Player ETB settlement, final sound/demo parity, successful CI, production deployment |
| 2 | Safari Simba | **FIXED_PENDING_TEST** | Existing `/new74/037-safari-simba/`; official demo spun; mock SPIN, multiplier rendering, 360/390/412px TURBO overlap fixed; staged renderer/audio policy | Original asset/sound verification, full demo parity, authenticated wallet ledger QA, successful CI, production deployment |
| 3 | Multi Hot 10 | **FIXED_PENDING_TEST** | Existing `/zplay74/multi-hot-10/`; official demo spun; native Canvas SPIN/STOP; independent login, 5×3 renderer touch targets and audio blur/focus fixes staged | Authenticated ledger/receipt, complete official parity, verified CI, production deployment |
| 4 | Multi Hot 20 | **MISSING_PARTS** | Dedicated 5x3 frontend, reel animation, original symbols/music, 27 KV hashes pinned, browser mock SPIN/STOP + controls passed | `/new74/multi-hot-20/` not deployed, authoritative math/paytable and Player ETB ledger not verified; live gameplay parity and CI pending |
| 5 | Multi Hot 100 | **FIXED_PENDING_TEST** | Existing `/new74/multi-hot-100/`; per-game audio blur/focus and mobile TURBO touch patches staged; browser audio lifecycle tested | Full official parity, live session and ledger, verified CI, production deployment |
| 6 | Multi Hot 5 Wild | **FIXED_PENDING_TEST** | Existing `/new74/multi-hot-5-wild/`; per-game audio/touch fixes staged and browser audio QA | Full official parity, live session and ledger, verified CI, production deployment |
| 7 | Multi Hot 5 Deluxe | **FIXED_PENDING_TEST** | Existing `/new74/multi-hot-5-deluxe/`; per-game audio/touch fixes staged and browser audio QA | Stale gamble modal/reconnect validation, full official parity, live settlement, verified CI, deployment |
| 8 | Multi Hot 5 Burn Wilds | **MISSING_PARTS** | Independent Wild-expansion scene, logo/symbols/atlas/music, 30 KV hashes pinned, mock 503 → same-token replay passed | `/new74/multi-hot-5-burn-wilds/` not deployed; approved math, true authenticated settlement, sound/feature parity and CI pending |
| 9 | Multi Hot 5 Super Wilds | **FIXED_PENDING_TEST** | Existing `/new74/multi-hot-5-super-wilds/`; per-game blur/focus audio and touch corrections staged | Full official parity, real ledger/receipt QA, verified CI, production deployment |
| 10 | Multi Hot Wild Ways | **FIXED_PENDING_TEST** | Existing `/new74/multi-hot-wild-ways/`; per-game blur/focus audio and touch corrections staged | Full official parity, real ledger/receipt QA, verified CI, production deployment |

**Batch 1 COMPLETED: 0/10**. The other 62 games are **not** declared complete by this checkpoint. There are still release gates; do not silently clear or weaken them.

## Exact existing file locations

- Grounded release checklist: `codex-work/native72-20261119/changes/batch01/release-readiness.json`
- Durable 71-game work queue: `codex-work/native72-20261119/qa/remaining71-readiness.json`
- Multi Hot 40 real frontend patch: `codex-work/native72-20261119/changes/multihot40-live-r2/multihot40-app.mjs`
- Multi Hot 40 controller and tests: `codex-work/native72-20261119/changes/multihot40-r1/live-controller.mjs`, `live-controller.test.mjs`
- Safari real frontend patch: `codex-work/native72-20261119/changes/safari-live-r5/game.mjs`
- Multi Hot 10 independent code: `codex-work/native72-20261119/changes/multihot10-r2/`
- Missing games' per-game controllers: `codex-work/native72-20261119/changes/batch01/multihot20/controller.mjs` and `multihot5burnwilds/controller.mjs`
- Five further independent audio controllers/tests: `codex-work/native72-20261119/changes/batch01/audio-r3/`
- New receipt/auto/reconnect regression tests: `codex-work/native72-20261119/changes/batch01/new-games-session.test.mjs`
- GitHub workflow: `.github/workflows/native72-branch-qa.yml`
- Official references: existing Cloudflare KV namespace binding `SSG_OFFICIAL_REFERENCES`, including `archive-index.json`. Some demo loaders reported geographic restrictions; use already captured references, but do not label an untested clip as an official interactive parity check.

## Rules for SPIN / funds / Player authentication

- UI and gameplay must be fully interactive. No screenshot-only reels, fake scripted payout, free bonus wallet, or detached engine.
- **Play Now** through the existing Player dashboard; never expose Play Demo as the Player launch flow.
- Distinguish user-visible mock browser testing from authenticated, ledger-backed production wager. Mock tests intercept the network and have **zero actual ETB debit**.
- Preserve idempotency: one request token per attempted wager; ambiguous 503/timeout must reconcile the existing request, not issue a new debit; rejected 400/402/422 must release the UI; a late response from an older session must not update new balance.
- Validate real server receipt identity, reel grid, math version, bet and payouts before showing a win; the server's authoritative result and existing wallet ledger own payout computation.
- Bet min **1 ETB** wherever Worker policy enforces it; max **40,000 ETB** subject to existing server model. Paytable preview never changes a wager.
- AUTO must not spin before START PLAY is pressed. Hide/blur/pause should immediately stop SFX, and focus may resume music only if previously enabled.
- For authenticated Player login, request the user to enter Phone Number/Password **directly into the existing secure website form**, never into chat or pasted expiring shared browser URLs. Inspect session state before claiming a successful login.

## Verification and status discipline

Use exactly: `NOT_STARTED`, `IN_PROGRESS`, `MISSING_PARTS`, `BUG_FOUND`, `FIXED_PENDING_TEST`, `TESTED`, `COMPLETED`.

Successful browser-only API interception and new source commits are **not** live release success. Keep remaining gates visible; do not advance the next 10 as completed until each game is genuinely finished. If a feature is missing, implement it against the actual game model and records rather than inventing rules from visual impressions. Treat demo graphics/media copyright/usage permissions separately from game math.

### Last recorded actions

- Ten-game readiness ledger and 5 invariant tests committed.
- Two missing-game dedicated session controllers **and original Canvas reel scenes** with tests committed (but no public route, approved official symbol atlas, or verified game-specific server math).
- Five separate game audio lifecycle modules and 5 browser lifecycle tests committed; five further touch patches exist in their game-specific files.
- Staged Multi Hot 40, Safari Simba and Multi Hot 10 input/animation/audio patches were verified with browser intercept/mocks at several viewport widths, **not** real ETB settlement.
- GitHub workflow configured for branch push, but full CI success has **not been demonstrated** here. No production deploy recorded for these changes.

- **2026-11-20 new code:** `batch01/multihot20/scene.mjs` and `batch01/multihot5burnwilds/scene.mjs`: independent 5×3 requestAnimationFrame Canvas scenes with receipt-driven 15-symbol settle, 5 reel-stop audio cues, win flashes, optional verified Wild expansion, strict official-asset requirement, and instant hidden/blur audio pause. Playwright evaluated the actual two new modules, with synthetic QA-only image sprites: both passed; one desktop-browser animation sample reported approximately 60fps, not a guarantee for mobile hardware. No live wager or production release was executed.
- **2026-11-20 reference verification:** Cloudflare `SSG_OFFICIAL_REFERENCES` archive manifests report Multi Hot 20 = 214 captured files / 6 screenshots and Multi Hot 5 Burn Wilds = 224 captured files / 7 screenshots; `play_clicked=true` in both archives, `video_contains_audio=false`. Those archives do not prove live interactive audio/official payout math.
- **2026-11-20 QA additions:** `batch01/scene-lifecycle.test.mjs` (8 scenarios) wired to `.github/workflows/native72-branch-qa.yml`. Cloudflare Playwright regression verified 5 stop events and muted WIN sound after blur in both scenes. A successful GitHub CI run is still not established.

**Next immediately executable item:** run/check first-ten test suite (including `batch01/scene-lifecycle.test.mjs`), fix failures; integrate approved original assets and existing Play Now route for Multi Hot 20 while preserving the wager/math release gate; continue Multi Hot 40 launch checks. The two scene browser smoke tests currently pass with synthetic QA sprites; official artwork/audio parity and authenticated settlement are still unverified.
