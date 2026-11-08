# Tower X, Tower Rush and Coin Miner94 artwork review

This directory adds three separate authored presentations using the current public
reference artwork. It is an isolated review surface. It does not change the
production catalogue, registry, wallet, backend, existing player, or release
readiness checks. Every generated manifest and scene has
`productionLaunchEnabled:false` and `financialActions:false`.

## What is implemented

| Game | Reference artwork and controls | Receipt-driven display |
|---|---|---|
| Tower X | Current SmartSoft b45 logo, background, five building types, bet/autoplay/menu/sound art, 14 sounds, house and umbrella Spine metadata/pages | Confirmed building list, source type mapping, an explicit animation-prefix selector, exact total paid stake and settled payout text |
| Tower Rush | Current Galaxsys v112 mobile background layers, five normal tower sprites, crane hook, Frozen/Temple/Triple floors, Temple wheel, Build/Cashout buttons, public audio sprite and Rubik fonts | Confirmed floors only; protected bank; frozen base and final ice layers; confirmed Temple section; Triple Build floors; no invented future floor |
| Coin Miner | Gaming Corps default assets used by the current `coin_miner_94` demo; exact 360×640 portrait coordinates, 5×5 board, coins, mine/explosion, rescue badge, menu/bet/random controls and sounds | Only confirmed public picks reveal; each closed tile composites both source halves; rescued picks use the full-tile source overlay; exact current cashout text |

The source lock contains **117 unique static assets, 8,992,097 bytes**, verified by
SHA-256 and byte length. The100 MB limit applies to this arcade inventory. Cache
files live outside the source tree and are reproducible from the locked public
URLs. No provider executable JavaScript is included or executed. Public runtime
hashes and URLs identify the reference evidence used to interpret those assets.

`staticArtReady` in `index.json` means only that the named art needed by these
static scenes was recovered. It does **not** mean the game is complete or
releasable. Full demo parity and all financial release gates remain closed.

## Build and review

Run from the `continuation` directory:

```sh
node scripts/fetch-arcade-reference-assets.mjs --cache-dir /tmp/zplay-arcade-assets
node presentation/arcade/build-manifests.mjs --cache-dir /tmp/zplay-arcade-assets
node presentation/arcade/export-review-scenes.mjs
node --test test/arcade-presentation.test.mjs
node presentation/arcade/serve-preview.mjs --cache-dir /tmp/zplay-arcade-assets
```

Open `http://127.0.0.1:8768/arcade/`. The server only serves local files through
GET/HEAD. It has no wallet or game-action route. The page allows choosing a game
and synthetic receipt fixture; all game action buttons are disabled. No autoplay
intent or provider session exists on this page.

To verify a previously downloaded cache without external requests:

```sh
node scripts/fetch-arcade-reference-assets.mjs --cache-dir /tmp/zplay-arcade-assets --verify-only
```

Offline artwork exports, using the shared renderer:

```sh
python3 presentation/arcade/render-review.py --cache-dir /tmp/zplay-arcade-assets --width 390
```

The resulting PNGs are deterministic display-list renders, **not browser screenshots**. The local
inspection font is DejaVu Sans when the shared fallback lacks a glyph; this is
not represented as the exact provider font. Original cached assets are read
without alteration.

`verify-browser.mjs` is ready to run against the local server in an environment
with Playwright Chromium installed. In the current workspace that check stopped
because Playwright's browser executable is absent and no system browser was
found. `evidence/browser-verification.json` records this blocker. No browser
comparison is claimed.

## Renderer contract

```js
import {
  createArcadeScene, paintArcadeScene, ReferenceAssetStore,
} from './arcade-renderer.mjs';

const store = new ReferenceAssetStore(manifest, {
  baseURL: new URL('/assets/', location.href).href,
});
const scene = createArcadeScene(manifest, {
  confirmed: true,
  balanceMinor: '100000',
  round: confirmedPublicRound,
});
const images = await store.prepare(scene);
paintArcadeScene(canvas.getContext('2d'), scene, manifest, images);
```

The financial host is responsible for authenticating receipts. The renderer
requires an explicit `confirmed:true` plus matching `game_id`/`model_version`,
`round_id`, status and canonical integer money strings. The public camel-case
`gameId`/`modelVersion` fields are also accepted. Active receipts cannot carry a
settled payout. Mismatched versions and malformed public state are rejected.

It has no RNG, request submission, persistence, automatic timer, wallet or game
API. The shared asset store only retrieves explicitly locked same-origin asset
files, verifies their hashes, and decodes images. It does not authenticate or
submit game actions. Sound data is inventoried; the review page does not autoplay
audio or pretend timing synchronization is complete.

### Per-game public fields

| Game | Required visible fields |
|---|---|
| Tower X | `floors:[{level,type,multiplier}]`, `totalBuildingMultiplier`, `stakeMinor`, settled `payoutMinor` |
| Tower Rush | `floors:[{level,type,multiplier,wheelSection?}]`, `currentCashoutMinor`, `lockedPayoutMinor`, `frozen`, optional settled `reason` |
| Coin Miner94 | `mines`, `picks:[{index,safe,treasureBoost?}]`, `currentCashoutMinor`, `treasureBoost.active` |

`options.frameIndex` selects a prefix of an already confirmed Tower X result.
The final payout is withheld from the scene until that prefix reaches the end.
`options.showTemple:true` displays the actual confirmed Tower Rush wheel section
as text; it does not manufacture a wheel stopping angle. `coinCellAt(x,y,manifest)`
maps the reference board geometry to a row-major index and rejects gutters. It
does not choose or submit a tile.

`review-fixtures.mjs` contains 10 synthetic public receipt shapes. They are
explicitly marked as review examples, not recorded production rounds, provider
RNG samples, balance confirmations or transfers. Future/hidden board fields are
ignored, and unconfirmed state never reveals floors or tiles.

## Reference corrections established during construction

1. Coin Miner `asset_closed_display:"mix"` means draw **both** transparent tile
   halves in the same 60×60 box. Alternating the halves is incorrect. The runtime
   `pickAsset` implementation and current config establish this composition.
2. Coin rescue art is a 200×200 transparent full-tile overlay, not a small badge
   image to shrink into a separate box.
3. Tower Rush `frozen_mob_idle` uses the main building and final ice frame 38
   together. Its mobile bone scale is 0.774 horizontally and 0.848 vertically.
4. Tower X's public Pixi Spine loader uses `.atlas.txt`. A historical request to
   bare `.atlas` returned404. The correct suffix and exact public paths were
   recovered from the loader; both house and umbrella atlas/texture/skeleton data
   are now in the lock. This does not implement full skeletal playback.
5. Tower Rush uses the fast-game CDN root `/fg-cdn/prd/root`, rather than the
   separate slot CDN root. The exact public chunk mapping is recorded in
   `sources.json`.

## Work still required before release

- Exact individual responsive layouts, camera movement, transitions and audio
  synchronization still require comparison against each official demo.
- Tower X umbrella/house skeletal playback and its distinct autoplay integration
  remain unfinished. The observed count choices are 50/100/500/1000, with 50
  initially selected in the public markup. This is not silently replaced by the
  separate slots autoplay profile.
- Tower Rush native receipts do not carry the provider's normal-floor visual
  variant. The review uses one identified normal sprite until a confirmed display
  variant is supplied. Crane physics, collapse animation and exact wheel angles
  remain unfinished.
- Coin Miner random-tile, instant-win, exact font and complete optional controls
  are mapped but unavailable. The default reference has color panels rather than
  the artwork used by other operator skins; no alternate skin is substituted.
- Operator monetary profiles and the model/reference divergences already listed
  by the main project remain unresolved. This presentation work does not clear
  them, change payouts, verify provider private math or enable a wager.

The focused suite covers source allowlisting, byte/hash integrity, the100 MB
inventory bound, receipt identity/model pinning, exact integer money formatting,
confirmed-only reveals, duplicate tile rejection, correct tile composition,
source atlas bounds/rotations and distinct building/bonus presentations.
