# Existing integration and new70 delivery

Repository: https://github.com/lacasoadmine-star/https-github.com-new. New isolated checkout: `/workspace/superwin-new70`, branch `work/new70-20261124`, based on82dba308a1a4b7cf40eec1a209a59af7f126710f. Previous unfinished work remains in `/workspace/superwin`; it is not a new70 completion.

## Identity and naming

Game numbers are001–070. After the current reference identity is verified, use `games/game-001-<verified-slug>/` and a new isolated ID such as `zplay70_001_<verified_slug>`. Do not assign the first official name or silently reuse an old game as Game#1. The release registry is `catalogue/registry.json`; it is intentionally empty until a real game is ready. Progress is recorded in `progress.json`, with independent reference/native/backend/browser/publication/live fields.

## Existing financial boundary

The current native-family Railway service is `superwin-native-family-engine-staging.up.railway.app`, servicef617aec9-d705-4dd3-b68b-dc058f9a0781, in the existing project5e2d5a78-b695-4d10-a0f1-7d7ded24b7f7. The environment's staging name does not mean its player financial data is disposable. Other game families use other existing services; select Game#1's actual compatible service after its identity and mechanics are observed.

Browser requests use the target Worker as same-origin gateway, retaining existing account cookies and auth. The existing native-family contract uses GET `/api/remaining20/state?game_id=<approved-backend-id>` for authoritative ETB balance/current round/model/session; POST `/api/remaining20/action` for server-authoritative actions. Each action uses `X-Zplay-Library-Session`, an opaque server-bound session identifier, and an idempotent UUID `request_id`. Never put a session value in this repository or client configuration.

The existing native start body has `request_id`, `type:start`, `game_id`, `model_version`, `stake` as a two-decimal string and `options`. Existing collection/other actions carry `type:action`, the same game/model identity, `round_id`, `expected_version`, `action` and `input`. Exact supported actions and payloads must be selected from Game#1's compatible engine, not assumed common across all70games. The server debits and credits its existing wallet/ledger. There is no client-authoritative balance, separate replacement wallet or arbitrary browser credit endpoint. A retry must recover the original UUID; STOP changes presentation only.

## Publication

Current target: `superwin-player` in Cloudflare account288bc182291438b87a68193627f36ca0. Current live version476; obsolete477 is staged and must remain unactivated. Existing18bindings, Durable Object exports, migration state, every old game and all financial routes remain preserved.

The actual existing publishing channel is the authenticated Cloudflare connector API, with an independently read current deployment, exact source/artifact pins, staging and activation through `/accounts/{account_id}/workers/scripts/superwin-player/deployments`. A generic `npx wrangler deploy` is not a verified command for this retained425+module build. Do not run it from the obsolete main branch. The source is close to the account's real uncompressed limit; the prior task's2,937byteappend alone was rejected. New70 delivery needs a reviewed capacity plan before publication, with static assets in owned content-addressed storage and all old behavior preserved.

No new70 model, paid action, lobby card or release is deployed by this preparation. Game#1 cannot be truthfully implemented or compared until its actual reference is visible.
