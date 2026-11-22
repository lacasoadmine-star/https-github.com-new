# Multi Hot 10: shared round order and host ownership

This is an unmounted continuation of the project's prepared M10 backend. It composes the real deferred lifecycle and PostgreSQL journal with the protected existing-wallet reservation bridge and symmetric request-owner guard. Every accepted SPIN also receives an entry in the existing shared round ordering, including a loss. It creates no wallet, samples no production outcome, installs no migration and mounts no endpoint.

## Implemented host contract

`createM10HostIntegration({ dependencies, ...modelCallbacks })` returns:

| Property | Use |
| --- | --- |
| `lifecycle` | Actual guarded M10 `state`, `spin`, `takeWin` and `gamble` methods |
| `legacyDependencies` | Existing adapter callbacks with protected available house balances and merged active-round rejection |
| `ownership` | Same-client shared-round registration, merged ownership and legacy state composition |

`dependencies` are the existing host's final `transaction`, `authenticate`, `sessionGuard`, `hash`, `lockWallets`, `balance`, `houseFor`, `assertNoActive` and `assertPlayerCapacity` callbacks. The model/release callbacks have the prepared lifecycle's existing interface. When no model or release callback is provided, new wagers remain disabled. Tests supply an explicitly synthetic model solely to exercise transaction behavior; it is not an M10 payout or probability configuration.

The project-owned deferred lifecycle and PostgreSQL adapter were continued in this directory. Their frontend protocol/identity imports point to the current M10 source. The substantive additions are the required same-client shared-order hook, protected-house-hold contract, opaque legacy-ID compatibility, and composition with the existing request guard. No old game renderer, assets, paytable or sampler is used to construct M10.

## Every accepted spin enters shared ordering

The existing old-game gamble implementation finds its original `nine:<round UUID>` in `sw_rebuild.rounds` and rejects a new gamble if **any** later shared order exists for that user. A new loss must therefore be registered just as a new win is.

The continued PostgreSQL adapter inserts the M10 journal row and then calls `ownership.registerRound(client, round)` before its request journal is committed. Registration uses the observed existing write columns:

```sql
INSERT INTO sw_rebuild.rounds
  (id, user_id, game, bet, payout, outcome)
VALUES (...);
```

The identity is `new-m10:<lowercase round UUID>` and the game is `zplay72_multi_hot_10_v1`. The host database supplies `settled_order`; the code does not derive order from dates or UUIDs. The exact accepted M10 journal must already exist on the same client, and its owner, request identity, amounts and receipt must match. Duplicate registration returns the stored order only when its complete shared record matches; a conflict fails instead of overwriting history.

A normal request replay returns the accepted request receipt before sampling or registering another round. The hook independently remains safe on duplicate invocation. PostgreSQL sequence gaps caused by conflicts or rollback are legitimate; only the relative accepted order and immutable stored identity matter.

### Award versus cash already paid

The shared row's `payout` stores the initial accepted base-game award, while its immutable `outcome` keeps `collectionStatus: PENDING` and `walletReceipt.creditedWin: 0.00` for a positive uncollected win. It is not a second financial ledger. The collection, transfer and paired-ledger records remain the authority for cash actually paid, including later X2 results.

The inspected old ordering code uses owner and order only. That code does not establish how every deployed reporting consumer interprets `payout`. Before mounting this representation, inspect those consumers; none should present a reserved initial award as an already completed transfer. This component does not mutate accepted shared receipts after collection or silently introduce a second reporting policy.

## One active owner and consistent state

The ownership hook reads existing native active rounds and positive M10 reservations under the existing wallet locks. M10 holds are joined to their accepted round and collection journal. Missing or mismatched ownership, an already collected positive hold, multiple active rows or simultaneous old/new ownership fail rather than selecting a convenient result.

Native round IDs remain their original strings. The available native contract uses `TEXT`, so an old ID such as `native:opaque-round` is valid when reporting a blocking game. The continued M10 state requires UUID only for its own round IDs. It does not invent a UUID for an old round.

`ownership.describeLegacyState(client, userId, { readSnapshot, describeGamble })` performs the merged read and calls the original legacy gamble `describe` with that blocking game **before** availability is derived. The snapshot callback receives the same client and user; it returns the existing authenticated base state, latest old round and current old profile. The result preserves the existing response shape while making both `blockedByActiveGame` and `round.gamble.available/reason` consistent.

The tests use the actual tracked old `createExistingGamble` implementation. They do not substitute a new interpretation of its eligibility rule. Old accepted action replays still precede latest-round rejection, so an accepted old receipt remains recoverable after a new M10 spin.

## Exact mounting points still required

This code is deliberately not imported by an active route or release module. These are the concrete host connections to make after database verification:

1. Provide the existing host's **final** dependency callbacks. The inspected native Railway binding spreads its input object and then defines a native-only `assertNoActive`, overwriting an earlier wrapper. The merged callbacks must be supplied at the final `createExistingServerRoutes` factory layer or retained through an explicit binding hook.
2. Use `legacyDependencies` at old mutation factories and retain the symmetric request-owner wrapper for their actions. Merely returning a richer `activeRound` callback does not change a route that uses its own SQL.
3. Inside the existing authenticated, wallet-locked state transaction, call `ownership.describeLegacyState` with the original state reads and original gamble descriptor. The current old state function directly queries native ownership; it must be wired to this hook. Do not patch only the top-level field after its transaction finishes.
4. Apply the prepared M10 journal and protected reservation migration only as a coordinated, reviewed host change. The reservation migration affects the existing wallet table. Verify the actual deployed schema, writer grants, READ COMMITTED isolation and affected wallet writers first. The disposable fixture establishes executable contracts, not the exact full production DDL.
5. Supply the new game's verified aggregate/max settlement evaluator and its distinct operator model. Provider RNG is not required; unresolved M10 aggregation and maximum-rule meaning are not supplied by this host component. The existing authenticated session and retained model identities continue to be used.

## Verification

Local component command:

```sh
node --test codex-work/continue71-20261122/m10-host-lifecycle/*.test.mjs
```

**10 component tests passed, with zero failures/skips.** They cover the actual old gamble descriptor after a new M10 loss; duplicate/conflicting global registration; rollback and old eligibility; exact journal/money identity; actual continued M10 state with an opaque native ID; same-client merged old state; conflicting owners; malformed pending ownership; and construction without database activity or model installation. The relation/transaction fixture is synthetic and is not evidence of PostgreSQL locking.

The dedicated `Continuation M10 host lifecycle QA` workflow adds ten prepared real PostgreSQL scenarios. It executes the actual composed lifecycle, current journal and reservation DDL, existing old gamble module and request-owner guard. Coverage includes:

- A new loss and twenty retries preserving one shared order and one BET.
- Actual old gamble eligibility/action rejection after the loss, before old RNG or money movement.
- Accepted old action replay after a newer M10 round.
- TAKE versus next-SPIN contention, requiring two observed database lock waiters before release and exactly one collection/WIN.
- SQL failures before and after the final request insert rolling back the shared order, hold, BET and journals together.
- Native opaque-ID blocking, M10 pending ownership, dual-owner rejection and cross-family key collisions.

No real PostgreSQL execution is claimed locally; that service and container tools are unavailable. The harness creates only its own random localhost database, uses the existing pinned PostgreSQL 17 image and `pg@8.16.3`, and waits for server-side connection drain before ordinary DROP without FORCE. Errors and missing configuration fail the job. The workflow is scoped to the continuation branch and its exact runtime dependencies; documentation-only edits do not rerun the database job.

`verification.json` contains test level and hashes of this component's own source. It includes no private provider reference files, account data, credentials or financial history. The reservation component, request-owner guard, current frontend and old shared source are unchanged by this new directory.
