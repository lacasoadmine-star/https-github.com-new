# Game #1 — Multi Hot 5 Burn Wilds

**Working date:** 23 November 2026, Africa/Addis_Ababa  
**Scope:** this game only. Game #2 has not been started by this task.  
**Checkpoint:** native client and isolated server simulation implemented; final deployed browser QA is awaiting the parent agent's append below. This checkpoint is **not production cash-wallet or ledger proof**.

The complete implementation lives in this directory. Current official observations are recorded in [reference/current-demo-20261123.json](reference/current-demo-20261123.json).

## 1. Current official demo inspection

The parent agent opened the current [SmartSoft product page](https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds) and followed its own [public Play Demo link](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MultiHot5BurnWilds&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/). The demo was playable in this session. The reference record deliberately contains no provider session identifier, private history screenshot or screenshot token.

### Manually initiated rounds

Seven separate manual rounds completed. These observations are evidence of controls and presentation; they do not estimate the provider's probability distribution.

| Round | Displayed bet | Final multiplier | Interaction |
| --- | --- | --- | --- |
| 1 | 0.10 DMO | 4× | SPIN |
| 2 | 0.10 DMO | 4× | SPIN |
| 3 | 0.10 DMO | 4× | SPIN, then STOP |
| 4 | 0.20 DMO | 4× | SPIN |
| 5 | 0.20 DMO | 1× | SPIN |
| 6 | 0.20 DMO | 3× | SPIN, then STOP |
| 7 | 0.20 DMO | 5× | SPIN |

Both STOP interactions accelerated the displayed reels without another displayed stake debit. The BET popup displayed five amounts at a time: 0.10, 0.20, 0.30, 0.40 and 0.50 DMO on the inspected page, with paging controls.

### AUTO, winning expansion and X2

AUTO opened with **100** selected and offered **25 / 50 / 100 / 500 / 1000**. Its three stop conditions were win threshold, balance decrease and balance increase. Unchecked condition amounts were blank and disabled.

An additional AUTO run selected 25 rounds at 0.20 DMO, with a stop-win threshold of 0.10 DMO. It stopped after seven automatic spins when a **1.60 DMO win at 2×** appeared. The second and fourth reels expanded into full WILD columns. The parent observed fire outlines, a highlighted yellow payline and a WIN count-up. The displayed balance remained **19,997.50 DMO** while that win was pending.

This establishes a specific collection rule: **the observed win-threshold AUTO stop occurred before collecting the final pending win**. The native controller now preserves that behavior. It does not infer unobserved count-only and balance-condition policies from this one case.

X2 displayed a pending 1.60 DMO amount, a 3.20 DMO target, RED, BLACK, a flashing card and TAKE WIN. Choosing RED revealed an ace of clubs, a black card. The pending win was lost; no further displayed account-balance debit occurred. TAKE WIN was visible in that run. Successful collection was then directly verified in a fresh official demo session, as recorded below.

### Directly verified TAKE collection

The first reference session timed out naturally. One reload of the same public official loader opened a fresh session with **20,000.00 DMO**. At a 0.10 DMO bet, AUTO 25 with a 0.10 DMO win threshold stopped after five rounds. The displayed balance was **19,999.50 DMO**, with **0.45 DMO pending**, a **3× multiplier** and the third reel expanded. Three cherry-line payouts cycled; one visible line quote was **0.05 × 3 = 0.15 DMO**.

At **11:33 Addis Ababa time on 23 November 2026**, the parent clicked TAKE. The balance became **19,999.95 DMO**, exactly the preceding balance plus the pending 0.45 DMO. The WIN, X2 and TAKE presentation disappeared. This is direct evidence of successful official collection, separate from the earlier losing X2 choice.

### Rules and controls

The game has five reels and three rows. WILD is described on the middle three reels; a winning WILD can expand vertically. A non-winning WILD was also seen without expansion.

| Chart line | Rows by reel, zero based |
| --- | --- |
| 1 — middle | 1, 1, 1, 1, 1 |
| 2 — top | 0, 0, 0, 0, 0 |
| 3 — bottom | 2, 2, 2, 2, 2 |
| 4 — V | 0, 1, 2, 1, 0 |
| 5 — inverted V | 2, 1, 0, 1, 2 |

**Observed discrepancy:** the rule chart numbers the middle line as 1, while an observed winning animation called a middle-line win “Line 2.” The implementation uses the chart's line geometry and numbering. This discrepancy remains explicit.

The refreshed paytable at a **0.20 DMO total bet** was:

| Symbol | 2 matching | 3 matching | 4 matching | 5 matching |
| --- | ---: | ---: | ---: | ---: |
| Seven | 0.10 | 0.80 | 2.00 | 20.00 |
| Grapes | — | 0.40 | 0.80 | 4.00 |
| Watermelon | — | 0.40 | 0.80 | 4.00 |
| Bell | — | 0.20 | 0.40 | 2.00 |
| Orange, lemon, plum, cherry | — | 0.10 | 0.20 | 1.00 |

SETTINGS exposed Sound Effects, Background Music and Full Screen. Turning effects off also turned music off; turning effects on restored both. The main sound icon was exercised in both mute and unmute states. **No acoustic comparison or original provider audio capture was performed.**

The provider displayed version **1.0.1**, RTP **96.55%**, maximum win **1300×**, minimum bet **0.10 DMO**, maximum bet **200 DMO**, and an X2 cap of **500 DMO**. These are recorded as **provider claims**. They are not assigned to the ZPLAY candidate RNG, payout exposure, test stake ladder or cash configuration.

## 2. Complete Native JavaScript / Canvas client

| Source | Responsibility |
| --- | --- |
| `entry.mjs` | Explicit Start server test action, current test-session resume, native mount and server history display. |
| `mount.mjs` | Real HTML buttons and dialogs, sound prompt, BET, AUTO, SETTINGS, X2 card view and TAKE. |
| `controller.mjs` | Server request ownership, original-key recovery, accepted presentation journal, pending win and AUTO control. |
| `scene.mjs` | Canvas reels, multiplier wheel, decorative initial grid, clipping, win count-up and payline presentation. |
| `expansion.mjs` / `flame-overlay.mjs` | Accepted-result validation and WILD expansion/fire presentation. |
| `own-artwork.mjs` | Original transparent fruit sprites and crown WILD, drawn directly in Canvas. |
| `audio.mjs` | Original procedural WebAudio effects, per-reel stop cues and optional ambience. |
| `layout.mjs` / `style.css` | Shared canvas/control geometry, portrait layout and touch/modal styling. |
| `rules.mjs` / `outcome-audit.mjs` | Payline quotes and consistency checks on supplied server results. |
| `simulation-transport.mjs` | Same-origin connection to the explicit Railway test endpoints. |

The client does not play a video or cycle through captured screenshots. A decorative first grid fills the cabinet before any round exists; it creates no accepted result, winnings or balance. During play, the server supplies the original grid, final grid, expansion columns, multiplier and winning lines.

Normal reel pacing is an independently chosen **1.5-second minimum for a non-expanding spin**. It is not an exact provider timing measurement. Expansions add their own presentation time. STOP accelerates presentation and sends no second wager.

### Assets and sound injection points

The shipped path calls `createBurnWildsOwnArtwork({doc:document})` in `entry.mjs`. It creates nine transparent symbol canvases. **No copied provider atlas, screenshot, logo, font or sound is served.**

To replace these with separately supplied game-specific assets later, pass an `artwork` object to `mountBurnWilds`:

- `gameId` must be `zplay72_multi_hot_5_burn_wilds_v1`.
- `symbols` must contain `orange`, `lemon`, `plum`, `grapes`, `cherry`, `watermelon`, `bell`, `seven` and `wild`.
- Each value may be an image/canvas or an atlas descriptor with `image`, `sx`, `sy`, `sw` and `sh`.
- Optional `background` and `logo` are drawn by the same scene.

The default `BurnWildsAudio` is procedural. A replacement passed as `audio` to the mount must support the existing `unlock`, `setPreferences`, `event`, `cue`, `pause`, `resume` and `dispose` lifecycle. Muting and disposal must stop active voices. User interaction unlocks audio; page blur/visibility changes pause it and focus resumes enabled audio.

These original assets are a clean compatible treatment. Pixel-identical appearance and acoustic provider parity are not claimed.

## 3. Existing Cloudflare Player and Railway attachment

The intended same-Player page is:

`https://superwin-player.apdiy61.workers.dev/native-ui/new90/burn-wilds/`

The existing Player already forwards `/native-ui/` to its existing `superwin-native-presentation` Worker. The new presentation attachment serves only this game's allowlisted static client files and delegates other paths to the retained service unchanged. The exact preservation/build process is documented in [player-integration/README.md](player-integration/README.md).

The existing Player API gateway forwards `/api/slots/` to `/api/` on the existing `superwin-nine-slot-engine` Railway service. No separate host or second production wallet is introduced.

| Browser endpoint suffix, under `/api/slots/new-games90/burn-wilds/test/` | Method | Purpose |
| --- | --- | --- |
| `session` | POST | Explicitly start an ephemeral server test session. |
| `state` | GET | Read authoritative test balance, pending amount and allowed stakes. |
| `spin` | POST | Validate the stake, generate a fresh server result and debit the test balance once. |
| `take` | POST | Collect the current pending test win once. |
| `double` | POST | Resolve RED/BLACK against the pending amount, with no second account debit. |
| `history` | GET | Read accepted results for this test session. |
| `logs` | GET | Read bounded test event records. |
| `health` | GET | Read the isolated test runtime's health information. |

The corresponding Railway prefix is `/api/new-games90/burn-wilds/test/`.

A session starts only after the explicit test action. Its opaque credential is sent in `x-burn-test-session`, not a URL. It is not a production Player login. Server responses identify themselves as:

```js
{
  mode: 'SIMULATION',
  currency: 'ETB',
  authenticated: false,
  cashEnabled: false
}
```

The visible unit is **TEST ETB**, including meters, paytable, AUTO inputs and X2. The simulation stake ladder is exactly **1, 2, 5, 10 and 20 TEST ETB**. Test balances and history are server controlled, ephemeral, and lost on expiry or service restart.

`server/simulation.mjs` binds this isolated behavior to the existing Railway function. `server/build-simulation-runtime.mjs` bundles its local dependencies and inserts the bounded attachment into a hash-checked backup of the existing Function. The build is not deployment evidence.

### Server behavior and its limits

SPIN validates the selected stake, records the original request identity, produces a new 5×3 result and holds a win pending. TAKE credits that pending amount once. DOUBLE risks only the pending amount. A later SPIN can atomically collect the specified previous pending round before accepting its next stake. Repeating an accepted request key returns the same result; replay-only recovery cannot create a new wager.

`candidate-math.mjs` contains the original ZPLAY candidate sampler. It uses server cryptographic entropy and explicit candidate symbol weights. The implementation does not infer provider probabilities from the reference rounds and reports no verified RTP. The probability model remains a simulation candidate.

This test runtime does not write the production database, wallet ledger, payments or Player accounts. Successful TEST ETB outcomes therefore establish server simulation behavior, **not production debit/credit settlement**. The separate cash adapter and lifecycle remain subject to their actual existing-host integration; they are not silently enabled by this test attachment.

## 4. Verification and Browser QA

At this documentation checkpoint, the parent records **46 focused tests passed, none failed**. The frontend subtask's 22 passing tests are part of the implementation evidence, not an additional independent count to add blindly to that total.

Checks include populated idle rendering, original art transparency, accepted request recovery, no duplicate STOP wager, simulation/cash journal separation, preserved pending wins at the observed AUTO threshold, per-reel audio deduplication, and actual local HTTP server/transport behavior.

Two legacy tests in unchanged `official-atlas-audit.test.mjs` still fail with `BURN_WILDS_REFERENCE_FRAME_COUNT`. Those old atlas fixtures are not part of the new original-art runtime. They are reported separately rather than presented as successful.

| Browser QA item | Checkpoint status |
| --- | --- |
| Current official demo: SPIN, STOP, BET | Observed directly. |
| Current official demo: AUTO and win-threshold stop | Observed directly, including the pending 1.60 DMO win. |
| Current official demo: winning WILD expansion and X2 loss | Observed directly. |
| Current official demo: successful TAKE | Observed directly: 19,999.50 + 0.45 = 19,999.95 DMO; pending-win controls disappeared. |
| Current official demo: sound controls and settings | Visual control behavior observed; acoustic comparison unverified. |
| Native Player route after deployment | Awaiting parent live verification. |
| Native viewport widths 360 / 390 / 430 | Awaiting parent browser verification. |
| Native SPIN / STOP / BET / AUTO / SETTINGS / SOUND | Awaiting parent live interaction verification. |
| Native X2 / TAKE and displayed server history | Awaiting parent live interaction verification. |
| Native win animation, clipping and touch hitboxes | Awaiting parent visual verification. |
| Physical mobile FPS and touch latency | Unverified. |
| Production cash-wallet and ledger settlement | Not established by this simulation. |

The test page's `?viewport=360`, `?viewport=390` and `?viewport=430` options constrain its container for desktop inspection. They are not physical device emulation or evidence of sustained mobile performance.

### Parent append: final release and live QA

Pending. Record the exact source commit, deployed Worker/Railway versions, verified URL, observed actions, native test balances/results, remaining limitations and any rollback reference here after deployment. Do not mark an unobserved interaction as passed.

## 5. Next game

**Game #2: Multi Hot 5 Super Wilds.** It is named for handoff only; no work on Game #2 is included in this task.

