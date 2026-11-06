# Two-game public-demo corrections and HTTP/2 fix

Status: binary packaging hotfix Worker308 is active; the compatible r13 frontend and versioned Railway rules update are prepared for publication. The final publication record will replace this status after live verification.

Only Multi Hot5 and Foxy Hot20 receive new game rules and native controls. Reference material comes from the official SmartSoft public DEMO sessions and public assets; no user-supplied video or screenshot was used for these corrections.

## Public rules and controls

- Foxy: eight symbols; new paid rounds no longer include the invented ninth scatter or award free spins. Twenty authored line paths, the original numeric wager ladder and five red/black gamble attempts replace the previous definitions.
- Multi Hot5: middle/top/bottom line numbering and both diagonal paths match the official demo. The maximum win is145×, with the original numeric wager ladder and five gamble attempts.
- The numeric demo wager ladders are adopted as this operator's ETB profile, without representing a currency conversion. Existing settled wagers retain their original currency, values and model.
- Native AUTO panels differ by game. Foxy has25/50/100/500/1000, default100, explicit START and individual-win/net-profit/net-loss stops. MH5 has10/25/50/75/unlimited, defaultunlimited, net-profit/loss stops and a strict greater-than25× BIG WIN stop. Foxy's five-row wager selector and MH5's horizontal stake carousel follow their respective demos.
- Original red/black gamble artwork, cards, controls and sounds replace the generic dialog. Results still come from validated server receipts. The visual win is collected at the native interaction point while the server ledger remains authoritative.
- MH5's source-defined background0.3 and win0.6 gains correct the audio mix without changing MP3 bytes. Existing native animation assets, authored curves, full music and selected-game loading remain intact.

## Existing balances and rounds

The original engine remains frozen and independently hashed. Earned Foxy free spins continue under their original rules, locked wager and retrigger behavior until used; no balance, receipt or free-spin rows are rewritten. Settled tokens replay before current-wager validation. Parent receipt identity selects the appropriate old or new gamble limit. The other nine games retain their original mathematical models and seeded results.

The frontend accepts both exact versions during rollout and uses an authenticated state endpoint to select the next round. New paid target requests must pin the current model; stale clients receive409 before debit. A model, wager or free-spin transition requires the player to review the updated SPIN selection. The compatible frontend must be published before the backend. After backend activation, do not restore a frontend that cannot interpret current receipts. Once new-model receipts exist, backend rollback must also retain the version dispatcher and parent-receipt handling; prefer a compatible roll-forward. New gamble requests pin the displayed stake and attempt, checked atomically after replay lookup and before debit. Legacy saved choices without those expectations are replay-only and cannot create a new unknown wager.

## HTTP/2 resource failure

Raw CDP Fetch.getResponseBody captured43 Cloudflare1102 responses and two1105 responses from the earlier asset package. Prior response.text diagnostics could silently refetch an empty failed response and did not preserve its original body. Request-admission failures were also absent from the sampled Worker fetch-error analytics.

Worker308 replaces the30MB JavaScript string asset bundle with immutable binary modules and64KiB streaming responses. All41 asset response hashes remained identical. The unchanged portal and all four game entries then passed in fresh browser contexts over actual HTTP/2:230 network responses, zero5xx responses, zero failed requests and zero browser exceptions. A runtime profile showed approximately119MiB p99 memory, versus approximately191MB before the change. Evidence is under evidence/r13; this verification applies to308 and is separate from the final r13 verification.

| Hotfix record | Value |
|---|---|
| Source | ba77c7923269d8411e602e2666c9d38bdd0d4bd6 |
| Worker version |308 /2fad5f75-d154-41a0-8d64-12597a95d42e |
| Deployment |33f3569e-b095-440c-b51c-6c53ee12c66d |
| Activated |2026-11-06T21:23:50.534541Z;100%traffic |
| Preservation |113 unrelated modules byte-identical;12 bindings and settings unchanged |

## Verification and limits

The versioned backend's39 focused tests cover all nine unaffected models,360 seeded settlements, all25 authored paths, legacy free-spin/replay preservation, exact model pins, gamble limits, concurrent duplicate calls, double-entry conservation and rollback at three injected failures. Tests use synthetic dependencies rather than production wallets. The hotfix also passed494 Node tests,9 platform tests and all three frontend builds. The final r13 Node suite passes520/520 checks. Native help passes123/123 focused browser checks at360px,390px and430px across both games; native gamble and audio pass48 focused tests and isolated browser scenarios. Integrated current-model browser scenarios are running before publication. The frozen frontend has57 assets and31,593,696 bytes.

Public artwork, rules and observed behavior can be compared directly. The provider's private reel probabilities, wheel weights and RNG are unavailable; existing non-scatter Foxy strip ordering/counts and MH5 strips remain local. No provider RTP or100% mathematical equivalence is claimed. Both public demos configure a500DMO gamble limit; natural MH5 wins of2000 and2100 offered no gamble. The new ETB operator profile disables gambling above500ETB. The exact provider comparison for wins between250 and500 remains unverified; accepting500 as the maximum stake is an explicit local profile choice, not a proven private-provider boundary.
