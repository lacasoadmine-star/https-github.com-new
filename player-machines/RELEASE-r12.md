> Historical r12 record. See [r13](RELEASE-r13.md) for the current correction. Raw CDP response capture subsequently proved Cloudflare resource-limit failures (1102); binary-module packaging resolved the reproduced HTTP/2 failure in Worker308. The earlier statements below about an unknown cause and active Worker307 describe that earlier release only.

# MH5 / Foxy original artwork, animation and audio update

Status: Worker307 is active with 100% traffic, published from corrected source `eb745e00996b24f385780957fddc7614b5276722`. Asset/module/settings readback, corrected-source startup checks and final live verification passed. Live browser results were obtained on separate HTTP/2 and HTTP/1.1 runs of the unchanged deployment; the intermittent HTTP/2 failures and unresolved cause are recorded below. Earlier visual and browser results remain attributed to their original source.

Scope: Multi Hot 5 (`multi_hot_5_video`) and Foxy Hot 20 (`hot_foxy_20`) inside the existing Player. This update replaces approximate presentation assets with assets retrieved from the official SmartSoft public demos. Existing validated receipts, wallet transport, settlement, paytables, reel recipes and mathematical definitions remain authoritative. Registry edits concern presentation; the mathematical records are unchanged.

## Changes

- Original symbol sprites, multiplier artwork, reel surfaces, control faces, footer artwork and backgrounds replace the selected games' approximations. Native source rectangles, packed rotation and transparent padding determine placement. Intro Regular and Intro Black Caps fonts are included from the same public source.
- Foxy uses the native multiplier wheel, selected shield and foreground artwork. Quick Play ENABLE selects the original gold arrow face and yellow lightning; disabling restores the normal face. NO, close and Escape cancel without a spin or speed change.
- A native animation path uses the authored Spine 3.8 skeletons and atlases, with Pixi 6.5.5 and pixi-spine 3.0.4. It adds Foxy's logo and birds, forest decoration, eight original symbol animations and win popups. Multi Hot 5 uses its original logo, multiplier, line and winning-cell sprite sequences, plus native win popup timelines. Static source artwork remains available as a fallback. Independent review passed the eight Foxy symbols at three sampled poses, both games' win badges and integrated idle/win placement.
- Original MP3 bytes replace the short repeating background excerpts. Chromium decodes approximately 87.17 seconds for MH5 and 96 seconds for Foxy. Background files load separately for the selected game after sound consent; no trimming, filtering or excerpt crossfade is applied.
- MH5 has seven native foreground clips; Foxy has fifteen. Source mappings supply MH5's spin, stop and three win tiers, and Foxy's one-shot movement, individual reel stops, fast stop and win phrases. Foxy's multiplier phrase plays on wins. MH5 has no added moving-reel or wheel cue where its official configuration defines none.
- Native animation loading waits until account/model/history startup checks complete. The provider-specific Pixi pointer hook referencing `$` and `gameInfo` was removed, and interaction plugins are disabled. Host touch controls remain authoritative; trusted-input smoke checks passed.
- Audio preserves mute, visibility, context recovery and disposal. Delayed Foxy decoding uses elapsed presentation time, so a short procedural fallback cannot prematurely finish or restart the native one-shot. Other games retain their existing audio banks and background assets.
- The game HTML now requests the r12 controller and stylesheet. A build guard rejects stale release paths, the local QA server serves only the current release prefix, and four generated-HTML route tests cover this regression. The correction changes only these two public HTML URLs; game behavior and media bytes are unchanged.

Artwork crops preserve every alpha byte and every RGB value at nonzero alpha. Lossless WebP is used only when that decoded-pixel comparison succeeds; otherwise the original PNG is retained. RGB values under fully transparent pixels may differ and are recorded. Skeleton JSON, atlas data and animation curves are retained without authoring changes. This establishes asset provenance and visible source-pixel preservation, not identical final screen pixels.

## Verification

| Check | Current evidence |
|---|---|
| Latest Node suite | 490/490 passed on corrected source `eb745e0`, including four generated-HTML route tests; restoring the old URLs correctly fails those four tests |
| Focused audio tests | 44/44 passed, including delayed decoding and context replacement |
| Platform checks | 9/9 backend tests and three frontend builds passed before final integration |
| Official public demo observation | Two completed virtual primary rounds per selected game; natural outcomes, sound consent, Foxy Quick Play and menu/rules observed |
| Original audio browser check | Both full beds match a fresh decode of the original MP3; selected-game lazy loading, consent, mute/resume, hidden/resume and disposal passed |
| Focused Foxy Quick Play check | 25/25 checks passed, including cancellation without wallet requests |
| Native visual review | Passed all eight Foxy symbols at 0, 0.25 and 1 second; both native win badges; integrated idle/win alignment, with no failed requests or browser errors in the isolated review |
| Native startup and trusted input | Account/model/history complete before native bootstrap; pointer hook removed and interaction plugins disabled; trusted-input smoke passed |
| Pre-correction 390px MH5 browser scenarios | 519/519 checks passed; 30 primary rounds, 39 total rounds; observed play duration 79.778s |
| Pre-correction 390px Foxy browser scenarios | 451/451 checks passed; 30 primary rounds, 41 total rounds; observed play duration 242.896s |
| Pre-correction 390px aggregate | 970/970 checks, 60 primary rounds and 80 total synthetic rounds; balanced ledgers and zero JavaScript errors |
| Pre-correction 360px and 430px selected-game scenarios | 576/576 checks; 12 primary rounds and 42 total synthetic rounds; native artwork and animations ready at both widths |
| Preserved MH100 and Stars scenarios | 215/215 checks; two primary rounds and 17 total synthetic rounds; existing presentation retained |
| Pre-correction browser aggregate | 1,761/1,761 checks on `64420f9`: 970 at 390px plus 791 mobile/preservation checks; 74 primary rounds and 139 total synthetic rounds overall, including 72 primary/122 total for MH5 and Foxy; balanced ledgers, zero JavaScript errors and unchanged source manifests during those runs |
| Corrected-source strict startup: MH5 | 131/131 checks passed; one primary round and eight total synthetic rounds |
| Corrected-source strict startup: Foxy | 115/115 checks passed; one primary round and nine total synthetic rounds |
| Corrected-source strict startup aggregate | 246/246 checks passed; two primary rounds and 17 total synthetic rounds; zero JavaScript errors |
| Frozen asset module | 42 assets; 30,598,213 bytes raw, 20,760,959 bytes gzip; SHA-256 `6dc7982c25e4c1fc0874c351cac1a563e776f7b48c024c708b0fe61684993677` |
| Complete Worker artifact | 59,632,746 bytes, below the 64 MiB (67,108,864-byte) limit |
| Corrected Worker307 publication and readback | ACTIVE at 100% traffic; exact asset hash verified, 115 modules with the other 114 unchanged, and all 12 bindings/settings preserved |
| Final live HTTP checks | 40/40 passed |
| Final live guest games | All four passed on separate unchanged Worker307 runs: Foxy and MH100 with HTTP/2; MH5 and Stars with HTTP/1.1. Native presentation and audio verified; MH5/Stars startup took 13,913ms/10,851ms |
| Final live portal | HTTP/1.1 run passed: six home cards, 57 catalogue entries, four detail pages, search and navigation; zero JavaScript, network or static HTTP errors |
| Independent request diagnostics | Previously affected assets returned HTTP 200 on sequential and six-concurrent GET checks; sampled Worker307 analytics showed 488 fetches, zero fetch errors, zero HTTP 503s and zero exceeded-resource events; 12 exceptions belonged to inherited cron executions |

The 1,761 browser checks were run on `64420f991d79dc16aef5894aaa0394e58a83f617`; they were not rerun in full after the HTML correction. Their game behavior and media bytes are unchanged in `eb745e0`, but the previous QA server accepted old release prefixes and therefore missed the stale URLs. The separate 246 corrected-source startup checks passed using the strict prefix server. Final live verification passed on published Worker307 using the protocol-specific runs above. Wagering scenarios used synthetic local sessions or the official public DEMO; live production checks used guest presentation and navigation, and the mobile/preservation suite made no production requests.

Evidence is under `evidence/r12/`: `official-demo-audit.json`, `art-mh5.json`, `art-foxy.json`, `official-audio-assets.json`, `official-audio-browser.json`, `quick-play.json`, `native-final-independent-review.json`, `final-browser-390.json`, `mobile-preservation-summary.json`, `entrypoint-browser-390.json`, and the native animation asset/runtime manifests. `foxy-foreground.json` and `native-win-art.json` document the static fallback assets; their static-only limitations do not describe the separate native timeline implementation.

Live evidence is in `live-guests.json`, `live-http.json`, `live-portal.json`, `live-independent-cloudflare.json` and `live-http2-diagnostic.json` under the same directory.

## Limits

No 100% pixel, animation, interactive audio mix, feature or mathematical equivalence is established. Original assets and full music remove specific r11 gaps. The independent visual review and browser scenarios cover the documented poses, synthetic wins and 360px, 390px and 430px viewports; they do not certify every timeline interruption, sequence or physical-device timing. Playback also passes through the existing user volume and limiter.

Initial HTTP/2 browser runs intermittently received static-resource 503 responses, including on the unchanged portal. The later successful guest and portal checks used the protocol-specific runs recorded above; no product changes were made between them. Independent asset requests and sampled Cloudflare fetch analytics did not reproduce those failures. Their exact cause remains unproved; these results do not establish a proxy cause or guarantee that HTTP/2 failures cannot recur.

The official Foxy presentation supplies eight symbols. The existing local model includes a ninth `scatter` symbol and a free-spin feature; it remains represented rather than silently replaced with an unrelated original symbol. This is a substantive feature/model difference, not an artwork defect. Independent outcomes, probabilities and RTP are not made equivalent by copying presentation assets. No unverified provider odds or payouts are substituted.

Runtime license and copyright notices are retained in `public/native-animation-LICENSES.txt` and must remain with the distributed runtime. Public source URLs and asset hashes are recorded in the provenance manifests.

## Publication

ACTIVE: Worker307 (version `edbc37aa-8f9e-4172-ba54-1d3c05ca61c7`) receives 100% traffic in deployment `cca03390-c38a-43af-b2d7-418ddbf59fac`, created at `2026-11-06T20:44:10.063591Z`. Corrected asset, module, binding and settings readback passed. Final live HTTP, guest-game and portal checks passed with the protocol caveat above.

The earlier Worker306 attempt (version `72e50e05-eb81-4eff-8af5-cf2edac5bd86`) received 100% traffic in deployment `e3b5c5f7-dc8a-4507-aa9d-071986b3a526` at `2026-11-06T20:31:38.349596Z`. Live HTTP checks found that its game HTML still referenced r11 controller/CSS paths. It was rolled back to Worker305 in deployment `f85e01a0-ca32-4f16-9627-29ebafffdee2` before the corrected publication.

Worker307 was prepared from Worker306 using the two HTML path replacements and an asset hash check, without KV reupload. The temporary KV namespace and relay have been deleted. Access policies are unchanged.

| Publication record | Value |
|---|---|
| Final source commit | `eb745e00996b24f385780957fddc7614b5276722` |
| Asset module SHA-256 | `6dc7982c25e4c1fc0874c351cac1a563e776f7b48c024c708b0fe61684993677` |
| Corrected Worker version and version ID | Worker307 / `edbc37aa-8f9e-4172-ba54-1d3c05ca61c7` |
| Deployment ID, timestamp and traffic | `cca03390-c38a-43af-b2d7-418ddbf59fac`; `2026-11-06T20:44:10.063591Z`; 100% |
| Asset module | 42 assets; raw 30,598,213 bytes; gzip 20,760,959 bytes |
| Complete Worker artifact | 59,632,746 bytes; below 64 MiB (67,108,864 bytes) |
| Temporary staging cleanup | KV namespace and relay deleted; no reupload needed for corrected publication |
| Corrected asset hosting readback | PASSED: exact 30,598,213-byte module and SHA-256 verified |
| Unrelated modules, bindings and settings preservation | PASSED: 115 modules, other 114 unchanged; 12 bindings and settings preserved; Access policies unchanged |
| Final live verification | PASSED: 40 HTTP checks, all four guest games and portal checks; separate HTTP/2 and HTTP/1.1 runs, with intermittent initial HTTP/2 failures documented above |

The rollback target remains r11 / Worker305, version `ca3fd065-f614-4275-9bad-07936e3be7cd`. The earlier restoration deployment `f85e01a0-ca32-4f16-9627-29ebafffdee2` is historical; the active deployment is Worker307 as recorded above.
