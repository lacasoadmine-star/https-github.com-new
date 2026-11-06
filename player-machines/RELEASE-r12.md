# MH5 / Foxy original artwork, animation and audio update

Status: implementation and focused verification in progress. Final combined-source browser verification and publication are pending.

Scope: Multi Hot 5 (`multi_hot_5_video`) and Foxy Hot 20 (`hot_foxy_20`) inside the existing Player. This update replaces approximate presentation assets with assets retrieved from the official SmartSoft public demos. Existing validated receipts, wallet transport, settlement, paytables, reel recipes and mathematical definitions remain authoritative. Registry edits concern presentation; the mathematical records are unchanged.

## Changes

- Original symbol sprites, multiplier artwork, reel surfaces, control faces, footer artwork and backgrounds replace the selected games' approximations. Native source rectangles, packed rotation and transparent padding determine placement. Intro Regular and Intro Black Caps fonts are included from the same public source.
- Foxy uses the native multiplier wheel, selected shield and foreground artwork. Quick Play ENABLE selects the original gold arrow face and yellow lightning; disabling restores the normal face. NO, close and Escape cancel without a spin or speed change.
- A native animation path uses the authored Spine 3.8 skeletons and atlases, with Pixi 6.5.5 and pixi-spine 3.0.4. It adds Foxy's logo and birds, forest decoration, eight original symbol animations and win popups. Multi Hot 5 uses its original logo, multiplier, line and winning-cell sprite sequences, plus native win popup timelines. Static source artwork remains available as a fallback. Detailed pose, placement and timing validation is underway.
- Original MP3 bytes replace the short repeating background excerpts. Chromium decodes approximately 87.17 seconds for MH5 and 96 seconds for Foxy. Background files load separately for the selected game after sound consent; no trimming, filtering or excerpt crossfade is applied.
- MH5 has seven native foreground clips; Foxy has fifteen. Source mappings supply MH5's spin, stop and three win tiers, and Foxy's one-shot movement, individual reel stops, fast stop and win phrases. Foxy's multiplier phrase plays on wins. MH5 has no added moving-reel or wheel cue where its official configuration defines none.
- Native animation loading waits until account/model/history startup checks complete. Decorative rendering has no pointer listeners; the provider-specific pointer rotation hook was removed so host touch controls remain authoritative.
- Audio preserves mute, visibility, context recovery and disposal. Delayed Foxy decoding uses elapsed presentation time, so a short procedural fallback cannot prematurely finish or restart the native one-shot. Other games retain their existing audio banks and background assets.

Artwork crops preserve every alpha byte and every RGB value at nonzero alpha. Lossless WebP is used only when that decoded-pixel comparison succeeds; otherwise the original PNG is retained. RGB values under fully transparent pixels may differ and are recorded. Skeleton JSON, atlas data and animation curves are retained without authoring changes. This establishes asset provenance and visible source-pixel preservation, not identical final screen pixels.

## Verification

| Check | Current evidence |
|---|---|
| Latest Node suite | 486/486 passed |
| Focused audio tests | 44/44 passed, including delayed decoding and context replacement |
| Platform checks | 9/9 backend tests and three frontend builds passed before final integration |
| Official public demo observation | Two completed virtual primary rounds per selected game; natural outcomes, sound consent, Foxy Quick Play and menu/rules observed |
| Original audio browser check | Both full beds match a fresh decode of the original MP3; selected-game lazy loading, consent, mute/resume, hidden/resume and disposal passed |
| Focused Foxy Quick Play check | 25/25 checks passed, including cancellation without wallet requests |
| Final native animation pose and timing checks | PENDING |
| Final combined-source browser scenarios and timed play | PENDING |
| Final artifact size, deployment preservation and live readback | PENDING |

The focused results do not certify the final combined source while native animation integration is still changing. Final source hashes, complete browser totals and publication evidence must be recorded before describing r12 as released. QA uses synthetic local sessions or the official public DEMO; no production wager is needed.

Evidence is under `evidence/r12/`: `official-demo-audit.json`, `art-mh5.json`, `art-foxy.json`, `official-audio-assets.json`, `official-audio-browser.json`, `quick-play.json`, and the native animation asset/runtime manifests. `foxy-foreground.json` and `native-win-art.json` document the static fallback assets; their static-only limitations do not describe the separate native timeline implementation.

## Limits

No 100% pixel, animation, interactive audio mix, feature or mathematical equivalence is established. Original assets and full music remove specific r11 gaps, but native animation poses, clipping, sequencing and device timing still need final comparison. Playback also passes through the existing user volume and limiter.

The official Foxy presentation supplies eight symbols. The existing local model includes a ninth `scatter` symbol and a free-spin feature; it remains represented rather than silently replaced with an unrelated original symbol. This is a substantive feature/model difference, not an artwork defect. Independent outcomes, probabilities and RTP are not made equivalent by copying presentation assets. No unverified provider odds or payouts are substituted.

Runtime license and copyright notices are retained in `public/native-animation-LICENSES.txt` and must remain with the distributed runtime. Public source URLs and asset hashes are recorded in the provenance manifests.

## Publication

PENDING: r12 has no verified publication recorded in this document.

| Publication record | Value |
|---|---|
| Final source commit and manifest | PENDING |
| Worker version and version ID | PENDING |
| Deployment ID, timestamp and traffic | PENDING |
| Artifact size and hosting readback | PENDING |
| Unrelated modules, bindings and settings preservation | PENDING |
| Final live checks | PENDING |

The previously recorded live baseline is r11 / Worker305, version `ca3fd065-f614-4275-9bad-07936e3be7cd`, deployment `404323d7-aff5-4ce6-98f3-e1643a59c295`. Confirm the current live version before publication and record the actual rollback target; do not assume the baseline has remained current.
