# Existing Deluxe: motion symbol scale correction

This review fixes the small falling symbols in the already-existing **Multi Hot 5 Deluxe** renderer. It is separate from the new-game project and contributes **zero** new games. The correction was activated on the existing Player Worker as version **463** on 2026-11-21; the recorded tests do not place a wager.

## Reproduction and correction

The baseline Player version was `fb87068c-5e84-4af1-b43c-5465ad10c300` (v461). Its Deluxe page loaded `zplay-native-machines-20261119-mh5deluxe-r1`. The baseline renderer and manifest used here match that release's exact SHA256/size pins. Small pinned KV reads recovered the renderer; already-retained PNG files were verified against the manifest. PNG alpha bounds were independently checked and match every recorded visible bound.

The stopped path crops the visible bounds before fitting the symbol into a reel cell. The moving path instead fitted the entire 200×200 PNG, including its transparent padding. A Cherry that is 85.33 logical pixels wide while stopped became only 40.11 pixels wide while moving. Across all nine symbols, moving width was only 47–56% of stopped width. Sharp and blur entries in this deployed manifest use the same PNG hashes, so this difference comes from drawing geometry rather than artwork.

The candidate changes two lines: moving draws call the same bounds-aware `drawSymbol` method, and that method selects the blur sprite/bounds when requested. It preserves the stopped path, game model, receipt, bet, payout, authentication, wallet, multiplier, and remaining presentation logic.

`evidence/deluxe-symbol-scale-comparison.png` is an actual execution of the deployed/candidate `draw()` methods using the installed native Canvas implementation and pinned PNGs. It is **not a browser screenshot**. The fixture uses a synthetic grid and never sends a game request. The optional self-contained HTML comparison is retained in scratch and omitted from this repository package to avoid duplicating 1.94MB of embedded artwork. Its browser execution has not been claimed.

## Verification

Run from this folder:

```sh
node --test --test-reporter=tap deluxe-symbol-scale.test.mjs deployment/route.test.mjs deployment/multipart.test.mjs
```

Actual result: **23 passed, 0 failed** under Node v24.22.3. The same geometry regressions against the retained baseline renderer produce **6 passed, 3 failed**; the candidate geometry suite passes **9/9**. Tests cover all nine symbols, pending/settling motion, normal/turbo settings, clipping, aspect ratios, reduced-motion and stopped geometry, accepted receipt preservation, STOP, immutable routing, GET/HEAD storage reads, missing/corrupt assets, old routes, and portal/API delegation. The six additional multipart tests verify exact binary views, preservation of every old module byte while appending, reconstruction of missing upload file headers, and rejection of unknown module types, malformed boundaries, collisions and header injection. Exact commands, source hashes, and TAP files are recorded in `verification.json`.

Nine unique pinned PNG files are packed losslessly as base64 in `baseline/symbol-images.json`; the geometry test verifies every restored byte hash and image dimension. No download, browser, Python or third-party package is required to run the 23 focused Node tests. The PNG comparison is a recorded native-Canvas artifact.

The separate original Multi Hot 5 settings observation is explained by its exact deployed audio control source: **Sound Effects is intentionally the master mute**, and disabling it clears Music. Switching Music on alone does not unmute the master. This source also cites provider launcher handlers, but those provider handlers were not freshly reverified in this review; the behavior was therefore preserved.

## Minimal deployment package

`deployment/entry.mjs` is a single new Worker wrapper module, prepared for the name `native72deluxefix20261121/entry.mjs`. It imports the current main `native72mh40r4/entry.mjs`, re-exports its existing named handlers, reuses the exact deployed Deluxe route factory, and imports the existing Deluxe asset map/HTML. It replaces only the renderer entry in a copied map, and changes the HTML's release prefix to `zplay-native-machines-20261121-mh5deluxe-r1`.

The candidate renderer belongs at the **new** content-addressed KV key in `deployment/plan.json`. Existing KV values must remain unchanged. New renderer GET/HEAD requests are checked by the retained route factory against the new SHA256 and byte length. Missing/corrupt new bytes return a no-store error, with no old-renderer substitution. All old release paths, original native games, other games, and API requests continue through the old main.

`deployment/plan.json` preserves the original preflight requirements, source module pins, renderer key, and preservation checklist. `deployment/result.json` records the activation and independent Cloudflare metadata readback. The deployed version is `527ad53e-210e-4e44-9c92-8bc5f74386f1` (v463); deployment `3d8e5552-02f0-48db-82eb-f9ccc8d54260` assigned it 100% at `2026-11-21T21:19:24.756756Z`. The deployment owner verified all 403 original module hashes before upload, preserved all 18 bindings and the runtime/handler declarations, and observed the canonical page loading the new release prefix with its canvas and signed-in controls. The final readback at `2026-11-21T21:23:19.563Z` verified all **404** modules: **403** original modules preserved and the new wrapper, with zero SHA-256 or size mismatches. Its record is `deployment/post-deploy-module-verification.json`. The dedicated-r2 package shipped in the baseline Worker was outside its active main import chain and was not used to activate this correction.

## Deployment issues caught before activation

The first upload reused downloaded multipart headers, which omit filename and content type. Cloudflare interpreted the parts as large text fields and rejected the upload with HTTP 400, "multipart: message too large". The corrected helper rebuilds `.mjs` parts as `application/javascript+module` and `.bin` parts as `application/octet-stream`, includes filenames, and streams views over each original body without changing its bytes. Two regression tests cover these observed header conditions and unknown file types.

Version 462 uploaded but was **not activated**: its runtime declaration omitted the existing Durable Object exports. The metadata equality guard caught this. Version 463 explicitly retained `LocalDemoWallet` and `NativeGameResources`, passed the binding/runtime/named-handler checks, and was activated. A successful upload alone was never treated as a live deployment.

The correction changes existing presentation only. No paid SPIN was used for verification, and no new game was activated. The local Canvas comparison remains distinct from browser proof of motion during a real round. Other games require their own exact-source reproduction before changes are applied.
