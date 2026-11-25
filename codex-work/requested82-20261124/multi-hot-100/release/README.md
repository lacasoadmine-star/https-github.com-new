# Current Multi Hot 100 same-host release preparation

This wrapper adds the reserved `/new-games72/multi-hot-100/` page and its content-addressed static namespace to the existing Player. It delegates the dashboard, other games, authentication, wallets and all financial APIs unchanged. The browser composes the own current UI with the already approved `multihot100_native` account/round service. It creates no outcome, balance, account or substitute settlement engine.

The exact20 static native assets are read from the currently pinned local media. All9 genuine own audio resources are now retained: background, spin, movement, five reel stops and `Start/WinMultiplier.mp3`. The ninth was recovered from the normally opened official demo's successful response,80640bytes, SHA256 `e511cc791eca3fe7b9f836c8f7701b94eae754d2ef7267423cac27962b4a44aa`; no guessed sound or access workaround is used. Supply the complete current `M100_AUDIO_PINS` as `audioPins`. The builder supports the earlier genuinely retained8 group for explicit historical builds, records any absent path in `missingAudioPaths`, and requires the exact supplied pins to match the own audio module and local bytes. Raw provider programs, private screenshots, cookies, session/history data and credentials are excluded from the bundle. Browser JS, CSS, pin metadata and media go into new content-hashed keys in the existing `SSG_OFFICIAL_REFERENCES` namespace. Only three small new ESM Worker modules are appended; all earlier module bytes and named exports remain intact.

The page uses external module/CSS assets, an empty game root and same-origin API access. Native cropped sprites require `data:` images; no external service is added to `connect-src`. Every static GET/HEAD loads the exact pinned KV key and validates its full byte count and SHA256 before serving it. Missing, corrupt or inaccessible resources fail closed. The wrapper has no financial POST handler and never injects dashboard cards.

Build with `buildM100Release({baseline,sourceCommit,assetDirectory,audioPins,enabled})`. The baseline must be the **actual currently active** version ID/number, main module, module count and complete byte total. Do not reuse a baseline after another deployment. The build checks the remaining64MiB module budget. By default, each bundled own source input and release source/style/pin file must match `git show <sourceCommit>:<path>`. Fetch the exact published feature commit locally before final packaging. `verifySourceCommit:false` permits disposable precommit QA only and records `publicationReady:false`; that artifact must not be used as verified publication.

`writeM100Release` emits the three modules, exact KV resource files and a report. `loadM100Release` independently reloads the output and rejects hash/length drift in modules or media. Source/artifact publication readiness is distinct from a completed game, successful account round or live deployment. All new live/completion claims remain false until their actual independent checks pass.

```sh
node --test codex-work/requested82-20261124/multi-hot-100/release/worker.test.mjs
```

The actual emitted browser app, CSS and CSP can be checked against an isolated unauthenticated host:

```sh
node codex-work/requested82-20261124/multi-hot-100/release/browser-qa.mjs BUILD_DIRECTORY
```

This check verifies the original-wire account401 flow at360,390,430 and1280px. It requires sign-in before creating gameplay controls or requesting native media. It does not create an account, wallet, outcome or financial action, and does not establish authenticated/live gameplay.

The parent release coordinator owns remote KV writes, staged full-bundle readback, existing-module/config preservation, actual activation and post-deploy browser/backend checks. This directory never performs remote mutations or commits.
