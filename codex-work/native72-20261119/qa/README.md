# Local browser QA

This harness serves the recovered frontend against an isolated in-memory session and simulated balance. It has no network forwarding, customer credentials, database, wallet integration, or production transaction capability. It binds only to `127.0.0.1`. A restrictive content security policy blocks external game requests. Missing assets return 404 instead of falling back to production.

Use complete staged asset directories, including `registry.mjs`, `contract.mjs`, controller, renderers, media, and all imported modules. Supply the exact recovered game HTML as `index.html` in each directory, or pass a separate `--habesha-html` / `--deluxe-html` path. The server replaces the game identity and asset URL bases only in its served HTML, then injects a visible local QA toolbar. Production files are never modified.

```bash
node qa/browser-server.mjs --habesha /absolute/path/to/habesha-stage --deluxe /absolute/path/to/deluxe-stage --port 4179
```

Open `http://127.0.0.1:4179/qa/habesha/` or `http://127.0.0.1:4179/qa/deluxe/`.

For the dedicated module release, add `--shared /absolute/path/to/shared-stage`. This mounts `/zplay-native-shared-20261119-r1/` and resolves the same origin-absolute module imports while Node loads the actual staged contract validators. Restart the server after changing validator modules; static files are read on each request.

The original UI still says ETB because its retained contract requires that currency string. Every balance displayed by this server is synthetic and cannot be deposited, withdrawn, or transferred. The local toolbar is explicit about that distinction.

## Scenarios

- `cycle`: repeating winning, losing, and maximum-wheel fixtures.
- `win`: a known matching payline with the first wheel multiplier.
- `loss`: a valid reel stop combination with zero win.
- `max-wheel`: highest paying symbol with the largest wheel multiplier.
- `reject-once`: one definitive pre-settlement 503; no balance change.
- `interrupted-once`: one result is settled only in memory, then its response is interrupted with 503. CONFIRM reuses the existing token and returns exactly the same receipt.

The toolbar also controls response delay and the next simulated gamble outcome. Reset creates a new synthetic session and balance. Expire makes subsequent API requests unauthenticated. `/__qa/state` reports request/replay counts and missing assets for inspection.

These deterministic fixtures validate actual frontend contracts and exercise UI states. They are not an estimate of provider probabilities, payout distribution, or certified math.

```bash
node --test qa/fixtures.test.mjs
```
