# Reference artwork presentation checkpoint

This directory contains an authored, receipt-driven Canvas renderer and a
reproducible cache of **public static artwork references**. It does not include
provider game logic, provider sessions, a wallet, a wager route, or a deployment.
Every manifest has `productionLaunchEnabled: false` and the preview cannot place
a bet. The new renderer is not integrated into the existing production client.

## What is constructed

The first seven manifests map the original artwork for Multi Hot 40, Multi Hot
100, Multi Hot 5 Super Wilds, Multi Hot 5 Wild, Multi Hot Wild Ways, Safari Simba
and Habesha Fortune 5. The supplemental capture adds Multi Hot 5 Deluxe and the
three Burning Ice variants from their observed, shared BlazingHot asset base.
`renderer-manifest.json` is the authoritative list of currently built manifests;
`evidence/asset-verification.json` records exactly which cached bytes were checked.

Each manifest includes per-game symbol identities, exact image crops, original
reel art, control-state crops, background references, available title art, audio
keys, font references and declared Spine groups. The renderer reconstructs
TexturePacker and Spine packed rotations in their respective directions. A
transparent 1-pixel placeholder is excluded rather than mistaken for artwork.
Trimmed image offsets and original frame bounds are retained.

Multi Hot 40 and 100 use their original separate titles and original multiplier
wheel layers. The wheel orientation is the mapping visible in the public game
configuration: multipliers 1–5 map to `[3,5,2,4,1] × π / 7`. The supplied result
chooses the displayed multiplier; the renderer does not choose an outcome.
Deluxe has a separate original multiplier strip. Burning Ice uses a repeated
per-column board and can show the supplied frozen-column/hold state. The 40-line
variant maps model symbol 9 to the observed `Box/10.png` override instead of
silently reusing the 5/10-line pot image.

The 420 × 900 review arrangement is authored. Its cell layout is fitted to the
visible board artwork, fixing the earlier Wild Ways/Wild 5/Super Wilds aspect
ratio error. Original artwork is evidence of art provenance, **not evidence of
complete provider layout, animation, interaction or mathematical parity**.

## Reproduce the cache and manifests

Run from `game-expansion/continuation`. The cache may remain outside the repo.

```sh
node scripts/fetch-reference-assets.mjs --all \
  --cache-dir /tmp/zplay-reference-presentation-assets --transport curl
node presentation/build-manifests.mjs \
  --cache-dir /tmp/zplay-reference-presentation-assets
node --test test/presentation.test.mjs
```

`fetch-reference-assets.mjs` uses the committed inventories and verifies both
the byte length and SHA-256 **before** atomically accepting a file. A changed
remote file fails verification; it does not silently replace the reference.
Cached files are also rehashed. Only static file types on the observed public
HTTPS host are accepted. Provider JS/HTML/CSS, query strings, credentials,
redirects and session URLs are excluded from the artwork cache. At most 200 MB
of unique selected assets are allowed, with a 16 MB per-file limit. The download
receipt also records an upper bound for attempted transfer bytes.

The supplemental inventory was captured from the URLs declared in the public
configuration and shared CSS identified in `source-declarations.json`. To
intentionally recapture those references, run the following and review the
resulting hash diff before rebuilding the main lock:

```sh
node presentation/capture-supplemental-assets.mjs \
  --cache-dir /tmp/zplay-reference-presentation-assets
node scripts/fetch-reference-assets.mjs --all --verify-only \
  --cache-dir /tmp/zplay-reference-presentation-assets
```

The capture tool follows only static atlas page dependencies. It does not run
the inspected configuration. Source script hashes are recorded as provenance;
their bodies are not bundled. Some animation URLs are declared but unfetched
and are explicitly listed in the manifest rather than represented as complete.

## Isolated review page and static images

```sh
node presentation/serve-preview.mjs \
  --cache-dir /tmp/zplay-reference-presentation-assets
```

The local page is `http://127.0.0.1:8766/`. It serves only GET/HEAD, static authored
files and content-addressed artwork. There are no API or wallet endpoints.
The preview shows a deterministic sample grid labelled as an artwork review,
blank financial values, a reel-blur toggle and an explicitly requested sound
preview. This sample grid is never treated as a server result.

```sh
node presentation/export-review-scenes.mjs
python presentation/render-review.py \
  --cache-dir /tmp/zplay-reference-presentation-assets \
  --games multihot40_native,multihot100_native --width 390
```

The PNGs under `evidence/` are **offline display-list renders made with Pillow**,
not browser screenshots. They use the same authored scene description and the
verified source images. PNG output is replaced atomically to prevent partially
written images being mistaken for a completed review. Viewport-fit unit tests
cover 360, 390, 430 and desktop sizes; these are not browser validation.
JPEG copies provide compatible previews of the same completed render; the PNGs
remain the lossless review artifacts.

## Host integration API — not wired to production

The host keeps ownership of authentication, stale-read protection, persisted
pending intent, exact retry bytes, session events, stake schedules and autoplay.
The current host modules include `client/session.mjs`, `client/controls.mjs` and
`client/autoplay.mjs`; the art renderer must not substitute for those decisions.
The existing presence import stays with the host. This directory neither
changes those files nor opens a launch gate.
Keep binary artwork as static, content-addressed files; do not embed this cache
as base64 strings in the Worker JavaScript bundle. A later deployment must use
the existing same-origin static-asset delivery and preserve its bindings.

```js
import {
  ReferenceAssetStore,
  createPresentationScene,
  paintScene,
} from './presentation/machine-renderer.mjs';
import {finalGridWins} from './client/scene.mjs';

// Load an authored manifest and its assets from the SAME host origin after a
// separately reviewed integration. Do not point the player at provider URLs.
const store = new ReferenceAssetStore(manifest, {
  baseURL: new URL('/native-library/reference-art/r1/assets/', location.origin),
});

async function renderConfirmed(hostState, selectedFrame = null) {
  const round = hostState.round;
  // selectedFrame must come from this exact confirmed round, never a previous
  // request/session. The existing host is responsible for that association.
  const snapshot = {
    grid: selectedFrame?.grid ?? round?.grid,
    wins: selectedFrame?.wins ?? finalGridWins(round),
    feature: selectedFrame?.feature ?? round?.feature,
    round, // payoutMinor remains the confirmed total, separate from frame wins
    balance: hostState.authenticated ? hostState.balance : null,
    authenticated: hostState.authenticated === true,
    stake: hostState.selectedStake ?? null,
    currency: hostState.currency ?? 'ETB',
    pending: Boolean(hostState.pending || hostState.busy),
    canStart: false, // all supplied presentation manifests remain closed
  };
  const scene = createPresentationScene(manifest, snapshot);
  const images = await store.prepare(scene);
  // The host must discard this asynchronous render if its session/read epoch
  // changed while images were loading.
  paintScene(canvas.getContext('2d'), scene, manifest, images, {
    width: canvas.width,
    height: canvas.height,
  });
}
```

`createPresentationScene` accepts `grid[reel][row]` symbol-ID strings and
`wins[].cells` in `[reel,row]` coordinates. It validates the grid against the
manifest; missing/unknown values produce no invented result. Money remains a
decimal string or an integer minor-unit string; BigInt formatting preserves
large-value precision. The renderer does not recompute a payout or balance.

When showing a sequence, pass only that frame's wins. On the final/skip state,
use `finalGridWins(round)` so earlier winning cells do not highlight a different
final grid. Display `round.payoutMinor` as the settled total separately from the
currently visible frame. `store.prepare(scene)` verifies bytes before decoding;
`store.playSound(key, {volume: 0.35})` is manual and should follow an enabled user
sound preference. Call `store.dispose()` when leaving the game. Awaiting a
sound must never delay financial submission or settlement.

`paintScene` only draws. It binds no pointer handlers. Existing accessible host
buttons should continue to own actions and disabled states. The manifest's
control artwork is available for a later reviewed mapping; a painted icon is
not a completed control flow. The proposed asset route above is documentation,
not a published endpoint.

## Remaining work

- Verify and reproduce each provider's actual mobile/desktop placement,
  responsiveness, title setup and interaction states. Current review placement
  is an authored fit to original art.
- Implement complete logo, win, respin, expansion and bonus animation
  sequences. Spine metadata and selected static attachments are mapped;
  general skeletal animation playback is not implemented.
- Complete each game's exact menus, paytable presentation, gamble/free-spin
  flows and all required feature controls. Numeric/model readiness remains
  tracked independently in the reference and release-gate files.
- Review then wire the renderer into the safe host controller, serve the locked
  assets on the same origin and perform real mobile-browser checks. This
  checkpoint makes no production publication or browser-pass claim.
