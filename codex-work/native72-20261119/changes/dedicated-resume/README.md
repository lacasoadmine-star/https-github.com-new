# Dedicated Habesha and Deluxe continuation

This checkpoint continues the existing Player project from Worker v457
(`11ec5499-9697-4063-bf3f-92252c32f89d`). It introduces separate Habesha r8 and
Deluxe r2 presentation releases, with a common transport/lifecycle foundation.
It creates no Worker, Railway service, database, domain or wallet.

## Ownership and identity

- `games/habesha/` owns Habesha's model, renderer, layout, audio bank adapter,
  startup, help, gamble and controls.
- `games/deluxe/` owns Deluxe's model, renderer, layout, audio bank adapter,
  startup, help and controls. Its existing credited-win gamble API remains intact.
- `shared/` owns session validation, saved-request ownership, receipt validation,
  authoritative balance display, audio/lifecycle primitives and animation runtime.
- `deployment/` adds three modules around the existing Worker entry. Exact manifest
  bytes are pinned in the uploaded module, eliminating the launcher's separate
  manifest KV read. Each asset is still checked for MIME, length and SHA-256.

The game modules import their own model and presentation assets and the explicitly
versioned shared namespace. They cannot select a foreign game's model. Existing
math versions and probabilities are unchanged; these are the existing local game
models, not newly certified provider mathematics.

## Correctness fixes

Request completion requires the same saved token and Player session. Delayed spin,
gamble, model, history and balance responses cannot replace newer account state.
Definite pre-settlement rejections clear the pending request and restore controls.
Ambiguous failures retain the original token so confirmation cannot create a second
debit. Rechecking a session closes the old gamble dialog.

Both games suspend audio immediately on blur, hiding and page-cache suspension.
Presentation clocks and remaining one-shot sound offsets resume coherently.
AUTO counts select only; START PLAY is the only launch action. Invalid threshold
input remains invalid through the shared controller and cannot fall back to a
default count. Paytable bet previews never change the actual selected wager.

Deluxe has its own wide and portrait cabinet, moving side multiplier, five-row
right-side bet list, linked Effects/Music switches, and dedicated dialogs. The wide
geometry was measured from its own public demo. Further visual acceptance is
recorded separately from code and HTTP checks.

## Reproduce the package

`release-checkpoint/` stores exact manifests, original HTML and normalized source
and asset metadata. Original media stays in its existing content-addressed store.
The restoration script verifies every reused or downloaded byte.

```sh
node qa/restore-dedicated-inputs.mjs --out /absolute/path/to/baseline
node qa/build-dedicated-packages.mjs --baseline /absolute/path/to/baseline --out /absolute/path/to/stage
node changes/dedicated-resume/deployment/build-pins.mjs /absolute/path/to/stage
```

The builder rejects foreign dependencies, missing files, changed original bytes,
404 placeholders, and changes to either pinned game model. Archive a new coherent
checkpoint only after rebuilding its stage:

```sh
node qa/archive-dedicated-checkpoint.mjs --stage /absolute/path/to/stage
```

## Validation and release

```sh
DEDICATED_QA_STAGE=/absolute/path/to/stage node --experimental-vm-modules --test \
  changes/dedicated-resume/tests/*.test.mjs qa/fixtures.test.mjs \
  qa/deluxe-renderer.test.mjs qa/deluxe-style-integration.test.mjs \
  qa/package-http-smoke.test.mjs qa/worker-version-transfer.test.mjs
```

The local HTTP fixture is isolated in memory, refuses unknown API endpoints, and
cannot forward transactions to production. Its simulated spin/gamble receipts use
the real staged validators. Production verification only makes read-only requests.
The Cloud browser could not reach the local fixture server; no local browser spin
test is claimed. Use the separate live UI verification record for observed views.

`qa/worker-version-transfer.mjs` preserves all 393 v457 module bodies byte for byte,
inherits all 18 existing bindings, and retains existing assets. A version upload
and a traffic deployment are separate steps. Verify the new version's configuration
and retain v457 as the rollback anchor before switching traffic.

The 72-game inventory is `qa/game-progress.json`. Available Play Now routes and
rebuild completion are separate fields; a catalog listing is not a completed game.
Each later game requires its own reference, implementation and validation record.
