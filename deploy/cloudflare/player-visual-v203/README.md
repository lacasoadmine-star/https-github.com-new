# ZPLAY presentation repairs — 2026-10-30

Source of truth: current superwin-player Worker v202, not /workspace/superwin (older repository).
Rollback deployment: 6c780e66-d432-4837-80dc-9a3fdb883a40.
Rollback version: bbd2ce9c-a8cf-4745-bf8d-38b9b6b0369d; fetched and verified via versions API.
Version script etag: 0aed1df030724f919ffae699b24e1c185c213b6f30c2c4609b52caa5210802ad.
Bindings observed: API_ORIGIN, ENGINE_EXTENSION, PORTAL. Preserve all unchanged.

## Reference evidence
- Live zplaybet.xyz/en/fastgames-lobby/All/ inspected with Chromium at 390×844. Dark navy #0c1a29 surroundings, near-black header/search/footer, green #22c55e controls. Header 52px below promotional strip; full-width two-tab All Games/My Games navigation; horizontally scrollable categories; search on separate row; two-column cards; five fixed bottom destinations. Reference catalogue remains loading with ALL (0) in this session; no claims about inaccessible game interiors.
- 30742.mp4: sampled at 0,15,30 seconds. Confirms full-width tabs, hero/category strip in casino/home, two-column scrolling game list, bottom five destinations. Authenticated view has balance and account in header.
- 29237.mp4: sampled every 8 seconds and 0.25-second samples 2.75–4.00. Multi Hot 5 has three columns and three rows, green clover background, thin gold reel borders; left multiplier window takes ~18% of cabinet width and shows three values; pink/gold selected border. Header/title compact, meters directly under reels; three hexagonal action controls then central pink/gold shield spin with neighboring stakes. Reels move downward and stop successively; multiplier shifts vertically. No screenshot or video used as runtime artwork.

## Existing implementation findings
- Current /slots/catalog.json contains five entries only: multi_hot_5_video, hot_foxy_20, wild_multi_stars, multi_hot_40, burning_ice. Cached definitions disabled; live /api/slots contract controls availability.
- A second 22-game catalogue exists beneath the first and is visually suppressed by accumulated CSS. Preserve its game IDs and launcher routes. Do not fabricate game definitions for Safari Simba, Habesha Fortune 5, Multi Hot 10 or Multi Hot Ways.
- Existing game APIs, wallet, auth, settlement, idempotency, round contracts and reel math are outside this patch.

## Validated changes
- 25 distinct displayed games: five existing slot entries plus 20 existing launcher entries, excluding two duplicate titles. Search/categories and saved-games filters span both renderers. Existing assets and launch routes retained.
- Multi Hot 5: restore shield geometry, left multiplier highlight and three existing upper controls; disabled actions remain disabled by the existing server contract.
- Focused browser checks passed at 360, 390 and 430 × 844: catalogue, search, categories, saved originals, launch sheet, no overflow, guest lock and options. Zero page errors; all non-GET/HEAD requests blocked.
- Five current slot cabinets load at 390px: Multi Hot 5, Hot Foxy 20, Wild Multi Stars, Multi Hot 40, Burning Ice. No actual-money rounds tested.
- Remaining priority machines not rebuilt. Multi Hot Ways has legacy configured IDs; this patch does not change its implementation. Safari Simba, Habesha Fortune 5 and Multi Hot 10 not found by name in the inspected internal config.
- Only 29237.mp4 and 30742.mp4 visually reviewed in this patch. No claim of full reference parity or all-game completion.
- All 21 v202 Worker modules verified by SHA-256 and preserved unchanged; wrapper adds only frontend asset overrides and CSS injection.

## v204 follow-up
Fixed combined game count after saving a primary game: the secondary renderer now republishes its count even when its list is unchanged, and the primary renderer avoids redundant DOM updates. Focused Favourite regression and the existing 390px navigation checks passed with zero page errors and zero non-read requests.
