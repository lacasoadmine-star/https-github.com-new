# ZPLAY expansion player

This directory is the standalone player for the expansion catalogue. `index.html` loads `app.mjs`; relative static imports resolve beneath `/native-library/expansion/r1/` after the root asset build rewrites the HTML entry URLs. The existing player presence module is loaded at its existing absolute URL.

## Contract

The pathname selects `/games/<game_id>`. The public config array comes from `/native-library/expansion/r1/games.json`. The player reads `/api/expansion/state?game_id=<game_id>` and submits player actions to `/api/expansion/action` with `X-Zplay-Library-Session` set to the authenticated snapshot's `sessionId`. Autoplay requires an explicit start with the selected count, stake and stopping limits; it then uses the same serialized request contract one round at a time.

The server remains authoritative for balance, stake acceptance, round state, every result, each multiplier and every payout. Money is formatted from integer-backed strings; Canvas never calculates a payout. State must include authenticated identity, matching game, ETB currency and valid decimal balance. Starts require the authenticated model version and stake bounds. Actions use the accepted round's model version and expected version even when new starts are paused.

`session.mjs` saves the exact serialized intent, request ID and original session before any financial request leaves the browser. An uncertain action keeps new starts disabled. Retry verifies identity, then reuses the saved bytes and ID. A replay requires a fresh state read before resolving the saved request. Normal refresh never discards an unresolved request. A malformed saved request sets a persistent recovery block for that session. Logout/session rejection invalidates outstanding reads and preserves any unresolved original-session storage entry.

## Presentation

- `scene.mjs` is the original unpublished Canvas prototype. Grid shape, symbol IDs, labels, palette, wins and features come from the game config and server result. It is not a claim of complete official-demo appearance. Individual verified-asset work is in `../presentation/`.
- Slot and cascade sequences display server-provided result frames. Skip only affects presentation. The total displayed win stays the server round's payout.
- Tower X reveals the server-provided building sequence. Tower Rush exposes the declared `step` and `cashout` actions.
- Coin Miner has 25 accessible tile buttons with server picks, mine count options and collection.
- `controls.mjs` uses each fixed official stake schedule without injecting generic amounts. CoinMiner offers only the nine verified mine counts.
- `autoplay.mjs` implements the referenced first-11 count menus and monetary stop conditions. The host waits for a confirmed receipt and the end of its result animation before submitting another paid round. A stop finishes the accepted round; it does not start another. Disconnect, session change, unresolved confirmation and leaving the page stop autoplay. Autoplay intent is never restored on reload. Legacy feature-stop toggles stay hidden until the adapter provides the explicit confirmed trigger flags; a presentation animation does not invent them.
- The rules dialog reads actual game paytable rows and their payout basis; no payout coefficients are invented in the frontend.
- The desktop layout has a separate control column. The mobile layout uses a single column, with 360/390/430-oriented sizing. Sign-in links return to the existing `/` lobby.

## Verification

Run from `game-expansion`:

    node --test continuation/test/client.test.mjs

The focused client suite checks financial request safety, state ordering, identity changes, persistence, replay handling, monetary formatting, all 23 public-config render paths and mobile/desktop scene geometry. It does not claim browser pixel/layout verification. Public browser inspection belongs to the deployment verification step; private source fixtures must not be uploaded to an external renderer.
