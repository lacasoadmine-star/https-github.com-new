# Two additive native machines

This portal extension adds `foxy_hot_20_native` and `multi_hot_5_native` alongside the existing catalogue. The 57 original normalized catalogue entries remain unchanged. Home retains its six old cards and adds both new cards. The full catalogue has 59 entries. Only the new cards carry a **New** badge; their routes and favourite keys are distinct from the old machines.

The new covers are byte-original WEBPs linked by SmartSoft's official game pages. `art-provenance.json` records their public URLs, sizes and hashes. They are served locally; no external provider connection or embedded demo is used. Existing legacy artwork stays at its immutable old URL and is not reused for either new card.

All existing portal modules remain unchanged. The new frontend copy retains the original identity, login, payment, history, account and legacy favourite code. For the two new IDs, a successful favourite write must acknowledge the exact requested state; a non-list success response is verified with the existing authenticated GET. Unsupported or ignored writes show an error and never fabricate a locally saved favourite. The upstream accepted-ID policy is not exposed by the generic Worker API proxy, so production persistence remains unverified without backend source or an authorized test account. New CSS affects only the new card images and badges. An explicit disabled/unavailable native game in `/api/config` stays hidden. A catalogue-fetch failure preserves the original app's fallback.

Build and verify from the repository root:

```
node player-machines/native-portal/build.mjs
node --import ./player-machines/scripts/register-binary-loader.mjs --test player-machines/native-portal/catalog.test.mjs player-machines/native-portal/router.test.mjs
node --import ./player-machines/scripts/register-binary-loader.mjs player-machines/native-portal/browser-check.mjs /workspace/work/native-catalog/browser
```

The browser check uses an ephemeral localhost server, a saved public catalogue fixture and disposable local account responses. It never accesses a production account or modifies a production balance.

## Worker integration

Add only `worker/native-catalog.mjs`, `worker/native-catalog-assets.mjs` and the five raw typed Data modules in `worker/native-catalog-data/` from `player-machines/`. The tiny asset manifest imports shared ArrayBuffers; responses enqueue at most 64 KiB per stream pull without copying or detaching the shared buffers. The build writes `worker/native-catalog-manifest.json` with exact Worker module types, sizes, hashes and public-resource paths.

```
import previous from './restore-20261102.mjs';
import {installNativeCatalog} from './native-catalog.mjs';
import {assets as nativeCatalogAssets} from './native-catalog-assets.mjs';
const catalogue = installNativeCatalog(previous, nativeCatalogAssets);
// Existing thin native entry dispatches new game routes first, then delegates:
// return catalogue.fetch(request, env, ctx);
```

`installNativeCatalog` returns the prior default export's properties and lifecycle handlers, bound to their original receiver, plus a decorated fetch handler. It serves five public resources under `/player-native-catalog-20261107-r1/`. It rewrites only a successful Player homepage's exact old portal script reference and adds one stylesheet. The original old stylesheet and cover-art URLs stay intact. Other portals, requests, old game routes and APIs are delegated unchanged. Cookies, CSP and security headers survive the HTML rewrite; stale content validators are removed. Versioned assets support GET/HEAD, ETag and immutable caching.

Do not replace any of the existing 156 Worker modules or change their immutable public URLs when integrating this extension. Backend registration of the two new game IDs and the new native game route dispatcher are separate deployment components.
