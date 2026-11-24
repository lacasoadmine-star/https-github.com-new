# Current requested82 — Multi Hot 100 host composition

This source continues **Multi Hot 100**, the first title in the latest24 November list, under its existing separately reserved new identity `zplay72_multi_hot_100_v1`. It preserves every existing game, account, route, wallet and service. The full exact user list remains in `../requested.json`; this does not restore the older90-name task.

The continued own M100 controls now reject a prior SPIN receipt, TAKE acknowledgement or GAMBLE acknowledgement while a different request is pending. Previously a known old response could return an idempotent no-op while silently leaving the later action waiting. Sparse winning-line arrays are also rejected before state changes. Existing duplicate handling remains idempotent when no later request is waiting.

The new controller composes those controls with an injected authoritative host and a receipt-bound presentation. One accepted input supplies one original request key; STOP changes presentation only; an uncertain SPIN/TAKE/GAMBLE recovers the identical payload through the host's recovery operation. Hidden/disposed pages and reentrant or throwing UI callbacks cannot create another action. TAKE remains usable inside the controller's own double dialog. No transport URL, balance, random result, payout model, full AUTO policy or production settlement is invented.

The presentation follows host-supplied progress/clock values. It cannot finish without an accepted receipt or replace an immutable accepted result. It does not claim measured provider timing.

Verification at source preparation:
-24 isolated protocol/regression cases prepared. All24 passed an in-tool V8 sanity run with a structured-clone shim; the four targeted stale-response/sparse-array regressions fail against the retained controls. Exact Node22, preserved7-case presentation suite, disposable backend tests and all3 portal builds are configured in the dedicated feature-branch workflow. Their actual CI outcome must be recorded separately.
- No browser/official-demo round, audible comparison, source-complete game, ETB round or production deployment is established by this checkpoint.
- The component uses the retained own M100 atlas decoder/symbol-name dependency, with no artwork or private capture bytes included. No provider program or user-uploaded video/screenshot is used.

Run `node --test codex-work/requested82-20261124/multi-hot-100/controller.test.mjs`.

## Unfinished game work

The own M100 visual/asset closure, measured motion/audio and real browser controls still require current official comparison. Its complete legal outcome model and existing-wallet server attachment remain unfinished; the retained reference explicitly leaves payline45/46 and complete probability/aggregation details unresolved. This source is not attached to a live financial route. All new-game completion and live deployment claims remain false.

The cloud environment still fails startup and previously reports `github_connector_not_configured`. Source and CI work can continue through connected GitHub; official interactive play cannot be claimed while the browser runtime is unavailable.
