# Super Wilds server continuation

The reserved game identity remains `zplay72_multi_hot_5_super_wilds_v1` at
`/new-games72/multi-hot-5-super-wilds/`. This subtree adds its deferred settlement
lifecycle, same-client PostgreSQL journal seam and explicit renderer transport
contract. It creates no wallet, balance, account, session, RNG, HTTP listener or
host. Import and construction apply no migrations or release changes.

`lifecycle.mjs` accepts only semantic SPIN/TAKE WIN input. The browser cannot
submit grids, awards, multipliers, probabilities or balances. The injected own
approved server model chooses and validates the complete outcome. New cash is
disabled by default; a current reference paytable does not establish a legal
outcome distribution, reel strips, RTP, rounding or production readiness.

An accepted SPIN debits the existing wallet before sampling, reserves its win
inside the existing protected house wallet, records the immutable receipt and
registers shared round order. Every operation uses one host transaction. A
failure in sampling, funding, ordering, journal write or final request recording
rolls back all those operations. STOP/QUICK/AUTO/SOUND have no money endpoint.

The request key, action fingerprint and original accepted receipt are retained.
Retries, UUID hex case changes and replay-only recovery do not sample or debit
again. Replay and collection do not require a currently enabled new-wager release
or a still-installed outcome model. An accepted pending win can be collected
only once, including requests using distinct TAKE keys. The explicit next-SPIN
collection and its new debit are atomic. State reconnect reads the existing
wallet and same accepted receipt without creating another round.

`postgres.mjs` delegates to the host's FINAL authenticated transaction and
wallet callbacks. Its fixed SQL only inserts/selects its new per-game journal.
All wallet transfers must still use `sw_rebuild.wallets`,
`sw_rebuild.transfers` and the paired `sw_rebuild.ledger`. There is no second
balance authority. The host must supply:

- `wallet.assertReady(client)`: inspect actual installed transaction isolation,
  cross-game reserved house floor and shared ownership integration. An in-memory
  liability counter or a user-supplied readiness boolean is insufficient.
- The protected existing wallet callbacks listed in `postgres.mjs`, all using
  that same client and stable existing player/house lock ordering.
- `withRequestOwner(client, identity, operation)`: symmetric old/new request
  collision protection before/after the operation. The older `sw_nine` and
  continued M10 adapters must observe the Super Wilds journal too.
- `registerRound(client, round)`: register every accepted SPIN, including losses,
  in the existing shared round ordering so older gamble eligibility expires.
- Approved own outcome model and operator release; neither is installed here.

`prepare-journal.sql` is prepared only and has not been applied. It creates
per-game immutable event journals, no wallet. Its application alone would not
install the protected house-floor or symmetric ownership hooks. The continued
M10 reservation bridge is hard-bound to its own game and cannot safely be
renamed or used as a Super Wilds production callback.

`transport.mjs` exposes `state()`, `prepare(intent)`, `dispatch(intent)` and
`recover(originalPreparedIntent)`. The controller must persist the prepared
intent before dispatch: it snapshots the exact bet/model/collection identity
needed after a lost reply or reload. Recovery refuses to reconstruct that old
identity from today's UI. It refreshes the current session guard through the
existing authenticated state. Receipt amounts are finite, safe integer ETB
minor units; accepted row-major 3×5 grids are transposed to the renderer's
column-major 5×3 convention without changing symbols or choosing results.
The approved server multiplier is preserved. DOUBLE currently has no approved
own gamble model and exposes `canDouble:false`; it cannot fabricate X2 results.

Validation: `node --test codex-work/new-games90-20261123/superwilds/server/*.test.mjs`
passes **42 tests**. These cover twenty concurrent retries, twenty concurrent
distinct TAKE keys, model withdrawal, post-acceptance recovery in another
session, session/owner conflicts, mixed-game key collision, debit-before-sample,
partial failure rollback, atomic collect+next-SPIN, exact grid/amount transport,
and same-client journal composition. The account/balances/model in
`test-support.mjs` are explicit disposable fixtures and never imported by the
production modules. The five PostgreSQL seam tests simulate query results;
they are not a real database or production ledger acceptance test.

The separate real PostgreSQL runner is
`postgres/run-tests.mjs`. It applies this exact `prepare-journal.sql` inside a
new random disposable database and exercises the actual lifecycle/journal seam
with SQL wallet/session/paired-ledger callbacks. Its seven scenarios include
twenty requests observed waiting on a real wallet row lock, twenty distinct
TAKE keys, both directions of old/new key collision, an injected SQL failure
after collection/new debit, a real reserved-house trigger, disabled-trigger
readiness and accepted-key recovery after model retirement.

Run it with `node --test
codex-work/new-games90-20261123/superwilds/server/postgres/run-tests.mjs` and
explicit `TEST_DATABASE_URL` for a localhost PostgreSQL `/postgres` admin
database plus `SUPERWILDS_TEST_CREATE_DATABASE=disposable-database-only`.
The optional `SUPERWILDS_TEST_NODE_MODULES` points to an isolated installation
containing `pg` (QA dependency). External hosts, other databases and URL
parameters/fragments are rejected before connecting. The runner closes its
pool, observes natural server-side connection drain and ordinarily drops only
its own random database. It never force-drops or terminates live clients.
The fixture account/model/floor callbacks are test-only; they are not a claim
that a production reservation bridge or model has been installed. This runner
was syntax-checked locally; no local PostgreSQL service was available, so its
real database execution still requires the exact CI job.

This source is not a mounted/live-verified game. No production schema, route,
wallet balance, account, ledger, old game, Telebirr service or deployment was
changed by this subtree. Final actual host reservation/ownership integration,
approved own distribution/rounding and live financial acceptance remain open.
