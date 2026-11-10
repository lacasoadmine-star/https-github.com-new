The existing NEW account pages were playable in isolated review but production
Spin and AUTO stayed disabled by the remaining-game start gate. This release
allows the nine retained independent operator models to use the original ETB
wallet while per-title presentation review continues. It does not implement
the remaining reference inventory or certify SmartSoft's private math.

The exact scoped flag is
`REMAINING20_OPERATOR_ETB_RELEASE=remaining-native-etb-r16`. The checked-in
policy pins the existing model versions and the original financial source
hashes. It requires the five existing financial/identity readiness checks.
Incomplete presentation and bonus checks remain false. The original complete
reference release policy and original two-title approval file are preserved.
Coin Miner and the other ten unreleased definitions remain closed. MultiHot5
and FoxyHot20 retain their original routes and code.

New starts reuse the existing LibraryService, authenticated account resolution,
PostgreSQL ledger, house reservation and account limits. Accepted request
replays, collect, gamble and expiry retain their original versioned evaluators
and can finish after the new-start flag closes. No balances, credits, caps or
private probabilities are created by this release. Wager presets remain
1–40,000 ETB; normal available-funds and payout-capacity checks still apply.

The Player and its existing asset Worker retain all bindings, durable objects,
assets and legacy modules. Public lobby status reads the native engine's health
without cookies or account identifiers. Only nine exact live versions can get
Play links; the seven matching construction references receive the same local
account link. The 1,000-reference inventory retains its original official URLs,
artwork and incomplete per-title evidence. Native status expires after ten
seconds, the browser refreshes every thirty seconds, and failed fresh reads
remove public Play links. Account state and wager admission remain authoritative.

Six observed modern portrait games now paint their own STOP label using the
official mobile button coordinates, font size and colour, plus each title's
disabled Bet sprite while the original controller locks the stake. Atlas pixel
dimensions are kept separate from the observed button coordinates. Earlier
public resource URLs retain their original bytes, and old R15/R16 module paths
continue serving already-open pages. The new R16b display namespace avoids
reusing a browser's immutable cached projection.

The R16 public-demo observation records add forty distinct sampled boards
across four titles, with entry/Spin/result/control captures and audio-start
events. Those samples do not certify unobserved bonuses or private odds.

Run the isolated financial review explicitly:

```bash
SMARTSOFT_REVIEW_NATIVE_ROOT=/path/to/recovered/native-source \
SMARTSOFT_PGLITE_MODULE=/path/to/pglite/dist/index.js \
node --test tests/smartsoft/operator-postgres.review.mjs
```

The review refuses `DATABASE_URL`, forbids a network SQL constructor and uses
in-memory PostgreSQL with the actual retained canonical wallet class and
LibraryService SQL. It covers all nine min/max stakes, double-entry conservation,
replays, accepted-round recovery after closure, gamble idempotency, concurrent
starts, account roles, insufficient funds, existing pending awards and account
limits. Standard checks are `node --test tests/smartsoft/*.test.mjs`,
`pytest -q tests/test_platform.py` and all three frontend builds.

`build-native-r16.py` adds the scoped release to the exact recovered existing
Function bootstrap. It verifies all original modules before applying the four
release files and keeps the encoded runner argument below Linux's 128 KiB
per-argument limit. This adds no backend or database. Re-read the existing
Function and reject a changed source before updating its start command. Apply
the current service configuration through a fresh deployment of its existing
`ghcr.io/railwayapp/function-bun:1.4.4` image. An old deployment's redeploy action
can reuse its previous startup snapshot; verify the new bootstrap log and live
health rather than inferring success from the deployment status alone. Never
commit unrelated staged environment changes to apply this release.

To close new starts, clear the scoped flag in the same service and deploy that
configuration. Keep all existing packed model variables and recovery modules.
Do not reset the ledger, lower reserved payouts or substitute another wallet.
Real-money betting transactions are not part of the automated review.
