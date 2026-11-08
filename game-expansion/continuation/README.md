# ZPLAY requested machine continuation

`requested-list.json` records the latest direct instruction: build the named 23 machines using each title's official demo as its reference. Preserve the four existing MultiHot5/FoxyHot20 variants and the already started JetX and Balloon releases. FootballX is outside this replacement queue. The earlier 20- and 25-title selections are historical records, not the current scope.

## Current release status

Balloon is already published on the existing player Worker. The new 23-machine continuation is an unpublished development checkpoint. There are 21 identified draft engines; the exact official DarkHorus and Assassins identities remain unresolved. None of the new 23 machines is enabled for a production wager or added to the live catalogue.

`release-readiness.json` records the individual evidence and outstanding work. `release-policy.mjs` requires a verified version and all eight checks: official identity, visible rules, paytable, controls and bonuses, presentation comparison, native mathematics, wallet settlement and browser integration. An implementation, a passing financial test or a `launchable` flag alone cannot publish a machine. The production registry currently adds only the unchanged prior Balloon adapter.

## Reference fidelity

Each public configuration records its official reference, visible rules, version, symbols, layout and payout rules. Reference evidence lives in `references/`. Unresolved title identities and unverified essential public mechanics must remain unlaunchable. An official product page alone does not prove that all demo mechanics were observed.

The requested visible paytables and rules must come from the individual official references. Earlier scaled awards, guessed bonus schedules and generic presentation are not treated as faithful completion. Public coefficients and fixed stake schedules have been restored for the first 11 machines. Reference-backed corrections for the remaining identified machines are recorded separately, including the selected official CoinMiner variant.

The draft engines use independently implemented server outcomes. Public demo artwork, help and visible strips do not establish the provider's private outcome probabilities. A diagnostic return for the draft sampler is not a provider RTP, and the earlier calibration files are explicitly superseded after rule and award changes. No current return is certified. Incomplete mathematics, unsupported payout ceilings and missing controls remain release blockers.

The current client integrates18 individual original-art presentations through `client/reference-presentation.mjs`. The host verifies each same-origin manifest and asset hash, binds it to the current model, and clears stale session/round/frame/viewport work before painting. Book's provider-symbol9 identity is mapped only in cloned display data. CoinMiner's accessible buttons follow the actual fitted tile rectangles and exclude gutters. Artwork failure blocks new starts, autoplay and risk actions; collecting an accepted round remains independently available.

These are static, receipt-driven original-art scenes. Full animation, audio timing, entry prompts, menus and official-demo/browser parity are unfinished. Moonstone and Samurai currently have help artwork only; MagicGarden has no verified gameplay-art mapping. Three Egyptian special-symbol setup poses are still missing. No generic generated symbol is substituted into a mapped game or its help legend.

`presentation/build-static-assets.mjs` enumerates604 immutable public paths,603 unique content hashes and126,022,237 unique bytes. Its actual assembly verifies all file hashes, sizes and allowed static MIME signatures before publishing a new local directory atomically. It includes no provider executable code. The future Worker uses the existing `NATIVE_LIBRARY_ASSETS` binding; deployment must merge the new paths into the preserved asset manifest. The package is additive and must never replace the existing site assets. `evidence/reference-assets-build.json` records the verified local build; it is not a deployment receipt.

## Existing platform and wallet

The backend loader preserves all nine previously deployed modules byte for byte. Their hashes are in `evidence/backend-baseline-manifest.json`. The new entry adds versioned game adapters to the existing library service, including the exact prior Balloon adapter. The canonical wallet, player sessions, transfers, double-entry ledger, history, audit and account revisions remain the source of truth.

The Worker adds `/games/{id}`, `/api/expansion/state` and `/api/expansion/action`. It authenticates through the existing player session and signs the unchanged library service contract. The player and backend both reject another session, an unknown game, stale model/version, altered retry body or a client-supplied payout. Pending financial intent is saved before sending; a lost response retries the same bytes and request ID.

Liability bounds do not depend on a sampled outcome. A failed reserve, account cap or insufficient balance rolls back all game and wallet changes. Accepted interactive rounds can settle after starts are disabled, after disconnection or through expiry reconciliation. A lowered account limit or subsequent account blocking cannot cancel an already reserved obligation.

## Local verification

Use Node24 or later, then run:

```sh
npm ci
npm test
npm run build:backend
```

`npm test` runs the cache-independent core and integration checks. `npm run test:all` also runs the complete original-art suite and requires the verified external caches. Cache paths are configurable through `ZPLAY_ARCADE_ASSET_CACHE`, `ZPLAY_LEGENDS_ASSET_CACHE`, `ZPLAY_EGYPT_SYMBOL2_JSON` and `ZPLAY_OLYMP_SYMBOL2_JSON`; missing optional pose samples are reported as skips, never passes. Actual asset assembly remains a separate strict check of every declared file.

To build an additive static package from restored caches, use explicit paths outside the repository:

```sh
node presentation/build-static-assets.mjs \
  --smartsoft-cache /path/to/cache/smartsoft \
  --remaining-slots-cache /path/to/cache/remaining-slots \
  --arcade-cache /path/to/cache/arcade \
  --legends-cache /path/to/cache/legends \
  --output-dir /path/to/new/reference-static-r1
```

`--inventory-only` validates and writes the source metadata without reading cached binaries or claiming byte verification. The packer performs no network, upload or production operation.

`test/wallet-settlement.test.mjs` runs real PostgreSQL semantics through an in-memory PGlite database. It imports a temporary copy of the exact canonical wallet module and explicitly rejects any attempt to construct a service database connection. A test-only fixture exercises the 21 identified drafts without opening their production gates. The suite verifies money conservation, atomic rollback, request replay, ownership, account limits, accepted expiry and mutual exclusion with the older native games and JetX. This is a single embedded PostgreSQL connection; it is not a claim of multi-process database load testing.

Other tests cover the versioned model contract, bounded states, outcome-independent reserve limits, authenticated bridge signatures, catalogue preservation, session recovery and client rendering. Stake-menu tests use the complete reference schedules and the model's real input validation. CoinMiner's menu uses its discrete official mine counts. No production account, credit, wallet reset or test wager is created.

## Deployment

The latest direct instruction explicitly authorizes publishing each completed native machine immediately to the same live Player; see `requirements/player-parity-and-publication-20261108.md`. Do not ask again for that same publication permission. A different ChatGPT workspace does not require a new hosting Worker or account system.

Publish only versions that satisfy the individual release checks. Use the existing `superwin-native-family-engine` Railway function and `superwin-player` Cloudflare Worker. Read the function's actual `deployedCode`, preserve the baseline modules, and do not accept the unrelated staged Railway patch. Verify a terminal successful deployment before changing player traffic.

The Worker upload preserves every previously deployed module, binding, static asset configuration, Durable Object export and scheduled handler. Source is committed before publication. Read-only HTTP and public-browser checks follow publication; concrete faults restore the recorded previous version. Final release IDs, hashes, verification results and remaining reference gaps are recorded in `evidence/`.
