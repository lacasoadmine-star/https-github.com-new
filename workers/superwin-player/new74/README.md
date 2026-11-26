# NEW74 — separate player frontends

New, independently authored pages for the existing `superwin-player.apdiy61.workers.dev` Worker. This addition does not reuse any existing game frontend. The existing account API remains authoritative for outcomes, denomination, stakes, wins and balance.

| Requested entry | New page | Existing financial API model |
| --- | --- | --- |
| 1. Multi Hot 5 | `/new74/001-multi-hot-5` | `multi_hot_5_video` |
| 2. Multi Hot 10 | `/new74/002-multi-hot-10` | `fresh_multihot10` |

Each page uses locally served official artwork, sprite animation frames, Intro fonts and audio. Multi Hot 5 has three reels, a vertical multiplier, hexagonal controls and adjacent bet steps. Multi Hot 10 has five reels, a multiplier wheel, circular SPIN, turbo and a bet selection panel. The new Canvas renderer shows the server's returned grid and win positions. SPIN animation is decorative; there is no browser RNG, payout evaluator or wallet balance generator.

The provider's free DEMO was observed for 15 rounds per title. Round evidence and public source URLs are in `reports/smartsoft-pair01`. The demo's money, account, game server, executable game code and result logic are not deployed. No third-party host is contacted by the player runtime. Captured media and visual observations do not certify exact parity for every rare bonus animation.

## Account behavior

Requests go only to the existing same-origin `/api` routes and use existing login cookies. Pending wager identifiers are stored before submission and reused on recovery. An uncertain result blocks further wagers. Responses are checked for game/model identity, grid dimensions, denomination and settlement arithmetic. Double tapping SPIN speeds up presentation; holding SPIN repeats only while held. Autoplay requires an explicit count and loss limit, and stops on cancellation, blur, hidden document or an uncertain response. A signed-out visitor sees no invented balance.

The API model IDs above are financial contracts, not links to existing game pages. No backend, database, account, payout rule, Railway service, existing asset key or old game source is changed.

## Restore and verify

```sh
python workers/superwin-player/new74/tools/download-assets.py
node --test workers/superwin-player/new74/tests/*.test.mjs
SUPERWIN_UI_FIXTURES=1 node workers/superwin-player/new74/tests/serve.mjs
# In another terminal, with Playwright and Chromium installed:
node workers/superwin-player/new74/tests/browser.cjs
node workers/superwin-player/new74/tools/manifest.mjs
```

The fixture server listens only on loopback and requires explicit opt-in. Its synthetic money and responses are never part of the deployment manifest. Browser tests cover each new page in portrait/landscape, stop/double tap, hold release, autoplay cancellation, same-origin network isolation and signed-out behavior. Local unit tests cover recovery after a lost response, account changes, corrupt receipts and media routing.

## Additive deployment

Upload only manifest files to the existing `SSG_OFFICIAL_REFERENCES` KV binding under `new74/20261113-pair01-r1/`. `router.mjs` serves only `/new74` and `/new74/…`. `entry.mjs` imports and re-exports the previous `native-game-entry-r23.mjs`, forwards all unrelated requests and appends one separate NEW74 entry link to the home page.

Use Cloudflare's **Replace Worker Script Content** endpoint (`PUT …/workers/scripts/superwin-player/content`) so configuration and bindings remain unchanged. Preserve every old module's raw bytes, filename and module type; do not UTF-8 decode binary parts. Add only `new74-entry-r1.mjs` and `new74-router-r1.mjs`, set the former as `main_module`, and preserve all previous named exports. Keep the previous deployed version ID in the release record. Do not apply unrelated staged Railway changes.

The remaining 72 requested entries are tracked by original list position, including repeated names. They need their own verified references and compatible existing financial API model before becoming playable; a title is never marked complete just because a card exists.
