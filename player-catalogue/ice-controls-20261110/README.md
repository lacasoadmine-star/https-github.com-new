# Burning Ice 10/40 continued controls release r5

This release continues the verified r4 package on the same Player and Library Workers. Only the two existing Ice CREDITS pages select the new immutable client prefix:

`/native-library/remaining20/20261110-ice-controls-r5/`

## Changes

- A visible 44px portrait menu replaces invisible menu, sound and turbo targets. The existing settings, BET and AUTO dialogs remain reachable. Returning to desktop restores the original drawn menu and one hit target.
- The confirmed-collection event can load the original hash-verified `Start/WinToBalance.mp3` cue.
- The client resolves its catalog relative to its own module URL, so it consumes this release's manifests instead of silently selecting r4.
- Completed Ice40 respins clear the frozen reel/side decorations, active columns, HOLD labels and ice logo. The confirmed receipt and financial fields are unchanged. Intermediate freezes remain visible and restored history does not replay thaw sounds.

The seven served assets have complete byte counts and SHA-256 values in `asset-manifest.json`. The compact asset module derives the two revised manifests and catalog from the retained r4 ASSETS module instead of duplicating unchanged JSON source. It also contains the complete changed application and renderer bodies and the verified sound.

## Existing dependencies and verification

The three Player modules compose `remaining20-ice-controls-player-entry-r4.mjs`. The three Library modules compose `remaining20-ice-controls-library-entry-r4.mjs` and import `remaining20-ice-controls-assets-r4.mjs`. Those exact modules must remain present in the existing Workers. All other r4 HTTP bodies remain immutable.

For the standalone Node verifier, copy the r4 asset module from the sibling `ice-controls-20261109` folder into this directory, then run `node verify-r5.mjs`. The copied baseline is not a new deployment module. `client/app.mjs` is the readable source corresponding to its generated immutable response.

Evidence distinguishes local routing/renderer checks, actual CREDITS browser calls, and official-provider observations. Five-minute official observations recorded 25 SPIN/STOP clicks per title; they do not assert 25 accepted provider wagers. No player cash wagers were used in testing.

The existing account service, wallet, actors, math, release gates, catalog cards and completed old games are preserved. This release does not mark the pair cash-ready or claim complete official mobile visual parity. The existing 69-title expansion remains a continuation task, not a completed release.
