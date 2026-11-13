# All-catalogue public-demo observation

Run from the repository root with Playwright and Chromium installed:

```sh
SPECIAL74_OBSERVE_DEMOS=1 \
SPECIAL74_BATCH_RUN=all74-20261113 \
SPECIAL74_BATCH_CONCURRENCY=4 \
NODE_PATH=/workspace/special74-tooling/node_modules \
node workers/superwin-player/special74/tools/batch-reference-all.cjs
```

The supervising command starts one isolated browser process per title, with at most four running concurrently. A 45-second per-title deadline (configurable through `SPECIAL74_GAME_DEADLINE_MS`, 20–180 seconds) terminates a stuck process group and salvages saved media, screenshots and verified actions; a deadline result is incomplete evidence, never a completed game. The lower-level `batch-reference.cjs` remains available for deeper targeted inspection.

The run identifier is a persistent checkpoint. Re-running it retains completed observations and processes remaining titles or failed/interrupted entries. Attempt directories always receive new increasing identities, including after setup failures. `SPECIAL74_BATCH_IDS` limits a diagnostic run to comma-separated catalogue IDs; `SPECIAL74_BATCH_DEFER` puts IDs at the end of the queue. `SPECIAL74_BATCH_RETRY=1` repeats previously completed observations. The lower-level runner can retry network, loading and provider-table-limit failures sequentially; the bounded supervisor completes the entire selected catalogue first. Run a targeted follow-up for individual unresolved entries using `SPECIAL74_BATCH_IDS`.

Each title gets a separate browser context. Normal official demo subresources load, including provider CDN variants. A production-host block isolates Superwin, its Workers and Railway endpoints; media export still filters known public provider resource origins. Launches require an explicit provider `DEMO` or `DEMO_EXH` token. No provider executable runtime, cookie, browser storage, account identifier or session request payload is exported. Saved resource URLs omit query strings. Media binaries are left to the media acquisition tool.

The observer dismisses a visible sound prompt and identifies named interactive Pixi sprites and visible DOM controls. It derives coordinates from current renderer bounds, resolution, iframe position and viewport clipping. It records DOM hit-test results and sends real mouse input only to measured named control bounds inside the viewport. Mobile iframe hit tests can report false negatives; observed bet changes, receipts and dialog disappearance determine action outcomes. It does not use shared fixed coordinates, trigger internal game functions or fabricate controls.

The tool attempts Bet increase/decrease, a Spin, available Take and menu features. It records effects separately: three equal selected-bet samples before and after input, changing in the requested numeric direction, confirm Bet; a provider round receipt arriving during the Spin action confirms a round response. DOM changes establish only that the visible interface changed. A canvas, an attempted tap, a provider receipt or a changed dialog never establishes full mechanics coverage, settled animation, audiovisual parity, real-wallet integration or release readiness.

Outputs live under `reports/special74/batch-observations/<run>/`. The top-level index and per-title `observation.json` are atomic checkpoints. Attempt folders preserve screenshots, presentation geometry, visible text, computed CSS backgrounds, media references, network failures and source hashes. Every result retains `ready: false` and `featureCoverageComplete: false` until separate game-specific review establishes complete coverage.

The observation viewport remains 412×839. Device scale defaults to 1 to reduce software-rendering contention; `SPECIAL74_DEVICE_SCALE_FACTOR` can select 1–3. The exact scale is saved in every observation. This efficiency setting does not certify audiovisual parity. For targeted follow-up use at most two workers and `SPECIAL74_GAME_DEADLINE_MS=120000`, with a separate run name to retain the complete all-catalogue index.
