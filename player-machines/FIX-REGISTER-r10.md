# Player r10 fix register

This register separates observed provider behavior, local receipt correctness and unverified feature rules. New differences should include the game, viewport, state, reference timestamp, actual interaction, receipt boundary and an affected-flow check.

## Implemented

| ID | Correction | Evidence |
|---|---|---|
| F01 | Foxy forest relief, emerald/gold frame and control glyphs | Native/actual browser screenshots; 360/390/430px |
| F02 | Measured Foxy reel/wheel/win-panel geometry and landing rebound | Official and uploaded normalized frames; local timed play |
| F03 | Dark sound choice with persistent Yes/No behavior | 44 fresh consent checks; no wagers |
| F04 | MH5 adjacent legal stake previews | Six responsive control cases |
| F05 | MH100 board geometry, WIN panel and multiplier palette | 5×4 symbols visible; no clipping/overflow |
| F06 | MH100 and Stars white ready control glyphs | Existing handlers and game palettes preserved |
| F07 | User-uploaded short background loop for MH5/MH100 | 72 local lifecycle checks; 93 Cloudflare checks; explicit consent |
| F08 | MH5 first SPIN after a finished win | Natural official win, 10.002s quiet wait, one tap starts new paid DMO round |
| F09 | Active AUTO cancellation while request/animation remains saved | Final controller removes the unconditional saved-request disable; 60/60 final AUTO/free-spin checks passed |
| F10 | Zero-balance entry with earned free spins | No deposit prompt while free spins remain; 60/60 final AUTO/free-spin checks passed |
| F11 | Backend rejects zero-balance earned free spins | One-predicate fix deployed; 20 tests; healthy existing service; staged source preserved |

MH5 ordinary award cells match9/9 and Foxy21/21 at numerical stake2. Earlier Foxy loading placeholders are superseded by fully loaded help. Existing outcome probabilities were not changed.

## Remaining differences

| ID | Finding | Required evidence or work |
|---|---|---|
| O01 · Stars rules | Official10 bidirectional lines and held-wild respins differ from local20-line scatter model;22/27 checked awards differ | Preview candidate passes33tests. Establish which stages pay/accumulate, new-star retrigger and termination, all-held completion/direction deduplication, and legacy symbol mapping before enabling settlement |
| O02 · Native AUTO variants | MH5 counts10/25/50/75/∞ and opens running STOP modal; Foxy25/50/100/500/1000 and active AUTO cancels directly | Isolated MH5 candidate passes48browser+3unit checks. Active X continuation and count locking are verified. Threshold/Big Win arithmetic, threshold editing and mobile Escape behavior remain gated. Existing r10 chooser stays in use |
| O03 · Complete soundtrack | MH5/MH100 short uploaded1.465s loop differs from full87s track; Foxy/Stars background details incomplete | Compare complete authorized audio and lifecycle; retain public full tracks as reference-only |
| O04 · Artwork/animation exactness | Reconstructed forest, typography, gem and spark detail remain distinguishable | Normalize cabinet/viewport and compare matched idle/moving/win states; retain untouched reference and local captures |
| O05 · MH100 rules/features | Basic layout and observed wins checked; full authoritative rules not established | Fully loaded provider help and naturally observed feature settlements |
| O06 · Catalogue scope |57 titles, only four completed30-round UI comparisons; many exact counterparts unknown | Keep exact/provisional/collision/unmatched catalogue rows explicit; avoid guessed title-to-engine bindings |
| O07 · Native menus/history | Provider-specific thresholds, audio switches and replay viewer differ | Verify each visible action and replay completion before replacing current functional menus |
| O08 · Pending backend patch | Preserved unrelated staged /api/state source still contains the old zero-balance predicate | Rebase that pending edit before a later acceptance; never publish it incidentally |
| O09 · Large uploaded reference | One previously supplied050916 recording exceeds the32MiB download limit | Remains uninspected; do not claim every supplied second was reviewed |

## Verification discipline

Final timed records must report exactly30 primary rounds per game and at least300 seconds on that game's visible page. Supplemental control cases, extra settlements, official tap attempts and pure math simulations must be counted separately. Preserve failed attempts and state why they were replaced.

The final source manifest is `85f31a6e5924d028ba12843eaa5d7e25993f194f2595e89458a71f05c970051c`; only controller AUTO availability and zero-balance entry notice differ from the earlier timed visual checkpoint. Reviewable candidates remain isolated until their unresolved rules are established.

No100% visual/audio/math or all57-game completion claim is made. Publication, exact counts and rollback are recorded in [RELEASE-r10.md](RELEASE-r10.md).
