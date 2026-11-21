# ZPLAY — 72 additional games

This branch continues the existing repository from `1d0f4c9ddc9d14aacc436021ed0bcb2b27dd85f0`. It is preparation for a single additional release. All existing game source, assets, routes, records, accounts, balances, sessions, Player/Agent/Admin boundaries and Telebirr behavior remain outside this change.

## Identity and scope

`registry.json` contains 72 new stable internal identities: the user's 57 names followed by 15 additional identities verified against the current official SmartSoft catalog. The current catalog had 75 distinct product/launcher identities; Multi Hot 5, Foxy Hot 20 and Habesha Fortune 5 are excluded from the new set. Existing games with the same display name retain their old IDs and routes. No alias or old implementation is counted as a newly completed game.

New identities use `zplay72_<title>_v1` and `/new-games72/<title>/`. These are reserved IDs/paths; reservation does not create a playable game. Keep these IDs stable when upgrading the separate rules/engine/assets versions.

The preservation baseline records 74 entries from the retained source catalog. That source inventory is not a complete fresh production availability audit. Activation requires a fresh check of the actual live Worker, its modules/configuration and existing server versions. Existing uncommitted work in other checkouts was preserved; it was not silently copied into this release.

## Work produced here

| Area | Code and evidence | Actual scope |
|---|---|---|
| Fresh identities | `references/`, `registry.json` | Current provider pages and demo identities; published copy is not a full paytable |
| Capture | `capture/` | Game-specific driver contract, separate round observations, durable action recovery, bounded concurrency, artifact hashes |
| Round recovery | `shared/` | Existing session/SPIN contract, stable request token, status-first replay and cooperating-client retry deadlines; 49 isolated tests |
| Roll X | `games/roll-x/` | Seven-round/control evidence, partial arithmetic and receipt-driven frontend 0.2.0 with editable AUTO stake/target; 57 local tests; browser acceptance pending |
| Multi Hot 5 Deluxe | `games/multi-hot-5-deluxe/` | Seven-round/video evidence, supplemental bound paytable evidence and five-line arithmetic; 23 tests; full engine and cash remain closed |
| Multi Hot 5 Wild | `references/access-survey/multi-hot-5-wild-followup-blocker.json` | Earlier entry-only sound prompt followed by a separately recorded country restriction; zero gameplay rounds |
| Hot Samba | `games/hot-samba/` | Actual provider country-restriction screenshot; zero gameplay observations |
| Release | `release/` | Exact-72 proof checks, legacy collision prevention, all-or-nothing activation, new-wager-only rollback |
| Lobby and asset integration | `integration/` | Additive catalog and unmounted content-pinned asset router; 32 tests; legacy paths pass through and exact retained historical assets remain available |

The capture drivers, game models, controllers and assets for the other titles are not implemented by naming their paths. The matrix distinguishes reserved paths, partial references and actual source files.

## Existing-system boundaries

The new shared client uses the already implemented same-origin `/api/slots/fresh-state` and `/api/slots/spin` contracts. Request recovery uses the original SPIN body with `replayOnly: true`. It does not invent an independent backend, ledger, account or credential store.

The existing server has not registered these new game IDs. Games with selected targets, cashout, continuing rounds, gamble or bonus state need explicit game-specific adapters on that server. In particular, Roll X's chosen target must be authenticated and persisted with the accepted request; the old seven-field SPIN contract cannot silently discard it. New wagers remain closed.

`integration/catalog.mjs` appends a complete reviewed publication to a copy of the old catalog. It does not install a route or authorize a bet. Its new section is absent while preparation is inactive. Runtime code must lazy-load the selected game's assets; reference screenshots/video are never gameplay frames.

`integration/asset-router.mjs` is an unmounted Worker-compatible integration component. It validates trusted complete publication/release manifests, source versions and asset size/SHA-256 before returning immutable release-specific assets. Missing or mismatched files produce explicit `no-store` errors without an old-release fallback. Each explicitly retained historical release is verified independently and remains available at its exact immutable URLs when the current publication is absent, closed or invalid. This does not authorize new wagers or change existing routing.

## Evidence and tests

Run focused local tests from this repository:

```sh
node --test \
  codex-work/new-games72-20261121/capture/*.test.mjs \
  codex-work/new-games72-20261121/shared/*.test.mjs \
  codex-work/new-games72-20261121/release/*.test.mjs \
  codex-work/new-games72-20261121/integration/*.test.mjs \
  codex-work/new-games72-20261121/games/roll-x/tests/*.test.mjs \
  codex-work/new-games72-20261121/games/multi-hot-5-deluxe/tests/*.test.mjs
node codex-work/new-games72-20261121/release/check-current-registry.mjs
```

The second command deliberately exits 2 while the identity registry is valid but required game-release evidence is missing. Do not weaken that gate to manufacture completion. Synthetic unit fixtures verify their named component only; they do not establish real ETB settlement, provider probability distributions, licensed asset parity, mobile-device performance, or live deployment.

The current combined source-bound local report records 221 passing tests: capture 34, recovery 49, release gate 26, integration 32, Roll X 57 and Deluxe arithmetic 23. No failure, skip or cancellation was counted as a pass. Canonical seven-manual-round evidence remains two games; recovered supplemental Deluxe desktop result images add zero rounds. The registry has 68 reference-pending, two reference-partial and two reference-blocked games. Release-ready and live-verified counts remain 0/72, and all new backend IDs remain disabled.

## Restoring packaged reference images

The source-publication transport packs 65 reference/recorded-QA images in eight archive parts, `evidence-bundle/public-references-20261121.zip.part-001` through `.part-008`, with exact paths, byte lengths and SHA-256 digests in [`evidence-bundle/index.json`](evidence-bundle/index.json). Another 17 binaries (16 images and the canonical video) are published individually. The full ZIP is not stored in the checkout. Both history images are withheld from public publication and indexed as unpublished; their originals remain local. After checkout, restore the public images before evidence checks or matrix regeneration:

```sh
python3 codex-work/new-games72-20261121/evidence-bundle/materialize.py --root .
```

The local materializer verifies the archive and every listed image before writing, restores the original evidence paths, and refuses to overwrite differing existing files. It downloads nothing. Per-game evidence indices and round counts remain unchanged; this archive contains no gameplay runtime assets. Packaging/integrity checks are recorded separately from the 221 component tests.

No setup/reset/seed command, production ledger test, paid live SPIN or deployment activation is part of this preparation. The release opens only after all 72 games pass their individual and integration requirements. Disabling a new game's future rounds must preserve accepted-round recovery, historical rules/assets, ledger entries and balances.

## Continue without losing work

Use the root `NEW_GAMES_72_MATRIX.md` and `PROJECT_PROGRESS.md`, the current registry, the captured evidence indices, and `release/peer-review.json` when present. Read each open defect and its actual retest result. Preserve completed captures for the same version; an expired session or missing control resumes its own unfinished work rather than restarting every game.

`build-registry.py` is a one-time importer from the retained fresh identity seed. It refuses to overwrite an existing registry. Update individual records as work is verified, and regenerate the matrix without deleting prior history.
