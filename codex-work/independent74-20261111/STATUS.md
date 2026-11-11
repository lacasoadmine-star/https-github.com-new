# Superwin / ZPLAY 74-game continuation checkpoint

## Direction and source of truth

Finish construction first, then transfer the completed release to the existing intended website. The catalogue contains 74 titles; Multi Hot 5 and Foxy Hot 20 are protected and must remain unchanged. There are 72 independent machines under construction. The user’s latest stake requirement is **1 through 4,000 birr (ETB)**, inclusive. Apply it at the new-machine client, gateway and existing-service adapter; do not confuse 400000 minor units with 4000000. Do not replace them with a nine-game-only integration or rename a shared generic model to claim title-specific completion.

- Live r5 comparison: https://superwin-player.apdiy61.workers.dev/independent74/compare74.html
- Repository: `lacasoadmine-star/https-github.com-new`
- Continuation branch: `codex/independent74-build-first-20261111`
- Remote parent checkpoint: `ef0cf91bc506f9edac8b1a651f07164b9b384b5c`
- Project directory: `codex-work/independent74-20261111`
- Read `REFERENCE_OBSERVATION_PROTOCOL.md`, `tests/evidence/official-demo-progress.json`, `tests/math-official72-audit.json`, and `server/EXISTING_LIBRARY74_INTEGRATION.md` before continuing.

The last verified production Worker is r5, version `00a0e443-b3ce-4554-81d3-46304bea2b85`, deployment `597ca5e8-a2fe-4e96-aaf0-360a62c87035`. The historical 408 passing tests describe that checkpoint. They do not prove completion of the current construction or 100% provider equivalence.

## Current construction

The new account-only client, controller, renderer and audio modules cover all 72 independent IDs. The comparison page points to the new machine client. Browser-side outcome generation and local demo balances are excluded from the new release assets. Balances and round results must come from the existing account service; a signed-in production integration is not yet deployed.

The gateway has an authenticated account route, and the backend installer injects the retained LibraryService, native signature verifier and existing session resolution. It creates no new wallet, database or financial service. New rounds remain disabled by default. Financial tests use isolated fixture accounts and the retained SQL classes, never player funds.

Reference-driven changes include public geometry and disclosures, Multi Hot 5 Wild's observed symbols and five lines, participating wild expansion for Burn Wilds, Multi Hot 100 held-win/gamble handling, fixed-stake Plinko Classic color multipliers, and a PopX cascade model. These are incomplete independent implementations. Private provider probabilities, full bonuses, exact assets, full visual parity and every game-specific rule have not been established.

All 74 official public pages were read. The public-rules matrix records conflicting claims rather than silently treating them as resolved. Geometry has public support for only a subset of the 72 models. Official demo observations are recorded separately: 164 completed rounds are recorded across four titles, including one screenshot-supported round with moderate confidence. This is far from complete across all 74 games or the 10,000-total target.

## Verification and artifacts

The fresh full suite passed **651 tests, 0 failed**. The r6 build completed successfully with 72 account definitions and zero enabled real-money releases. Full-suite output and build output are stored in `work/complete74-test-output.txt` and `work/complete74-build-output.json`. Read their final summaries; do not assume an earlier partial run passed.

The backend installer and its source hashes, verification summary and test log are in `server/artifacts/`. The final owned backend/PopX suite passed 116 tests. Its data-URL import and signed HTTP → retained authentication → existing service → shared ledger replay test passed. PGlite is a single-connection fixture runtime, so this does not establish distributed production locking or performance.

`tests/machine74-browser.mjs` is written but has not successfully run. Local Chromium failed because its process socket was denied. Automatic approval review rejected running that isolated test outside the sandbox; the cloud browser also could not reach the terminal loopback server. These are blockers, not successful responsive or visual tests. No successful new-machine browser report exists.

## Still required before release

1. Observe every official demo and save per-game evidence. Count completed rounds only; distinguish public-page reads, UI observations, local simulations and official play.
2. Replace remaining generic assumptions with source-backed per-game geometry, paylines, paytables and feature behavior. Explicitly preserve unknown/private mathematics as unresolved. Plinko X's observed risk selector and ball counts are not yet implemented. PopX remains an authored single-player model, not the provider's shared session.
3. Complete and visually verify each renderer, controls, animations, audio, responsive layout, bonus flow and history. Execute the existing browser suite in a permitted environment and inspect actual evidence.
4. Verify retained production bootstrap wiring, session resolution, reciprocal active-round guards, accepted model versions and timer/reconciliation installation. Keep the existing release gate closed until those checks and the construction requirements are satisfied.
5. Prepare a reviewed release using the existing Worker/backend only. Preserve the original 304 Worker modules, bindings, exports and the two protected games. The Worker is near its uncompressed size limit: replace the four independent74 modules rather than appending duplicate releases.

No production deployment, production wager, real account/balance mutation or new infrastructure was performed during this construction checkpoint. Do not accept the unrelated existing Railway staged patch. Full Worker settings/source reads were rejected by automatic review because they could expose secrets; do not retry them through another route.

## Reproduce and continue

```sh
npm ci
npm test
node tests/update-official-demo-progress.mjs
node server/build-existing-library74.mjs
IND74_RELEASE=r6 IND74_EXPECTED_VERSION=00a0e443-b3ce-4554-81d3-46304bea2b85 node build.mjs
```

Read actual current remote state before later deployment; the version above is a checkpoint, not a promise that production has stayed unchanged. Continue through small verified per-game changes and keep the journal, unresolved gaps, source versions and passing evidence committed together. Parallel work is permitted when file ownership and integration are coordinated.

The local scratch Git baseline was reconstructed from an archive and is not the remote commit history. Continue from the saved remote feature branch; do not force-push the reconstructed local history over it.
