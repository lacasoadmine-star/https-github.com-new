# Original SmartSoft demos with an existing-wallet entry preview

The owner requested that SmartSoft game graphics, rules and spins remain unchanged. Both lobby buttons now open the exact original public provider launcher. PLAY (ETB) first verifies the existing authenticated, play-enabled Player and a positive canonical ETB wallet balance; it then shows that unchanged real balance in the surrounding player header. PLAY DEMO opens the same public demo without wallet access. The provider game remains labelled DEMO.

POST /api/gateway/launch accepts only game_id and mode. The funded response is explicitly WALLET_DEMO with settlement_enabled=false. It has no stake, debit, credit, refund, provider-outcome or ledger operation. The actual account balance is read from the existing canonical session, never invented or reset. A stale funded lobby cannot bypass a fresh zero-balance or disabled-account response. Identity and launcher inputs cannot be supplied by the browser.

The ETB Wallet Test dialog, stake-check form and long test paragraphs are removed. The only player header controls are the game title, DEMO badge, actual wallet balance on funded entry, in-place fullscreen and close. There is no external-open link; the top-level page stays inside Superwin. No test credit is created. Original three native ETB game routes and existing account/payment workflows remain intact. /api/wallet/test returns 410.

New rounds in the replacement Superwin engines have been disabled. Existing accepted receipts, cashouts, payout reservations and expiry handling remain recoverable. No historical ledger entry or balance was deleted or rewritten.

This preserves the provider game and connects authenticated wallet display and funded entry only. Wins and losses in the external SmartSoft demo are not posted to the local wallet. Real provider debit/credit settlement remains unimplemented because no verified provider bet/outcome/callback contract or credentials are configured. A provider DEMO result must not be represented as a settled ETB transaction.
