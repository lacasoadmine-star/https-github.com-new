# Remaining slot presentation checkpoint

This directory contains authored mappings and a draw-only renderer for public
static game artwork. It does not contain provider game runtimes, sessions,
wallet access, outcome generation or wagering controls. Every manifest and every
scene has `productionLaunchEnabled: false` and `financialActions: false`.

## What is built

| Machine | Verified source artwork | Current presentation |
| --- | --- | --- |
| Vegas Nights | 13 symbol identities; separate ordinary, converted and SuperWild images; idle, blur, thumbnail and fallback frames; backgrounds, title, reel frame and control sprites; exact 25 payline paths | 218 normalized frames and an authored portrait review arrangement. Exact provider viewport/control layout, full animation, audio and interactive panels remain incomplete. |
| Book of Magic | 13 symbol identities and one alternate scatter still; four original texture sheets; 12 current GameUI SVGs; exact 20 payline paths | 49 normalized frames. The 810 × 1440 portrait background, logo and reel coordinates follow the public configuration. Control placement/composition, transitions, audio and responsive parity remain incomplete. |
| Moonstone | Seven images named by the current public help CSS | A help-art review, with no invented gameplay symbol mapping or gameplay controls. |
| Samurai | Fourteen images named by the current public help CSS, including ten help symbol IDs | A help-art review, with no claim that help images are the actual gameplay atlas. |
| Magic Garden | No usable public art was verified through the observed routes | An explicit unresolved entry. No other machine or generated artwork is substituted. |

`index.json` is separate from the shared presentation gallery index. The root
integration may merge this index later; this checkpoint does not alter existing
gallery entries or any launch policy.

## Source evidence and storage

`assets.lock.json` records 79 selected image assets totaling **11,097,250 bytes**.
The necessary original source transfers total **15,007,395 bytes**, including
the chunked Vegas texture packages. The fetcher enforces a 100,000,000-byte
aggregate transfer ceiling and a 16,000,000-byte ceiling per source.

Original textures remain in the external content-hash cache. They are not copied
into this repository. The repository contains the authored mapping inventory,
hashes and URLs, renderer, tests and small offline review images. Every cache hit
is verified against its full byte count and SHA-256 before use. The selected
Vegas inline textures are decoded from concatenated static JSON packages with
`JSON.parse`; provider JavaScript is never evaluated.

`source-inventory.json` holds factual atlas rectangles and the source-proven
coordinate/line mappings used by `build-manifests.mjs`. It is not executable
provider code. `provenanceDocuments` records the source hashes of the actual
Vegas game JSON, Book configuration/GameUI, and SmartSoft help CSS.

The Book texture JSON references KTX2 for three sheets. Its actual public
GameUI resolver explicitly chooses same-name PNG images when the metadata image
is KTX2/Basis. Those four PNGs returned HTTP 200 with exactly matching dimensions.
The mapping therefore uses a verified official fallback, not an invented PNG
location or an assumed KTX2 decoder.

## Reproduce the checkpoint

Run from `game-expansion/continuation`. Use an external cache directory.

```sh
node scripts/fetch-remaining-slot-assets.mjs --cache-dir /tmp/zplay-remaining-slot-assets --transport curl
node scripts/fetch-remaining-slot-assets.mjs --cache-dir /tmp/zplay-remaining-slot-assets --verify-only
node presentation/remaining-slots/build-manifests.mjs
node presentation/remaining-slots/export-scenes.mjs
node presentation/remaining-slots/render-review.mjs --cache-dir /tmp/zplay-remaining-slot-assets --width 390
node --test test/remaining-presentation.test.mjs
```

The fetch command requests only the locked public static asset URLs. It supplies
no authentication, cookie, token or wager request. The `--verify-only` command
performs no network request. `--games vegasnights_native,bookofmagic_native` may
be supplied to the fetcher to select a subset.

The offline renderer needs the existing `sharp` Node package and Python Pillow.
It reuses `../render-review.py` and leaves the original source cache unchanged.
SVG controls are rasterized into a temporary derived cache; derivative hashes
and methods are recorded in `evidence/render-method.json`. This process does not
start, emulate, or verify a browser. The PNGs are offline display-list exports.

## Draw-only API

```js
import {
  createRemainingScene,
  RemainingAssetStore,
  paintScene,
} from './presentation/remaining-slots/renderer.mjs';

const store = new RemainingAssetStore(manifest, {baseURL: verifiedAssetBaseURL});
const scene = createRemainingScene(manifest, confirmedDisplaySnapshot);
const images = await store.prepare(scene);
paintScene(context, scene, manifest, images, {width: 390, height: 844});
```

`confirmedDisplaySnapshot.grid` or `.round.grid` must contain the mapped symbol
IDs. An absent or invalid grid is rendered empty; this module never fabricates a
spin result. `createStaticReviewScene(manifest)` deliberately supplies a named
static artwork fixture and contains no money, round ID or winnings. The source
artwork is unchanged. A supplied `selectedLine` highlights only the verified
cells from the selected payline.

The SVG subclass reuses the shared complete-byte hash gate and rejects active
SVG elements and external image references before image decoding. The renderer
has no event handlers or action requests. It refuses manifests whose production
gate has been enabled; integration of an actual finished machine requires a
separate reviewed change.

## Verified and still open

Seventeen focused tests cover all source-frame bounds, Book atlas rotation,
distinct Vegas wild IDs, exact line counts/paths, symbol-versus-board drawing
order, absent/invalid state behavior, help-only/unresolved entries, closed
production gates, bounded static fetches, complete-byte cache validation and
SVG validation. All passed in this checkpoint. The five generated PNGs were
visually inspected. The existing remaining-game models and reference files
were not changed.

These checks do not establish complete A–Z official-demo fidelity. Full
responsive interaction, animation timing, audio, all optional modes, and exact
running-demo comparison remain open. Book's observed startup age-confirmation
wall was not answered or bypassed. Magic Garden still lacks a verified usable
game-art source. No live game or wallet request and no asset upload/deployment
was performed for this work.
