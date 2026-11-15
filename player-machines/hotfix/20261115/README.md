# ZPLAY — native touch repair, 15 Nov 2026

**Status:** implemented and unit-tested in a feature branch. **NOT deployed to Player Worker.**

## Investigated

The existing `superwin-player` Worker v418 serves seven `/new74/<slug>/` games with the same Pixi UI overlay. Its `style.css` gives invisible HTML buttons `pointer-events:auto` and only `cursor:default` to disabled buttons; the status message is absolutely positioned. Disabled/invisible overlays may intercept touches.

Multi Hot 10 has a distinct live route `/new74/002-multi-hot-10/`, a Canvas controller and a tiny 3%-wide speed target in landscape. The old `/games/multi_hot_10_native` route is not its live game.

## Scope

- Seven native games: Multi Hot 100, Multi Hot 5 Deluxe, Multi Hot 5 Wild, Multi Hot 5 Super Wilds, Multi Hot Wild Ways, Habesha Fortune 5, Safari Simba.
- Multi Hot 10 (separate canvas controls).
- Protected originals Multi Hot 5 and Foxy Hot 20 are explicitly **not modified**.

`native-touch-hotfix-r1.mjs` adds a small CSS layer to GET `/new74/<approved-game>/style.css` only. A disabled/hidden HTML hit area cannot consume a tap; account status doesn't mask the cabinet; buttons remain touch-friendly. Multi Hot 10 quick/sound/menu targets are enlarged in landscape. No balances, transactions, RNG or server requests are altered.

`new74-touch-entry-r1.mjs` is an additive module that wraps the **current** Worker entrypoint; it must be uploaded with all pre-existing modules. It cannot replace the Worker alone.

## Tests

```bash
node --test player-machines/hotfix/20261115/native-touch-hotfix.test.mjs
```

Tests target all eight game CSS routes, protected pair, financial endpoints, non-CSS routes, range requests and repeat processing. Local test run: **13/13 passed** with the companion extended test fixture on 15 Nov 2026; committed regression file provides similar scope.

## Deployment gate

Current Worker is 67 MB, **320 modules**, with existing service, KV, asset, DO, and secret bindings. Stage a Cloudflare Worker version retaining the original 320 modules, aliases, script settings and rollback ID, **plus** the 2 proposed modules, then preview before routing traffic. Do not upload only the patch. Verify controls with mobile 360 / 390 / 430 CSS px and landscape, inspect sound, animation, STOP without a second wager and session/recovery; never place real production bets in tests.

Official demo equivalence is **unverified**, and the original pair still needs a separate non-invasive QA pass. Worker v418 remains unchanged until a safe preview/deploy procedure is performed.
