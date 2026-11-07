# ZPLAY requested machine continuation

`requested-list.json` records the latest direct instruction: build the named 23 machines using each title's official demo as its reference. Preserve the four existing MultiHot5/FoxyHot20 variants and the already started JetX and Balloon releases. FootballX is outside this replacement queue. The earlier 20- and 25-title selections are historical records, not the current scope.

## Current release status

Balloon is already published on the existing player Worker. The new 23-machine continuation is an unpublished development checkpoint. There are 21 identified draft engines; the exact official DarkHorus and Assassins identities remain unresolved. None of the new 23 machines is enabled for a production wager or added to the live catalogue.

`release-readiness.json` records the individual evidence and outstanding work. `release-policy.mjs` requires a verified version and all eight checks: official identity, visible rules, paytable, controls and bonuses, presentation comparison, native mathematics, wallet settlement and browser integration. An implementation, a passing financial test or a `launchable` flag alone cannot publish a machine. The production registry currently adds only the unchanged prior Balloon adapter.

## Reference fidelity

Each public configuration records its official reference, visible rules, version, symbols, layout and payout rules. Reference evidence lives in `references/`. Unresolved title identities and unverified essential public mechanics must remain unlaunchable. An official product page alone does not prove that all demo mechanics were observed.

The requested visible paytables and rules must come from the individual official references. Earlier scaled awards, guessed bonus schedules and generic presentation are not treated as faithful completion. Public coefficients and fixed stake schedules have been restored for the first 11 machines. Reference-backed corrections for the remaining identified machines are recorded separately, including the selected official CoinMiner variant.

The draft engines use independently implemented server outcomes. Public demo artwork, help and visible strips do not establish the provider's private outcome probabilities. A diagnostic return for the draft sampler is not a provider RTP, and the earlier calibration files are explicitly superseded after rule and award changes. No current return is certified. Incomplete mathematics, unsupported payout ceilings and missing controls remain release blockers.

The original generic Canvas remains an unpublished functional prototype. The `presentation/` work and its asset-fetch script reconstruct individual scenes from verified public asset inventories. Asset hashes, authored rendering code and reference mappings are retained; downloading an asset inventory is not the same as completing visual, animation and audio comparison.

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

`test/wallet-settlement.test.mjs` runs real PostgreSQL semantics through an in-memory PGlite database. It imports a temporary copy of the exact canonical wallet module and explicitly rejects any attempt to construct a service database connection. A test-only fixture exercises the 21 identified drafts without opening their production gates. The suite verifies money conservation, atomic rollback, request replay, ownership, account limits, accepted expiry and mutual exclusion with the older native games and JetX. This is a single embedded PostgreSQL connection; it is not a claim of multi-process database load testing.

Other tests cover the versioned model contract, bounded states, outcome-independent reserve limits, authenticated bridge signatures, catalogue preservation, session recovery and client rendering. Stake-menu tests use the complete reference schedules and the model's real input validation. CoinMiner's menu uses its discrete official mine counts. No production account, credit, wallet reset or test wager is created.

## Deployment

Publish only versions that satisfy the individual release checks. Use the existing `superwin-native-family-engine` Railway function and `superwin-player` Cloudflare Worker. Read the function's actual `deployedCode`, preserve the baseline modules, and do not accept the unrelated staged Railway patch. Verify a terminal successful deployment before changing player traffic.

The Worker upload preserves every previously deployed module, binding, static asset configuration, Durable Object export and scheduled handler. Source is committed before publication. Read-only HTTP and public-browser checks follow publication; concrete faults restore the recorded previous version. Final release IDs, hashes, verification results and remaining reference gaps are recorded in `evidence/`.
