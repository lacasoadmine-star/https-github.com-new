# Official DEMO observations — frontend audit

These observations come from the visible official demo interface. They do not establish provider probabilities, certified return, or complete implementation parity. No live ETB account was used.

## Multi Hot 5 Wild — 11 November 2026

[Official DEMO source](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MultiHot5Wild&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/)

**10 completed rounds verified.** Current-day history lists one manual round and nine native AUTO rounds between 08:20:20 and 08:23:30 on the displayed clock. Each staked 0.05 DMO and returned 0.00 DMO. Balance moved from 20,000.00 to 19,999.50 DMO. Spin IDs changed from 1965839244.1 to 1965839244.10. Older 28 October history rows were excluded.

The board has three columns and three rows, five fixed lines, and a separate left multiplier reel. Help lists 1× through 5×, Wild substitution and red/black X2. The visible paytable at 0.05 DMO total bet states:

| Three matching symbols | Published award, DMO |
| --- | ---: |
| Wild | 1.00 |
| Double seven | 0.75 |
| Double dollar | 0.50 |
| Bell | 0.25 |
| Watermelon or grapes | 0.15 |
| Plum, lemon, orange or cherry | 0.05 |

Help displays minimum 0.05 DMO, maximum 400 DMO, maximum win 375×, RTP 95.77% and version 1.0.1. The higher three-Wild paytable award needs clarification against the displayed maximum; no unobserved probability or coupling has been inferred.

AUTO offers 25/50/100/500/1000. The 100 batch was explicitly started with stop thresholds disabled, then manually stopped at 91 remaining to prioritize title coverage. Only the nine completed AUTO rounds are counted. Turbo activation was not conclusively established.

Screenshots and exact current-day timestamps are indexed in the adjacent JSON record. Demo DMO limits remain reference observations, separate from the platform's ETB account rules.

## Multi Hot 5 Burn Wilds — 11 November 2026

[Official DEMO source](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MultiHot5BurnWilds&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/)

**One completed round supported by surviving screenshots; confidence moderate.** One manual spin at 0.10 DMO settled before the screenshot clock 08:25:29. The screenshot shows the static board, ready HOLD & SPIN button, 19,999.90 DMO balance and no win display. The subsequent rules screenshot at 08:25:41 shows Spin ID 1965843039.1. The initial visible balance was 20,000.00 DMO. No autoplay was started. No current-day history row was captured before the parent closed the demo tabs, so this count has weaker evidence than the ten history-verified Wild rounds.

The board has five columns and three rows. Its multiplier appears in a **top semicircular arc**, with 5× selected in the settled screenshot. Help lists 1× through 5× but refers to a left reel; that wording conflicts with the visible placement. The local renderer/layout correction for the top arc remains pending.

At the displayed total bet of 0.10 DMO, the surviving paytable screenshot shows:

| Symbol | Five matches | Four matches | Three matches | Two matches |
| --- | ---: | ---: | ---: | ---: |
| Single seven | 10.00 | 1.00 | 0.40 | 0.05 |
| Grapes | 2.00 | 0.40 | 0.20 | — |
| Watermelon | 2.00 | 0.40 | 0.20 | — |
| Bell | 1.00 | 0.20 | 0.10 | — |

All values are DMO. The lower fruit table is cropped in the surviving image and is omitted from the confirmed table. Visible help stated minimum 0.10 DMO, maximum 200 DMO, maximum win 1300×, RTP 96.55%, version 1.0.1 and a double-up limit of 500 DMO. Wild appears on reels 2, 3 and 4, substitutes from the left, and expands vertically when part of a winning line. No winning expansion or X2 outcome was observed in the single round.

## Checkpoint and remaining work

This frontend journal records **11 completed demo rounds across two titles**: ten confirmed by current-day history and one supported by the settled board and Spin ID. It does not claim 74-title coverage or 10,000 rounds. The other assigned titles were not observed before the pause.

The provider permits one slot table at a time. The extra pre-play Burn Wilds tab was closed, and observations proceeded serially. No session-limit bypass was attempted. All demo tabs were closed by the parent, and no autoplay remains active.

The local automated UI suite exists at `tests/machine74-browser.mjs` but **has not executed**. Chromium launch was blocked by socket permissions and the specific outside-sandbox command was automatically rejected. No passing browser report exists; the planned 288 viewport checks remain unverified. The renderer/audio focused tests passed **94/94** after replacing a hardcoded Wild ticket denominator with the current model bound. Further exploration and features are frozen for the continuation checkpoint.
