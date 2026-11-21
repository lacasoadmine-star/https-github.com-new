# Multi Hot 10 visual preview wrapper

This additive wrapper exposes `/new-games72/multi-hot-10/preview/` for visual verification of the independently built M10 renderer. The page explicitly says **Visual preview — bets disabled**. It manually mounts the current module with `previewOnly: true`, without a financial host or an isolated outcome transport. It does not cycle fixtures, invent outcomes, create balances, or mark the game ready.

The renderer's explicit preview boundary disables SPIN, AUTO, TAKE and GAMBLE buttons, direct round actions and the Space shortcut. Menu, settings, bet selection and the separate paytable bet preview remain available. A successful visual preview is not a complete engine or production-wallet verification.

## Exact source boundary

`preview-manifest.mjs` contains 41 exact paths: 13 own M10 runtime modules, one shared round-recovery infrastructure dependency, one stylesheet, 12 native image/atlas/title files and 14 original MP3 files. The shared dependency is statically imported by the M10 deferred client; no financial client is constructed in this preview. No old game module, screenshot, reference fixture, provider program, secret, backend schema or server-side lifecycle is exposed.

Each entry pins its repository path, SHA-256, byte length and output MIME type. The source host and repository are fixed. Requests always use the published 40-character Git commit SHA, never a moving branch. Original relative imports retain their tree structure. An explicit import map resolves the original absolute M10 module prefix and the one shared import only inside this preview. Unversioned M10 and shared routes pass through to the previous worker with the original request and response unchanged.

Immutable source URLs have this shape:

```text
/_zplay/m10-preview/<published-commit>/<manifest-revision>/new-games72/games/multi-hot-10/main.mjs
```

GET and HEAD are the only permitted methods in the preview scope. Incoming cookie, authorization, referrer, query and custom headers are never forwarded. Fetch uses Workers-compatible `redirect: 'manual'`; every 3xx response is rejected before following its destination. Other non-200 responses, unexpected MIME types, excess/short bodies and SHA mismatches are also rejected. Only verified bytes enter the optional edge cache; cached bytes are verified again before use. Errors are `no-store` and do not fall back to an old error page or asset.

Dynamic HTML uses `no-store`. Verified immutable resources use a one-year immutable cache header, a content hash ETag and a source commit header. The HTML CSP permits scripts, images, media and fetches only under the immutable preview prefix; it denies forms, frames, arbitrary connections and financial API paths. Only rendered data images and inline styles required by the renderer are additionally allowed. No configuration or body content is reflected from query parameters.

## Pin after publishing the M10 source

The initial manifest has `sourceCommit: null`. That is deliberate: unpublished local bytes must not be represented as a remotely available commit. An unpinned or malformed manifest returns 503 only for the new preview scope and preserves all prior routes.

After the original M10 files are in the authorized GitHub repository, run from the repository root:

```sh
node codex-work/new-requested71-20261122/preview/build-manifest.mjs --commit PUBLISHED_40_CHARACTER_COMMIT_SHA
node codex-work/new-requested71-20261122/preview/build-manifest.mjs --check
node --test codex-work/new-requested71-20261122/preview/preview.test.mjs
```

The build reads only the exact allowlist, checks its static import closure, requires the runtime's explicit preview boundary, and hashes the current bytes. `--check` detects source drift. It does not prove that a supplied commit contains those bytes; the wrapper performs remote hash verification, and live QA must confirm successful resource loading after publication. Rebuild the pin after any renderer edit.

## Compose without altering the active worker

`composition.mjs` generates a new outer entry using the existing integration entry contract:

```js
import previous from '../EXACT_ACTIVE_MAIN.mjs';
export {LocalDemoWallet, NativeGameResources} from '../EXACT_ACTIVE_MAIN.mjs';
import config from './worker-assets.mjs';
import {createAdditiveWorker} from './worker.mjs';
import {createVisualPreviewWorker} from './preview-worker.mjs';
import previewManifest from './preview-manifest.mjs';

export default createVisualPreviewWorker(
  createAdditiveWorker(previous, config),
  previewManifest,
);
```

The real active entry path must come from the captured active-version inventory; the example is not a deployment configuration. Preserve the existing Durable Object re-exports, bindings, assets and all prior module bytes. This work has not modified the active worker, the frozen registry, M20 or M100.

Two new deployment modules are required in addition to the four NEW71 integration modules:

- `newrequested71r1/preview-worker.mjs`
- `newrequested71r1/preview-manifest.mjs`

The upload helper accepts exactly the four catalogue modules or all six composed modules. The preview pair is mandatory together, using the same frozen module-name constants as the composer; partial pairs, extra modules and hash drift are rejected. Baseline module verification remains mandatory. `composition.mjs` and the builder are local orchestration helpers, not Worker runtime imports.

## Verification

Seventeen focused preview tests cover exact allowlists and preview-only flags, no-store HTML, disabled round bootstrap, CSP restrictions, GET/HEAD-only behavior, safe canonical aliases, credential isolation, immutable pinning, Workers-compatible redirect rejection, MIME/size/hash rejection, cache integrity, unpublished-manifest failure, existing response identity, existing auth/payment routes, actual NEW71 composition and Durable Object re-exports. Together with eleven catalogue/preservation tests, 28 local tests pass. They do not make live network or wallet requests. The local Chromium launch is blocked by a denied socket syscall; browser acceptance must run in the existing permitted CI/browser environment.

After publication and deployment, inspect the dedicated preview URL, verify that all source resources return the pinned hashes, exercise menu/settings/bet display controls, and confirm that SPIN/AUTO remain disabled and no `/api/` requests occur. Existing games and authenticated wallet flows remain owned by the previous worker.

## Current-source browser CI

The existing `new-games72-additive-qa.yml` workflow now includes a bounded NEW71/M10 preview browser job on the continuation branch. It runs the catalogue and M10 fixtures independently, preserving both outcomes. The M10 fixture uses 360/390/430 portrait widths and 1280×900 desktop at DPR 2. It verifies six visible main controls with reachable 44px centers, disjoint portrait hitboxes, mobile dialog targets, readable rules, responsive BET/Rules/Settings/History/Quick controls, the disabled wager boundary and zero financial endpoints. Off-scope requests are blocked before transmission. Desktop dialog artwork retains its original pointer-target geometry. Reports and screenshots are retained per viewport; a failure cannot be reported as browser acceptance.
