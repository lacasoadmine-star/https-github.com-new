# Superwin internal family engines

This additive Bun service powers 30 independent Superwin games in the existing Player at `/native/<game-id>`. The original three slot routes, existing accounts, authentication, payment workflow and PostgreSQL ledger remain in place. These engines are not SmartSoft implementations or an official provider integration. Supplied external demo links remain separate and unverified.

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
