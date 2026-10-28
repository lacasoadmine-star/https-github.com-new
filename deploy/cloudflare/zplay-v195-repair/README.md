# ZPLAY live-source repair candidate

Status: **draft, not deployed, incomplete seven-game rebuild**.

The repository main branch does not contain the deployed Cloudflare frontend. This directory contains the affected frontend source retrieved from `superwin-player` version 195 (`00fe4a95-5744-4495-8563-c0b2213fd6a2`). It must never replace the whole Worker or the existing database.

Changes:
- Continuous clipped reel strips now accelerate and decelerate to exact server symbols. STOP shortens the animation without invoking a wager. Per-reel stop events fire once. Symbols retain their aspect ratio; canvas resolution is capped at two device pixels and two megapixels.
- Reject malformed round IDs, bets, grids, symbols, multipliers, win-line positions and money fields before displaying the returned balance. Preserve the pending token on ambiguous responses and lifecycle interruption.
- Add explicit round lifecycle states. Existing authenticated API paths, request bodies and idempotency tokens remain in use. No wallet engine, payment endpoint or ledger was replaced.
- Show the existing catalogue artwork when the game API fails, with wagering disabled. No local balance or fabricated outcome is introduced.
- Stop hiding the original live game catalogue and navigation filters. The featured collection retains search/favourites. Remove the temporary alternate symbol art before the atlas loads.
- Write ZPLAY directly into the touched HTML and components; deepen the collection's green theme.

Validation performed:
- `node --test tests/*.test.mjs`: 5 passing tests. Includes 500 response-shape fixtures and 500 renderer rounds (100 per existing model), exact final grids, one stop event per reel, invalid result rejection and continuous stop trajectories.
- These are frontend tests with fake responses/canvas. They are **not financial settlement, RNG, RTP, real browser, or database idempotency tests**.
- All 10 supplied MP4 files were located. FFprobe metadata and 754 one-second frames were extracted. Another 1,036 quarter-second frames were extracted in five gameplay intervals. Contact sheets across each full video and five detailed intervals were reviewed. This does not certify exhaustive spin-event labeling or visual parity.
- All ten files are 1080×2340 portrait recordings and contain **no audio stream**. Original sound timing cannot be measured from them. Frame rates vary; preserve the rational values in the metadata rather than assuming 60 FPS.

Blocked validation:
- The production URL and shared conversation URL return the environment restriction `Forbidden. Calls to this URL are not allowed`.
- The local Playwright package is installed but its Chromium binary is absent; the official browser download is also blocked with 403. The prepared 360/390/430/768/1280 tests did not execute. There are no passing mobile screenshots, SSIM scores or measured FPS claims.
- No isolated copy of the actual production wallet database/backend was exercised. Existing accounts, balances, transactions, Agent and Admin services were not changed.

Release preparation:
1. Run `node scripts/prepare-release.mjs` to create the new entry module. It only prepares a file.
2. Before uploading, download and back up the **complete** current multipart Worker and configuration using the authorized Cloudflare connection. Check that the deployed version remains the baseline; otherwise reconcile again. Local baseline holds edited frontend files only.
3. Preserve every existing Worker module. Append the prepared entry module and choose it as `main_module`. Preserve the actual current bindings, secrets, compatibility settings, service bindings and original API origins. Never deploy just this directory.
4. Run the real browser/financial regression checks in an isolated environment, upload a version without deploying, and verify its preview and bindings.
5. Deploy only after those checks; then verify the original production URL and active deployment ID. Roll back to the preserved baseline version if needed. This task did not perform steps 2–5.

Remaining scope:
The active `/slots` contract contains Multi Hot 5, Hot Foxy 20, Wild Multi Stars, Multi Hot 40 and Burning Ice. Safari Simba, Habesha Fortune 5, Multi Hot 10 and Multi Hot Ways were not added to this contract or falsely enabled. Their existing routes need further live-source tracing and authoritative backend verification. All seven requested cabinets, artwork, dashboard flows, licensed sounds, wallet regression and production release remain to be completed/verified. See `audit/game-comparisons.md`.
