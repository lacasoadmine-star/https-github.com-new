# Retained renderer inputs

These four files are exact read-only rendering and layout snapshots from the
retained `local-qa-r3` presentation stage. `provenance.json` records each byte
length and SHA-256 hash. They contain no assets, account records, controller,
session adapter, wallet or network transport implementation.

The Habesha renderer matches the retained checkpoint presentation. The Deluxe
renderer and layout include the later local desktop presentation work. That
work was not part of the verified remote checkpoint
`f116c93b7bd91fc53301882c2ba6daca106b3d6b`; the source-state distinction is
recorded in the provenance file.

The default `symbol-geometry.test.mjs` run verifies these hashes, copies the
inputs to a temporary directory, applies the QA-only geometry correction,
loads the actual renderer classes with isolated drawing dependencies, and
removes the temporary directory afterwards. It never imports the production
controller or contract implementation, starts a game session, requests a
round, accesses an account, or loads external media.

From the `codex-work/native72-20261119` directory:

```sh
node --experimental-vm-modules --test qa/freeplay-ui/symbol-geometry.test.mjs
```

All actual-renderer checks run by default. `FREEPLAY_STAGE` remains optional
for inspecting a separate, already patched local QA stage.
