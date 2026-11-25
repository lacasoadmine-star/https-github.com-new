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
interactive demo was opened. Replace \`--url\` with the actual official **demo**
URL to inspect its in-game controls. For browser-based access to a previously
authenticated profile, start your own Chrome with its CDP endpoint enabled and
pass \`--cdp http://127.0.0.1:9222\`. Do **not** send CDP endpoints, cookies,
login passwords, tokens or storage-state files to anyone.

Default behavior is **read-only**: it opens one URL, inspects buttons/canvases
and layout across 360, 390, 430, and 1280 px, estimates browser RAF activity,
and takes screenshots. The default run does not click any button and cannot
debit an account. Local output is written under \`qa-artifacts/smartsoft/\` and
is ignored by Git.

For up to seven spins, an explicit **demo-credit-only** URL is mandatory:

~~~sh
python tools/smartsoft_demo_audit.py \
  --url "https://OFFICIAL-GAME-DEMO-URL?mode=demo" \
  --game-id "verified-game-id" --spin-count 7 --confirm-demo
~~~

The command above uses a placeholder URL; it is not a runnable official link.
The tool still refuses to spin when the landed URL has no explicit demo marker,
or when the game exposes only Canvas hitboxes without a verified control map.
A real-money ZPLAY session must **never** be used for automated demo spins.
If loading fails, the local report records a failure, not a false successful test.

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
provider files. Confirm distribution rights before publishing such assets.

The observed ZPLAY Casino All Games provider selector displayed **SmartSoft
(72)** at inspection time. The requested 60 titles must therefore be explicitly
selected and checked one by one; a list of 60 playable games is **not** produced
by this audit tool. Do not show unfinished games as live in the player lobby.
