# ZPLAY — next26 experimental engine lab

This **is not a production deployment** and is not an official SmartSoft implementation. The existing ZPLAY Player Worker, Agent Worker, backend, ETB wallet and historical accounts are intentionally not modified.

## Scope and entry point

- `reference-audit-20261116.json`: 26 official provider page references, with source-provenance and limits of verification. Historical archive evidence is **not** proof of live interior play.
- `engine.js`: 26 game IDs with original code-driven, nonfinancial state machines across crash, cascade, slot, mines, path, plinko, wheel, roulette and tower test modes.
- `index.html`, `style.css`, `app.js`: a device-responsive Canvas+HTML interaction harness, original procedural graphics, simple generated audio, PLAY/STOP/COLLECT/AUTO/level/rules and pointer/keyboard controls.
- `engine.test.cjs`: deterministic, isolated no-money tests. No accounts, no production bet requests, no wallet, no secrets.

Run `node --test player-machines/next26/engine.test.cjs` to check 26×20 simulated rounds. Run `python3 -m http.server 9000 -d player-machines/next26` then open `http://127.0.0.1:9000/` to inspect the local-only browser harness. Do not expose it as a production gambling interface.

## Engineering limitations and release gate

The test engines intentionally do **not** reproduce provider RNG, RTP, paylines, crash probabilities, game rounds, copyrighted audiovisual assets or licensed mathematical models. Visuals and mechanics are original simulations. Historical snapshots, a public website feature description, or a loading screen **cannot** establish that provider SPIN/controls have been exercised. Before production launch, each title requires verified official demo interaction, reviewed game-specific maths & back-end contracts, 20 controlled end-to-end browser actions, regression tests for the existing two protected machines, preservation of all current Worker modules/bindings and a reviewed versioned deployment with rollback. Never place real monetary wagers as tests.

In particular, the screenshot archive found 23 of 26 titles; Roll X, Double X, and Samurai required fresh official-page discovery. These three have no replayable provider-demo evidence in the historical KV index. Two historical `PLAY` click records among the 23 are not equivalent to complete gameplay verification.

Build source is deliberately isolated from `player-machines/public/` and `player-machines/worker/`; it does not patch live routes. This is an engineering checkpoint, not 26 completed playable ETB games.