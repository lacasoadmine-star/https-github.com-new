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
