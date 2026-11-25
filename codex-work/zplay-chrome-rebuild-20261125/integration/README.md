# Existing Player integration

This is new source only. Nothing here has been deployed. It contains no game engine or copied artwork. `lobby-layer.mjs` is an additive static-document handler, separate from the new UI source in `../web`.

The active deployment identified for this investigation was Player version476 (`55e5e48b-66a5-480a-8985-63a9f11c38d7`), source commit `47b783f6615e2159c5909cc5e663c297754323ca`. A newer uploaded version is not necessarily active. Recheck the active deployment before packaging or uploading anything.

## Route preservation

- Default `publishAtRoot: false` leaves `/` unchanged. The review page is `/_zplay/rebuild-20261125/preview/`.
- Assets are served only inside `/_zplay/rebuild-20261125/<64-character-release>/` with an exact byte-count/SHA-256 manifest. No guessed asset path is accepted.
- All account, session, presence, payment, game, and API routes delegate to the previous Worker with the original `Request`, `env`, and `ctx`. This code never reads credentials or financial request bodies.
- Existing scheduled behavior is retained. A deployment entry must additionally re-export the existing module's named exports, including `LocalDemoWallet` and `NativeGameResources`; importing only the default export is insufficient.
- Retain every existing binding and module. Do not deploy this file as a replacement Worker. Do not route `previous` through the `LEGACY_PLAYER` service binding: it names the same Worker and could recurse.
- The reviewed source HTML gets a same-origin `<base>` for its release so relative scripts, styles and data work at both the preview path and `/`. Source documents containing an existing base element are rejected.

## Existing frontend contracts confirmed from source

These facts were read from the active commit's Player frontend/session integration; no login or financial transaction was performed for this review.

| Action | Contract |
| --- | --- |
| Read user | `GET /api/me`, same-origin cookies, `cache: no-store`; successful JSON is the user object directly. Existing UI consumes `id`, `username`, `public_id`, `balance`, and optional `credit_facility.outstanding`. |
| Format balance | `balance` uses integer minor ETB units; display `balance / 100` with two decimal places. Never substitute zero for missing or invalid balance. |
| Sign in | `POST /api/login`, JSON `{username, password}`. The player form labels `username` as Phone Number. The displayed `+251` prefix is not programmatically prepended by that form. After success, the existing client confirms sign-in with `GET /api/me`; no returned token field is assumed. |
| Auth errors | Existing frontend clears the user on401/403; other read failures leave the previous state visible with an unavailable message. It reads failed response text from JSON `error`. |
| Session | Server-managed HttpOnly `sw_session`; successful sign-in sets `X-Zplay-Session: started` and the signed presence cookie. Never read or copy these cookie values in frontend code. |
| Presence | `POST /_player/presence` requires the same-origin Origin header and valid existing session/presence lease. Success is `{active: true, expiresAt: <timestamp>}` with a renewed five-minute lease.401 means expiry. It does not create authentication. |
| Configuration | `GET /api/config` supplies `portal`, `games`, and `provider_games`. |
| History | `GET /api/history`; existing UI consumes `ledger`, `rounds`, `deposits`, `withdrawals`. |
| Favourites | `GET /api/favourites` returns IDs consumed as an array. `POST /api/favourites` uses `{game: gameId, enabled: boolean}`. |
| Refresh | Existing app calls `GET /api/sync` while signed in, then rereads `/api/me` when state changes. |

Safe integration starts with the read-only user/config contracts. Login visuals still must come from the current reference. Existing `/` is the confirmed account-portal navigation destination; a general `/login` or `/history` route has not been verified and must not be invented.

Existing catalogue `accountPath` examples are `/games/multi_hot_5_native`, `/games/foxy_hot_20_native`, `/new74/037-safari-simba/`, and `/zplay74/multi-hot-10/`. They identify preserved old games; do not count them as the newly requested games or use their old renderers as new implementations.

## Validation

Run `node --test integration/lobby-layer.test.mjs` from the rebuild directory. Six tests cover route/body/header preservation, delegated scheduled behavior, explicit root activation, preview asset integrity, HEAD, failure handling, and manifest path validation. These tests establish wrapper behavior only, not visual parity or completed games.
