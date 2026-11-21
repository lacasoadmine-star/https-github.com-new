# Existing-ledger X2 integration

`createExistingServerRoutes(dependencies)` exposes `gamble(request,body)` alongside the existing `state` and `spin` hooks for Multi Hot 20 and Burn Wilds. The existing authenticated, origin-checked, size-limited service handler must delegate its existing `/api/slots/gamble` route only for those game IDs. Other games keep their original handlers. This module starts no server and enables no release.

An action uses the original cookie-authenticated Player, session guard, approved server model and existing parent round. The body contains:

```js
{
  gameId, roundId, roundToken, sessionGuard,
  mathVersion, engineVersion, mathSha256,
  choice: 'RED', // or BLACK
  expectedAttempt: 1,
  expectedStake: '1.00',
  replayOnly: true // recovery lookup only; omit for a new explicit choice
}
```

`roundId` identifies the original settled spin; `roundToken` is a new persisted action UUID. The server generates a separate `actionId`. The response echoes all three identities, game, choice, attempt, risked stake and math identity, plus the actual RED/BLACK result, `won`, `payout`, and the exact `walletReceipt` (`balanceBefore`, `chargedStake`, `finalWin`, `balanceAfter`, ETB). A win pays twice the risked amount; a loss pays zero. RED/BLACK uses the existing unbiased cryptographic sampler with bound two. This is our independent fair X2 model and does not reproduce provider randomness.

The operator rules permit up to five attempts, with an explicit **500.00 ETB maximum risk per attempt** and a ten-minute lifetime from the original round. The numeric ETB limit is an operator policy, not a conversion from demo currency. Every new action requires the current server-approved profile and matching parent/body math identity, exact next attempt and stake, the latest settled round across the existing account, no other active game, sufficient Player funds, house reserve and account capacity. All these checks precede `GAMBLE_BET`.

The normal wallet transaction reauthenticates the Player, locks the existing wallet rows in their established order, checks `sw_nine.actions` for the token, and rejects a collision with a spin token. A matching stored action is returned before current profile, catalogue or release checks, so a lost response can recover during an outage or release withdrawal. A replay-only unknown token returns `ROUND_NOT_FOUND_FOR_REPLAY` (404) and never opens a new gamble. Different tokens with the same expected attempt serialize under those same wallet locks; only one can mutate.

One atomic PostgreSQL transaction writes the original `GAMBLE_BET`/`GAMBLE_WIN` transfers, ledger entries and wallet audit, validates integer-cent conservation for both Player and house, then stores the receipt in the existing `sw_nine.actions`. An insert or payout failure rolls back the entire action. The original spin receipt remains historical and is not rewritten.

`fresh-state` returns the existing original spin under `round.result` and adds `round.gamble`: current attempt, current riskable stake, availability, reason, five-attempt and 500.00 limits, and the last stored action result. The current account balance comes from the ledger. **Take Win does not credit money again**: the spin or preceding successful X2 already credited it. The client closes the gamble view and refreshes the existing state, preserving unresolved action tokens for recovery.

Focused unit checks live in `existing-gamble.test.mjs`; genuine disposable PostgreSQL checks live in `postgres-qa/existing-gamble-postgres.test.mjs`. The latter uses hash-validated independent candidates with approval fields changed only on local QA copies, actual existing ledger SQL, deterministic server-only draws for winning and losing cases, and the runner's temporary database. These tests do not mutate production flags, accounts or balances.
