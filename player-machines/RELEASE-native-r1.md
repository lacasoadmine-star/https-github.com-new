# Foxy Hot20 and Multi Hot5 — two new native machines

Release: `zplay-native-machines-20261107-r1`.

Status: additive source and local verification are in progress. This document does not record a native production publication yet. Worker308 remains the live baseline. The earlier replacement-scope r13 candidate was stopped and never published.

The release adds two separate machines to the existing player portal. The original machines remain playable with their original pages, wager rules, stored receipts and earned free spins.

| New machine | New route | Existing machine retained |
|---|---|---|
| Foxy Hot20 | `/games/foxy_hot_20_native` | `/games/hot_foxy_20` |
| Multi Hot5 | `/games/multi_hot_5_native` | `/games/multi_hot_5_video` |

The portal has 59 entries: all 57 existing entries plus these two additions. New cards use official SmartSoft covers and a “New” badge. The four existing local machine launch URLs, account controls and other portal routes remain available. Native page assets use a separate immutable namespace; the original Worker308 modules and their URLs are retained byte-for-byte.

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

The additive backend can be activated first because it preserves the old IDs and request contracts. Verify its health, schema metadata and 13 public models before exposing the new frontend and catalog. No real production wagers or account balance changes are part of release verification.

The health response includes `nativeSchemaCompatibility`. A single asynchronous startup query reads PostgreSQL catalog metadata only, with a two-second timeout. It reports `pending`, `compatible`, `review_required` or `unavailable`; a failed probe does not block the existing health response or old games. The live result has not yet been observed, and this probe does not settle a financial transaction.

## Verification record

These are scoped results, not one combined test total. Final integrated and production evidence must be appended after it runs.

| Scope | Observed result |
|---|---|
| Final additive backend with metadata-only health probe | 52 tests passed; all 11 original models and 440 seeded outcomes preserved |
| Local engine contract | 636 checks passed, including 600 settled synthetic rounds across four old and two new machine IDs |
| Native identity, old-game preservation and Help | 29 checks passed |
| Integrated motion and identity unit checks | 27 checks passed |
| Catalog unit/router checks | 14 passed |
| Catalog browser checks | 39 passed at 390px and 1280px, using disposable local account fixtures |
| Official payout arithmetic | 681 payout cells matched across all public wager levels |
| Naturally observed official outcomes | 40 MH5 and three Foxy outcomes matched the local payout calculation |
| Platform checks | Nine pytest tests and all three frontend builds passed |

The native full-suite, final integrated browser, exact additive Worker readback, live new-route HTTP/2 and production memory results are pending in this record. Historical replacement-r13 browser results are retained in [RELEASE-r13.md](RELEASE-r13.md); they are not represented as final additive release verification.

## Live baseline and publication

Worker308 fixed the observed HTTP/2 resource failure before this native release. It replaced the large JavaScript asset string with binary modules and 64 KiB streaming responses while retaining all old HTTP asset bytes. Fresh actual-HTTP/2 checks covered the portal and all four existing machine pages: 230 responses, zero 5xx responses, zero failed requests and zero page exceptions. The original 503 evidence included Cloudflare 1102 resource errors; the fix therefore addresses the recorded failure rather than merely switching clients to HTTP/1.1.

| Record | Value |
|---|---|
| Live baseline Worker | 308 / `2fad5f75-d154-41a0-8d64-12597a95d42e` |
| Baseline deployment | `33f3569e-b095-440c-b51c-6c53ee12c66d` |
| Baseline activation | `2026-11-06T21:23:50.534541Z`, 100% traffic |
| Baseline module preservation required | All 156 modules; no old module replacements |
| Existing settings preserved | 12 bindings and existing settings, except the reviewed additive main module |
| Native source commit | Pending final source freeze |
| Native backend source | 113,520 bytes; SHA-256 `895874f3d9972115cf6bda5353f6f6f7b0cbc348166cf15014c12b0c75b42b5b` |
| Native math hash | `d8888e57448d41c4c4d46124482a37bed54a80f8debf21ee0116a32bcee11272` |
| Native backend deployment | Not recorded yet |
| Native Worker version/deployment | Not recorded yet |
| Temporary upload cleanup | Pending successful publication |

The native Worker adds a new entry that delegates existing routes and lifecycle handlers to the original entry. New immutable assets reuse original binary modules by exact hash when possible; additional native and catalog modules have separate names. Candidate creation is non-live, followed by exact module/settings readback and a guarded publication against the current baseline.

## Known limits

Original assets and observed behavior do not establish provider-certified identity. The provider's private reel probabilities, wheel weights, RNG and RTP are unavailable. Existing local strip order and weight choices therefore remain local. The finite post-response reel and wheel stopping curves are not fully ported, and exhaustive device-by-device timing and sound milestones have not been demonstrated. The source-derived MH5 line scheduling follows the 60 Hz reference without reproducing low-frame-rate ticker drift. This release does not claim 100% visual, timing or mathematical equivalence.
