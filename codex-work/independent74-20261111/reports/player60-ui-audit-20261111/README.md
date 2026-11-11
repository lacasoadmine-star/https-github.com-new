# Existing Player UI audit — 2026-11-11

Source: https://superwin-player.apdiy61.workers.dev/ . Observed in the existing shared browser while logged out. The rendered footer reported ZPLAY v2.12.0. No credentials, deposits, ETB wagers or account changes were submitted.

## Current visible inventory

The live DOM contained **60** game buttons labeled `PLAY · ETB sugaya server-ka` and **9** additional game buttons labeled `New LIVE`. These are the **69** cards in the current new-game group. The page also rendered **13** legacy or duplicate game cards and **one** Coin Miner `Preparing` card: 83 game buttons overall, not 83 distinct titles. Exact visible labels and observation time are in `current-inventory69.json`.

All 60 pending-status cards were enabled as navigation controls. The audit opened and recorded **40 of their launch sheets**, then inspected Multi Hot 10 and PopX embedded machine screens. This is not a claim that all 60 machines accepted authenticated play. The public logged-out page cannot prove server financial admission, settlement or wallet correctness.

## Existing launch behavior

- New machine sheets open `/independent74/machines74.html?embedded=1#<game-id>` within the existing Player dashboard.
- Multi Hot 100 uses `/games/multihot100_native`; logged-out navigation redirects to `/?play=multihot100_native` and the existing Login dialog.
- Preserved Multi Hot 5 uses `/games/multi_hot_5_video`; preserved Hot Foxy 20 uses `/games/hot_foxy_20`.
- The existing header Login selector is `header.player-header .header-actions button.login-button`.
- New embedded machines exposed their configuration while logged out, but monetary controls remained disabled. Their current sign-in link navigated to `/`, losing the selected title.
- PopX's desktop stage was excessively tall, placing the controls below the visible modal area.

## Local fixes prepared from this audit

The child controller now sends a same-origin sign-in request containing only the selected game ID; the parent dashboard listener owns reopening the existing Login dialog and resuming the title. Confirmed account action/state changes send a same-origin wallet-change notification so the parent can invoke the existing React account refresh. The controller does not patch account balances into the dashboard DOM.

The machine layout keeps stage and controls adjacent in wide embedded dialogs. PopX's 6×5 cascade board has a bounded desktop width. Additional original-art multiplier, X2, Gates tumble and Charging Wild presentation changes are local source work; the screenshots in this directory show the deployed page **before those changes**, not a deployed-after result.

## Evidence

`pending-cards.json` records all 60 pending-status navigation controls. `new60-launch-routes.json` records the 40 launch sheets actually inspected. `retained-routes.json` records retained route observations. AX text records the visible deployed page and PopX logged-out machine. Screenshots preserve the main dashboard, pending game sheet, machine screens and native Login redirect. `02-lobby-pending-cards-footer` is a footer view, not the top of the page.

Sound waveform quality, video capture, authenticated ETB arithmetic and five rounds per title were not part of this read-only dashboard audit. Official DEMO observations and isolated server wallet tests are recorded separately.
