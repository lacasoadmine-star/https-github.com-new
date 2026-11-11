Current deployed Worker: `superwin-player`, version `00a0e443-b3ce-4554-81d3-46304bea2b85` (r5), deployment `597ca5e8-a2fe-4e96-aaf0-360a62c87035`.

Live reference gallery and side-by-side viewer: https://superwin-player.apdiy61.workers.dev/independent74/compare74.html

The current official catalogue supplies 74 names, public DEMO launch URLs and cover references. All 74 launch URLs returned HTTP 200 in Playwright; 67 observations contained a visible canvas. A loaded launcher or canvas is not a verified wager. Separate fresh completed official rounds are recorded for Multi Hot 100 and Plinko X Classic. Other-publisher Coin Miner was also played and is explicitly identified as Gaming Corps.

The official-catalogue collection contains 72 independent prototype models; Multi Hot 5 and Foxy Hot 20 are excluded and remain protected. The earlier requested list remains a separate prototype collection. Neither collection is connected to player funds. The existing production dashboard, wallet routes, bindings, Durable Object exports and all 304 original Worker modules remain unchanged.

Fresh improvements include Multi Hot 100's observed 5-column/4-row layout and public pay values, independent fruit artwork, staggered reel stopping, distinct synthesized win cues, and Plinko X Classic's observed 16-row/17-bucket board with a new pink-ball fair-path prototype and outcome-driven ball motion. Plinko 5x/10x ball behaviour is not implemented. Provider RNG probabilities, full bonus logic, exact media and complete official parity are not established. These models must not be represented as the complete official games.

408 automated tests pass. Browser evidence covers mobile controls, animation stopping, repeated actions, bet scaling, exact point settlement and all 72 current-catalogue prototypes. Live account API calls and player-wallet mutations during those checks are zero. Eight legacy public-route hashes remain unchanged. Production evidence is in `tests/artifacts/`; release and original-module preservation proofs are in `deploy/`.

The existing Railway backend still reports `new_rounds_enabled:false`, `configured_games:0` and `recovery_games:30`. Its actual wallet schema, triggers and funded house reservations have not been verified for these new models. The prepared adapter and schema-audit prelude are source only. A live function update reported `changed:true`, but source readback remained byte-for-byte the original deployed code and no new deployment appeared; the audit did not run. Do not count that response as a successful backend change. No database rows or balances were changed. Do not accept the unrelated existing staged Railway patch.

Work continues solo at the user's request. Do not restart the quota-failed agents, create infrastructure, alter the two protected games, relabel local points as ETB, or claim full official parity.

Rebuild the browser bundle with the existing esbuild binary and the browser-only RNG alias:

```sh
/workspace/superwin/node_modules/.bin/esbuild client/test72-entry.mjs --bundle --minify --format=esm --platform=browser --alias:node:crypto=./client/test72-rng.mjs --outfile=client/test72-bundle.mjs
npm test
IND74_RELEASE=r6 IND74_EXPECTED_VERSION=00a0e443-b3ce-4554-81d3-46304bea2b85 node build.mjs
```

Deployment is guarded by exact active/latest version checks and byte-level preservation of all legacy multipart modules. Replace only the four existing `independent74-*-r5.mjs` modules using `deploy/r5-own-module-hashes.json`; preserve all bindings and exports. The existing Worker is close to its 63.9 MiB uncompressed size limit, so do not append duplicate releases or embed a new media library. `render-upload.mjs` uses a replacement callback to preserve literal dollar sequences in compiled source. Verify every original module before activating a candidate and run the legacy public-route check afterward.
