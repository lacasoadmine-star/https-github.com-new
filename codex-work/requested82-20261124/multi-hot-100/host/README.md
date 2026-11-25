# Existing authoritative Multi Hot 100 host

This adapter connects the new view `zplay72_multi_hot_100_v1` to the already authorized native operator model `multihot100_native`, version `superwin-multihot100-2-etb1-40000-v1`, on the existing account, wallet, journal and backend. It implements no new financial engine, balance or random distribution. The incompatible legacy `multi_hot_100` model is rejected.

The actual deployed native-family bootstrap was read through the connected service and decoded without executing it. Its complete decoded hash and embedded operator patch hash match the bootstrap's pins. The scoped `remaining-native-etb-r16` policy expressly includes this M100 model under the owner's earlier ETB authorization; it validates the retained model and financial checks before promotion. The original source payload variables are redacted, so their values were neither recovered nor bypassed. Public own native client/session resources supply the model metadata and actual wire protocol. Current fresh official geometry/paytable checks independently match all 100 paths, the corrected line 46, every displayed coefficient and the 2,500× maximum. `source-verification.json` preserves the exact observations and hashes without publishing private source bodies.

```js
import {createExistingM100Transport} from './transport.mjs';
const transport = createExistingM100Transport();
const connected = await transport.connect();
// Construct the ETB controls only from connected.hostPolicy.
// If connected.pendingIntent exists, recover it before mounting new play.
```

`connect()` performs an authenticated GET through the existing same-origin cookie session. It returns `hostPolicy`, `pendingIntent`, `pendingRequest`, `restoreView`, `round`, `balance`, `accepting`, `otherActiveGame` and `canStart`. Its policy hash pins this adapter's own compatibility metadata; it is explicitly not presented as a server-reported hash or provider certification. The real returned model must match the promoted operator version, all paths/coefficient values, approved wager ladder, independent mathematical profile and action policy before any POST is possible.

The original endpoints are:

- `GET /api/remaining20/state?game_id=multihot100_native`
- `POST /api/remaining20/action`, using the original authenticated `X-Zplay-Library-Session` header and UUID `request_id`.

A start uses `type:start`, the exact native game/model, an admitted stake and `options:{autoCollect:false}`. Collection and doubling use `type:action`, the accepted `round_id`, `expected_version` and original `collect` or `gamble` action. The doubling input is `{color:'red'|'black'}`. Numeric native symbols 0–7 map to seven, bell, grapes, watermelon, cherry, orange, plum and lemon. Native grids are column-major; the new view receives four row-major rows.

`submit(intent)` and `recover(intent)` implement the current controller contract. A next SPIN with a pending win saves both the separate collection UUID and original start UUID before dispatch. Recovery replays those exact bodies, including an already accepted collection. Storage checkpoints are never proof of acceptance: every recovered step is confirmed by the real host again. An old native page's unresolved journal blocks new wagers and is preserved. A changed session, model, accepted grid, multiplier, path, line amount, payout, wallet delta, action version or history fails closed. A source-model mismatch never falls back to the legacy model.

The adapter recomputes every original line and total with the fresh deterministic quote. TAKE uses the actual collect action, except when an authenticated state already proves that the host settled and credited this exact round. GAMBLE retains the native pending award and validates the confirmed history and exact double/zero result. The host's binary color is illustrated by a fixed corresponding ace; the adapter generates no additional random card or financial outcome.

On reload, a saved pending action is recovered before mounting a controller. After successful recovery, `snapshot()` returns `pendingIntent:null` and the current validated `restoreView`/balance. A restored settled round has `collected:true`; a restored active round retains the actual pending award. No new nonce is generated for display restoration. Logout/session-changing events call `disconnect()`; page disposal blocks late delivery while preserving an uncertain journal. Only explicitly marked `safeToCancel && noWagerDispatched` failures occurred before any POST attempt and may cancel an unsent presentation intent.

The actual anonymous live state probe returned **401 UNAUTHORIZED**, as required. No authenticated live financial round was executed here. Generic native health returned ready/database/financial readiness, `new_rounds_enabled:false`, zero generic configured games and 30 recovery games. That response does not prove admission of the separate scoped operator release. The adapter therefore requires the actual authenticated game state and `accepting:true` for new wagers. No enablement flag was changed or inferred from redacted values.

Verification: `node --test codex-work/requested82-20261124/multi-hot-100/host/transport.test.mjs`. The explicit `test-support.mjs` fixture is for isolated tests only; it never contacts production and must not be included in the production client. Its synthetic balances and rounds establish adapter behavior, not live account acceptance or completion of the pair.
