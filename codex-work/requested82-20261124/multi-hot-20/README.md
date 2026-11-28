# 27 November — compact host and paired stylesheet continuation

The recovered M20 work exposed two actual defects: short phone/landscape controls were sized against the whole window rather than the space below the existing host header/status, and the app-only release builder omitted the compact CSS it had tested from the working tree. The stage now uses the available host height and recalculates after the loading banner hides. All eight targets retain at least 44px; hosts with less than 144px available space scroll.

The optional `previousStylePath` build emits both immutable app and CSS resources. The wrapper replaces their exact original tags together, verifies both resources' sizes/SHA-256, preserves CSP/cookies/other routes, and fails closed on a missing or duplicate tag. The legacy app-only mode remains available for historical builds. Existing media and financial transport are unchanged.

Current focused verification: source-mounted real Chromium checks cover ten host viewports; compiled native-media receipt/recovery checks cover 360x844, 390x844, 430x844, 1280x900, 844x390 and 390x320. The compiled check serves only the emitted stylesheet, so working-tree CSS can no longer conceal a packaging omission. Native media are the retained thirteen SHA-matching public same-game files. Each synthetic accepted draw recovers its original receipt with one fixture SPIN and no second TAKE credit; no production wager is implied.

The guarded two-module presentation update is described in [release/README.md](../../requested20-20261126/multi-hot-20/release/README.md). It preserves the existing global main, original r1 entry, all 432 non-target modules and runtime configuration. Only its own config/worker may change. Source/test results alone do not claim activation or authenticated financial acceptance. Historical release evidence follows.

---

# Multi Hot 20 accepted-result recovery

The existing mounted Multi Hot 20 could strand an accepted SPIN after its renderer threw or the native scene's asynchronous settlement rejected. The controls already retained the accepted result and had cleared the pending financial request; the previous recovery path only handled missing server responses. The player could therefore see an interrupted game without a usable way to finish showing the accepted win.

The active controls, controller and native adapter retain that original immutable receipt and expose local presentation recovery. RECOVER resets the failed native display and restores the same grid, multiplier and pending amount without another SPIN, host recovery call or wallet operation. A late settlement promise cannot overwrite the restored display. Failed static drawing remains recoverable on another attempt. Hidden/disposed pages, conflicting receipts and reentrant callbacks cannot introduce another action. The outer connection banner clears after successful recovery.

The retained main UI gains optional controls/controller factories with its original defaults. Its existing SPIN caption now remains visible in three lines inside the native arrows; fresh official Multi Hot 20 inspection showed the HOLD & SPIN text that the previous native presentation hid. No stylesheet or native artwork is replaced.

The identities remain `zplay72_multi_hot_20_v1` and existing backend `fresh_multihot20`. The existing same-origin state, SPIN and X2 transport stays unchanged. The host still settles immediately; TAKE refreshes that existing state and never credits the win a second time. No release flag, mathematical model, account, wallet, ledger, session or payment service changes.

## Verification

On 24 November 2026, all **74** retained M20 and active recovery/release tests passed:

```sh
node --test codex-work/new-games90-20261123/m20/*.test.mjs codex-work/new-games90-20261123/m20/render/motion.test.mjs codex-work/requested82-20261124/multi-hot-20/*.test.mjs
```

The exact built browser app `eebc6d668279141b6080cc5b8915bd407211eea75b60be195b8f86554134a1e9` (**111,436 bytes**) passed Chromium Playwright at **360, 390, 430 and 1280 pixels**. A real PLAY link opened the built page, loaded all thirteen existing same-game native image/audio resources through the retained integrity loader, accepted a synthetic HTTP receipt through the unchanged host transport, encountered an intentionally failed accepted-frame draw, recovered that exact receipt and completed TAKE. BET, menu, settings and Escape responded. The native caption remained visible; there was no horizontal overflow, page error or external request. Each isolated run sent one SPIN POST and zero TAKE POSTs. These are explicit fixtures, not production balances or financial acceptance. `browser-verification.json` records their scope and exact app hash.

Browser captures and recovered media stay outside Git under the private task scratch directory. Media were recovered through normal GETs against the existing publicly served manifest and thirteen content-pinned asset paths; every byte length and SHA-256 matched. They are runtime inputs for the local test, not this task's new reference media and not public repository additions.

The current [official Multi Hot 20 page](https://www.smartsoftgaming.com/games/multi-hot-20) and its exact linked public `MultiHot20` demo opened successfully in fresh Chromium. Initial rendering confirmed the five-column/three-row emerald cabinet, multiplier wheel, right AUTO/SPIN/BET/QUICK controls, bottom menu/balance/bet/sound and 0.20 DMO initial bet. This continuation did **not** play seven new official rounds or establish full artwork, motion or audible parity.

The actual existing Player route `https://superwin-player.apdiy61.workers.dev/new-games72/multi-hot-20/` returned HTTP 200, its app/style returned 200 and no page error occurred. The existing state route returned **401 PLAYER_LOGIN_REQUIRED** in the fresh guest context. That is a functioning authentication boundary; no default credentials, production test funds or customer account was used. Authenticated production SPIN/ledger acceptance remains unverified.

## Additive release

`build.mjs` emits one new content-addressed browser app for the existing `SSG_OFFICIAL_REFERENCES` binding and three additive Worker modules totaling **2,977 bytes**. The wrapper changes exactly one previously pinned script tag in the existing M20 page. Every old style, manifest, media, dashboard and API request remains delegated; all previous named exports remain exported. A mismatched page or corrupted script fails closed. No bytes are changed under an old immutable URL or KV key.

```sh
node codex-work/requested82-20261124/multi-hot-20/build.mjs new90m20r1/entry.mjs 79bb7e48737feb68a2e905f8 /_zplay/new90-m20/79bb7e48737feb68a2e905f8/app.d4c20fdb220638287477a1464c4b47e5bfb6e6f2b7b49988d344d3cc8d1250e6.mjs /absolute/scratch/output
```

Supply `GITHUB_SHA` for the exact published source when packaging. Parent release orchestration must retain the active baseline and all original modules/bindings, stage and read back the new KV app, publish the exact source, verify the staged wrapper, and record activation/live readback. These source and fixture results do not themselves claim deployment or a completed new game. No dashboard card is added by this repair.
