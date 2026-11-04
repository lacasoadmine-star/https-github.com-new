# Superwin internal family engines

The active catalog now contains 30 Superwin-owned ETB engine configurations keyed to the 30 selected lobby entries. PLAY (ETB) opens the owned engine; PLAY DEMO opens the official SmartSoft public demo. The ETB engines are independent Superwin implementations and do not use or settle the external demo's displayed outcomes. They share the existing canonical PostgreSQL wallet. The original three native slots remain unchanged.

The earlier 30 internal IDs remain recovery-only. The HTTP server passes an explicit active-ID whitelist to the store. Old accepted receipts replay before that whitelist check, old accepted actions and expiry remain supported, and new wagers on retired IDs are rejected. `NATIVE_ENGINE_ACCEPT_NEW_ROUNDS=true` enables only the active 30 configurations, not the retired catalog. No production accounts, balances or house funds are seeded.

A stake moves through the canonical transfers and double-entry ledger under row locks. Its maximum payout is reserved before acceptance. Final payouts go back into the same Player wallet, unused reserve returns to the house, and canonical round/audit/live-revision records are updated atomically. Fresh authenticated funded entry is required, zero-credit wagering is rejected, browser-supplied wins are never accepted, and repeated request IDs cannot charge or pay twice. One active interactive round is allowed per account.

The illustrated cabinet uses the existing Player's fruit atlas and local animated rendering. The embedded player posts validated balance snapshots to the exact same-origin parent; parent handling checks the frame, origin, canonical user ID, wallet session identity, game ID and currency. Both the header wallet and the account balance update after settlement. No wallet-test modal or affordability-check form is displayed.

## Configuration

Read secrets only from service environment variables:

- `DATABASE_URL`: reference the existing canonical API's PostgreSQL connection. The canonical schema is `sw_rebuild`.
- `NATIVE_ENGINE_SECRET`: at least 40 random characters, shared only with the Player Worker's secret binding.
- `NATIVE_ENGINE_ENABLED`: `true` enables financial routes after schema verification and migration.

Worker bindings `NATIVE_ENGINE_ORIGIN` and `NATIVE_ENGINE_SECRET` point to this service. Preserve all existing Worker bindings and the immutable legacy version at zero percent during deployments. The Worker resolves the real Player through `/api/me`; browser-supplied identity is never used. Requests are HMAC-signed over method, path, timestamp, identity and exact body. Only the Worker can invoke financial endpoints.

Migration creates only `sw_native_family` tables and indexes. No production accounts or funds are seeded. Money is held as integer santim. Each wager reserves its maximum possible payout in an existing-ledger reserve wallet; the reservation, stake, settlement, balanced double entries, round record and audit changes are transactional. Insufficient bankroll rejects the whole wager. Do not fund the house with invented balances. Existing account balance limits are enforced against maximum liability.

Requests require UUID idempotency keys, bind keys to the complete payload, and replay the original receipt with the current wallet balance. Interactive rounds are unique per player, owned by that player, and use checked versions. Crash uses server time; Mines and Hi-Lo use server-owned state. Server seeds are secret during a round and revealed after settlement. The commitment proves that the revealed seed did not change; it does not independently certify the service or its randomness.

## Build and verification

From this directory:

```sh
npm ci
npm run build
npm test
npm run test:postgres
```

The PostgreSQL test runner creates and removes a disposable local database. It refuses remote database URLs. Browser verification requires Playwright and Chromium, with `CHROME_PATH` supported by lobby checks. The suite checks all families, ownership, concurrent requests, wallet conservation, payout reservations, expiration, interrupted responses and session boundaries. Run the repository's existing backend tests and all three portal builds as well.

`build` regenerates the inline assets and emits `dist/index.mjs`, a complete single-file Railway Function source. Deploy that complete source to the existing `superwin-native-family-engine` service. Check `/health` for both `database_ready` and `financial_ready` before publishing the new Worker. The schema inspection bootstrap is not part of the production implementation.

The Player Worker's scheduled handler calls signed `/v1/reconcile` every minute. It settles due Crash rounds and expired Mines/Hi-Lo rounds, including amounts owed to blocked players. Untouched expired Mines/Hi-Lo rounds refund their stake; played ones cash out. Reconciliation is idempotent. Active-player reads and actions also settle due rounds.

To build the Worker compatibility module from the repository root:

```sh
npx esbuild deploy/cloudflare/player-compat.mjs --bundle --format=esm --platform=browser --outfile=/tmp/superwin-native-worker-compat.mjs
```

Use `integrateLobbyScript` with the preserved v244 fixture to generate the lobby text module. Upload the bundled compatibility module and generated lobby module while retaining the deployed main module and all its original assets. The source transformer refuses unknown anchors. Upload a Worker version, verify configuration, then deploy with the immutable legacy version retained at zero percent. Rollback restores the previous Player version; preserve the additive service and tables so already accepted rounds can still be settled. Do not delete outstanding reserves.

Expected gameplay: Crash grows and cashes out against server time; Plinko follows independent peg decisions; Mines reveals chosen cells; Slots evaluates five paylines. Dice, Wheel and Hi-Lo also have independent rules. Instant games target a 97% theoretical return before unbiased santim rounding; Hi-Lo has a 3% edge per successful step. A theoretical return is not a guarantee for any session. Limits and rules are visible in the player.

The shared wallet adapter sets `SET LOCAL search_path=sw_rebuild,public` inside every ledger transaction. Existing wallet triggers invoke `sw_live_touch(text[])` without a schema qualifier; using the default search path caused PostgreSQL 42883 and a full rollback before wallet reservation. Startup now verifies that the canonical dashboard function resolves, and the regression fixture includes the actual unqualified trigger call.
