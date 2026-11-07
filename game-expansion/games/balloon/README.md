# ZPLAY Balloon — Player integration

This resumes the Balloon checkpoint in the user's 43464.mp4 recording. It shows the prior construction conversation and embedded static references, not a complete gameplay recording. The visible continuation asks for 20 new games, one by one while conserving credits. The separate 25-name catalogue remains research/backlog metadata, not an implementation count.

## Implemented

Native Canvas scene, HOLD/RELEASE, ETB stakes, procedural audio and the authenticated Worker bridge connect to the existing Railway ledger. The read-only backend health check reported ready=true and accepting=true on 2026-11-08 (Africa/Addis_Ababa).

Uncertain requests retain their exact body, request ID and original session; another stake cannot replace them. State polling cannot restore stale balances or rounds. Actions use the accepted round's model version, and continued HOLD/COLLECT intent is bound to that original account and round. Replays trigger a fresh state read.

The existing Player presence module renews sessions. The retained catalogue renderer adds Balloon once on Home and in Flight/All Games. The cover uses its permitted same-origin image path; no second game-card overlay is appended.

## Build and tests

Run inside this directory:
```bash
node prepare-assets.mjs
node --test test/*.test.mjs
```

35/35 focused checks passed: 17 client request/session/recovery regressions, 6 model checks, 11 Worker/authentication checks and 1 catalogue preservation check. They use isolated fixtures, not production wagers. Browser viewport checks and publication results are recorded under evidence when completed. They do not establish 100% provider fidelity or a production-wallet wager.

## Preserve the existing deployment

Baseline: Player v312, version 8a64773a-46d2-423c-b5a7-f0b22084d2d7, 208 modules, 13 bindings, existing static assets and minute cron. See evidence/player-v312-baseline.json for all module hashes. The content/v2 endpoint recovers the complete multipart bytes without the earlier script-download memory failure.

Retain every old module's bytes, filename and MIME type. Keep assets and their routing, inherit all13 bindings, forward fetch/scheduled, re-export LocalDemoWallet and omit Durable Object migrations. The existing v312 remains the rollback target.

deployment/balloon-entry-20261108.mjs imports the actual retained live entry. Package worker.mjs as balloon-worker-20261108.mjs with its asset import mapped to balloon-assets-20261108.mjs; package client-assets.mjs under that name. The new scheduled wrapper invokes library reconciliation through the existing minute cron.

Do not apply Railway's stale early-November-7 staged patch. Its later successful deployed source already contains Balloon. These changes preserve backend model/ledger source.

## Routes and model

- /games/balloon_native
- /native-library/balloon/v1/*
- /assets/zplay-balloon-native-v1.svg
- /api/library/state?game_id=balloon_native
- /api/library/action

The server uses an independent Superwin outcome distribution, not SmartSoft's confidential mathematics.
