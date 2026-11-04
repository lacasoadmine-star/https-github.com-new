# Existing Superwin Worker wallet compatibility

The deployed player and agent already use the shared Railway API at
`https://zplay-rebuild-api-staging.up.railway.app`. This module adds the API paths
used by the supplied player snippet without replacing the live lobby, account
handlers, native engines, financial database, or settlement code.

- `GET /api/wallet` returns the authenticated player's existing ETB balance as an
  exact decimal string. The legacy `/api/wallet/DDSAgent` path is an alias for the
  signed-in player; it cannot select or create an account named DDSAgent.
- `GET /api/games` lists only enabled native titles, with same-origin launch URLs.
- `POST /api/spin` accepts `mode: "ETB"`, `game_id`, `stake` as a decimal string
  with two fractional digits, and a UUID `request_id`. It obtains identity from
  the session and forwards to existing `/api/slots/spin` settlement with the same
  idempotency token. The native engine still validates bet levels and balances.
- DEMO requests return 409 before contacting any wallet or settlement handler.
  Public provider demos are not integrated with the financial ledger.
- WebSocket upgrade requests under `/ws` and `/ws/` preserve the original
  response, credentials and upstream authentication. This adds no new socket
  server; availability depends on the existing upstream route.

`installWalletCompatibility` applies the wrapper to the downloaded production
module and stops if the expected source anchors have changed. Upload the result
as `worker.mjs` together with `player-compat.mjs`. Preserve all deployed bindings,
including secret bindings through Cloudflare's `inherit` binding type, and the
existing compatibility settings. Preserve legacy version
`33c53af1-1f23-41e8-bc4a-43edab1c2b6a` at zero percent in the deployment: the live
player's self-service binding explicitly dispatches account and API calls there.
Do not deploy the independent sample SQLite application to either live portal.

Validation: `node --test tests/worker-wallet-compat.test.mjs
tests/frontend-regression.test.mjs`, `python -m pytest tests/test_platform.py -q`
with the test module's disposable database, and `npm run build` for all portals.
Production verification uses read-only requests; no test wagers or test balances
are created in the shared financial system.
