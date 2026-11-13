# Superwin 74-title catalogue

This additive release restores a visible catalogue at `/new74/` and a compact
entry on the existing player homepage. It lists 74 titles in the reviewed
catalogue order, links 16 titles to existing game pages, and leaves 58 titles
disabled with **Weli diyaar ma aha**. A link means that the corresponding page
and title identity were observed; it does not certify complete gameplay or
financial behavior. This change does not create 74 game engines.

The lobby provides name/index search, availability filters, name sorting,
responsive cards and keyboard-accessible controls. It uses 59 fresh, clear
poster images; the other 15 cards have CSS placeholders. It does not substitute
recorded clips for games or introduce account, wallet or outcome logic.

## Source and assets

`public/` contains only the four reviewed text files. The 59 JPEG assets are
uploaded separately to the existing website, under the content-addressed paths
already referenced by `public/lobby.mjs`. They are deliberately absent from
this code-only repository folder. A source checkout therefore is not a complete
standalone asset bundle.

`worker/new74-router-r1.mjs` contains the exact approved public-file allowlist.
The four lobby files and 59 images use `new74/20261113-all74-r1/`. Existing game
support files, the two existing `/new74` game routes and their assets retain
`new74/20261113-pair01-r1/`. Requests outside `/new74` pass through to the
unchanged parent handler. The homepage entry removes only the previous
catalogue-hiding style and maintains its own link across SPA navigation.

## Local checks

Use Node.js 22 or later and Python 3.10 or later. Run from this folder:

```sh
node --test worker/new74-router.test.mjs worker/stage-new74-version.test.mjs tests/catalogue.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

The tests use synthetic fixtures and mocked connector calls. They do not
upload, stage or deploy anything, and do not require the private asset bundle.

## Preparing a reviewed release

The deployment operator supplies the separately reviewed poster assets and a
private manifest with `files: [{path, bytes, sha256}]`. The manifest must cover
exactly the four public text files and 59 hash-named JPEGs. Current Worker
metadata, the original router and target identifiers are private inputs, not
repository files.

`worker/build-staging-artifacts.py --help` describes the required CLI inputs.
Unlike the one-time deployment preparation, this repository copy has no
embedded account or baseline version identifier. It requires explicit expected
version, version number and module count, verifies the private baseline and
public file hashes, and writes the router and connector request files locally.
Running the builder makes no network request.

`python3 prepare-kv-batches.py <release-directory>` prepares local upload batches
once the complete reviewed public asset directory is present. The operator
uploads those assets to the existing site's KV storage separately. Running this
script does not upload them.

The staging helper is an explicitly invoked function, not an automatic deploy
command. It checks the latest version and active deployment, verifies the
reviewed original modules/configuration, and can stage a router-only change
with traffic deployment disabled. It verifies the staged bytes and unchanged
configuration before returning. Its mocked tests cannot establish remote API
availability. Traffic publication remains a separate reviewed action.

Keep generated manifests, request bodies, upload batches, receipts, current
Worker dumps, account identifiers and capture files outside Git. The local
ignore rules cover the conventional generated paths. Only the four files under
`public/` and the separately uploaded approved images are public site content.
