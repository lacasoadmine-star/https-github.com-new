# Fresh Multi Hot 10 account contract

The existing Player Worker forwards `/api/slots/*` to the existing nine-slot service. The retained handler rewrites that prefix to `/api/*`. Authentication, wallet locks, settlement transactions, financial tables and model bytes are reused.

## Read and recovery

`GET /api/slots/fresh-state` requires the existing active player cookie. It returns:

```json
{
  "authenticated": true,
  "currency": "ETB",
  "sessionGuard": "64 lowercase hex characters",
  "balance": "100.00",
  "game": {
    "id": "fresh_multihot10",
    "enabled": true,
    "freshReleaseReady": true,
    "buildStatus": "ready",
    "mathVersion": "fresh-mh10-20261111-v1",
    "engineVersion": "zplay-fresh-slot-v1",
    "mathSha256": "383b2348149f8eb50c14f26edfa6a1b3dc7816130d5d2ea1244d9b6ce855700a",
    "betLevels": ["0.10", "0.20", "0.50", "1.00", "2.00", "5.00", "10.00", "20.00", "50.00", "100.00", "200.00"]
  },
  "round": null,
  "blockedByActiveGame": null
}
```

`game` also retains the existing public rules, paytable, independent probability-model description and `providerRtpReproduced:false`. Its `enabled` flag is the conjunction of global slot admission and the exact `FRESH74_ACCOUNT_RELEASE=mh10-v1` release. No flag is changed by the candidate.

With the fresh release variable absent, the state endpoint still returns the authenticated balance, but MH10 reports `enabled:false`, `freshReleaseReady:false`, `buildStatus:"draft"` and an empty bet list. All 74 fresh registrations remain closed. A direct authenticated new spin returns `503 FRESH_RELEASE_NOT_ENABLED`; a previously stored matching receipt remains recoverable without any new transfer.

When there is a settled fresh round, `round` is `{result, createdAt, gamble}`. `result` is the existing immutable spin receipt. `gamble` contains `attempt` (number already completed, starting at zero), `stake` (current award, exact two-decimal string), `available`, `maxAttempts`, `maxStake`, `reason`, and optional `lastResult`. The latest round and newer-round checks use canonical `sw_rebuild.rounds.settled_order`, including other game families. A state read places no wager and creates no financial row.

## Spin

`POST /api/slots/spin` uses the original `{gameId,bet,roundToken}` plus `sessionGuard`, `mathVersion`, `engineVersion`, `mathSha256` from state. The game ID remains `fresh_multihot10`. A new token is generated only after an explicit user action.

Persist the exact submitted body until its outcome is confirmed. For refresh or timeout recovery, retry that token with `replayOnly:true`. A settled matching receipt returns unchanged; if no receipt exists, `409 ROUND_NOT_CONFIRMED` prevents a new wager. A different authenticated account cannot retrieve the first account's receipt. A same-user rotated session can recover an old receipt, but its old session guard cannot create a new wager.

## Gamble

`POST /api/slots/gamble` uses:

```json
{
  "roundId": "parent spin round UUID",
  "roundToken": "new action token",
  "choice": "RED",
  "sessionGuard": "current state session guard",
  "expectedAttempt": 1,
  "expectedStake": "5.00"
}
```

`expectedAttempt` must equal the latest completed attempt plus one. `expectedStake` must exactly match the current two-decimal award. Receipt replay is resolved before these fresh-operation checks. Unknown-token `replayOnly:true` fails without a wager.

Fresh gamble receipts additionally return `gameId`, `currency`, `balanceBefore`, `chargedStake`, `finalWin`, `balanceAfter`, `netChange` and the same fields inside `walletReceipt`, calculated by the retained `settlementReceipt` function inside the locked transaction. The prior `roundId`, `attempt`, `maxAttempts`, `choice`, `revealed`, `won` and `payout` fields remain.

## Admission and failure behavior

Fresh spin/gamble checks for another active native-library round while holding the retained sorted player/house wallet locks. House full-liability reserve checks remain. Any existing account maximum balance is read from `sw_rebuild.account_limits` and checked against the worst possible payout before drawing RNG; no limit value is invented. Failed admission, failed credit and thrown transaction faults create no partial settlement.

Legacy game identities and response shapes remain unchanged. The 73 other fresh registrations remain closed. The source patch is inversely checked against the exact deployed runtime. Local verification uses disposable PGlite and a Redis lock mock; it does not prove multi-process PostgreSQL scheduling or perform production wagers.
