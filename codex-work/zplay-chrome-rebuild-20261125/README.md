# ZPLAY rebuild from the current Chrome reference

**Unpublished, incomplete source. No new native game is complete.** This package does not replace or update the live Worker. The requested objective remains the full website and 70 newly implemented native games, with visuals and behavior taken only from the current reference website.

- Reference: https://zplaybet.xyz/en/
- Authorized eventual target: https://superwin-player.apdiy61.workers.dev/
- Current completed native games: **0 of 70**.
- Current fresh catalogue capture: **157 distinct reference records**, merged from 100 Casino All entries and 72 entries in the independently observed SmartSoft filter; eight Most Liked entries were also captured. These are observed cards, not 157 implemented games.

## Package contents

- `reference/`: current captured public catalogue records, observed theme rules and icon mappings. No session tokens, credentials, account balances or private game transactions are included.
- `web/`: newly written HTML/CSS/JavaScript lobby source, using observed original artwork URLs. Search, confirmed provider filtering, device favourites, menu controls and read-only existing-account integration are implemented in source. New Play actions stay disabled because `web/readiness.json` has no verified new games. Unsupported pages and incomplete category membership are identified rather than fabricated.
- `integration/`: a new additive static-asset wrapper. Root publication is off by default; all existing account, wallet, payment, API and game routes delegate unchanged to the retained Worker. It is not a replacement deployment.
- `progress.json`: machine-readable scope and unfinished status.

## Access and remaining work

Original provider gameplay uses the additional origin `eu02-server-w3.ssgportal.com`. Automatic approval review rejected opening its session-bearing frame URL because explicit authorization for that provider origin is still required. No bypass was made. Do not copy a session URL or token into chat, source, logs, or this package. The parent reference tab remains the authorized source; provider access must be approved explicitly before inspection continues.

Complete game source/assets/audio and authoritative game rules have not been acquired. No native game engine was invented, copied from an earlier implementation, or represented as finished. Catalogue screenshots and card images do not supply working game engines.

Desktop browser checks confirmed search, the 72-entry SmartSoft filter, opening/closing the 14-item menu, light/dark switching and device favourites. Play stayed disabled. The preview had no horizontal document overflow. All eight featured game covers failed to load from their original CDN, and original icon glyphs did not render correctly; no substitute artwork was added. See `qa-browser.json` for the observed results.

Exact visual parity, mobile behavior at 360/390/430 pixels, original asset availability, all account screens, every public page, backend game integration and individual live game verification remain unfinished. External original artwork/font URLs are dependencies and are not bundled media.

## Validation and local preview

```sh
node --test web/*.test.mjs integration/*.test.mjs
python -m http.server 4173 --bind 127.0.0.1 --directory web
```

The combined 11 tests pass. Syntax checks pass for all JavaScript modules in `web/` and `integration/`. Tests cover catalogue provenance/filtering, no launch of unverified or old games, device-storage failure handling, account balance validation and preservation of the existing Worker routes. They do not certify artwork availability, browser parity, playable games or a live deployment.

The local preview at http://127.0.0.1:4173/ has no production account backend. A local 404 from `/api/me` does not create an account or balance. Do not enter production credentials into this preview.
