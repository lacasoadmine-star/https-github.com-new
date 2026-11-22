# Requested ninety-game catalogue integration

This is the additive catalogue and release integration for the exact ninety names supplied on 23 November 2026. It is not ninety implemented games. Every new financial release remains closed, and the public ready count is zero.

`requested.mjs` preserves the precise order and the three exact exclusions. `registry.json` carries thirty-three exact prior additive IDs, the separately reserved classic JetX identity, and fifty-six newly reserved IDs. The previous catalogue, implementations and routes are preserved. The classic JetX request uses `zplay71_jetx_v1` and `/new-games71/jetx/`, never the inherited New Era alias. JetX3 remains linked to Aviastar as a duplicate official product; all requested names retain distinct records. Multi Hot Ways is not silently renamed Multi Hot Wild Ways. The Burning Ice and Blazing Hot requests keep separate IDs until the official variant work resolves their relationship.

The four-module Worker wraps the actual active entry supplied by the coordinator. Every previous module is retained. The root response removes only the former NEW71 catalogue loader and its stylesheet, then adds the current NEW90 loader. Existing games and dashboard rows are not removed or restyled. `/new-games71/` and all prior previews still delegate to the original handler. The new section displays ten entries above Slots, and `/new-games90/` displays the complete ordered ninety with responsive local search and exact match counts. It provides no placeholder gameplay, borrowed thumbnails, fake balances or financial endpoints.

The current Multi Hot 10 read-only preview link is retained. A coordinator may supply a separately verified preview descriptor, such as Multi Hot 20, to `buildDeployment({previewDescriptors:[descriptor]})`. A descriptor must match its own reserved game route plus `preview/`, explicitly be read-only, and carry its reviewed source commit and asset-manifest SHA-256. Adding it does not enable Play or change a release count. Its actual preview-serving Worker and complete asset closure must be composed separately before activation.

`model.mjs` opens a Play link only when the implementation, assets, rules, financial integration and actual live evidence all pass the per-game release contract. Client controls never calculate financial results. The new catalogue JSON is fetched without credentials, and prior session/authentication data passes through unchanged. A restrictive CSP applies only to the new catalogue page; the inherited root CSP is retained.

## Build and tests

Run the focused suite:

```sh
node --test codex-work/new-games90-20261123/catalogue/catalogue.test.mjs
```

Generate the exact four-module artifact with the confirmed active main module:

```sh
node codex-work/new-games90-20261123/catalogue/build.mjs newrequested71r1/entry.mjs /tmp/zplay-new90-build
```

The programmatic builder accepts the existing locked esbuild instance through `minifier`. No dependency change is required. Its report pins every source and deployed module; packing is checked for exact JSON and asset-byte equivalence. `loadDeployment` checks all four module identities and hashes before loading the artifact. The unminified artifact is approximately twenty-five kilobytes, under its sixty-kilobyte guard; use the fresh build report for exact bytes.

Run isolated Chromium QA using the exact artifact:

```sh
ZPLAY_NEW90_BUILD_ROOT=/tmp/zplay-new90-build \
ZPLAY_NEW90_QA_OUTPUT=/tmp/zplay-new90-browser-qa \
ZPLAY_QA_CHROMIUM_PATH=/usr/bin/chromium \
node --test codex-work/new-games90-20261123/catalogue/browser-qa.mjs
```

The runner uses `ZPLAY_QA_NODE_MODULES` or the installed primary runtime to resolve Playwright. It checks 360, 390, 430 and 1280 pixel viewports, the observed broad legacy hide rule, late stylesheets, duplicate imports, route exit/remount, touch targets, exact names/order, search results, retained old row bytes/styles, unchanged synthetic auth storage, cookie-free catalogue fetches and absence of financial or external requests. Reports and screenshots are required outside the repository. These are fixture assertions, not official gameplay or production-round verification.

At the local checkpoint all fourteen Node tests passed. Chromium launch failed before creating a page because the execution environment rejected the browser's process-singleton Unix socket (`Operation not permitted`). No viewport or live gameplay verification was claimed from that failed run. The same exact runner is prepared for the existing GitHub CI browser environment; successful CI must be observed before claiming browser QA passed.
