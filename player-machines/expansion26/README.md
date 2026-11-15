# ZPLAY — 26 Games: non-monetary QA source checkpoint (2026-11-16)

This is an original, isolated game-family QA checkpoint, not the final SmartSoft games, a licensed game engine, or a production release. It is additive to the original protected repository.

## Delivered
- 26 distinct public SmartSoft product-page references in `catalog.mjs`; no claim of in-game playable demo observation.
- Ten code-driven interaction families: crash, reels/slots, mines, path, Plinko, wheel, roulette, cascade, tower and hybrid.
- `engine.mjs` verifies synthetic result shape, controls animation state, rejects duplicate round identities, handles STOP as acceleration only and keeps all money disabled.
- `fixtures.mjs` supplies non-monetary, deterministic fixture data, not licensed provider payout data.
- A Canvas-based responsive local QA interface: `preview.html`, `preview.css`, `preview.mjs`; includes START, STOP, COLLECT, sound, Help, automatic fixture cycles when appropriate, tile and choice controls.
- `engine.test.mjs` provides 35 passing Node tests including 20 QA fixture rounds for each of 26 games (520 synthetic fixture rounds, NOT official demo spins).
- `browser-qa.mjs` provides 33 passing Chromium checks at widths 360, 390, 430 and 1280 pixels, including pointer interactions on selected games.
- `QA-STATUS.json` preserves checkpoint status and blockers.

## Run
In this directory with Node >=22:
```bash
npm test
npm run qa:browser
```
Open `preview.html` through a local development web server. Browser QA uses Chromium and DevTools document injection to avoid needing external access.

## Production protection
Current Player Worker (observed): v421 `cd27fd55-3e84-4113-8a29-e85ae67b20a1`; deployed `ee090b47-ff5f-4201-b3f7-2eb684306449`. This is newer than the authoritative GitHub frozen baseline. Its live deployment, Durable Object bindings, wallet, backend, player accounts, deposits, withdrawals and agent portal were not changed.

Protected games `multi_hot_5_native` and `foxy_hot_20_native` are unchanged.

## Gaps before real deployment
- Official live product-directory pages were located, but interior demo PLAY, SPIN, audio and animations were not verified. BalloonX official loader returned `COUNTRY_BLOCKED`; further Browser Rendering attempts returned HTTP 429.
- Source mechanics and presentation are original illustrative prototypes, NOT certified provider probabilities, payout math, RTP, rules, artwork or sound.
- No authorized provider game-engine math or ETB wallet adapter is implemented; all game definitions set `walletEnabled:false` and `productionEnabled:false`.
- Before activating any existing live route, compare against current Worker v421, preserve inherited modules and bindings, audit backend integration, run isolated security and wallet tests and full player/agent regression, establish rollback and verify live without real-money wagers.

There is no live deployment from this checkpoint; do not misrepresent its tests as official demo spins.
