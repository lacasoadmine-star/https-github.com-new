# Connect new games to the existing ZPLAY account backend

This checkpoint continues the existing project. It preserves the Player and Agent sites, existing accounts, database, wallet ledger and retained game engines. It does not create a new host, wallet service or database.

## Release state

**Fresh Multi Hot 10 is currently closed for new ETB wagers while the executing backend runtime is verified.** The configured nine-slot source includes the reviewed account/recovery guards and authenticated state endpoint. On 2026-11-11, the owner-authorized activation set the existing `FRESH74_ACCOUNT_RELEASE` switch to `mh10-v1`; deployment `da801e21-783a-4ef7-ad54-e954e6a3b291`, created at 18:46:43 UTC, reached `SUCCESS`. The switch was then cleared to an empty string, and closure deployment `461c1004-c35b-4415-84da-4f7042920cb4`, created at 19:00:15 UTC, reached `SUCCESS`. A direct public check at 19:04:24 UTC confirmed `enabled: false`, `freshReleaseReady: false` and no allowed stakes for MH10; all 74 fresh registrations were closed.

During the temporary activation, the public catalog enabled only `fresh_multihot10` and supplied its retained ETB stakes. The signed-out homepage showed **PLAY · ETB**, opened the account game and required login before SPIN became available. These are historical activation observations, not the current release state. The model remains the preserved independent implementation and is not provider-certified. The existing Player Worker version and deployment did not change for this activation or closure.

The catalog also reported `buildStatus: draft` while readiness was true. Both the Worker list route and the direct nine-slot list and single-game routes returned that value. The reviewed runtime explicitly normalizes it to `ready` when readiness is true. Read-only checks confirmed that the configured function source and decoded start command matched the reviewed source, but they did not explain this served-response difference or positively identify the code executing behind the public route. `buildStatus` is not itself a wagering gate; the discrepancy remains unresolved and is not claimed to be harmless.

A diagnostic candidate was prepared offline with one 50-byte insertion: a static `runtimeRelease` field in `/health`, also included automatically in the existing startup-ready log. Reversing the insertion restored the reviewed source exactly, and dependency-free syntax checks passed. Automatic approval review rejected the proposed whole-function update because it replaces and deploys the entire wallet-connected wagering service, the user had not explicitly authorized that new source replacement/deployment, and the unresolved runtime discrepancy made disruption risk material. The diagnostic was not deployed; no retry or workaround was attempted. The remaining reviewable action is that specific diagnostic deployment while the release stays closed, followed by verification of the marker and runtime identity before reopening wagers.

See [fresh-mh10-activation-evidence.json](fresh-mh10-activation-evidence.json) for the activation, closure and rejection history, and [diagnostic-health-marker.diff.txt](diagnostic-health-marker.diff.txt) for the single proposed metadata change. [deployment-evidence.json](deployment-evidence.json) remains unchanged and preserves the earlier closed-release checkpoint.

The native60 registration and later read-only native facade were prepared and tested, but their whole-service source changes were rejected by automatic approval review. Neither candidate was deployed. Their private carriers and installer payloads are intentionally absent from this checkpoint.

The existing Player Worker now runs r18, version `2a07c969-d64d-4299-bc55-5c2544f09510` (version 393), deployment `e2767574-72ca-412a-8f41-080d6e4d7579` at 100%. Its new account screens use the existing authenticated `GET /api/machine-session` to read the real account balance. The 60 new account titles remain read-only: starts and game history stay explicitly unavailable until their missing models and release work are completed. No new native endpoint or financial POST forwarding was added.

A post-deployment download verified all 310 retained module bodies byte-for-byte and exactly three authored compiled additions, for 313 modules. All 15 existing bindings and the runtime, assets and Durable Object migration settings were preserved. This is a connection to the existing account service, not evidence that all new games are ready to accept wagers.

No production wager was placed by these tests. Existing balances were not edited, and no invented balances or test accounts were created in production.

## What changed

`backend/fresh-hooks.mjs` adds Fresh-specific account state, session and model checks, exact receipt recovery, cross-game admission and current gamble-state checks inside the retained backend. Its existing financial transaction and wallet functions remain authoritative. State reports the current balance, model, allowed stake values, latest retained round and whether gamble remains available.

`client/fresh74-account.mjs` uses the existing account API. It persists the exact pending request token, retries ambiguous operations with `replayOnly:true`, binds recovery to the authenticated session, validates wallet receipt arithmetic and rejects mismatched stake/model responses. Once a wager is confirmed, a failed balance refresh triggers GET-only recovery rather than resubmitting the wager. Gamble requests include the expected attempt and confirmed stake.

`client/fresh74-ui.mjs` uses those account results, server-provided stakes and recovery controls. STOP affects presentation of the accepted result. Existing procedural artwork and styles remain inherited from the live Worker; they are not duplicated in this authored-source checkpoint.

`worker/modules/` contains the four readable source modules; `worker/assets/` and `client/` contain the eight text asset overrides. The deployed package is `worker/compact/modules/`: three additions totaling 33,596 bytes. Its gateway adapter reuses the retained r17 gateway and applies the same four response changes as the readable r18 source. The asset loader compresses the exact eight overrides. This packaging kept the upload within the existing request-size limit without replacing any retained module.

`tools/multipart.mjs` parses downloaded Worker multipart bytes without decoding module bodies. It preserves binary bytes and original newlines, checks exact framing, rejects duplicate names and detects missing closing boundaries. Its exported function has no external helpers and can be embedded in the existing deployment tool. Native FormData reconstruction is covered by a byte/digest round-trip test.

## Verification

| Area | Passing isolated tests | Scope |
| --- | ---: | --- |
| Fresh account client | 14 | Pending receipt recovery, session binding, malformed responses, confirmed GET-only recovery, server stakes and gamble state |
| Existing backend guards | 27 | Authenticated state, closed default, retained accounting, replay, admission, capacity, rollback and gamble receipts |
| Multipart parser | 13 | Invalid UTF-8, embedded boundary-like bytes, newline preservation, duplicates, exact closing framing and FormData round trip |
| Readable and compiled Worker | 20 | The same eight gateway checks against both implementations, two compact parity/asset tests, and two lobby/controller DOM tests |

The portable checkpoint passes **74 distinct test invocations** across these suites. The compact parity test checks 226 request scenarios, including exact status, body, headers and delegated request traces. A rebuild of the staged portable compact builder reproduced the deployed three modules byte-for-byte.

For the later configuration-only MH10 activation, all 14 account-client tests passed again. A pure imported-module check confirmed that only the exact release value enables MH10 and that the other 73 fresh titles remain closed. The prior 27 financial-backend tests were not rerun because the reviewed configured source was unchanged; those tests do not resolve the identity of the runtime serving the live route. Public catalog and health reads and a signed-out browser visit verified the temporary activation, and the later direct catalog read verified closure. No production login or wager was performed, so live debit and payout settlement was not exercised by this verification.

The backend tests run the retained SQL logic against disposable PGlite with a mocked Redis transport. They do not establish multi-process PostgreSQL lock behavior or production settlement. The preserved independent math model is not a provider-certified probability model.

The actual deployed fresh page was opened in the shared browser: r18 JavaScript ran, the signed-out page requested login, the balance remained unknown (`—`), and SPIN/AUTO/X2 stayed disabled. No application console error was observed; an unrelated browser-extension error was present. No authenticated live wager was submitted. The homepage also rendered the existing LIVE cards, new ETB cards and Fresh Multi Hot 10 card. Opening Multi Hot 10 through FUR WALLET ETB rendered the embedded account machine with its 5×3 grid; it requested Player login, left the balance unknown and kept SPIN disabled. No login was performed.

The separate mocked mobile checks at widths 360, 390 and 430 are **not verified**. Local Chromium failed before opening a page because its process-singleton socket was unavailable. The isolated remote rendering submission was rejected by automatic approval review, and no workaround was attempted. The rejected generated HTML payload is excluded. The passing DOM tests are not a substitute for viewport rendering.

## Run the portable tests

Use Node.js 22 or later:

```sh
npm install
npm test
```

The default tests need no backend, credentials, account or live URL.

The financial backend suite additionally requires the separately retained private baseline and candidate runtime files. It refuses database and Redis URLs other than the registered in-memory fixtures. Supply private file paths explicitly:

```sh
export FRESH_BASELINE_RUNTIME=/private/verified-baseline-runtime.mjs
export FRESH_CANDIDATE_RUNTIME=/private/prepared-runtime.mjs
node tests/build-fixtures.mjs
npm run test:backend
```

Generated service fixtures contain private retained runtime source and are ignored by Git. They must not be added to a public commit.

## Run the Worker checks offline

The deployed compiled additions are already included. The source builder and tests use separately retained private r17 modules/assets as read-only inputs. Set their directories explicitly; preparation creates ignored local symlinks and does not copy or publish their contents:

```sh
export PLAYER_RETAINED_MODULES_DIR=/private/verified-player-modules
export PLAYER_RETAINED_ASSETS_DIR=/private/verified-player-assets
npm run prepare:worker
npm run build:worker
npm run test:worker
```

The retained modules required by these checks are `independent74-assets-r17.mjs`, `independent74-catalog-r17.mjs` and `independent74-gateway-r17.mjs`. The existing public route fixture remains in the parent checkpoint at `../independent74-20261111/client/existing-wallet-routes.mjs`. These commands do not fetch files or contact a deployment API. The build only produces the three authored additions; it is not a self-contained replacement for the live Worker and must not be uploaded without the independently preserved current modules and configuration.

## Prepare the guarded runtime offline

`backend/prepare-candidate.mjs` preserves the authored patch procedure while requiring explicit private inputs. It never fetches, deploys, changes environment variables or contacts a database:

```sh
node backend/prepare-candidate.mjs \
  /private/verified-baseline-runtime.mjs \
  /private/verified-baseline-carrier.mjs \
  /private/verified-pins.json \
  /private/prepared-output
```

The private pin record has format `fresh-slot-private-inputs-v1` with independently verified `runtimeSha256` and `carrierSha256` fields. Missing or mismatched pins stop preparation. The preparer verifies that reversing its authored changes restores the exact baseline bytes. No deployed-runtime fingerprint or private source carrier is embedded in this public preparer.

## Publication boundary

Included files contain authored changes, isolated tests, public API examples and sanitized verification evidence. Private carriers, runtime snapshots, whole-runtime fingerprints, deployment pins, credential values, generated native installers and rejected bundled rendering payloads are excluded. The current checkpoint does not enable unfinished game models or remove their admission gates.
