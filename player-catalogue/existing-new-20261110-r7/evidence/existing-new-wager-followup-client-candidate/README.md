# Existing NEW wager frontend — prepared candidate

This candidate covers only the existing Multi Hot 40 and Balloon launch pages.
It matches the separately reviewed `existing-new-etb1-40000-v1` profile and its
fifteen ETB presets: 1, 2, 5, 10, 20, 50, 100, 200, 500, 1,000, 2,000, 5,000,
10,000, 20,000 and 40,000.

No deployment, Git write, real session or wallet wager was performed here.
Both imported new model definitions remain `launchable:false`. The client does
not open their release gates, change server calculations or fabricate balances.

## Exact source and scope

The builder verifies these active source module hashes before reading them:

| Source | SHA-256 |
| --- | --- |
| `balloon-assets-20261108.mjs` | `83f5b55ca75c9c5af44692932716501c8825ac14e7072b9161bda1ea63574ff8` |
| `expansion-client-assets-20261108-fetch-fix.mjs` | `5a818240cf8ad2d051774ffbc2dbc22743d79bfc65c60258a79bdb649058032a` |

The full files are retained in `../../current-new-modules/`. Later recovered
source copies differ and are not used for these transforms.

Only `/games/multihot40_native` and `/games/balloon_native` are rewritten.
MultiHot5, FoxyHot20, JetX, the ten current demos, all financial API routes and
the old immutable static prefixes retain their existing handlers and bytes.

## Changes

- Balloon's HTML contains all fifteen presets. Its original select, plus/minus
  controls and request functions remain in use. Boundary buttons now reflect
  both button presses and native select changes.
- MultiHot40 consumes a versioned catalog derived directly from the new model's
  public configuration. The corresponding manifest binds the current model and
  wager profile while preserving every existing geometry/artwork field.
- A new start requires the exact advertised new model version, profile ID,
  preset ladder, limits and `launchable:true`, plus the original authenticated
  session, balance, accepting and pending-action checks. Old or closed server
  profiles leave new starts disabled.
- Old accepted rounds remain actionable under their stored `model_version`.
  MultiHot40's displayed active bet now uses the accepted `round.stakeMinor`;
  this fixes the old default-stake display after reload. Existing history,
  pending-request storage, retries and action bodies remain byte-identical.
- MultiHot40 help labels the model's return as **before currency rounding**.
  It no longer uses the previous hardcoded exact-RTP fallback for this profile.
- The exact old MultiHot40 SpinHold class produced a native Chromium `Illegal
  invocation` on pointerdown: native timer functions were invoked with the
  controller as their receiver. Only the new namespace's timer defaults are
  bound to `globalThis`; the held-spin state machine is unchanged.

Balloon has no existing history-page API. This candidate preserves its accepted
round, replay refresh and original-model action contracts without adding one.
MultiHot40's dedicated renderer has no rejection based on receipt model version;
it receives the original grid, stake and winnings. Old receipts are never
relabeled with the new version.

## Immutable paths and module composition

New prefix: `/native-library/existing-new/20261110-etb1-40000-r1/`.

| Family | New suffix | Retained fallback |
| --- | --- | --- |
| MultiHot40 | `multihot40/` | `/native-library/expansion/r1/` |
| Balloon | `balloon/` | `/native-library/balloon/v1/` |

The seven changed static responses are served by the existing Library Worker
under `/v2/remaining20/client/existing-new-etb1-40000-r1/`. The Player keeps a thin
proxy and HTML transform. Library calls strip player credentials. GET, HEAD,
ETag/304 handling and bounded gzip HTML rewriting are verified.

`manifest.json` is the authoritative file inventory. It lists three Player
modules totaling **6,312 bytes** and three Library modules totaling **180,516
bytes**. The entry templates currently wrap the r6 entries. Root must recheck
the actual active entry chain before staging, including any separately released
older-three zoom wrapper. Its recognized HTML paths include these exact new
app paths, so either wrapper order can retain the scoped additions.

Do not activate this frontend ahead of the matching reviewed backend profile:
its intentional compatibility guard would pause new starts against the old
server definitions. Activation and rollback must be coordinated with the
versioned registry, while historical accepted rounds stay available.

## Verification

Run from this directory:

```bash
node build-client.mjs
node --experimental-vm-modules verify-client.mjs
node verify-browser.mjs
```

`verification.json` records seven passing source/route/import groups. Both actual
app graphs link through their own families: ten modules for MultiHot40, two for
Balloon. The tests verify source hashes, draft-model/catalog equality, unchanged
art geometry, strict new-start compatibility, old receipt display, protected
route delegation, immutable old responses, original request/history sections,
and exact static response behavior.

`browser-verification.json` records five passing groups across eight isolated
local Chromium contexts. Every request is intercepted; zero external requests
or real financial actions are performed. The fixture tests cover:

- Old-server and closed-new profiles disable new starts for both titles.
- MultiHot40's thirty ascending/descending selections make no action request;
  an explicit local Spin sends the selected 40,000 stake and new model version.
- The real timer-fixed SpinHold arms, launches once, then stops on pointercancel.
- MultiHot40 restores an old accepted 100 ETB stake, collects with the old model
  version and opens an old history replay without another action.
- Balloon's twenty-eight ascending/descending plus/minus steps make no action
  request; the native select updates its boundaries. An explicit local HOLD
  submits the selected new stake/model, and an old accepted round still uses
  the original model for hold/collect.
- Selected controls are checked at desktop and 390/844 px widths. The tested
  pages report no JavaScript errors or unlisted requests.

These are **UI fixtures, not wallet or payout proofs**. MultiHot40's canvas
presenter is replaced only inside the fixture by an explicit state recorder;
the actual app, session, SpinHold, dialogs, catalog and history code execute.
Balloon runs its actual canvas client. Captured screenshots visibly say
“LOCAL UI FIXTURE — no real wallet.” The separate parent-folder model/registry
suite owns canonical settlement, reserve, scaling and idempotency verification.
