# Current requested82 — Multi Hot 100 host composition

This source continues **Multi Hot 100**, the first title in the latest24 November list, under its existing separately reserved new identity `zplay72_multi_hot_100_v1`. It preserves every existing game, account, route, wallet and service. The full exact user list remains in `../requested.json`; this does not restore the older90-name task.

The continued own M100 controls now reject a prior SPIN receipt, TAKE acknowledgement or GAMBLE acknowledgement while a different request is pending. Previously a known old response could return an idempotent no-op while silently leaving the later action waiting. Sparse winning-line arrays are also rejected before state changes. Existing duplicate handling remains idempotent when no later request is waiting.

The new controller composes those controls with an injected authoritative host and a receipt-bound presentation. One accepted input supplies one original request key; STOP changes presentation only; an uncertain SPIN/TAKE/GAMBLE recovers the identical payload through the host's recovery operation. Hidden/disposed pages and reentrant or throwing UI callbacks cannot create another action. TAKE remains usable inside the controller's own double dialog. No transport URL, balance, random result, payout model, full AUTO policy or production settlement is invented.

The presentation follows host-supplied progress/clock values. It cannot finish without an accepted receipt or replace an immutable accepted result. It does not claim measured provider timing.

Verification completed:
- Exact source `f35e68a9752489734c316d314f2ba806193ef6ec` passed [CI45495792749](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/45495792749), job138805807149: **24 current protocol tests,7 retained presentation tests,9 disposable backend tests and all3 existing portal builds**. Workflow and job both report success. Decoded job logs were inspected.
- Before publication, all24 protocol cases also passed an in-tool V8 sanity run with a structured-clone shim. The four targeted stale-response/sparse-array cases failed against the retained controls in that same harness.
- These are source/component and existing-platform checks. No browser/official-demo round, audible comparison, source-complete game, ETB round or production deployment is established.
- The component uses the retained own M100 atlas decoder/symbol-name dependency, with no artwork or private capture bytes included. No provider program or user-uploaded video/screenshot is used.

Run `node --test codex-work/requested82-20261124/multi-hot-100/controller.test.mjs`.

## Unfinished game work

The own M100 visual/asset closure, measured motion/audio and real browser controls still require current official comparison. Its complete legal outcome model and existing-wallet server attachment remain unfinished; the retained reference explicitly leaves payline45/46 and complete probability/aggregation details unresolved. This source is not attached to a live financial route. All new-game completion and live deployment claims remain false.

The cloud environment still fails startup and previously reports `github_connector_not_configured`. Source and CI work can continue through connected GitHub; official interactive play cannot be claimed while the browser runtime is unavailable.

## Accepted-result recovery after a presentation failure

The controller now distinguishes a lost authoritative reply from a failure to present an already accepted reply. If acceptance/drawing fails after the controls retain the immutable receipt, RECOVER restores that exact result locally and finishes presentation without another SPIN/TAKE/GAMBLE request. A winning amount stays pending until the existing host acknowledges TAKE or a subsequent SPIN collection. No balance is changed by presentation recovery.

Broken frames are suspended until recovery. A failed, conflicting or hidden/disposed recovery cannot finish the round; it retains the same accepted receipt. Eight additional isolated cases cover these paths. Exact source `45a3a4f15e143ea69aa4d7ccac2e4c2df2ca146c` passed [CI45505483877](https://github.com/lacasoadmine-star/https-github.com-new/actions/runs/45505483877), job138839477494: **32 current protocol tests,7 retained presentation tests,9 disposable backend tests and all3 portal builds**. The workflow/job both completed successfully and decoded logs were inspected. In-tool V8 sanity also passed all32 cases; all8 added cases fail against the preceding source in that shim-based harness. The earlier CI above remains an explicitly historical source checkpoint. No browser/provider comparison or new game deployment is implied.
