# ZPLAY Balloon Native — reference continuation

The 43464.mp4 screen recording is a *visual reference*, not game media. This release continues the existing ZPLAY implementation with native Canvas animation, a Cloudflare Worker authenticated bridge and canonical ETB backend.

Backend: Balloon rules and ledger library code were preserved from Railway's successful 2026-11-07 deployment. The server chooses pop/payout and performs all real ETB debits and credits. The browser never simulates money or uses demo credit.

The model implements independent Superwin distribution; confidential SmartSoft mathematics has not been replicated.

## Build and test

Run: node prepare-assets.mjs && node --test test/*.test.mjs

Integration entrypoint: worker-entry.mjs; it composes on top of the existing JetX Worker. Balloon routes: /games/balloon_native, /native-library/balloon/v1/*, /api/library/state?game_id=balloon_native, /api/library/action.

## Production preservation

Never overwrite the existing 205 Cloudflare Worker modules, its 13 bindings, login, wallet, players or agent portal. Do not apply the old Railway staging patch from early 2026-11-07: the successful later deployed code already contains Balloon. Do not execute test wagers against production.

Status: Railway backend deployment succeeded and GitHub sources/test package are prepared. Cloudflare production publication and authenticated browser pixel parity are NOT yet verified, because downloading the very large currently deployed Worker failed. The live Player has not been changed by this branch.
