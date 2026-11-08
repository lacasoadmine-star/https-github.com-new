# Egyptian and Olympian Legends: original artwork construction

This directory contains an authored, draw-only presentation adapter using the
games' actual public mobile backgrounds, logos, boards, controls, progress art,
fonts, sound files and symbol atlases. It is an **unpublished construction
checkpoint**, with every production and financial-action flag closed.

The four 390 × 836 review images in `evidence/` are deterministic offline
display-list renders. They are **not browser screenshots**. The base and
bonus-art variants differ by the original background asset; the latter does not
claim to implement or validate a bonus round.

## Concrete coverage

The locked public capture contains **61 URL records and 17,966,789 bytes**, all
verified by size and SHA-256. The cache is outside the repository at
`/tmp/zplay-legends-assets`. The two source atlases expose 338 and 158 named
regions respectively. The authored static-pose pipeline currently renders:

| Game | Drawable setup symbols | Exact remaining symbol gaps |
| --- | --- | --- |
| Egyptian Legends | All eight normal symbols | Wild has no visible setup attachments; Scatter requires active clipping; Multiplier has an unavailable `scarab_multi1` attachment and unsupported `noScale` bone inheritance |
| Olympian Legends | All ten symbols, including Wild and Scatter | No missing setup symbol; animation and complete game presentation remain outstanding |

The symbols are derived images, explicitly identified as
`derived-static-spine-setup-pose`. Their receipts retain the skeleton URL/hash,
every used source atlas texture hash, the visible alpha bounds and output hash.
The original images are not edited or replaced. The review layout fits those
visible bounds into its authored cells. That sizing is not a claim of exact
provider runtime placement.

The first11 presentation files and the production client are unchanged by this
directory. The first11 shared atlas interpreter, byte-verifying asset store and
display-list painter are imported, rather than copied.

## Source provenance

The public asset root is
`https://cdn.galaxsys-games.com/gsl-cdn/prd/`. Every captured URL is token-free,
HTTPS, static, and included in `assets.lock.json` with exact size and SHA-256.
There are no login URLs, private provider sessions or executable provider
scripts in that asset lock.

The exact public declaration sources inspected were:

| Game | Runtime declaration source | SHA-256 |
| --- | --- | --- |
| Egyptian | `https://cdn.galaxsys-games.com/gsl-client/prd/gsl-egyptianlegends-client/v44/252.js` | `af3379a040558bb1f8651c4f79cde399aa8f0508c99da242658f88289094cd06` |
| Olympian | `https://cdn.galaxsys-games.com/gsl-client/prd/gsl-olympianlegends-client/v165/240.js` | `4b2b922650f80404d0bf6d85d3da414c6a7637b04d9d5fc9343a7c11733a5281` |

These declaration files were read as references, not executed or bundled. The
source-backed 6 × 5 board and cumulative progress thresholds
20 / 40 / 60 / 85 / 110 come from `../../references/galaxsys-runtime.json`.
That reference file separately records unresolved mechanics and numeric
paytables; this presentation adapter does not resolve or hide those gaps.

`static-pose.mjs` exports `SETUP_POSE_REFERENCES`, pinning the inspected primary
Spine 4.1 source URLs and hashes. Its scope is deliberately bounded:

- Default-skin setup draw order, region attachments, unweighted and weighted
  meshes, source UVs, normal affine bone chains, negative scale, shear, tint,
  opacity and supported blends.
- Exact Spine 4.1 setup-frame resolution for sequences. No animation timeline
  is evaluated.
- Exact `noRotationOrReflection` bone basis, including its small-axis fallback.
- One absolute-world translation-only transform constraint with the proved
  ordering and dependency restrictions. Negative mixes are evaluated, and even
  an actual zero setup delta is recorded in `appliedConstraints`.
- Active clipping and other unproved modes remain explicit blockers. An
  incomplete pose is never rasterized as if it were complete.

## Rebuild and verify

Run from the `continuation` directory:

```sh
node presentation/legends/assets.mjs --cache-dir /tmp/zplay-legends-assets
node presentation/legends/assets.mjs --verify-only --cache-dir /tmp/zplay-legends-assets
node presentation/legends/build-poses.mjs --cache-dir /tmp/zplay-legends-assets
python presentation/legends/render-poses.py --cache-dir /tmp/zplay-legends-assets
node presentation/legends/build-manifests.mjs
node presentation/legends/export-review.mjs
python presentation/legends/render-reviews.py --cache-dir /tmp/zplay-legends-assets
node --test test/legends-pose.test.mjs test/legends-presentation.test.mjs
```

The first command restores only missing files declared by the lock and verifies
every cached/downloaded byte. `--verify-only` performs no network calls.
`--capture` is an explicit new source capture; it is not necessary to reproduce
this checkpoint. Capture is bounded to 55 MB total and 8 MB per asset. The one
targeted retry recorded in the lock recovered three ordinary proxy connection
timeouts; the final verification has zero failures.

The Python steps use the already installed Pillow, NumPy and fontTools. The
source Rubik WOFF is verified and decompressed in memory for offline text
rendering. No new package or browser installation is required.

Current focused verification: **51 tests passed, zero failed, zero skipped**:
37 static-pose tests plus 14 presentation tests. They cover actual cached
skeleton cases, transforms, exact sequence paths, unsupported geometry,
source checksums, mobile bounds, result provenance and disabled controls.
Viewport checks at 360, 390, 430 and desktop are geometry assertions, not actual
browser layout tests.

## Renderer integration contract

The exported interface is separate from the first11 renderer:

```js
import {
  createLegendsScene,
  LegendsAssetStore,
  paintScene,
} from './presentation/legends/renderer.mjs';

// Load the chosen manifest from presentation/legends/index.json.
// This route is an integration example only; it has not been published.
const store = new LegendsAssetStore(manifest, {
  baseURL: new URL('/native-library/reference-art/legends/', location.origin),
});

const scene = createLegendsScene(manifest, {
  confirmed: true,
  authenticated: hostState.authenticated === true,
  currency: hostState.currency,
  balance: hostState.balance,
  round: hostState.round,
  frameIndex: visibleFrameIndex, // omit to show the final confirmed round
});
const images = await store.prepare(scene);
paintScene(canvas.getContext('2d'), scene, manifest, images, {
  width: canvas.width,
  height: canvas.height,
});
```

Use only an accepted response from the existing session controller for
`hostState`. `confirmed` describes display provenance; it grants no authority.
The host must still discard stale asynchronous paints after a session, game or
round change, and call `store.dispose()` when leaving the renderer.

`round.gameId` or `round.game_id` must match the manifest. Signed-out,
unconfirmed and foreign-game states never display balances or outcomes.
`frameIndex` selects only that frame's grid, wins, progress and god; it cannot
fall back to later progress or final-frame highlights. Invalid indices and
malformed confirmed grids display no sample outcome. The overall confirmed
round payout is labeled separately from the visible frame.

`createLegendsScene(manifest, {}, {review: true})` creates a deterministic artwork
review without a balance or result. `{bonus: true}` selects only the captured
bonus background. These options are for review. Every returned scene keeps
`financialActions: false`, `productionLaunchEnabled: false`, and Spin,
Autoplay and Buy Bonus disabled, regardless of supplied `canStart` values.

`LegendsAssetStore` verifies file bytes before decoding. It adds the captured
Rubik font to the frozen shared asset-store API. Its inherited sound loader can
read the locked sound bytes, but source sprite cue timing, autoplay permission
and game-event sound synchronization are not integrated.

## Outstanding construction

1. Resolve the three Egyptian special-symbol cases without inventing an
   animation pose or substituting unrelated artwork.
2. Implement actual timelines, mesh deformation, clipping, character/god
   effects, cascades and feature/bonus transitions.
3. Reconstruct and compare exact provider placement, all menus, paytables,
   control flows, audio cue timing and mobile/desktop behavior.
4. Resolve the separately documented numeric paytable and game-model gaps.
5. Integrate with the existing confirmed session/round controller, publish only
   through the approved same-origin asset route, and perform actual browser
   checks before any launch decision.

This checkpoint makes original-art construction reviewable. It does not mark
either game A–Z complete, and it changes no production gate or live route.
