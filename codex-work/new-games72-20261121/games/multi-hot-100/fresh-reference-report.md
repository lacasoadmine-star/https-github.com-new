# Multi Hot 100 — fresh initial reference

**Status: seven manual public DMO rounds captured; reference only. No evaluator, renderer, production route or release activation is claimed.**

The current SmartSoft catalog and [official Multi Hot 100 page](https://www.smartsoftgaming.com/games/multi-hot-100) were checked before opening the exact linked public demo. The product page identifies a five-column, four-row fruit slot with 100 fixed paylines and a multiplier feature. This capture uses no previous game screenshots, source, assets or arithmetic.

The supported cloud browser opened a separate tab for the provider's public `MultiHot100` demo. The original files are preserved under `/workspace/shared/zplay-official-m100-20261122` and copied byte for byte into this module's `evidence/2026-11-21/` directory. Although the task folder uses `20261122`, the actual capture timestamps are **2026-11-21 21:56:41.758–22:01:36.956 UTC**, a 295.198-second initial capture. The viewport was **1363 × 936**, landscape. The game rules displayed **v1.0.0**.

`evidence-index.json` pins **37 original JPEG screenshots and two capture logs**, totaling **3,994,876 bytes**. Every copied file was read back and matched its source bytes. No history panel was opened. The round identifier visible in the rules header belongs to the public DMO demo session; no production account was used.

## Publication availability

The37 original screenshots and their archive bytes are privately retained and excluded from GitHub. Following the M20 binary-upload review rejection, the entire M100 bundle folder is also held from public publication; no rejected payload was retried. `publication-status.json` records this boundary and the private-retention checksum without a private storage identifier. The filenames and hashes in this report, `round-observations.json` and `evidence-index.json` identify retained private originals; a public checkout cannot restore them or run image QA.

Reviewed text observations remain publishable. M100 is reference-only: no evaluator, specification implementation, runtime assets or game-completion claim is created by this publication. The public demo DMO amounts below are not production Player balances.

## Seven separate observations

Each round began with one separate short click on the main SPIN control. No sustained HOLD or AUTO sequence was used. Every round has a result image named `spin-01.jpg` through `spin-07.jpg` plus a separately captured immediate post-click image. Immediate post-click images show different phases of the response; they are not all frames of moving reels.

All seven used **1.00 DMO**. The initial displayed balance was **20,000.00 DMO**.

| Round | Visible multiplier | Win presentation | Displayed balance after observation/collection |
|---|---:|---|---:|
| 01 | 5× | None observed | 19,999.00 DMO |
| 02 | 4× | None observed | 19,998.00 DMO |
| 03 | 3× | None observed | 19,997.00 DMO |
| 04 | 1× | **0.40 DMO**, highlighted cherries and lines | **19,996.40 DMO after COLLECT** |
| 05 | 1× | None observed | 19,995.40 DMO |
| 06 | 1× | None observed | 19,994.40 DMO |
| 07 | 5× | None observed | 19,993.40 DMO |

For round 04, separate frames preserve the start of its result presentation, the visible 0.40 DMO amount and line highlights, the COLLECT click, and the credited balance. No X2 guess was made. The subsequent rules header displayed a round suffix of `.7`, consistent with the seven separately initiated rounds.

`round-observations.json` binds the seven result hashes and a visual transcription of their five-by-four symbol boards. It does not assign the observed win to particular payline IDs or infer an aggregate payout rule.

## Controls and rules actually checked

- **SPIN:** seven independent starts, with results observed before another start.
- **COLLECT:** the lower collection icon after round 04 transferred the displayed 0.40 DMO win into the demo balance without another spin.
- **MENU / rules:** opened and closed; the initial paytable, multiplier and gamble explanations, control help, partial payline chart, version, limits and disconnection section were inspected.
- **Paytable preview:** the displayed amount changed from 1.00 to 2.00 DMO with the plus button and returned to 1.00 DMO with minus. The bound displayed awards changed with it. This was a paytable preview operation; no new bet was played at 2.00 DMO.
- **Sound settings:** the initial effects and music indicators were both on. Clicking effects and then music left effects off/music on; a further music click showed both off. One effects click restored both on. These are visual control-state observations; the intermediate effect of the first two-click sequence was not separately captured and no audible result was verified.
- **AUTO:** opened the configuration panel showing 25, 50, 100, 500 and 1000 choices, plus three stop-condition controls. It was closed without pressing Start Play. No AUTO round occurred.
- **Bet selector:** opened the visible 1–5 DMO portion and selected the existing 1.00 DMO value to close it. Other bet values were not played or verified by a changed wager.

The displayed rules state a 1.00–100.00 DMO range, maximum 2500× and 96.66% RTP. These are provider-displayed reference facts, not validation of the new platform's economics. The official product page also lists X2, big-win presentation and Gift Spin; those features are not all established by the seven observed rounds.

## Remaining work

The complete set of 100 payline paths still needs legible capture and independent transcription. Only part of the chart is visible in this checkpoint. The low-symbol table should also receive a fully visible dedicated frame before its numeric values are used in code. The displayed rules and the observed 0.40 DMO result need a source-bound arithmetic trace before any evaluator is built.

AUTO execution/cancellation, sustained HOLD, STOP, turbo, changed bet values, fullscreen, X2, mobile touch and keyboard behavior remain untested here. Screenshots preserve sampled states, not continuous motion or measured stop timing. The supported browser surface did not provide a recording interface, so no video, sound recording, audible comparison or sound reuse rights are claimed.

Reference images remain evidence only. They must not be installed as playable screen backgrounds, round videos, symbol artwork or other production assets. No new probability, reel strip, payout, original sound substitute or release-ready implementation was created from this checkpoint.
