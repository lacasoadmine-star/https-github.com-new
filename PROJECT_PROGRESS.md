# Active continuation — NEW71, M10 controls and additive deployment

Updated: 22 November 2026, Africa/Addis_Ababa. Continue the user's latest exact **71-name** order in [the active queue](codex-work/continue71-20261122/active-queue.json) and [the recorded instruction](codex-work/continue71-20261122/ORDER.md). The user's “2 games + 69” instruction preserves the current work; it does not restart it or mark two games complete. All older sections below are historical checkpoints.

The carried-forward M10 runtime and its exact asset closure were published at `fd8bdc4d9600e0f2d2bfc0bb7ab529a8d515ad51`; the preview was pinned at `a48c9baf443a2376566749c3947c2bbc1b47e1fa` on `work/continue71-20261122`. [CI44962425768](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/44962425768) passed all six jobs, including the existing Player/Agent/Admin builds and disposable backend tests. The M10 runtime passed 54 component tests and NEW71/preview passed 28 tests. Actual Chromium preview QA passed 127 checks at 360, 390, 430 and 1280 pixels, with zero browser errors, financial requests or off-scope requests. NEW71 browser QA passed all four viewport cases, preserving the old rows and exact 71-name order. These are source and isolated-preview results, not new-game cash completion.

M10 fixes include hosted AUTO starting from its selection dialog, one slot per original action, stopping at the chosen count, retaining the original request key on lost replies, pending BET/AUTO controls, and stopping AUTO on session/lifecycle changes. Renderer fixes preserve accepted results, avoid the restored-winning-view crash, retain native animation-frame receivers, and remove wheel-angle jumps on delayed receipt/STOP. Portrait artwork and hitboxes share the same layout coordinates with at least 44-pixel main controls. A fresh official M10 inspection completed seven individually initiated DMO rounds and current menu/settings/paytable checks. It exposed the retained BET-grid mismatch, now corrected to five native-art rows, separate up/down targets, all 31 observed DMO levels, clamped five-level movement and an offset retained across close/reopen. The host's ETB stake policy is unchanged. The updated runtime passes 62 component tests. A refreshed official session separately verified AUTO start and manual AUTO stop after one DMO round; the earlier expired-session attempt is recorded as an unsuccessful control check. These later source changes require their new immutable pin and browser verification before release.

Current deployment status: the existing Player version 466 (`8e07dd15-edb8-408e-b9fd-6fcabc25687b`) was verified as active and latest with 405 modules, 66,968,653 source bytes and 18 bindings. Three **staging-only** attempts were rejected with Cloudflare error 10027 (uncompressed size limit): the initial additional package, the tested 29,723-byte compact package, and that same compact package through the documented JSON Merge Patch version endpoint with `deploy=false`. No activation was submitted. Changing the upload format did not resolve the limit.

The next candidate therefore losslessly repacks one data-only deployment module, `native72dedicatedr1/release-pins.mjs`, while preserving its complete exported object and every embedded manifest string byte-for-byte. Its original source is 127,134 bytes with SHA-256 `db96f12990fe8d48d62e1c04de2e7611d9f3ba117bd791f733fa75af75b2cf10`. The isolated candidate saves over 92 KB before minification. All 321 asset records, three inline manifests, paths, KV keys, hashes, sizes, types, property order and exact HTML strings are checked for equivalence. The original repository source remains unchanged. This is the one explicit metadata-container replacement; the other 404 existing Worker modules and every actual asset must remain byte-identical. It changes no old gameplay, account, wallet, ledger or authentication behavior. The repack artifact must pass exact-source CI and full staged readback before activation; all existing bindings and settings must remain intact.

Independent continuation: [M20](codex-work/continue71-20261122/multi-hot-20-component/README.md) has a five-test correction for delayed-receipt/STOP wheel jumps; [M100](codex-work/continue71-20261122/multi-hot-100-component/README.md) has seven tests for immutable accepted receipts, duplicate delivery, repeated STOP and sparse grids. These are separate component closures with no replacement of the accepted financial evaluators. A fresh official M20 session has now completed seven individually initiated DMO rounds and exercised STOP, QUICK and TAKE WIN. Private captures and account/history material are not included in this source checkpoint.

The [request-owner guard](codex-work/continue71-20261122/request-owner-guard/README.md) adds symmetric old/new journal checks and adapter seams without mounting financial routes. [Exact-head request-owner CI44964127528](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/44964127528) passed at `4cd2337f6ea7aff5a0dc81865707d4709655659b`: all 27 guard/M20/M100 component tests and all six real PostgreSQL scenarios passed, without failures or skips. Twenty concurrent mixed old/new requests retained one owner and one debit; reverse collisions, original receipt replay, rollback, action-kind/UUID-case conflicts and legacy non-UUID replay passed. The disposable container and network were removed successfully. These synthetic database fixtures verify the unmounted seams, not production ledger integration.

The new [M10 house-reservation bridge](codex-work/continue71-20261122/m10-house-reservations/README.md) protects pending accepted wins inside the existing house wallet, using the existing transfer and paired-ledger contract. Fourteen local component tests pass, including collection replay, concurrent requests, rollback, exact funding, other players' holds and X2 accounting. Its prepared shared-wallet floor trigger and reservation migration remain **unapplied**. Ten real PostgreSQL scenarios and a bounded disposable workflow are prepared; their exact-source CI result is not yet claimed. Integration must add every new round, including a loss, to the shared round ordering and merge pending ownership into existing state/mutation entry points.

The existing operator-owned RNG/model hooks can be used; hidden provider probabilities are not a prerequisite. A distinct M10 operator distribution must still use the confirmed M10 settlement rules. Freshly reopened M10 v1.0.0 rules confirm multiplier values, deferred TAKE/next-SPIN collection, X2 and AUTO collection, but do not explicitly resolve aggregate settlement across multiple winning lines or whether the displayed 1000× label is a clipping rule. No guessed aggregation, cap or provider RNG is introduced. An explicit ETB denomination policy can use 0.10 multiples to avoid fractional minor-unit quotes.

The revised M10 source is pinned to `9326e45e0f5384afea5c503e3bdbfb649da4d414`. Additive CI44964127553 first stopped correctly at a 31,435-byte compact package exceeding the 30,000-byte guard. After lossless data packing, [exact CI44964364266](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/44964364266) passed all six jobs at `e590f54e60c620914ed528fab1d4386710c468e9`: 62 M10 tests, 35 catalogue/preview/data tests, seven compiled-artifact tests, 175/175 M10 browser checks, all four catalogue viewport cases, existing platform builds and nine disposable backend tests. Browser QA used the actual six-module artifact, totaling 29,723 bytes, at 360, 390, 430 and 1280 pixels, with no browser errors, off-scope requests or financial requests. All 41 pinned preview files and native image/audio bytes remain unchanged by packaging. A successful preview CI does not establish cash integration or completed games.

**Completed new games: 0. New-game cash activation: false.** The catalogue contains 71 requested entries, including identities still awaiting their own current official source; a card, reference capture or component test does not count as a completed game. Preserve every old game, account, balance, ledger, session, permission and Telebirr route. The exact excluded base titles remain MultiHot5, FoxyHot20 and HabeshaFortune5.

---

# Historical continuation — native recovery and remaining per-game verification

Updated: 22 November 2026, Africa/Addis_Ababa. This additive candidate follows verified commit `e91e3ae188b54e5a1adb9a5f4782a24c37e6c1d6`; it preserves every prior checkpoint below. The public QA candidate `e772499664ff2a558df3ff5f70a6d74cf9e5f051` passed [exact CI44959310953](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/44959310953) in all five jobs. Its source-pinned reports are retained in [the exact-run evidence folder](codex-work/new-games72-20261121/release/ci-e772499); the native keyboard/lifecycle issues are now closed within the tested Chromium fixture scope.

- The prior final integration passed [CI44957393122](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/44957393122): 363 Node tests, 55 Roll X browser checks, nine existing backend tests and the Player/Agent/Admin builds. Its 16 source hashes and 15 screenshot hashes matched the reviewed merge.
- Roll X passed 63/63 browser checks, preserving the prior 55 and adding eight native held-Space checks across STOP/READY transitions. The trace showed 40 cancelled repeat keydowns and no extra round on release. Separate full-Chromium BFCache passed 8/8 with trusted persisted lifecycle events, the same document/controller, actual frame restoration, preserved receipt and no wager during restore. Source hashes and artifact screenshots were verified, including visual review of the two new final states. ROLLX-FIX-005 and 006 are FIXED for this tested environment; no additional runtime patch was needed.
- Shared recovery passed 20/20 native browser assertions over four scenarios: cross-tab overlap, accepted response loss plus real reload, unaccepted request loss plus exact-key resend, and a shared server Retry-After deadline. Each fixture accepted one round with one debit/credit. A deliberate held-request failure also exited with the expected failure while draining work, closing the browser and retaining evidence. Three source hashes matched the exact commit. This uses intercepted synthetic accounts and injected shared metadata; it does not prove PostgreSQL settlement or change production storage/wallet behavior.
- A new partial Multi Hot 100 component passed 47 local tests and 47 independent peer retests. Automatic approval review rejected publication of its private evidence provenance. The mixed upload was stopped before any tree/ref update; the rejected action was not retried. All new M100 additions are withheld from this public commit and public CI and retained privately. The earlier public reference files are unchanged. No M100 full-game or ETB settlement claim is made.

- A fresh Multi Hot 40 reference added seven separately initiated manual DMO observations, current rules/paytable and control evidence. This makes six retained seven-manual-round reference sets across the historical/current work; it does not mean six completed games or resolve current membership. A later AUTO start/stop returned a provider timeout. Its accepted-round count and settlement remain unknown; one bounded official-entry recovery opened a separate session with zero new round inputs. The original reference and open findings are retained privately, with provider/shared-history material excluded from the continuation package. Independent visual review confirmed all 40 transcribed chart paths; this confirms geometry only. No continuous video, audible sound, complete rule semantics or full-game implementation is claimed.

The public run also passed 285 focused plus 79 other Node tests (364 total, zero failures/skips), nine existing backend tests and all three portal builds. These numbers count assertions/components, not completed games.

The requested target remains **72 distinct additional games**, with current supplied-name identity gaps retained in `codex-work/user-request-20261122`. **RELEASE_READY: 0; LIVE_VERIFIED: 0; new-game cash activation: false.** No production wager, balance/ledger change, credential change or live activation is part of this candidate. The current existing live metadata readback and all earlier captures remain valid only within their recorded scope and timestamps.

---

# Protected source reconciliation — canonical routing and viewport verification

Updated: 22 November 2026, Africa/Addis_Ababa. This continuation integrates tested code merge `381c25279e1d30ac3a3db198c3bfb2f0eeb7363d` and the concurrent progress-only follow-up `43c36d9322e7f7bb76d634ed988475ef9e106f50`. It preserves the latest supplied-name audit, fresh per-game work and existing-system maintenance recorded below. The requested total remains **72 distinct additional games**; no missing or duplicate identity is invented to reach that count.

## Exact verified checkpoint and current integration

The isolated [cc6933a GitHub run](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/44955629035) passed the existing Player/Agent/Admin builds, nine backend tests and all focused checks. Its browser report passed **50/50 assertions** at the canonical `/new-games72/roll-x/` route, with Chromium 151.0.7922.34, zero page errors, zero unknown resources and no production endpoint or financial POST. The report pins the source commit and hashes. Desktop, three portrait sizes, tablet and landscape measurements/screenshots confirmed the earlier viewport defect was corrected in that commit. This is synthetic receipt QA, not live wallet settlement, provider parity or game completion.

The concurrent upstream branch added a different wrapper-based Roll X layout and broader short-landscape checks. The integration retains its matching HTML/CSS panel structure and adds the canonical URLs, mandatory nine-control visibility, strict wheel/feedback bounds, focus checks, modal controls and tablet coverage. Upstream center-hit, overlap, page-height, small-landscape and active-AUTO checks are retained. Two test gaps found in review are addressed: a hidden essential control cannot be omitted from a passing layout check, and an active-AUTO measurement must capture AUTO as active in that same state. **The combined source passed its own [exact GitHub CI run 44956716335](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/44956716335): 284 focused tests and 55/55 browser assertions, with all three jobs successful.** All 16 artifact source hashes and 15 screenshots were verified. [The retained review](codex-work/new-games72-20261121/release/ci-381c252/review.json) covers twelve sampled states, including active AUTO in the same geometry sample, unavailable landscape, 568×320 and 667×375, three portrait sizes, tablet and desktop. Native BFCache restoration, held-Space repeat, audible sound, provider parity, physical-device performance and full new-game ledger settlement remain separate open work.

The six scoped route/layout/AUTO/QA issues are now marked FIXED with their actual action retests; this is not whole-game completion. The original route and layout attempts remain in [the canonical report](codex-work/new-games72-20261121/release/canonical-route-reconciliation-20261122.json), [the layout issue](codex-work/new-games72-20261121/release/vertical-layout-reconciliation-20261122.json) and the per-game issue ledger. The two baseline-image blob writes were not confirmed, so their existing public CI artifact remains the image source; the repository retains their hashes, measured coordinates and source-bound report. No failed binary upload was repeated or rerouted.

## Current scope and preserved evidence

The [latest ordered supplied-name audit](codex-work/user-request-20261122/README.md) takes precedence over the earlier candidate matrices: it records 71 supplied strings, including Cube Nova 01–21, 35 distinct currently verified products and one verified alias duplicate. Exact missing identities and the requested replacement positions remain open. [The earlier official 75/rendered 74 comparison](codex-work/new-games72-20261121/references/scope-reconciliation-20261122/SCOPE_RECONCILIATION.md) is retained as historical evidence, not adopted as a replacement for that latest list.

The [fresh product-rule refresh](codex-work/new-games72-20261121/references/product-rules-refresh-20261122.json) preserves the Multi Hot 20 marketing 100-line ambiguity. Concurrent current-demo evidence now records 20 chart paths and its separate bounded evaluator; the specification still marks the marketing/demo conflict and aggregate settlement unresolved. No guessed cap, sum, probability model or RTP is introduced. Multi Hot 10/20/100 work and all five retained seven-manual-round reference sets remain intact; no completed same-version capture is restarted by this integration.

A [fresh read-only live metadata check](codex-work/new-games72-20261121/release/live-readback-20261122.json) at 2026-11-21T22:27:59Z confirmed existing Player version 466 still serving 100% with 18 bindings. It did not inspect all gameplay/account/ledger flows.

All new cash/release gates remain closed. Existing controller/session/receipt/recovery code and existing platform runtime sources are preserved. No production spin, balance/ledger change, account reset, permission change, Telebirr change or deployment activation is performed by this reconciliation. Private provider-history and M20/M100 image archives remain outside the public tree.

---

# Current continuation — latest supplied names and verified maintenance

Updated: 22 November 2026, Africa/Addis_Ababa. The requested target remains **72 distinct new games**, preserving the existing system and excluding exact **Multi Hot 5, Foxy Hot 20 and Habesha Fortune 5** from the new scope. This section is current. All sections below are explicitly retained historical checkpoints.

## Exact latest list

The latest appended list contains **71 exact strings: 50 named entries and Cube Nova 01–21**. The ordered, source-linked audit is in [codex-work/user-request-20261122](codex-work/user-request-20261122/README.md). Thirty-six rows currently map to **35 distinct verified official products**. The current official AviaStar page and its demo identify JetX3 as that same product; the two supplied names are not counted twice. Next Level JetX maps to New Era of JetX. Plinko X and Plinko X Classic retain their distinct official loaders.

Two related-product candidates remain unresolved (Cappadocia and Crash Duel X); 33 other entries lack current primary identity proof, including all 21 numbered Cube Nova names. No absent title, variant, payout, artwork or 72nd name has been invented. A separate classic JetX variant must not be replaced silently with the New Era demo. The requested72 composition and three replacement positions are still unresolved, while independent work continues. Earlier 71/72 registries remain historical, with activation closed.

## Verified implementation and maintenance

- Published and tested code: `032df69f2343750719c438a6960bc08b7cdb845c` on `work/new-games72-additive-20261121`. The [exact push CI run44955509438](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/44955509438) completed successfully in all3 jobs. It passed280 focused additive/component tests,15 historical-scope tests,23 Deluxe tests,18 signed-transport tests,23 Balloon state/routing tests,12 evidence-packaging tests,9 existing backend tests, and all3 existing Player/Agent/Admin builds. All executed tests reported zero failures/skips. Tree readback preserved707 pre-existing files unchanged, modified exactly9 approved files, added93 files, and removed0; no private-image paths were published.
- The exact-source Roll X browser run passed **37/37 checks with zero page errors**. Its12 screenshot hashes and all15 runtime/test source pins matched; Git blob identities matched the exact published tree `08d81d27cbcb972e721721cec4186b4bced2f9d4`. At844×390 the SPIN control is now y240–292 and MENU/SOUND y296–340, with no scroll or overlap. At568×320 SPIN is y206–250 and MENU/SOUND y251–295, with44px controls. The568px,844px and active-AUTO landscape screenshots were visually reviewed. These are isolated immutable-receipt fixtures, with no production endpoints or real-money actions and no provider-parity claim.
- Browser artifact14727715300 is242401bytes, SHA-256 `732513f6b6ea2b1deb7449a4dd8ebacfd72200d554bba620f13006323e5b7f5e`; it contains the report and12 screenshots. The prior b61f6e2 CI run44951988734 passed31 browser assertions but did not test vertical fit: the then-recorded SPIN control was below the390px viewport. The strengthened37-check run above resolves that specific omission. Controller, session, renderer, audio and shared recovery source remain preserved by the layout change.
- The existing Deluxe moving-symbol scale correction is live. Its immutable renderer keeps the same visible alpha-bounded geometry while idle and moving. It is maintenance and contributes **zero new games**;23 focused tests pass. It is not a provider-parity or paid-spin claim.
- The existing Multi Hot40 and Balloon transport correction was first activated as Player version464, `8ed7d80e-16c3-41d6-b301-4b35668ff571`, and remains preserved in current version466. Cloudflare rejected the original redirect mode before network transmission. Both corrected wrappers now use explicit manual redirects and reject3xx destinations. The version464 readback verified all404 module identities:402 bodies unchanged and exactly2 intended replacements. All18 bindings and runtime/named handlers were preserved. Multi Hot40 connected and its BET and MENU opened; no paid wager was made.
- Balloon's remaining `Not connected` UI was traced to quiet polls invalidating slower successful responses. The first client-wrapper attempt, version465, was rolled back after its exact source guard rejected the newer retained client path. The corrected r2 release uses the actual current wager-profile client and is **live as Player version466**, `8e07dd15-edb8-408e-b9fd-6fcabc25687b`, deployment `6379df0b-d336-44f2-94d9-bea13ff10574`, activated at `2026-11-21T22:01:36.670446Z`. All405 modules were verified:404 prior bodies unchanged plus the corrected wrapper. Both KV objects, all18 bindings, runtime settings and named handlers matched. The canonical page loaded the r2 module and dependency, reached Ready, enabled HOLD and passed Refresh and stake1→2→1 checks without a wager. Its23 focused tests pass both locally and in exact-source GitHub CI. [The deployment and evidence](codex-work/live-balloon-state-fix-20261121/README.md) preserve the failed465 attempt separately; no paid-round or full provider-parity claim is made.
- Multi Hot10 now has a separate bounded evaluator with34 component tests from its freshly observed ten-line table and seven manual demo rounds. Multi Hot20 has its own fresh seven-manual-round capture, twenty observed line paths, current rules/version and tested controls, with a separately implemented bounded evaluator. Their incomplete aggregate-settlement/probability rules remain explicitly unavailable. The first Multi Hot20 paytable paint and official marketing100-line/demo20-line discrepancy are retained as evidence rather than silently guessed away.
- Multi Hot100 now has [seven fresh official DMO manual-round observations](codex-work/new-games72-20261121/games/multi-hot-100/fresh-reference-report.md), with37 original screenshots and separate action/metadata logs. This is a reference checkpoint only; no completed evaluator, ready game or live new-game release is claimed.

## Evidence and release truth

Fresh seven-manual-round reference sets have been captured for Deluxe, Roll X, Multi Hot10, Multi Hot20 and Multi Hot100. Multi Hot20's final visible demo ordinal was10: its seven reference rounds remain separate from three extra AUTO/main-control test rounds. An attempted STOP click reached the main control after the prior presentation may have settled; STOP-only behavior was not claimed. Screenshots labelled by action are classified by their actual visible content. No unsupported audio/video capability or unheard sound is claimed.

**New games release-ready:0. New games live-verified:0. New-game cash activation:false.** A reference capture, reserved path, passing bounded evaluator or source publication is not a finished independent game. No production wager, ledger/balance rewrite, account reset, Telebirr change or new hosting service was used. Existing games and historical release assets remain available. Current public evidence excludes private demo-history captures and actual Player account/history content. Automatic approval review rejected M20 archive part012 and the cropped Balloon proof upload; neither was retried. All M20/M100 source-image archives and bundle folders, plus the Balloon cropped JPEG, are excluded from the public tree and retained privately. The original94 M20/M100 screenshots and the cropped Balloon proof have been saved privately; no private storage identifiers are published. Their exact hashes, capture facts and observed outcomes remain in reviewed text records.

Public CI restores only the original65 public images and the accepted M10 evidence bundle. M20 runs all24 pure evaluator tests from its three text dependencies, with no image restoration or image QA; that isolated three-file run passed24 with zero skipped. M100 remains reference-only. The exact public CI run above passed these declared checks. It does not claim access to or verification of privately retained images.

## Next concrete actions

The maintenance source, reviewed reference text and identity audit are published, and the strengthened37-check browser job passed against the exact code commit above. This progress-only follow-up records the observed CI result; it does not alter or redeploy code. Continue independent modules only from their own current official observations, including the newly captured Multi Hot100 reference. Resolve the missing/duplicate identities and obtain official sources for Cube Nova before treating the latest requested list as72 distinct official games. Obtain the unresolved aggregate-settlement, admissible-outcome/probability and rounding specifications before cash activation. New games remain release-ready0, live-verified0 and cash-disabled.

---

# Retained 71-game progress checkpoint

# ZPLAY / Superwin — active additional 71-game work

Updated: 22 November 2026, Africa/Addis_Ababa. The latest explicit user instruction supersedes the older quantity: use the **74 rendered live catalog names in their current order**, excluding exactly **Multi Hot 5, Foxy Hot 20 and Habesha Fortune 5**. Preserve those games and all existing services. The active target is **71 new, independently identified games**. Historical checkpoints below remain intact and are not current completion claims.

## Current outcome

- The first additive checkpoint is published on `work/new-games72-additive-20261121` as commit `c743f8d2030eb1f6585ee4a5fa9f0aaca6274aa8`. Readback preserved 520 pre-existing files byte-for-byte; only this progress document changed among old files. There were 159 added files and no forbidden history-image paths in the tree.
- [NEW_GAMES_71_MATRIX.md](NEW_GAMES_71_MATRIX.md) and [the active registry](codex-work/new-games71-20261122/registry.json) cover 71 ordered targets and 568 owned work items. Seventy earlier additive IDs/routes are retained. Classic JetX has its own new ID and route, with its distinct official variant unresolved. SplitX and Double X are historical, outside this active scope.
- The existing Deluxe moving-symbol shrink defect is **deployed** on the existing Cloudflare Player Worker. [The isolated correction and proof](codex-work/live-presentation-fixes-20261122/README.md) are separate maintenance and count as **zero new games**. Version `527ad53e-210e-4e44-9c92-8bc5f74386f1` (463), deployment `3d8e5552-02f0-48db-82eb-f9ccc8d54260`, received 100% at `2026-11-21T21:19:24.756756Z`. The fresh readback verified all 404 modules: every original 403 module was unchanged, plus one pinned wrapper. All 18 bindings, named handlers and runtime metadata were retained. The new immutable renderer URL loaded on the canonical signed-in live page.
- Deluxe's isolated exact-source tests pass **23/23**. The old moving geometry fails three targeted checks; the correction passes. The comparison image is native Canvas fixture execution, not a paid round or a browser motion recording. No real-money spin was used for verification.
- The exact first [GitHub push CI run](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/44951228218) passed all three existing frontend builds, nine existing backend tests, 221 focused Node tests and 12 evidence-packaging tests. Its Roll X browser job **failed after 13 passing checks**: AUTO stopped after its first round with `Illegal invocation`. Native host timers had been invoked with the controller as receiver. A targeted regression reproduced it; the wrapper correction now passes **58/58 Roll X local tests**. The next exact push browser result remains pending.
- Current official seven-manual-round reference sets are retained for **Deluxe, Roll X and Multi Hot 10**. Multi Hot 10's 30 non-history screenshot hashes and current control/paytable observations are recorded; its separate source implementation is in progress. Reference captures do not prove complete rules, probability models, visuals, audio parity or finished games.
- All 17 public Play links among the 74 visible cards were inspected for nonfinancial presentation and controls across the session. The other 57 cards do not expose a public Play link. This is not a claim of paid-spin or full gameplay verification. Multi Hot 40 and Balloon showed state request failures; the exact deployed modules contain a Workers-unsupported redirect mode. A narrow reproduced repair is being prepared, without changing credentials or wallet logic. JetX's page intentionally disables new bets.

## Current release and evidence limits

**NEW GAMES RELEASE_READY: 0/71. NEW GAMES LIVE_VERIFIED: 0/71. Public new-game activation: false.** Existing account/session/ETB/ledger/authentication/permissions/Telebirr data and the existing domains remain preserved. A passing structural test or published source is not game completion. The live Deluxe maintenance release does not change this count.

The new [active-scope check](codex-work/new-games71-20261122/check-active-scope.mjs) has nine focused regression tests for ordering, exact exclusions, duplicate identities/variants, stable paths, protected live routes, immutable evidence, active owners and closed activation. It explicitly verifies 71 and does not reinterpret the retained 72-game release gate. Both remain closed.

Official observations are the only new game-specific source. Do not substitute old live artwork/gameplay, guessed payout tables, synthesized sound or renamed templates for missing provider evidence. Sound not audibly verified remains unverified. Classic JetX identity and provider-blocked Wild/Hot Samba access remain named open work; no access restriction is bypassed. Unknown probability models and incomplete game rules remain closed to settlement.

Two official DMO demo history screenshots were excluded from public publication after automatic approval review rejected the original mixed archive part. The rejected payload was not retried or rerouted. A new public bundle omits both histories; the original demo evidence is retained privately. No actual Player account/history screenshot was added to the repository.

## Next coordinated actions

Publish the tested timer correction, active 71-game contract and already-deployed Deluxe source package, then check the exact browser rerun. Complete the source-pinned Multi Hot 40/Balloon request repair and verify their state requests after deployment. Continue independent game modules from current official observations, starting with the captured Multi Hot 10 rules. Preserve accepted request identity, historical receipts and all old routes. No unknown rule or missing implementation is converted into a completion claim.

---

# Retained additive 72-game checkpoint — historical record

# ZPLAY / Superwin — active additional 72-game work

Checkpoint: 21 November 2026, Africa/Addis_Ababa. This section records the latest explicit additive request and supersedes the earlier sequential scheduling instruction for this new scope. The complete prior checkpoint is retained below; its existing implementations, staged work and unresolved deployment investigation have not been reset or activated by this preparation.

## Active scope and durable handoff

- Repository: `lacasoadmine-star/https-github.com-new`.
- New feature branch: `work/new-games72-additive-20261121`, based on the retained continuation commit `1d0f4c9ddc9d14aacc436021ed0bcb2b27dd85f0`.
- Active matrix: [NEW_GAMES_72_MATRIX.md](NEW_GAMES_72_MATRIX.md).
- New source/evidence: [codex-work/new-games72-20261121](codex-work/new-games72-20261121/README.md).
- Exact stable identities, reserved routes, backend paths, task owners and next actions: [registry.json](codex-work/new-games72-20261121/registry.json).
- Preservation inventory: [baseline.json](codex-work/new-games72-20261121/preservation/baseline.json), containing 74 retained source-catalog entries. This is not a claim that 74 old games were freshly tested live.

The user's supplied list contains 57 names. Fifteen additional distinct current official products complete the required 72-entry scope. Aliases share one identity and are not counted twice. Old same-name games retain their old IDs/routes. New code uses `zplay72_*_v1` and `/new-games72/`; reserving these paths does not make them playable.

All 72 remain in the active project scope, with per-game tasks for references, rules, assets, frontend, backend, controls, sound/animation and QA. Groups of ten are for reporting; they do not block parallel independent work. Shared API/wallet code is coordinated separately from per-game files.

## Verified work at this checkpoint

Fresh official product identities and current demo links are recorded for the 72 entries. The retained canonical evidence contains seven separately started manual demo-round observations for Multi Hot 5 Deluxe and seven for Roll X. Roll X's additional AUTO and STOP-control rounds remain separate. Deluxe has an actual canvas motion recording; some result frames were recovered from that same recording after a tool response was lost, without another spin. Its recovered desktop screenshots add zero verified manual rounds because their original action log and exact capture timestamps are unavailable. They supply separately labelled paytable and control-state evidence. Reference media is never runtime gameplay.

Deluxe now has deterministic five-line payout arithmetic with **23 passing tests**. Bound help displays at two bets and two observed wins support the implemented scaling. This is not a complete engine: admissible outcomes, probability weights, the displayed maximum-win restriction, X2 settlement, renderer and live integration remain unresolved. Outputs retain `settlementEligible: false` and `outcomeLegalityVerified: false`. The arithmetic does not invent reel restrictions or silently clamp a synthetic outcome to the provider's displayed cap.

Roll X frontend `zplay72-roll-x-frontend-0.2.0` adds editable AUTO stake and target fields. Its **57 local tests** verify that valid selections remain bound through serialized actions and invalid or stale selections cannot submit a wager. Its partial evaluator still covers the verified 1.4x/2x arithmetic subset. Complete target/stake limits, rounding, probability model, retained accepted-model versions, target-aware integration on the existing server, provider parity and live settlement remain unfinished. Cash is closed. A local installed-browser attempt failed at socket creation before any browser assertion; actual browser acceptance remains pending.

Multi Hot 5 Wild's later full-reference attempt returned a provider country restriction. Its earlier sound-prompt entry observation is retained as a separate event; neither attempt produced a gameplay round. Hot Samba also remains blocked by its observed provider restriction. The registry now distinguishes **68 REFERENCE_PENDING, 2 REFERENCE_PARTIAL and 2 REFERENCE_BLOCKED** entries. Other games continue independently, and entry-only surveys do not count as seven-spin captures.

Shared recovery now adopts saved `Retry-After` deadlines when another client's pending request is discovered and reloads the latest deadline before replay. Three reproduced failures were corrected; **49 recovery tests pass**. The existing API, accepted request identity and wallet boundaries are unchanged. Earlier capture/recovery/lifecycle retests remain in [peer-review.json](codex-work/new-games72-20261121/release/peer-review.json).

The unmounted additive asset router validates complete publication identities, release/source versions and each asset's size/SHA-256 before serving immutable URLs. Missing, corrupt or mismatched assets return explicit uncached errors without substituting older content. Independently validated retained releases remain available at their exact historical URLs when the current publication is absent, inactive or invalid. **32 integration tests pass**: nine catalog checks, 20 router checks and three independently reproduced historical-asset regressions. The [independent router review](codex-work/new-games72-20261121/integration/asset-router-review.json) retains the failed attempts and successful action retests. This handler is not mounted or activated.

The combined focused local suite passed **221/221** tests, with 0 failed, skipped or cancelled: capture 34, recovery 49, release gate 26, integration 32, Roll X 57 and Deluxe arithmetic 23. [The exact-source report](codex-work/new-games72-20261121/release/focused-integration-report.json) records the actual command, runtime, source hashes and TAP output. These isolated tests are not production ledger tests, native browser acceptance or 72-game completion.

The earlier Cloudflare source/fixture upload for browser QA was rejected by automatic approval review because authorization for transmitting that private payload to the destination account had not been established to the reviewer. That rejected upload was not retried or rerouted. The prepared feature-branch-only GitHub workflow tests checked-out source with game network traffic intercepted on an invalid test origin and uses no production credentials or wallet actions. The current GitHub publication/readback and browser workflow results remain unverified at this document checkpoint. The normal release-check command remains closed; `--expect-closed` proves only that valid preparation identities remain disabled.

## Preservation and release state

No existing game/runtime source or assets were overwritten. Accounts, balances, ledger, past rounds, authentication, permissions and Telebirr were not modified. Existing dirty checkouts were left intact. The earlier checkpoint recorded read-only Player/Agent HTTP 200 checks and Worker version/binding inspection without activation; those observations are not fresh authenticated gameplay or ETB settlement verification for this continuation. A new live baseline is still required before release.

**RELEASE_READY: 0/72. LIVE_VERIFIED: 0/72. Canonical seven-manual-round reference sets: 2/72. Public activation: false.** The new backend IDs are unregistered and disabled. No production spin, balance adjustment, data reset or new deployment activation was performed. A successful source publication or CI run must not be reported as live completion.

## Next actions

Publish and read back the exact source checkpoint through the existing GitHub feature branch, then inspect the isolated browser workflow's actual result and correct reproduced failures. Complete Roll X's native AUTO/input/lifecycle checks and target-aware adapter on the existing server. Complete Deluxe's outcome-legality, maximum-win and probability specifications alongside its renderer and remaining controls. Continue the other games independently from their per-game evidence and task owners. Preserve completed captures for the same version. Add disposable-database ledger and recovery tests before release, preserving accepted request identity and historical versions. Activate only one compatible release after all 72 reach RELEASE_READY and a fresh live baseline confirms existing services/modules/configuration.

Specific unresolved provider access, unknown financial rules, missing runtime code and evidence gaps remain active tasks; they must not be hidden by templates, copied old math, renamed cards or passing structural tests. Rollback must only close future new-game rounds and preserve accepted rounds, ledger, correct balances, payouts and required historical assets/rules.

---

# Retained prior checkpoint — unchanged historical record

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

## Publication and live deployment checkpoint

The reviewed public release artifact and progress checkpoint were published in commit `e60e4b0ed68c74e557dbba93580106306e47d957`. Exact artifact and progress readbacks were verified against that commit. The compact server package was then built using the actual immutable artifact URL, retaining the tested `c52af99` source and unchanged reconstruction checks. Publication contains the reviewed public source and CI evidence; private runtime and operational review records remain separate.

The actual `c52af99` browser report and selected screenshots have been reviewed. The five required evidence reviews and exact-source server package are complete offline. Fresh private inspection verified all 403 existing Player modules byte-for-byte and the unchanged 18 bindings.

All 24 additive Player KV records for this release have now been staged and read back successfully: 21 game files and three shell files, totaling 11,089,067 bytes. Each complete value and its metadata match the prepared hashes. The first immediate readback returned 404; the subsequent complete readback verified all 24 records. Existing release keys were not overwritten. Staging these files has not activated the new Worker or deployed the server.

The preparation-test fixture still described the older split-sprite package. It now uses eight source files and the current 13 media files. The corrected local preparation/transfer tests pass **11/11**, including all 21 missing-file cases, legacy/mixed-media rejection, version drift, retained routes and closed Burn behavior. This is a test-only working-copy correction, not a new deployed gameplay build. The accepted 19-source snapshot and sealed release inputs remain unchanged.

The desired compact server command is configured on the existing engine service. Two redeploy attempts reached platform `SUCCESS`, but the actual live health response still lacked the new release identity. A subsequent Function-update acknowledgement did not produce a verified new runtime. These acknowledgements do not establish that the accepted package is running. The desired command was retained, and the deployment investigation is recorded in the private continuation evidence.

Dashboard fallback reached sign-in, but authentication did not complete. No new Player activation or live wager was performed. The existing unrelated infrastructure changes were not committed.

The next exact step is to deploy the configured package on the existing engine service and verify its actual health response against the accepted release, source and acceptance hashes. Then activate the sealed content-only Player update after a fresh version/module/configuration guard, and verify the live game before marking Multi Hot 20 COMPLETED or advancing to Burn Wilds. Any new gameplay code correction requires verification of the resulting commit.

The new release is **not verified live** at this checkpoint. Opening Multi Hot 20's detail sheet on the live Player still shows `Diyaarin` and a disabled availability control. The current game remains **IN_PROGRESS**. No game is marked completed on the strength of source, screenshots or isolated tests alone. Continue from this checkpoint and the retained package; do not restart the project or skip to another game.
