# Official demo catalog and future provider integration

The ZPLAYBET player uses first-party demo launchers from SmartSoft Gaming and Pragmatic Play. Each catalog entry keeps its official source page, exact launcher URL, provider game identifier and official thumbnail. The catalog does not generate fictitious titles or repeat games to reach a requested count. `requested_games` records the owner's target of 1,000; `total_games` is the number of distinct sourced demo entries actually available in the release.

The existing three native ETB games, signed-in identity, PostgreSQL wallet, account workflows, Agent and Admin remain on their existing routes. Public provider demos never settle against that ledger. Provider PLAY (ETB) is unavailable until an official contract is configured and implemented; demo credit remains provider-managed.

The current snapshot includes 600 source-listed demos (65 SmartSoft and 535 Pragmatic Play). Of those, 423 launchers were resolved during collection; 177 are resolved on demand from their fixed official provider page. The resolver accepts no client URL, validates the public demo host, bounds responses and redirects, and caches only public launcher URLs for six hours. A provider outage offers a manual retry and never produces wallet mutations. The 1,000-game target is not claimed as delivered.

## Stable integration boundary

- `GET /api/gateway/games`: sourced public catalog, including `provider_key`, `provider_game_id`, `source_url`, `launch_url` and per-entry settlement status.
- `GET /api/providers/status`: demo counts and explicit provider integration readiness. It returns no credentials.
- `POST /api/providers/launch`: same-origin JSON containing only `game_id` and `mode`. `DEMO` resolves a catalog-owned launcher. `ETB` currently returns `409 PROVIDER_API_NOT_CONFIGURED` and performs no wallet operation.

When the owner supplies the official operator contract, implement each provider's launch and signed callback adapter behind this boundary. Read credentials only from server secrets. Authenticate the current Player server-side; bind each provider session to the canonical user and currency. Validate the contract's signing rules, transaction identifiers, round lifecycle, retries, debit/credit/rollback semantics and amount units before enabling live play. Use the existing atomic ledger and immutable idempotent receipts; never accept client-reported winnings. A generic guessed callback schema is not a provider integration.

The adapter must be verified against the provider sandbox and isolated wallet fixtures before setting live readiness to true. Existing accepted rounds and reserves remain recoverable during rollout or rollback. No production test wagers, default accounts, automatic credit or changes to existing balances are part of this catalog release.
