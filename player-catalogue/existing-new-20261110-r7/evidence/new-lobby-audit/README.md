# Thirteen NEW titles: official cover and launch audit

The saved rendered lobby and exact retained code show all ten r3 demo cards in the existing `.portal-r9-grid`, alongside the three older NEW cards. Their detail-sheet Play anchors retain the same-tab routes recorded in `thirteen-title-audit.json`; there is no external game URL or new dashboard in this candidate. Protected `multi_hot_5_native` and `foxy_hot_20_native` are excluded.

## Findings and correction

1. **Multi Hot 40:** the displayed SVG embeds a recomposed 400×520 ZPLAY card. The archived `build-multihot40-cover.mjs` proves how the title and symbols were assembled. The exact official catalogue cover is already hosted at `/new-machines/catalog/multihot40-official-card.webp`. Its SHA-256 matches the fresh official CDN download: `da096be654b1d276bde71bed962e1d87cfe9cd7e64b649d2f11de47546ebe822`.
2. **Balloon:** the displayed SVG is a custom gradient/vector balloon. The candidate uses the current official **Balloon** thumbnail, explicitly not BalloonX.
3. **JetX:** the current card points to `/native-library/jetx/r1/cover.webp`. Its original artwork provenance was not recovered, so this audit does not label it wrong. The candidate supplies the exact current official New Era of JetX thumbnail, consistent with the current JetX reference title.
4. **The ten r3 covers remain unchanged.** Their retained bytes and hashes were checked against the compiled active catalogue module. Their CREDITS routes and truthful demo labels remain unchanged; this is not a cash release.

The source `observed-lobby.css` currently applies a 16:11 aspect ratio to existing card buttons in the games view. The candidate changes no card, grid or dialog dimensions. `object-fit:contain` displays the complete 493×617 official artwork within the existing bounds, avoiding enlargement or cropping. The r3 detail sheet already has a bounded 92dvh maximum and 240px maximum image width; its CSS is unchanged.

## Candidate and integration

- `official-new-covers-assets-r1.mjs` packages the module, tiny CSS and only the two new Balloon/JetX WebP files. Multi Hot 40 reuses the verified existing asset route. Total new asset bodies: **39,984 bytes**.
- `official-new-covers-html-r1.mjs` exports `patchOfficialNewCoversHtml(html, pathname)` and `COVER_PREFIX`. It injects a stylesheet/module only into the recognized existing Player shell on `/`, `/games`, or `/games/`.
- Serve `OFFICIAL_COVER_ASSETS` under `/native-library/existing-new/20261110-official-covers-r1/`, with the normal immutable cache headers and existing Player-to-Library asset proxy. The parent owns composition and deployment.

The module updates only the three existing native card images and their existing detail-sheet images. It leaves original card nodes, click callbacks, anchors, focus, labels and account state in place. It preloads the official asset before swapping, retains prior artwork on load failure, handles a React-style image reset and does not add cards or dashboards. No financial or API code is involved.

## Evidence

- `official-covers/provenance.json`: direct official catalogue links, HTTP 200 receipts, exact sizes/hashes and title associations. Source: `https://www.smartsoftgaming.com/games`, image links 66 (Multi Hot 40), 105 (Balloon), and 15 (New Era of JetX), observed 9 November 2026. Web source reference: `turn7view0`. Images were visually inspected and not edited.
- `overlay-report.json`: **22 offline browser checks passed** at 360, 390, 430 and 1280px. Existing card bounds and both protected card DOMs remained identical; all three official images loaded fully; original click callbacks/same-tab anchors and rerender handling worked. No API/mutation request or browser exception occurred.
- `html-patch-report.json`: **9 scope/idempotence checks passed**.
- `candidate-manifest.json`: final code hashes and publication inputs.

The browser fixture used actual saved card DOM, inert click callbacks and bounded representative card geometry. Its screenshot is a local input/layout check, not a fresh complete live Player screenshot. Live image delivery and the full current Player composition remain the parent's final verification.

No deployment, Git mutation, official provider table, shared CUA session or cash action was used for this audit.
