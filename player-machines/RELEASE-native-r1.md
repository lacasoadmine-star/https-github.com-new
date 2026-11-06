# Foxy Hot20 and Multi Hot5 — two new native machines

Release: `zplay-native-machines-20261107-r1`.

Status: the additive backend is live and exposes 13 games, including the two new IDs. The native frontend is frozen and uploading; it is not yet published in this record. Worker308 remains the live frontend baseline. The earlier replacement-scope r13 candidate was stopped and never published.

The release adds two separate machines to the existing player portal. The original machines remain playable with their original pages, wager rules, stored receipts and earned free spins.

| New machine | New route | Existing machine retained |
|---|---|---|
| Foxy Hot20 | `/games/foxy_hot_20_native` | `/games/hot_foxy_20` |
| Multi Hot5 | `/games/multi_hot_5_native` | `/games/multi_hot_5_video` |

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

The additive backend was activated first because it preserves the old IDs and request contracts. Its live public API exposes all 13 games. The global legacy math identity remains unchanged; the separate `activeNative` identity is the new hash. No real production wagers or account balance changes are part of release verification.

The health response includes `nativeSchemaCompatibility`. A single asynchronous startup query reads PostgreSQL catalog metadata only, with a two-second timeout. It reports `pending`, `compatible`, `review_required` or `unavailable`; a failed probe does not block the existing health response or old games. The live metadata confirms that `sw_rebuild.rounds.game` is `TEXT`, with no restrictive CHECK, foreign key, row-level security or rules. One existing notification trigger makes the conservative probe report `review_required`; its function remains under review in this record. The probe does not settle a financial transaction.

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
| Official payout arithmetic | 681 payout cells matched across all public wager levels |
| Naturally observed official outcomes | 40 MH5 and three Foxy outcomes matched the local payout calculation |
| Platform checks | Nine pytest tests and all three frontend builds passed |

The final integrated browser evidence is in [evidence/native-r1/browser390/results.json](evidence/native-r1/browser390/results.json). It covers Foxy motion before a delayed response and cancellation, popup interception, reduced motion, MH5 multiple-line scheduling, and isolation from old pending requests, history and free spins. The [combined local runtime proof](evidence/native-r1/local-runtime-proof.json) records 650,228 bytes of startup JavaScript heap, a 2,060,088-byte peak and 35,025,983 bytes of backing storage. Its h2c isolate omits the 113 unrelated old modules and uses an older local compatibility date, so it does not replace full live Worker/edge memory and HTTP/2 verification.

Exact additive Worker readback, live new-route HTTP/2 and production memory results remain pending in this record. Historical replacement-r13 browser results are retained in [RELEASE-r13.md](RELEASE-r13.md); they are not represented as final additive release verification.

## Live baseline and publication

Worker308 fixed the observed HTTP/2 resource failure before this native release. It replaced the large JavaScript asset string with binary modules and 64 KiB streaming responses while retaining all old HTTP asset bytes. Fresh actual-HTTP/2 checks covered the portal and all four existing machine pages: 230 responses, zero 5xx responses, zero failed requests and zero page exceptions. The original 503 evidence included Cloudflare 1102 resource errors; the fix therefore addresses the recorded failure rather than merely switching clients to HTTP/1.1.

| Record | Value |
|---|---|
| Live baseline Worker | 308 / `2fad5f75-d154-41a0-8d64-12597a95d42e` |
| Baseline deployment | `33f3569e-b095-440c-b51c-6c53ee12c66d` |
| Baseline activation | `2026-11-06T21:23:50.534541Z`, 100% traffic |
| Frozen additive module inventory | 205 modules: all 156 baseline modules byte-identical, plus 49 additions |
| Frozen uncompressed source size | 64,104,721 bytes; 3,004,143 bytes below the 64 MiB limit |
| Existing settings preserved | 12 bindings and existing settings, except the reviewed additive main module |
| Immutable native Worker source commit | `228f426025322c1c01e65c5cba6612ccfe4db3d0` |
| Native Worker manifest SHA-256 | `5ba3fc19692cbad40eb0a215b8d0187dd104948c58c2432691d976d9766fffe2` |
| Native backend runtime | 113,506 bytes; SHA-256 `c434a085e736326db5f9c8822bf1feb8212073495174889527a0655e9a5b5c91` |
| Railway deployment wrapper | 82,860 bytes; SHA-256 `83755318696124ce3566dd80d44c723288f14d79f4d45b761b821234662bd738` |
| Native math hash | `d8888e57448d41c4c4d46124482a37bed54a80f8debf21ee0116a32bcee11272` |
| Live native backend deployment | `3cc34ab8-5d40-4830-81c9-0288f6222994`; SUCCESS; created `2026-11-06T23:16:14.742Z` |
| Native Worker version/deployment | Not recorded yet |
| Temporary upload cleanup | Pending successful publication |

The native Worker adds a new entry that delegates existing routes and lifecycle handlers to the original entry. New immutable assets reuse original binary modules by exact hash when possible; additional native and catalog modules have separate names. Candidate creation is non-live, followed by exact module/settings readback and a guarded publication against the current baseline.

The Railway wrapper decompresses the frozen runtime, verifies its exact length and SHA-256, and imports it beside the wrapper so the existing `pg` and `ioredis` dependencies resolve normally. Its encoded startup argument is 110,480 bytes, below Linux's single-argument limit. The wrapper's hash is distinct from the executed runtime's hash; the underlying runtime is byte-for-byte preserved. Local dependency-loading and tamper-rejection checks are included in the 54 backend tests and packaging evidence.

## Known limits

Original assets and observed behavior do not establish provider-certified identity. The provider's private reel probabilities, wheel weights, RNG and RTP are unavailable. Existing local strip order and weight choices therefore remain local. The finite post-response reel and wheel stopping curves are not fully ported, and exhaustive device-by-device timing and sound milestones have not been demonstrated. The source-derived MH5 line scheduling follows the 60 Hz reference without reproducing low-frame-rate ticker drift. This release does not claim 100% visual, timing or mathematical equivalence.
