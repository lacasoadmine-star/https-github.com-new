# Existing Balloon: prevent state polling from discarding every response

This maintenance patch fixes an observed connection failure in the existing Balloon page. It contributes **zero** new games and changes no game rules, betting action, payout, authentication contract or wallet operation.

The corrected **r2 release is deployed and its live connection and non-wager controls are verified**. Player version **466**, `8e07dd15-edb8-408e-b9fd-6fcabc25687b`, was activated at `2026-11-21T22:01:36.670446Z`, deployment `6379df0b-d336-44f2-94d9-bea13ff10574`. The first attempt, version465, failed its live source check and was rolled back to version464 before the corrected r2 release. See `deployment/result.json` and `evidence/deployment-attempt-v465.json`.

## Diagnosis

After the preceding transport correction was deployed as Player version 464, the existing Balloon endpoint returned a successful state response. The page still displayed its initial "Not connected" and sign-in text, and its HOLD button remained disabled. A manual Refresh did not recover it.

The deployment owner checked only the state response's field names and presence flags. It contained the expected game, currency, state and sessionId fields, with no error. It did not contain an authenticated field. That absence is valid for this deployed client: apply(payload) checks the game identity, currency and session, then sets its local connected/authenticated state itself. No server authentication field was added or changed.

The exact client reveals the failure: a timer starts a quiet state read every 1,200ms, even while an earlier read is pending. Each read increments readSequence, and a response applies only if it still has the newest sequence. Read-only service logs during the investigation show successful state requests taking about 1,940ms while new requests arrive about 1,200ms apart. Consequently, the next poll invalidates each previous response before it arrives.

The log path omits query strings, so its individual rows cannot independently distinguish Balloon from another existing library game. The source-bound fixture independently proves the timing defect using only Balloon's actual client.

## Actual served source and the failed first attempt

The first candidate was based on the older `/native-library/balloon/v1/` source. An existing higher Worker wrapper had already replaced that script with `/native-library/existing-new/20261110-etb1-40000-r1/balloon/balloon.js` and updated the stake selector to the existing 1–40,000 ETB profile. The first wrapper's exact-source guard returned `BALLOON_UI_SOURCE_MISMATCH`; it did not substitute the older client.

Player version 465 (`e838cfcb-d22f-46d3-8445-174e74b74ade`) was activated at 2026-11-21T21:47:11.454318Z. The deployment owner observed the failure and restored version 464 (`8ed7d80e-16c3-41d6-b301-4b35668ff571`) at 2026-11-21T21:50:03.225518Z, deployment `752ad954-4e97-4633-bdc5-5d0bc594e591`. The original 21 local tests exercised the older template and did not establish the actual served-client integration. No paid round was used for verification.

The r2 candidate is rebased on the independently pinned current client from `superwin-library-100`, module `existing-new-wager-client-assets-r1.mjs`. Its relative `./wager-profile-client.mjs` import and that dependency's entire body are preserved. The fixture runs the exact existing higher wrapper against its original foundation HTML, so the current script URL and stake options are tested together. The old foundation module is retained for this HTML and the state-server fixture; its JavaScript is not the r2 candidate's source.

The source module's metadata and exact selected asset bodies are saved in `baseline/actual-served-assets.json`. The original wager-profile ID, model check, exact stake choices, minimum/maximum buttons and mismatch rejection remain intact.

## Reproduction and correction

The fixture executes the full pinned current client with a controlled clock, DOM and synthetic network. Its single import is linked to the exact unchanged dependency. No Canvas frame or paid game round is executed. It supplies the same response shape, without an authenticated field, and a 1,940ms response delay:

| After six simulated seconds | Original client | Corrected client |
|---|---|---|
| State requests started | 6 | 3 |
| Connection | Not connected | Ready |
| Local authenticated state | false | true |
| HOLD control | Disabled | Enabled |
| Notice | Initial sign-in message | Press and hold instructions |

The correction counts pending state reads and skips only overlapping quiet polls. Manual Refresh keeps its existing latest-response ordering. A fresh after-action read may still proceed while an old read is pending, and the original generation/sequence guards prevent stale results from restoring an earlier state. A finally block releases the pending count after success, rejection, timeout or a discarded stale result.

The candidate contains this small polling change only. Server response fields and authentication code remain unchanged. Tests run the pinned deployed Worker against synthetic identity responses as well: false identity and HTTP403 never reach the engine and keep client play disabled. A mismatched wager profile still prevents HOLD and stake changes.

## Verification

From this folder:

    node --test --test-reporter=tap state-polling.test.mjs deployment/route.test.mjs

The focused suite passes **23/23**: 13 client/state tests and 10 immutable-routing tests. Against the actual original client, the 13 state tests produce **10 passes and 3 failures**, reproducing the overlapping-read defects. Coverage includes slow successful responses, manual refresh ordering, fresh reads after actions, stale-completion races, timeout/retry recovery, false identity, invalid responses, preserved wager-profile controls, the unchanged dependency, canonical module loading and unchanged legacy/API delegation.

| Source | Bytes | SHA-256 |
|---|---:|---|
| Actual current `balloon/balloon.js` | 23,265 | `9a54803a1636d35670537de8e3e9da32aae6fd07039ee220b0771f4fe5a6e2d5` |
| Corrected r2 client | 23,399 | `a957319895ffca907db5a828608af684df1dd0ce4e78ebf1e81ebc31508761b9` |
| Unchanged wager-profile dependency | 1,661 | `34ce4a93a0ec5b530cdff846a26eb62364bcc789a5cdfc8d7a1ac0e7e1965b79` |

These are isolated Node fixtures, not a browser gameplay run. `verification.json` records the command, runtime, TAP counts and source hashes. `evidence/timing-fixture.json` contains the regenerated before/after trace for the actual served client. Historical first-attempt artifacts live under `attempts/v465/` and are not deployment candidates.

## Deployment package

The r2 wrapper serves two verified assets under `/native-library/balloon/20261121-state-r2/`: the client with its content hash in the filename and its unchanged relative-import dependency. Both use new release-specific keys in the existing `SSG_OFFICIAL_REFERENCES` KV binding. The old v1 and current wager-profile URLs continue to delegate to their retained handlers.

The wrapper replaces only the current Balloon script reference in canonical `/games/balloon_native` HTML. Its `type="module"`, existing stake options, other scripts and policies remain intact. The canonical page is no-store. Each new asset is served only after its byte length and SHA-256 match; missing or corrupt bytes produce an explicit no-store error with no old-client fallback.

At r2 preparation, active version464 contained 404 modules and latest uploaded version465 contained those same 404 plus the failed wrapper. The r2 deployment replaced only `balloonstatefix20261121/entry.mjs` in that latest bundle. Post-deployment verification confirmed **405 total modules**, all **404 original version464 modules byte-for-byte**, and the exact new wrapper hash with zero mismatches. Its import and named-export forwarding point directly at the retained Deluxe main. Both transport corrections, the Deluxe fix, all 18 bindings, runtime declarations and named handlers were preserved exactly.

`deployment/plan.json` retains the original rollback lease and latest-uploaded guard as historical preflight inputs. Both new KV objects were read back with matching complete byte lengths and SHA-256 values. `deployment/result.json` is the sanitized authoritative execution record.

## Live verification

The canonical Balloon page loaded the exact r2 script as a module and resolved its unchanged relative dependency. At `2026-11-21T22:02:53.971Z`, the deployment owner observed Ready and an enabled HOLD control, retried Refresh successfully, and changed the stake selection **1 → 2 → 1**. The existing stake choices were preserved. HOLD was not used to place a wager; this confirms connection and non-wager controls, not financial-round execution or complete provider visual/gameplay parity.

The original cropped control screenshot is **retained privately and excluded from GitHub**. Automatic approval review rejected its binary upload because the exact submitted payload could not be independently verified; no retry was made. It shows the resulting controls and Ready state with the entire account header removed. The retained JPEG is50,142 bytes,1363×864, with SHA-256 `a40f2af32558436f9d2f20b37888657f081f37e32e19d79682a34ba19097d9ee`. It is not a public file or a required public source pin.

The public `deployment/result.json` is an availability-annotated derivative of the authoritative deployment record. Its deployment outcome is unchanged; it replaces the former screenshot path with an explicit private-evidence record. The original record and screenshot are preserved privately, and no private storage identifier is published.

The next GitHub publication and exact-source CI result remain pending at this metadata checkpoint. The 23 focused tests above are the preserved local result for the unchanged r2 code; metadata updates did not rerun or replace them.
