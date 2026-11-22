# Multi Hot 10: protected reservations in the existing ETB wallet

This continuation implements the wallet callback contract needed by the prepared M10 deferred lifecycle. A winning SPIN records an existing-wallet BET and protects the accepted win inside the existing house balance; TAKE records one existing-wallet WIN. It creates no additional wallet, imports no game presentation or provider program, and supplies no payout probabilities. All routes, release flags and production database changes remain unmounted.

## What the existing engine can supply

The prepared M10 lifecycle already takes authenticated transaction callbacks and an operator-owned model through `getApprovedModel` and `resolveApprovedModel`. The model supplies `sampleOutcome`, `validateOutcome`, `maximumPayoutMinor`, an ETB stake ladder and immutable `mathVersion`, `engineVersion` and `mathSha256` identities. These hooks do not call or require the provider's server. The existing engine's independent-model design likewise distinguishes our probability policy from reproducing provider RNG. Its other games' distributions are not an M10 specification and are not copied here.

Consequently, unknown provider reel frequencies or multiplier probabilities are not, by themselves, a reason to stop the new backend. A game-specific operator distribution can use the existing secure RNG service once its support and payouts are explicitly specified and audited. The model's existing verification flags are implementation/release checks; they do not imply a new user-permission requirement.

There are still precise M10 rule questions. The current M10 evaluator returns ten separate line candidates and exact table quotes, with `aggregatePayoutMinor: null`. The captured highest-payline wording has not yet established the round aggregation rule or how the displayed 1000× maximum constrains a round. Neither summation, a global maximum nor a payout cap is silently chosen by this component. Those are settlement rules to settle from the current game's official rules/observations, independently of choosing our own outcome frequencies. An operator ETB ladder whose amounts are multiples of 0.10 can avoid fractional minor-unit quotes at the confirmed 0.10 scaling anchor; that would be an explicit denomination policy, not a claim about provider rounding. No such model or ladder is enabled here.

The authenticated session guard and retained model lookup in the prepared lifecycle are existing integration hooks. This component does not invent a separate season selector or replace the current authentication/session system.

## Implemented accounting

Let `H` be the existing house wallet's gross minor-unit balance, `R` the sum of its positive M10 reservations and `P` the player's existing balance. The exposed house capacity is `H - R`; `reserveBalance` reports the player's protected pending amount. All steps use the host's same transaction client and its existing stable wallet-lock order.

| Action | Existing wallet and paired ledger | M10 reservation |
| --- | --- | --- |
| SPIN | Transfer the accepted stake from player to house once as BET | Protect a positive accepted win in the original funding house |
| TAKE | Transfer that exact pending amount from house to player once as WIN | Close the matching hold before the transfer, within the same transaction |
| X2 win callback | No player cash transfer | Increase the hold by its exact current amount |
| X2 loss callback | No player cash transfer | Release the exact whole hold |
| Retry | Return the same event receipt | No extra transfer or hold change |

For SPIN with stake `S` and accepted win `W`, the lifecycle sees `P' = P - S`, available house `H' - R' = H - R + S - W`, and pending reserve increased by `W`. Collection increases `P` by `W`, decreases gross house and its hold by `W`, and leaves available house unchanged. This satisfies the prepared lifecycle's numerical conservation checks without provisioning a second wallet. The prepared lifecycle's earlier comment requiring a separate reserve wallet must be explicitly replaced with this enforced-house-hold contract when that lifecycle is integrated.

`bridge.mjs` exports `createM10ReservationBridge(rawHostDependencies)`. It uses the existing host functions `lockWallets`, `balance`, `houseFor`, `assertNoActive`, `assertPlayerCapacity` and `activeRound`. It returns:

- `wallet`: the prepared M10 PostgreSQL lifecycle's named financial and active-round callbacks.
- `legacyDependencies`: wrappers for the old adapter's `balance`, returned `lockWallets` rows and `assertNoActive`. Both balance-reading paths expose the same available house amount. This avoids a state response advertising the gross balance while a wager checks the reserved balance.

The transfer statement preserves the common wallet → transfer → paired-ledger contract. Its audit is `sw_new_m10.wallet_movements`, with distinct `new-m10:<round UUID>:BET|WIN` transfer IDs. It does not reuse an old adapter's hardcoded `sw_nine.wallet_transactions` audit or label a reservation as an immediately credited WIN. The common ledger insert requires only `transfer_id`, `wallet_id` and `delta`; no unverified `ledger.id` column is assumed.

Stable event keys bind each operation to its owner, original round, kind and exact integer amount. The collection identity is also bound. An accepted pending hold keeps the original house wallet identity; a later house reassignment cannot redirect its payment. New mutations reject such a reassignment until the host supplies an explicit recovery path. This component does not create that recovery policy.

## Database protection and installation boundary

`prepare-schema.sql` is a prepared, unapplied migration. It creates M10 reservation, movement and event tables, plus two enforcement functions and triggers. It also adds a trigger to the **existing** `sw_rebuild.wallets` table. It is therefore a shared-table migration, not merely a new schema installation.

A plain liability counter would let another game spend the held cash. The wallet trigger rejects a balance update below the sum of all reservations for that house, including updates issued by unchanged old SQL. The reservation trigger locks and verifies the funding wallet and rejects overcommit, identity changes, deletion and reopening a closed hold. The bridge additionally requires the exact expected enabled trigger type, update-column coverage, function binding, volatility, definer mode and fixed search path before touching money. Missing or weakened enforcement closes the new component.

Both trigger functions require READ COMMITTED and use fully qualified tables with a fixed `pg_catalog` search path. The concurrent old-debit case must be verified against real PostgreSQL: an old debit that was already waiting for the house row must see a hold committed while it waited. Synthetic JavaScript serialization alone cannot prove that behavior. The functions' owner, the existing writer role's permissions, the host isolation level and any affected wallet writers must be reviewed against the real deployment before installation. No production role name, grant or migration execution is guessed here.

PostgreSQL 17 documents that [VOLATILE functions obtain a fresh snapshot for each query they execute](https://www.postgresql.org/docs/17/xfunc-volatility.html) and that [a trigger runs in the transaction of its triggering statement](https://www.postgresql.org/docs/17/trigger-definition.html). The disposable concurrency test verifies this particular wallet/hold interaction, rather than treating those general statements as a completed database test.

Foreign keys to the M10 round journal are deferred until transaction commit because the prepared lifecycle makes its BET and reservation before inserting the accepted round. Their references still reject an orphaned financial operation at commit. Application roles should have no DELETE privilege on reservations and no mutation privilege on accepted event receipts; deployment-specific grants remain unapplied.

## Exact remaining host integration

1. Mount the prepared M10 lifecycle with the existing authenticated transaction, this wallet callback object, the symmetric request-owner guard and immutable journal receipt handling. A callback must never run under autocommit or a different client from its parent journal transaction.
2. Supply a fresh M10 settlement evaluator and operator model as described above. The secure random service and shared wallet can be reused; another game's presentation, payouts, strip definition or model identity cannot fill the M10 rule gaps.
3. Insert **every** accepted M10 round, including a loss, into the host's shared round-order mechanism within the same transaction. Existing old-game gamble eligibility reads `sw_rebuild.rounds.settled_order`; the prepared M10 journal currently writes only its new table. Omitting the shared order would leave an older game round appearing latest after a new M10 play.
4. Use the returned old-adapter capacity and active-round wrappers and merge M10 pending ownership into the existing state response. The M10 callbacks merge the supplied old active-round lookup, but existing raw state SQL that only reads `sw_native_library.rounds` does not become aware of M10 automatically. All mutation entry points must observe the same ownership rule.
5. Run the disposable PostgreSQL cases, then the combined prepared lifecycle against that database, including TAKE versus next-SPIN contention, request-key collision, stale session, rollback and recovery. Install the migration and reviewed grants only with the coordinated host changes; verify the deployed schema/role/isolation and the live authenticated path before enabling wagers.

This directory adds no host import, endpoint, production migration runner, release flag or financial model. Existing request-owner guard source, M10 frontend source and old shared files remain unchanged.

## Verification

Run the isolated component checks from the repository root:

```sh
node --test codex-work/continue71-20261122/m10-house-reservations/bridge.test.mjs
```

The current local result is **14 passed, 0 failed, 0 skipped**, and `node --check` passes for the bridge. These tests execute the real bridge against a synthetic transaction/SQL contract fixture. They cover BET and paired ledger conservation, exact collection and replay, twenty concurrent collection attempts, rollback after hold/ledger/event writes, exactly funded collection, other players' holds, overcommit, X2 callback accounting, identity/house binding, both legacy capacity reads, old active-round checks and rejected amounts. They do not establish PostgreSQL row locking or deployed financial correctness.

A separate bounded disposable PostgreSQL harness and branch-scoped CI job accompany this component. Its ten prepared scenarios apply the exact migration, test twenty concurrent collection calls, observe a blocked unchanged old debit before committing a hold, exercise real SQL rollback, check other players' protected funds, reject weakened triggers and unsupported isolation, check NULL funding balances, reject an orphan at deferred-FK commit, and preserve reservation identity/closed state. The synthetic shared ledger deliberately has no `id` column. The harness creates and removes only its own random database on a disposable localhost PostgreSQL service; missing configuration fails instead of silently skipping.

No PostgreSQL server, Docker or Podman is available in this local environment, so a real PostgreSQL pass is not claimed until the exact source workflow runs. `verification.json` records the actual level and hashes of this component's own code only. It contains no credentials, financial history or private provider reference files.
