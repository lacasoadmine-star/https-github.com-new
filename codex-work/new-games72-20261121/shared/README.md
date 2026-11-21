# Shared request recovery for the additive 72-game work

`round-recovery.mjs` is an unactivated transport component for new game modules. It registers no game, implements no RNG or payout rules, starts no service, and changes no existing Player, Agent, Admin, Telebirr, wallet or route. It must not be counted as a completed game.

## Existing contract followed

The implementation follows the inspected existing source at baseline commit `1d0f4c9ddc9d14aacc436021ed0bcb2b27dd85f0`:

- `codex-work/native72-20261119/changes/batch01/multihot20/session.mjs`
- `codex-work/native72-20261119/changes/batch01/server/existing-server-routes.mjs`
- `codex-work/native72-20261119/changes/batch01/server/sw-nine-pg-adapter.mjs`

Only these existing same-origin endpoints are used:

| Action | Existing request |
| --- | --- |
| Read authenticated account, game model, balance and current eligibility | `GET /api/slots/fresh-state?gameId=<registered-id>` |
| Submit or recover one SPIN | `POST /api/slots/spin` |
| Status-first lookup for a saved request | Same SPIN endpoint with `replayOnly: true` |

The body contains `gameId`, `bet`, `roundToken`, `sessionGuard`, `mathVersion`, `engineVersion` and `mathSha256`. Recovery adds only `replayOnly`. It does not invent a request-status endpoint. The existing server authenticates the cookie, verifies the guard, locks the existing wallets, and owns idempotency and settlement.

The new game IDs are **not registered by this module**. Their existing-server integration, verified rules/evaluator, retained model versions and per-game validators remain separate required work.

## Integration API

Construct `RoundRecoveryClient` with the new game's registered ID and mandatory `validateModel(game)` and `validateReceipt(receipt, context)` functions. No default game validation or assumed paytable is supplied. `context` includes the original saved `action`, the currently advertised `currentModel`, and `recovering`.

A replayed receipt can use a previously accepted model version. The game-specific validator must resolve the original action's retained rules/model identity; it must not silently reinterpret an old result using the current paytable. The common envelope check validates identity, ETB decimal representation and the authoritative wallet equation, which is not a substitute for game-specific payout verification.

| Method/property | Contract |
| --- | --- |
| `await connect()` | Reads and validates existing fresh-state; returns the account snapshot. Saved same-session requests enter `PENDING`, without wagering. |
| `await spin(bet)` | Allowed only from `READY`. Revalidates the session and unchanged displayed model; persists request identity before POST. |
| `await recover()` | Looks up the saved token with `replayOnly: true`. A verified result does not create another wager. |
| `await refresh()` | Reads the current authoritative account after settlement; required before enabling the next SPIN/AUTO. |
| `snapshot` | Copied state for UI, including `phase`, `pending`, `receipt`, `canSpin`, `canAuto`, `retryAt` and `balanceFresh`. |
| `disconnect()` | Aborts local work, invalidates stale responses and clears the in-memory account; retains saved requests under their original scope. |
| `dispose()` | Aborts and permanently closes this instance. Late responses cannot invoke state callbacks or remove saved requests. |

STOP and TURBO belong to each game's presentation controller. This component exposes no STOP/TURBO financial action. The UI must use `canSpin`/`canAuto` and cease starting AUTO rounds as soon as a request is unresolved. It must not call `spin()` to accelerate an animation or confirm a pending round.

`SETTLED` deliberately remains unable to wager until `refresh()` succeeds. The accepted receipt's historical `balanceAfter` is not assigned as the current account balance: another tab may have settled a later transaction. A game may present the receipt while clearly treating the cached account snapshot as unrefreshed.

The optional `request`, `storage`, `uuid`, `now`, `delay`, `lock`, `onState` and `onEvent` dependencies permit isolated tests and integration with the existing UI. An injected request transport must preserve the same-origin authentication and existing endpoint semantics. `onEvent` receives bounded retry/failure reasons without cookies, tokens, account information or receipt contents. UI/audit callback exceptions cannot change financial execution.

Operation-generation checks also run after awaited fresh-state, cooldown and lock-return boundaries. Disconnecting during those continuations rejects the stale operation with `STALE_OPERATION` and cannot restore its account or enable SPIN/AUTO. If settlement was already validated, cancellation of the stale caller does not recreate its pending record or reverse settlement. Rendering code must also retain its own lifecycle guard across its awaits; a returned receipt is not permission to revive a component that has since exited.

## Lost response and retries

After an ambiguous initial POST failure, the original key remains pending and new SPIN/AUTO is blocked. `recover()` first uses `replayOnly`. Only the exact authenticated `404 / ROUND_NOT_FOUND_FOR_REPLAY` response permits resending the **same** original action. Before that resend, fresh-state must still show the same session, original math identity, permitted bet and enabled release. A generic 404, timeout, 5xx, model change or malformed receipt never creates a replacement key or a guessed refund/payout.

Read-only state/replay requests have a bounded exponential retry policy, defaulting to three attempts with 250 ms initial delay and a 2,000 ms maximum wait. The initial financial POST and a replay-miss resend are each sent once per operation; ambiguity returns to `PENDING` for another status-first recovery.

`429` honors both integer-seconds and HTTP-date `Retry-After`. If the requested delay exceeds the bounded local wait, the operation stops with `RETRY_DEFERRED` and its absolute retry time is preserved with the pending metadata. It does not shorten the server's delay. Repeated manual recovery and a reconstructed client honor that timestamp. `401`/`403` retain pending identity and expose `AUTH_REQUIRED`; they do not refresh credentials or bypass permission checks.

A cooperating client that discovers another client's request during SPIN preflight or account refresh adopts the saved retry deadline along with its identity. Every recovery reloads that deadline under the exclusive request lock, so a newer `429` received in another tab cannot be bypassed by an already connected client. Even the read-only replay waits until the recorded deadline; it does not spend requests or generate a replacement token while the server asks it to wait.

Only specifically enumerated, known initial pre-settlement rejections can clear a newly created key. Unknown errors and any recovery rejection keep it. Corrupt/unwritable storage fails closed before a new financial request.

## Persistence and concurrent tabs

The storage envelope contains only request identity, an opaque existing per-session guard and a retry timestamp. It stores no password, cookie, credential, account balance, payout, or invented wallet. A single key per session guard coordinates pending new-game work across game modules sharing that storage. Another account has a separate key; it cannot replay or overwrite the old account's pending request.

The default `sessionStorage` preserves refresh recovery within one browser tab. It does **not** provide a cross-tab shared journal. `createExclusiveLock()` uses Web Locks when available and otherwise rejects overlap within the current JavaScript realm. It rejects duplicate concurrent actions rather than queueing extra wagers.

For cooperating cross-tab clients, integrate both shared request-metadata storage and a cross-tab lock such as Web Locks. A localStorage journal may store this request metadata; it must never become a wallet. The fallback lock alone is not a cross-tab guarantee. Tabs that bypass the cooperating client, separate devices, storage corruption, browser crashes and different request tokens require the existing server's wallet locks, request uniqueness and ownership checks. Two genuinely different requests are not made identical by this client.

The per-game SPIN adapter follows the existing paid-round fresh-state contract. Games with continuing rounds, bonus state, free-spin entitlements, cashout, gamble or other actions need their own verified adapters. This component does not infer those rules or certify their recovery. The existing fresh-state endpoint must remain available for a newly constructed client; a backend outage is not repaired by this frontend helper.

## Verification and remaining integration

Run from the repository root:

```sh
node --test codex-work/new-games72-20261121/shared/round-recovery.test.mjs
```

The focused suite uses an isolated, in-memory, contract-shaped fake transport. It checks response loss after settlement, request loss before acceptance, a late first acceptance racing a same-key resend, refresh recovery, session replacement, delayed callbacks, malformed/mismatched receipts, 401/403/429/5xx, explicit replay misses, duplicate input, cooperating-client locking, storage failure and bounded retries. The accepted-response-loss cases assert exactly one debit and credit in the fake.

The continuation review reproduced three failures where a cooperating client ignored a newer shared retry deadline. The corrected suite passes 49 tests, including those three action retests. The saved verification report pins the actual source and test output; these additional cases use shared in-memory metadata, not a real cross-tab browser or PostgreSQL ledger.

This is not a production wallet test, PostgreSQL concurrency proof, browser cross-tab acceptance test, game-specific mathematics validation, sound/animation test or live deployment. No production requests or wagers are made. Actual ledger integration, server-side version retention, isolated PostgreSQL tests and real browser lifecycle/cross-tab checks are required before activation.
