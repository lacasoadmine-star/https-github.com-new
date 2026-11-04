> Superseded: the old test modal and read-only stake check have been removed. See wallet-demo-entry.md for the active owned ETB and official-demo modes.

> Superseded: the test dialog and form have been removed. The old endpoint returns 410. See wallet-demo-entry.md for the current direct-entry preview.

# Manual ETB wallet test for the existing demo catalog

Each of the 30 official-demo entries has PLAY (ETB) · TEST and PLAY DEMO. The existing three native ETB games keep their normal launch and settlement routes.

PLAY (ETB) · TEST enters an ETB test panel and reads the existing authenticated wallet through GET /api/wallet. Entry is allowed at 0.00 ETB. TEST WALLET stays locked until the current balance covers the requested stake and the account has play permission. No sample credit is created and no existing balance is reset. After a legitimate credit reaches the existing wallet, REFRESH BALANCE reads it again. Opening the panel never submits a stake test automatically.

TEST WALLET is a manually invoked, read-only affordability check. It validates the selected catalog game, the stake, the existing session, ETB currency, account play permission and current available balance. It does not reserve or debit funds, calculate a game outcome, submit a provider bet, settle winnings, create a ledger entry, or issue credit. The provider demo continues using its own demo credits.

POST /api/wallet/test accepts only JSON with game_id and a decimal-string stake from 1.00 through 1000.00. Unknown fields, including browser-supplied user identity, are rejected. The real identity is resolved from the existing canonical backend session. The response includes TEST_PASSED, test_only=true, ledger_mutated=false, debit_executed=false, win_settled=false, the unchanged actual balance and an explicitly hypothetical projected_balance. The hypothetical amount is never displayed as a new wallet balance or persisted.

The endpoint requires the exact same Origin, rejects unauthorized or play-disabled accounts, uses bounded JSON reads, validates money with integer santim and preserves session cookie renewal. It only dispatches to the existing session GET route. There is no new funding endpoint or production credit seeding. Authentication failure, insufficient balance and unavailable backend states remain explicit; a failed request never shows a successful connection.

The client locks duplicate checks, bounds request time, clears and aborts stale responses on close/logout/session change, keeps the test panel separate from provider settlement, and submits checks only after a manual button press. No automatic retry or automatic wager is installed.

This prepares the account → wallet → backend connection for further work. A future real betting implementation must have its own authenticated session, authoritative outcomes and atomic debit/credit/reversal protocol. This test endpoint must not be reused as proof that a bet was placed or settled.
