# Multi Hot 5 / Multi Hot 10 presentation repair

Target: the two existing `/new74/` game pages on `superwin-player.apdiy61.workers.dev`.

This change corrects the presentation and client recovery logic of existing games. It does not install new financial game models or claim completion of all 74 titles.

## Changes

- Preserve the observed desktop stage proportions: 48:25 for Multi Hot 5 and 16:9 for Multi Hot 10, with a separate portrait layout.
- Align the title, multiplier, reels, footer and controls to the retained current-day official demo frames. Keep sprite aspect ratios and use pre-transform canvas dimensions for rotated control artwork.
- Preserve the atlas reel cabinet instead of covering its frame with generated gradients. Draw clipped moving reel strips and settle only to a supplied, validated receipt grid.
- STOP accelerates presentation without submitting another round or changing its destination.
- Pause presentation clocks, repeated input and audio on hidden/disposed pages. Respect reduced motion and resume with one animation loop.
- Bound and retry artwork startup. Disable new actions after a failed refresh and preserve pending recovery tokens through storage failures.
- Historical replay receipts do not overwrite the current balance; a fresh read is required before another action. Backend transport URLs, server game models, wallet arithmetic and outcome generation remain as before.
- A temporarily mixed cached account module without freshness support cannot enable a new spin.

## Validation

Run `node --experimental-vm-modules --test *.test.mjs` in this directory. All tests use local mocked state. No production wager or account mutation is part of these checks.

`render_canvas.mjs` uses the installed `@napi-rs/canvas` package and locally recovered, hash-verified existing artwork for a network-free raster check. Its images are explicitly labelled local presentation rasters, not browser screenshots.

`build_geometry_fixture.py` creates a sanitized blank DOM with layout properties only, without artwork, fonts, game modules, account code or network requests. Its browser metrics check containment and responsive geometry. `geometry-results.json` records exact successful and rate-limited cases; a failed API attempt is not a passed check.

## Publication and rollback

Only `app.mjs`, `account.mjs`, `art.mjs` and `style.css` require replacement in the existing public static KV prefix `new74/20261113-pair01-r1/`. `change-manifest.json` pins the original and replacement SHA-256 hashes. The original four files are kept in `rollback/`.

Before replacement, re-read and compare all four production hashes. Do not overwrite a mismatched baseline. Publish the four checked resources and verify their actual returned bytes afterward. Keep the existing Worker, routes, bindings, accounts and wallet data intact. No newly provisioned website or service is required.

The original `game.html`, `games.mjs` and `sprites.json` are included to make tests and source review reproducible; they are unchanged and should not be republished as part of this patch.
