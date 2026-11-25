# SmartSoft official-demo audit (isolated from production)

This tool is **not** a casino engine. It starts the observation stage for each of
the requested SmartSoft games without changing the existing player, agent, admin,
Railway database, Cloudflare Worker, wallet or payout calculations.

## Run one game at a time

Install Playwright on the machine where Chrome and the demos are accessible:

~~~sh
python -m pip install playwright
python -m playwright install chromium
python tools/smartsoft_demo_audit.py \
  --url "https://www.smartsoftgaming.com/games/multi-hot-wheel" \
  --game-id "multi-hot-wheel"
~~~

The example is a **public official product reference**, not a claim that an
interactive demo was opened. Replace `--url` with the actual official **demo**
URL to inspect its in-game controls. For browser-based access to a previously
authenticated profile, start your own Chrome with its CDP endpoint enabled and
pass `--cdp http://127.0.0.1:9222`. Do **not** send CDP endpoints, cookies,
login passwords, tokens or storage-state files to anyone.

Default behavior is **read-only**: it opens one URL, inspects buttons/canvases
and layout across 360, 390, 430, and 1280 px, estimates browser RAF activity,
and takes screenshots. The default run does not click any button or intentionally
initiate a wager. Local output is written under `qa-artifacts/smartsoft/` and
is ignored by Git.

For up to seven **demo control clicks**, both a recognized official demo URL
and confirmation of demo-credit-only use are mandatory. This public Burn Wilds
launcher was linked by the [official product page](https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds)
on 2026-11-25:

~~~sh
python tools/smartsoft_demo_audit.py \
  --url "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameName=MultiHot5BurnWilds&PortalName=DEMO&Token=DEMO" \
  --game-id "multi-hot-5-burn-wilds" --spin-count 7 --confirm-demo
~~~

The public `Token=DEMO` constant is not a private player token. The launcher
may issue a temporary token to its own game iframe; those tokens are never
written into report URLs. No private ZPLAY session is needed for this public demo.

Click authorization is deliberately limited to the observed routes:

- Launcher: HTTPS `eu-server.ssgportal.com/GameLauncher/Loader.aspx`, with one
  `PortalName=DEMO`, one `Token=DEMO`, and one game name.
- Owning game frame: HTTPS `eu-server-w3.ssgportal.com`, with the exact route
  shape `/SlotsDemo/Slots/<game>/Game.aspx`.

Arbitrary origins with `/demo` or `mode=demo`, unobserved hosts/routes, conflicting
or duplicate mode parameters, private launcher tokens, and ordinary `/Slots/`
game frames are rejected. A demo parent never authorizes a real-money child frame.
If the provider changes its host or route, observe and review that new contract
before extending the allowlist; do not loosen the check to match any “demo” string.

Before every click, the tool rediscovers a unique visible enabled `SPIN` or `PLAY`
DOM button and rechecks its owning demo frame. It pins that element for the action
instead of reusing a locator across navigations. If navigation replaces the
document, the old element is unusable; the tool does not retry the action against
the replacement. Canvas hitboxes and unknown selectors are not guessed.
This means the command can legitimately report **zero clicks** for a working
canvas game whose controls need direct visual observation.

## What the report proves

Schema version 2 replaces the misleading `spinCountExecuted` field with
`spinClickCountAttempted`, `spinClickCountAcknowledged`, and
`spinClickCountUncertain`. A timed-out click might already have reached the page,
so it is recorded as uncertain and is never automatically retried. Successful
clicks are recorded before taking the screenshot, so a failed screenshot does
not erase an acknowledged action.

`spin-click-01.png` and subsequent files are screenshots after clicks, not proof
of settled rounds. The fixed delay does not establish reel completion, a win,
or a balance change. `roundCountVerified` remains **0**; completed rounds require
separate observation of actual game results. The tool cannot certify seven
completed rounds or mark a game `LIVE VERIFIED`.

Page titles are omitted because loader/error pages can use private signed URLs as
titles. Loading and capture failures are recorded by exception type only. Raw exception
messages and tracebacks may contain private URLs and are not printed by the CLI
or saved in the report. Cleanup failures are recorded separately.

Offline regression checks use mocked pages and no network, browser, wallet, or
production database:

~~~sh
python -m unittest discover -s tests -p 'test_smartsoft_demo_audit.py' -v
~~~

## Evidence required before production game approval

For each game, record the official demo URL/date/version, all rendered
symbols/backgrounds/splash screens, reel counts, paylines, paytable, wilds,
scatters, bonus mechanics, sound observations, 7 distinct non-financial spins,
control hitboxes (SPIN/STOP/BET/AUTO/TURBO/SETTINGS/SOUND), and viewport tests.
Playwright video does **not** establish audible Web Audio correctness.
A browser RAF estimate is **not** a verified in-game 60 FPS benchmark.

Each finished game's frontend module, rules/evaluator, approved artwork/audio,
round-id idempotency, and audit tests must be independent. Server must compute
the outcome and settle the bet atomically in ETB; the browser must not calculate
wallet wins. Failed/retried network calls must not create a second financial
round. Use an isolated test database, never production balances.

Official demo artwork/audio is reference material, not a license to redistribute
provider files. Confirm distribution rights before publishing such assets; the
provider's [Terms and Conditions](https://www.smartsoftgaming.com/legal/terms)
reserve commercial reuse rights.

The requested 60 titles must be observed in the current ZPLAY catalog and checked
one by one. A list of 60 playable games is **not** produced by this audit tool.
Do not show unfinished games as live in the player lobby.
