# Game 1: same-Player test page

This attachment serves **Multi Hot 5 Burn Wilds only** through the existing
`superwin-native-presentation` Worker. The live Player already forwards
`GET` and `HEAD` requests under `/native-ui/` to that service.

## Page and server contract

- Page: `/native-ui/new90/burn-wilds/` on the existing Player origin.
- Client: `entry.mjs`, with the explicit **Start server test** action.
- Display currency: **TEST ETB**, mode `SIMULATION`, cash disabled.
- Backend base: `/api/slots/new-games90/burn-wilds/test/`.
- Existing Player proxy rewrites `/api/slots/` to `/api/` on the existing
  `superwin-nine-slot-engine` Railway service.
- The presentation attachment has no API handler, wallet, RNG, account access,
  cookie write or provider iframe.

The bootstrap owns `#burn-start-server-test`, `#burn-test-status` and
`#burn-wilds-root`. Optional server history uses `#burn-test-history`,
`#burn-refresh-history` and `#burn-history-output`.

`?viewport=360`, `?viewport=390` and `?viewport=430` constrain the game container
for layout inspection in a desktop browser. They are **container previews**,
not device emulation or proof of physical mobile performance. The default
page also adapts to a genuinely narrow browser viewport.

## Static-source boundary

Only the exact client filenames in `BURN_TEST_CLIENT_FILES` are exposed. The
build validates local import closure and refuses external imports or imports
of files outside this set. `server/`, tests, candidate RNG, source references
and integration tooling cannot be fetched through the game prefix. Client
paytable and accepted-result auditing modules remain public by design.

All paths outside the new prefix retain the previous service's original
request, environment, context and response behavior. The prior presentation
module is copied byte-for-byte and its SHA-256 must match the inspected source.
The build retains the existing service's operational settings and requires
the original no-binding configuration.

## Build and verification

Run from the repository root, with the independently saved current service
backup and an output directory outside this source tree:

```sh
node --test codex-work/new-games90-20261123/burn-wilds/player-integration/page-worker.test.mjs
node codex-work/new-games90-20261123/burn-wilds/player-integration/build.mjs \
  --previous-module /absolute/backup/presentation-service-entry-r23.mjs \
  --out /absolute/reviewable-release
```

The backup directory must also contain `settings.json` from the inspected
existing Worker. The build generates four Worker modules and a release
manifest containing exact hashes, sizes, target, preserved source and upload
metadata. It performs **no deployment**.

Before an authorized deployment, recheck the target's active version and
settings. Upload the manifest's modules and metadata to
`superwin-native-presentation` only; verify the uploaded version, then deploy
that exact version and inspect the same-origin Player page. Do not deploy the
parent Player's separately uploaded version 473 as part of this change.

At this implementation checkpoint the original child version is
`be700a79-c11c-4094-b734-c68e1eb63c76`; the full preserved source hash is
`4ee86c4149fc920685df98555feab00adc9662a59e6b08e1df3ad938d1e1c423`.
Those values are preconditions, not assertions about a later active version.
