# Foxy Hot20 and Multi Hot5 — two new native machines

Release: `zplay-native-machines-20261107-r1`.

Status: the additive backend and native frontend are published. Worker309 serves 100% of traffic, and the backend exposes all 13 games, including the two new IDs. The final seven-page live HTTP/2 check passed, and temporary upload cleanup is independently verified. One earlier 503 strongly correlates with an upstream spin response, but its exact backend cause remains unknown; the strict global production-clear result is still false. The earlier replacement-scope r13 candidate was stopped and never published.

The release adds two separate machines to the existing player portal. The original machines remain playable with their original pages, wager rules, stored receipts and earned free spins.

| New machine | New route | Existing machine retained |
|---|---|---|
| Foxy Hot20 | [Open new Foxy Hot20](https://superwin-player.apdiy61.workers.dev/games/foxy_hot_20_native) | `/games/hot_foxy_20` |
| Multi Hot5 | [Open new Multi Hot5](https://superwin-player.apdiy61.workers.dev/games/multi_hot_5_native) | `/games/multi_hot_5_video` |

The additive portal provides 59 entries: all 57 existing entries plus these two additions. New cards use official SmartSoft covers and a “New” badge. The four existing local machine launch URLs, account controls and other portal routes remain available. Native page assets use a separate immutable namespace; the original Worker308 modules and their URLs are retained byte-for-byte.

## New machine behavior

Only official SmartSoft public DEMO sessions and public source assets were used as references. User-supplied screenshots and videos were not used.

- Foxy has eight symbols, 20 authored payline paths, the official numeric wager ladder and five red/black gamble attempts. It does not include the old local game's ninth scatter or free-spin award.
- Multi Hot5 has its five authored line paths, original numeric wager ladder, 145× maximum win and five gamble attempts.
- Each machine uses its own original artwork, symbol animations, blur textures, full music, game-specific sounds, AUTO panel, wager controls, Help and gamble presentation. Help wager changes preview the paytable without changing the actual stake.
- The original animated SmartSoft GIF and YES/NO sound choice appear from first paint. Readiness follows the required assets and authenticated game state. Original font bytes and an explicit Canvas renderer work under the existing strict CSP.
- Native audio uses the observed gain graph and compressor settings. MH5 background gain is 0.09 and win gain is 0.36 after parent and instance gains; Foxy applies its per-clip gains once. Missing native clips remain silent rather than playing synthesized substitutes.
- Foxy begins its decorative pending spin motion before the response arrives, then binds the validated receipt without choosing an outcome locally. Failure or recovery cancels the matching pending animation. Its native win shade covers the controls, and popup skip/dismiss input cannot place another wager.
- MH5 winning lines follow the source-derived sequential order and lifetimes. Generic confetti, duplicate shield pulsing, invented all-line flashes and generic win overlays are removed from the new native machines.

The public demo's numeric wager values are adopted as this operator's ETB profile. This does not represent a DMO-to-ETB exchange conversion. The profile permits a gamble stake up to 500 ETB; public observations confirm that larger demo wins do not offer Double, but the provider's exact comparison within the 250–500 interval remains unverified.

## Financial identity and preservation

The new IDs are `foxy_hot_20_native` and `multi_hot_5_native`. They remain unchanged through API requests, receipt validation, pending recovery, history, free-spin keys and gamble parents. A separate presentation-family mapping selects shared artwork and styles; it never rewrites a financial receipt's game ID.

The backend adds the two IDs beside all 11 original games. Each original ID still dispatches to the frozen original core. All 11 original public models and 440 seeded outcomes are exact. Original Foxy free spins remain on the original machine, including their locked wager, retriggers and ability to play at zero balance. No wallet, history, receipt or free-spin data is migrated or reset.

The existing shared wallet and double-entry ledger remain authoritative. Settled requests replay before current-model validation. New native paid requests pin the current model; stale pins are rejected before debit. Native gamble recovery and optional expected stake/attempt guards are scoped only to native parent receipts. Original games ignore those added fields as before.

The additive backend was activated first because it preserves the old IDs and request contracts. Its live public API exposes all 13 games, and all 11 original public models are deeply equal to the pre-release snapshot. The global legacy math identity remains unchanged; the active native models use the new hash. See the [live public-model verification](../server-fixes/native-rules-20261107/evidence/live-public-verification.json). No real production wagers or account balance changes are part of release verification.

The health response includes `nativeSchemaCompatibility`. A single asynchronous startup query reads PostgreSQL catalog metadata only, with a two-second timeout. It reports `pending`, `compatible`, `review_required` or `unavailable`; a failed probe does not block the existing health response or old games. Live metadata confirms that `sw_rebuild.rounds.game` is `TEXT`, with no restrictive CHECK, foreign key, row-level security or rules. The unchanged `sw_live_rounds` AFTER INSERT/DELETE/UPDATE trigger passes only `user_id` to `sw_live_user_change`; its function body was unavailable, so notification-only behavior is not proven. The automatic status remains `review_required`. The [limited manual metadata review](../server-fixes/native-rules-20261107/evidence/live-trigger-manual-review.json) found no observed game-ID restriction and accepted frontend exposure without a schema change. Existing atomic settlement and rollback remain intact. Neither review settled a real financial transaction.

## Verification record

These are scoped results, not one combined test total. Several focused checks overlap with the full suites.

| Scope | Observed result |
|---|---|
| Final additive backend with metadata-only health probe and deployment wrapper | 54 tests passed; all 11 original models and 440 seeded outcomes preserved |
| Final native frontend Node suite | 775/775 passed |
| Final integrated native browser | 491/491 checks at 390px: 268 MH5 and 223 Foxy; 32 settled synthetic rounds, balanced ledger, zero JavaScript or CSP errors |
| Local engine contract | 636 checks passed, including 600 settled synthetic rounds across four old and two new machine IDs |
| Native identity, old-game preservation and Help | 29 checks passed |
| Integrated motion and identity unit checks | 27 checks passed |
| Catalog unit/router checks | 16 passed |
| Catalog browser checks | 40 passed at 390px and 1280px, using disposable local account fixtures |
| Old/native Worker routing and packing | 23 checks passed; all old asset and page bytes pinned unchanged |
| Combined local runtime | 115 simultaneous h2c responses: all 200 with exact hashes; 41 old assets, 69 native assets and five catalog assets |
| Final live seven-page browser check | 455 same-origin HTTP/2 responses; zero captured 5xx responses, failed requests or JavaScript errors |
| Live tested-window fetch metrics | 742 fetches; zero fetch errors or 5xx; largest reported per-group p99 memory 124,695,630 bytes |
| Official payout arithmetic | 681 payout cells matched across all public wager levels |
| Naturally observed official outcomes | 40 MH5 and three Foxy outcomes matched the local payout calculation |
| Platform checks | Nine pytest tests and all three frontend builds passed |

The final integrated browser evidence is in [evidence/native-r1/browser390/results.json](evidence/native-r1/browser390/results.json). It covers Foxy motion before a delayed response and cancellation, popup interception, reduced motion, MH5 multiple-line scheduling, and isolation from old pending requests, history and free spins. The [combined local runtime proof](evidence/native-r1/local-runtime-proof.json) records 650,228 bytes of startup JavaScript heap, a 2,060,088-byte peak and 35,025,983 bytes of backing storage. Its h2c isolate omits the 113 unrelated old modules and uses an older local compatibility date, so it does not replace full live Worker/edge memory and HTTP/2 verification.

Catalog favourites show “Saved” only after upstream confirmation; an ignored write displays an error. The upstream game-ID validator was unavailable for source inspection. Favourite persistence checks used disposable local fixtures, with no production account writes.

The [final live browser evidence](evidence/native-r1/live-309-native-catalog-surface-http2-verification.json) covers the portal, both new machines and all four existing local machines. It confirms 59 catalog cards, six correct launch links, both native Help/Settings panels and helpers, and exact hashes for all 41 old HTTP assets. The [version-specific analytics](evidence/native-r1/native-309-independent-browser-window.json) show 742 fetches without 5xx or fetch errors in the tested window, with the largest reported per-group p99 memory at 124,695,630 bytes. The [final independent check](evidence/native-r1/native-309-final-independent-verification.json) covers 1,636 post-publication fetches: zero thrown fetch errors and one earlier 503, reported with runtime status `success` rather than a resource exception. That broader query's largest per-group p99 memory is 127,390,456 bytes; the earlier highest observed p99 of 131,845,500 bytes is retained in the evidence. The [read-only 503 diagnostic](evidence/native-r1/native-503-diagnostic.json) found a strong time correlation between the Worker response at `23:24:08Z` and the backend’s `POST /api/spin` 503 at `23:24:09.164Z`. The Worker invocation reported no error, and the matching backend windows contained no runtime exception or SQL-error log. No response body or shared trace was retained, so the exact backend business error remains unknown; this is a correlation, not a proven cause. A global zero-5xx claim is not supported, and the strict production-clear field remains false despite passing browser and cleanup checks.

The [candidate readback and publication record](evidence/native-r1/cloudflare-publication.json) verifies all 205 modules, including the 156 unchanged baseline modules, all 12 inherited bindings and the preserved settings. Publication also confirms the unchanged `local-demo-v1` migration tag. Historical replacement-r13 browser results are retained in [RELEASE-r13.md](RELEASE-r13.md); they are not represented as final additive release verification.

## Live baseline and publication

Worker308 fixed the observed HTTP/2 resource failure before this native release. It replaced the large JavaScript asset string with binary modules and 64 KiB streaming responses while retaining all old HTTP asset bytes. Fresh actual-HTTP/2 checks covered the portal and all four existing machine pages: 230 responses, zero 5xx responses, zero failed requests and zero page exceptions. The original 503 evidence included Cloudflare 1102 resource errors; the fix therefore addresses the recorded failure rather than merely switching clients to HTTP/1.1.

| Record | Value |
|---|---|
| Previous baseline Worker | 308 / `2fad5f75-d154-41a0-8d64-12597a95d42e` |
| Baseline deployment | `33f3569e-b095-440c-b51c-6c53ee12c66d` |
| Baseline activation | `2026-11-06T21:23:50.534541Z`, 100% traffic |
| Frozen additive module inventory | 205 modules: all 156 baseline modules byte-identical, plus 49 additions |
| Frozen uncompressed source size | 64,104,721 bytes; 3,004,143 bytes below the 64 MiB limit |
| Existing settings preserved | 12 bindings, `local-demo-v1` migration tag and existing settings, except the reviewed additive main module |
| Immutable native Worker source commit | `228f426025322c1c01e65c5cba6612ccfe4db3d0` |
| Native Worker manifest SHA-256 | `5ba3fc19692cbad40eb0a215b8d0187dd104948c58c2432691d976d9766fffe2` |
| Native backend runtime | 113,506 bytes; SHA-256 `c434a085e736326db5f9c8822bf1feb8212073495174889527a0655e9a5b5c91` |
| Railway deployment wrapper | 82,860 bytes; SHA-256 `83755318696124ce3566dd80d44c723288f14d79f4d45b761b821234662bd738` |
| Native math hash | `d8888e57448d41c4c4d46124482a37bed54a80f8debf21ee0116a32bcee11272` |
| Live native backend deployment | `3cc34ab8-5d40-4830-81c9-0288f6222994`; SUCCESS; created `2026-11-06T23:16:14.742Z` |
| Live native Worker | 309 / `0be4d4fe-7e81-41fb-b27a-42f6dc23ddcc` |
| Native frontend deployment | `a057740f-dccf-4188-9ba1-d83744b7233f` |
| Native frontend activation | `2026-11-06T23:24:02.960148Z`, 100% traffic |
| Temporary upload cleanup | Owned namespace deleted; exact ID/title absent and GET returned 404, independently confirmed `2026-11-06T23:34:26.142Z` |

The native Worker adds a new entry that delegates existing routes and lifecycle handlers to the original entry. New immutable assets reuse original binary modules by exact hash when possible; additional native and catalog modules have separate names. The candidate was created non-live and then published through the guarded additive workflow against Worker308.

The Railway wrapper decompresses the frozen runtime, verifies its exact length and SHA-256, and imports it beside the wrapper so the existing `pg` and `ioredis` dependencies resolve normally. Its encoded startup argument is 110,480 bytes, below Linux's single-argument limit. The wrapper's hash is distinct from the executed runtime's hash; the underlying runtime is byte-for-byte preserved. Local dependency-loading and tamper-rejection checks are included in the 54 backend tests and packaging evidence.

## Known limits

Original assets and observed behavior do not establish provider-certified identity. The provider's private reel probabilities, wheel weights, RNG and RTP are unavailable. Existing local strip order and weight choices therefore remain local. The finite post-response reel and wheel stopping curves are not fully ported, and exhaustive device-by-device timing and sound milestones have not been demonstrated. The source-derived MH5 line scheduling follows the 60 Hz reference without reproducing low-frame-rate ticker drift. This release does not claim 100% visual, timing or mathematical equivalence.

After cleanup, exactly two fresh Chromium document GETs returned 200 over HTTP/2 with the native release header and no-store HTML. Subresources were intentionally blocked for this narrow availability check. A separate urllib HEAD request returned 403 without the Worker release header; its cause is not established. See [post-cleanup document evidence](evidence/native-r1/native-309-browser-get-after-cleanup.json).
