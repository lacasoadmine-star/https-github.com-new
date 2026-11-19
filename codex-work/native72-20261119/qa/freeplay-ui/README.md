# Free-play presentation corrections — 19 November 2026

This checkpoint contains **isolated, money-free graphics corrections for Habesha Fortune 5, Multi Hot 5 Deluxe, Multi Hot 10 and Safari Simba**. It does not change a deployed game, connect a player account, select paid outcomes, or operate a wallet. No game is marked DONE and no claim of full official-demo parity is made.

## Confirmed defects and corrections

| Presentation defect | Evidence from recovered code | Correction in the isolated copies |
| --- | --- | --- |
| Multi Hot 10 symbols change at cell crossings | All 15 visible symbols changed identity across a phase boundary while moving only about 0.00025 pixels. | A persistent strip ties each symbol to a physical position. The supplied target enters from outside the visible mask. |
| Multi Hot 10 STOP jumps | At one unchanged timestamp, STOP moved the five reels by approximately 6.88–7.10 cells. | STOP starts a new segment from the current phase and velocity, retaining the same target and endpoint. |
| Safari symbols change in the middle of a cell | All nine visible symbols changed at the 80 ms boundary while moving only about 0.0000018 pixels. | Symbol identity and position now use the same continuous phase. |
| Habesha/Deluxe symbols change scale during motion | Moving images used the full source bitmap while stationary images were cropped to alpha bounds and enlarged. | Blur, sharp and stationary drawings share the original source coordinate system and anchor. |
| Trimmed MH10/Safari atlas layers change scale | Blur and sharp frames have different trim sizes and offsets. | One sharp-derived source scale/origin positions both layers, including rotated atlas entries. |
| Duplicate Deluxe portrait draws | All nine retained portrait blur/sharp pairs reference identical artwork. | The same image is drawn once at full inherited opacity. |

The supplied final display grid is preserved. These helpers do not choose outcomes or implement probabilities. Timing values in this isolated correction are implementation parameters, not measured official timing specifications.

## Verification

Run from this directory with the verified Node 24 runtime:

```bash
node --experimental-vm-modules --test *.test.mjs
```

The suite is self-contained: **20 graphics checks**, comprising 7 symbol-geometry checks and 13 reel-continuity checks. It verifies hashes of the included source snapshots, creates temporary stages, and exercises the actual copied renderer methods with recording canvas adapters. No external repository checkout or binary artwork is required. These checks establish drawing coordinates and state continuity; they are not browser screenshots or audible playback tests.

The separately retained `evidence/audio-controls.tap` records **30 existing mocked audio/focus checks** run on the recovered local source. It covers mute preferences, hidden/blurred view suspension, delayed audio completion and resumption. It does not certify that the soundtrack has been listened to or matches the provider.

## Official free-demo observations

Browser interaction used only the provider's DMO demonstration sessions:

| Reference | Directly observed this turn |
| --- | --- |
| Habesha Fortune 5 | Two completed SPIN actions; AUTO opened a configuration dialog with a separate START PLAY action. |
| Multi Hot 5 Deluxe | One completed SPIN action; the BET selector opened beside the cabinet. |
| Multi Hot 10 | One completed SPIN action; a frame showed the first reel settled while later reels remained blurred; a settled win display followed. |
| Safari Simba | One completed SPIN action and return to the ready controls with a changed symbol grid. |

Screenshots in `evidence/` are **official reference screens**, not screenshots of the corrected local build. No real-money session was used. Exact animation duration, complete sound/music parity, mobile/touch acceptance and all control combinations remain unverified.

The attempted cloud-browser navigation to the isolated localhost QA server returned `ERR_CONNECTION_REFUSED`. Direct browser verification of the corrected local build was therefore not completed. There was no live deployment.

## Files and reproduction

- `baselines/` retains the minimum original Habesha/Deluxe renderer and layout inputs plus hashes.
- `reel-baselines/` retains original MH10 graphics modules and Safari's extracted graphics-only classes. Safari's account application and API transport are excluded.
- `symbol-geometry.mjs` and `trimmed-sprite-layers.mjs` align artwork in one source coordinate system.
- `continuous-reels.mjs` implements the graphics-only symbol strip and motion segments.
- `mh10-reels.mjs` supplies the five-reel presentation adapter.
- `apply-symbol-geometry.mjs` applies geometry corrections only to a copied `freeplay-stage*` directory.
- `apply-reel-continuity.mjs` materializes isolated MH10/Safari graphics modules from the hash-locked inputs.
- `evidence-matrix-72.json` and `.md` preserve all 72 target identities, with the initial 15 exposed routes first in the QA queue and 57 pending entries after them.

To materialize the MH10/Safari graphics modules in a separate directory:

```bash
node apply-reel-continuity.mjs /absolute/path/to/freeplay-stage
```

The materialized graphics modules still require their documented artwork and animation runtime for browser use. They are not complete standalone games. The tests intentionally stub those drawing dependencies instead of silently fetching production resources.

## Source provenance and remaining scope

The separately verified remote anchor is repository `lacasoadmine-star/https-github.com-new`, branch `work/native72-session-presentation-20261119`, commit `f116c93b7bd91fc53301882c2ba6daca106b3d6b`. The recovered local source has newer HEAD `e47bf71c2496fbdaf26e3ac5b17319f6c9949646` and additional uncommitted Deluxe work. This checkpoint preserves the relevant renderer snapshots with their own hashes; it does not equate the newer local tree with that remote commit.

The catalog snapshot exposes 15 target routes and leaves 57 entries pending. Exposure is not a completed-game result. All 72 per-game acceptance states remain UNVERIFIED and DONE remains zero. The remaining games were inventoried, not built in this turn. Protected originals Multi Hot 5 and Foxy Hot 20 were not modified.

Remaining acceptance includes direct corrected-build browser playback, overlay ownership, touch sizes on real portrait/wide layouts, sound listening and synchronization, full reference flow comparison, and all still-unreviewed titles. The real-money integration and live wagering portions of the broader request are outside this checkpoint.
