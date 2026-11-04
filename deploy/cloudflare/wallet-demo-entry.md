# Direct demo entry with the existing wallet

The old ETB Wallet Test dialog, stake-validation form and explanatory test text have been removed from the player. PLAY DEMO opens the official provider launcher directly. For an authenticated, play-enabled Player with a positive current ETB wallet balance, PLAY (ETB) opens that same provider demo in the same player, with the actual wallet balance in the surrounding header. The game is labelled DEMO. Empty or disabled wallets cannot use the funded entry; normal demo access remains available.

POST /api/gateway/launch validates the exact same Origin, bounded JSON, selected catalog game and mode. Mode ETB resolves the existing authenticated wallet through the canonical session route, verifies play permission and positive balance, and returns session_mode=WALLET_DEMO with settlement_enabled=false. It performs no stake, debit, credit, refund, game-outcome or ledger operation. Demo provider wins and losses remain provider demo credits. This is a funded-access preview, not real ETB provider settlement.

The only accepted JSON fields are game_id and mode. Browser-supplied identities, launch URLs and other fields are rejected. The client checks the server's approved identity, game, URL, mode, currency and balance before entering the game. Existing native three-game settlement is unchanged. No new native engine is deployed or enabled. The previous /api/wallet/test endpoint returns 410.

The UI cancels stale requests on close/logout/session change, prevents duplicate entry requests, validates the provider launcher and clears the iframe and displayed balance on close. A zero balance returned by the backend overrides a stale funded lobby snapshot. All 30 provider demos keep the same game URL for either entry.

Real debit/credit settlement for these provider demos remains unimplemented pending a verified provider outcome/callback protocol. The funded-entry result must never be treated as a bet receipt or as authorization to modify the ledger.
