# Editable sources for the current ten clients

These are exact UTF-8 sources recovered from the immutable Player v354 /
Library v33 `accepted-controls-r12` asset package. Eight upstream client groups
serve ten games through twelve cash/demo pages. They include the deployed
accepted-stake recovery changes; the older `../client/app.mjs` is a separate
prototype and must not replace these clients.

`clients/<group>/app.mjs` is editable source. `accepted-controls.mjs` is the
shared helper. Existing upstream dependency paths and per-game imports are
preserved. This directory is a packaging input, not a standalone web root;
dependencies continue to resolve through the existing r12 Worker wrappers.

Run `node build.mjs --check` from this directory to compare every source byte
with the released assets. To build a fresh candidate after editing:

```sh
node build.mjs --output /workspace/work/accepted-controls-candidate.mjs
```

The output includes all nine public asset entries and a SHA-256 inventory.
Nothing is uploaded or deployed. Validate an edited candidate against the
actual per-game pre-paint paths and browser flows before publishing it through
the existing Player/Library. Existing published release files stay immutable.
Ice rendering sources are already editable in `../ice-receipt-r11/client/`;
that separate package retains its recorded receipt and Worker checks.
