# NEW71 additive catalogue integration

This implementation continues the retained NEW71 section before the existing first slot row, in the user's exact requested order. The current public projection has **0 ready games**. Multi Hot 10 links to its explicitly labelled visual preview with bets disabled; the other titles remain labelled **Diyaarin**, without game launch links. No existing game thumbnail, screenshot, gameplay code or payout is used by this catalogue presentation.

## Scope and routes

- The lobby module mounts once before `main.player-main .home-slot-heading`, observed on the live `/` lobby by the parent agent. It removes only its own node on navigation away from `/`, and remounts after an SPA return or relevant DOM replacement.
- The root preview contains the first 10 requested names in the exact requested order. `/new-games71/` lists all 71. Existing cards and rows remain in place.
- `/new-games71/catalogue.json` exposes names, ordinals and truthful readiness only. Internal evidence paths, configuration paths and official demo session URLs are not published by this endpoint.
- Client JavaScript and CSS use content-addressed paths under `/_zplay/new71/`. HTML and the catalogue use `no-store`. CSS rules that apply to the lobby are scoped to the added section.
- No API request in this feature creates a session, changes a wallet, submits a round, changes an existing route, or operates a payment.

`publicCatalogue()` requires all per-game implementation, financial integration, live verification, fresh reference and release gates before it can produce a Play link. Excluded base names, route collisions and malformed or partial registries fail validation. A reserved identity or route alone is insufficient. Duplicate official product labels remain unplayable.

## Files and build

`catalogue.mjs` validates the minimal continuation registry and renders the standalone list. This registry preserves names, identities, ordering and closed readiness flags without importing private evidence, histories or provenance. `new-section.mjs` handles idempotent lobby mounting. `worker.mjs` serves only the new paths and adds the loader to root HTML. `build-assets.mjs` emits the public catalogue and packaged assets.

```sh
node codex-work/new-requested71-20261122/integration/build-assets.mjs
node codex-work/new-requested71-20261122/integration/build-assets.mjs --check
node --test codex-work/new-requested71-20261122/integration/*.test.mjs
```

`--check` compares generated files without writing them, and exits with an error on stale output. Eleven local unit/integration tests pass. They cover readiness, prohibited identities, passthrough of existing routes and handlers, session header preservation, cache validator removal only on transformed root HTML, read-only new endpoints, version-specific module recovery and exact binary module preservation. The preservation fixture round-trips 405 mixed binary/source modules, all 18 inherited bindings, static asset configuration and both existing Durable Object exports, with exactly six additional modules for the composed preview.

The browser fixture checks 360, 390 and 430 portrait widths plus 1280×900 desktop at DPR 2, insertion order, 44px reachable link targets, duplicate imports, route exit and return, existing card preservation, horizontal overflow, the 71-name page and the absence of financial requests. Requests outside the exact local fixture are blocked before transmission. It uses isolated local content. It does **not** test provider demos or production spins.

```sh
ZPLAY_QA_NODE_MODULES=/path/to/browser-tools/node_modules \
ZPLAY_NEW71_QA_OUTPUT=/path/to/results \
node codex-work/new-requested71-20261122/integration/qa/run-isolated-browser.mjs
```

The continuation environment's system Chromium cannot start because its socket syscall is denied. The fixture is available for the existing GitHub browser QA job; its successful current-source run must be observed before claiming mobile browser verification. No browser verification is claimed from the local launch attempt. `ZPLAY_QA_CHROMIUM_PATH` can select an already-installed executable in a permitted test environment.

## Preservation during a reviewed Worker upload

`additive-upload.mjs` is a pure preparation helper. It does not call Cloudflare or deploy. It parses multipart modules without round-tripping binary assets through text, verifies every existing module's byte count, MIME type and SHA-256, and appends an exact allowlist under `newrequested71r1/`. The catalogue-only form contains four modules; the composed visual preview contains those four plus `preview-worker.mjs` and `preview-manifest.mjs`, both required together. Shared frozen module-name constants keep the composer and uploader in agreement. The helper inherits all 18 existing bindings by name, retains static assets and preserves the existing SQLite Durable Object exports and compatibility settings. Every new module also requires a byte count and SHA-256 pin.

The entry module must import the **active** main module. It must not assume that the latest uploaded content is the active release. An initial legacy API response showed v464 while a separate deployment had already advanced the live Worker. The newer documented API resolves that ambiguity: `GET /accounts/{account_id}/workers/workers/superwin-player/versions/{version_id}?include=modules` returns the exact pinned version, its explicit `main_module`, configuration and base64-encoded modules. `partsFromVersion()` decodes those bytes directly.

The retained checkpoint identified active v466 (`8e07dd15-edb8-408e-b9fd-6fcabc25687b`), deployment `6379df0b-d336-44f2-94d9-bea13ff10574`, with main module `balloonstatefix20261121/entry.mjs`, 405 modules and 18 bindings. These are historical identifiers, not proof of the currently active version. The release coordinator must retrieve the exact current module inventory and version configuration, preserve all baseline bytes, and recheck the active deployment immediately before staging and activation.

No external deployment is performed by these files. Before an upload, verify the active version and all active module hashes, produce a public source commit, run the required checks, pin the preview source manifest, and review the exact additional six modules. After upload, verify retained module hashes and configuration before activating that version. The release coordinator owns all external writes.

## Compact deployment package

The first staging-only attempt to append six ordinary source modules exceeded the existing Worker's uncompressed-size limit. No activation was submitted. The initial compact package changed the representation of only the six new modules. The current v2 package retains that representation and adds the one explicit, lossless metadata-container exception documented below. Image and audio quality remain unchanged.

The catalogue's repeated fields and the manifest's repeated directory/MIME strings are encoded as tuples and reconstructed to the exact canonical objects. SHA-256 digests use a shorter base64 representation during packaging and are restored to the same lowercase hexadecimal values. Repeated CSS literals use a small lossless dictionary; the served stylesheet's whitespace, escapes and every byte remain unchanged. Runtime source is minified with **esbuild 0.25.12**, already pinned in the platform's `package-lock.json`. The served lobby JavaScript/CSS strings, all 41 preview source paths, byte counts, hashes, MIME types, source commit and revision must remain exactly equal. Both structural equality and JSON serialization equality are required before output is accepted.

After the final preview manifest has been regenerated and pinned, the existing platform-build job runs:

```sh
node codex-work/new-requested71-20261122/integration/compact-deployment.mjs \
  --active-main balloonstatefix20261121/entry.mjs \
  --output "$RUNNER_TEMP/new71-compact-deployment"
ZPLAY_COMPACT_MODULE_ROOT="$RUNNER_TEMP/new71-compact-deployment" \
  node --test codex-work/new-requested71-20261122/integration/qa/compact-runtime.test.mjs
```

The active-main argument above is the observed v466 entry; the release coordinator must recheck it before using the artifact. The build fails if the six module names change, the locked minifier version changes, canonical data differ, or combined UTF-8 source exceeds **30,000 bytes**. `compact-report.json` records the actual byte count, six content hashes, exact checkout commit, preview source pin and all build-source hashes. The v2 artifact separately records the metadata-container exception below. It does not claim a successful deployment.

Seven local data-compaction tests join the existing 28 catalogue/preview tests, including CSS marker/escape/Unicode preservation. The v2 package adds five metadata tests and expands the compiled suite to eight checks covering response equivalence, credential/redirect restrictions, composed-entry passthrough, both Durable Object exports, the explicit 404-plus-one preservation contract and artifact-tamper rejection. Compiled checks require the generated artifact and are not counted as executed merely because their source exists.

The browser job downloads the artifact from **that same workflow run and attempt**. Both browser fixtures verify its module/source pins and exercise the compiled Worker factories. They preserve `deploymentFormat: "compact"` and the module hashes in their reports. No deployment should use hand-minified output or a package from another run. Stage the accepted artifact, verify every old module and all configuration against the exact active version, and then activate through the existing reviewed deployment flow.

## One explicit lossless metadata-container exception

The 29,723-byte six-module package passed its checks but was still rejected by the platform's actual size limit. Read-only measurement found 67,081,674 multipart bytes, including 66,998,376 module bytes and 1,508 metadata bytes. A JSON merge-patch attempt with the same module contents was also rejected. The 30k guard therefore did not by itself establish platform acceptance.

The revised artifact repacks exactly **`native72dedicatedr1/release-pins.mjs`**, a generated, data-only export already present in the active Worker. Its original source remains unchanged at `codex-work/native72-20261119/changes/dedicated-resume/deployment/release-pins.mjs`: 127,134 bytes, SHA-256 `db96f12990fe8d48d62e1c04de2e7611d9f3ba117bd791f733fa75af75b2cf10`. Every other old module, actual asset, KV value, gameplay module and financial component retains its exact bytes. This metadata is used solely to preserve existing infrastructure; it supplies no reference or implementation for a new game.

`repack-release-pins.mjs` parses only that exact pinned JSON export. It folds repeated MIME types, KV prefixes, filename fragments and HTML lines into literal tables. When a filename contains its own asset SHA exactly once, the same digest is used to reconstruct that literal filename. Base64 is only a shorter representation of the original digest bytes. The decoder uses ordinary array/string operations, `atob`, `Object.fromEntries` and `JSON.stringify`; it performs no network access, dynamic evaluation, asynchronous global work or game logic.

The unminified replacement is **34,991 bytes**, saving **92,143 bytes**. The build requires at least **90,000 bytes saved after minification**. Exhaustive checks require the same sole `releasePins` export, exact outer JSON property order, all three original inline-manifest strings byte for byte, and all **321** asset names, sizes, SHA values, MIME types, KV keys and ordering. Both HTML templates retain their exact strings. The exported-object semantic SHA-256 is `5e180abe371eca39c8bf34006ab1885bd804b3ded7e1fe52889f299d271f5fd3`.

The v2 report records `metadataRepack` separately from the six new modules, with the fixed before pin, actual after pin, savings, semantic hash, all three manifest proof summaries and `netAddedBytes`. Artifact loading verifies the original source, replacement bytes and complete reconstructed values again. Five local tests cover source drift, exhaustive equality, text/property-order changes, canonical input validation and the exact replacement allowlist. The compiled suite verifies **404 byte-identical old modules plus this one semantically exact metadata container**, all six new modules and all 18 inherited bindings.

`applyPinnedMetadataRepack()` validates the original full baseline before creating new collections with that one replacement. It requires the hard-coded original module/hash/size, semantic proof identifier, verified artifact hash and 90k saving. It cannot replace another old module and does not mutate the caller's baseline. The release coordinator must use the CI-verified v2 artifact, recheck the active source pin, stage without activation, and read back **404 exact old module pins, the one reviewed replacement pin and six new pins** before activating. Static Assets, bindings, Durable Object exports and configuration must also match the active baseline. No KV write is needed for this packaging change.
