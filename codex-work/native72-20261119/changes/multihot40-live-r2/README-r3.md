# Multi Hot 40 r3 — actual existing Player release

Route: https://superwin-player.apdiy61.workers.dev/games/multihot40_native

`release-r3.json` pins the three deployed source modules. `entry-r3.mjs` wraps the active v457 entry (`native72habesha7/entry.mjs`) and re-exports its Durable Object classes. It deliberately does not wrap the inactive v459 entry. All 399 inherited modules are retained; two small modules implement only four exact presentation GET/HEAD paths. All financial APIs and other games delegate to the active baseline. The content-only Cloudflare upload preserved 18 bindings, assets and compatibility settings. Production version: `546d9322-fba0-4d83-b5ab-ed134747618d`.

Changes: 44px mobile controls; focus/AUTO/hold lifecycle; complete-body loader timeout and reload retry preserving saved rounds; original one-shot fast spin audio; ordinary versus turbo reel-stop cues; no multiplier sound on losing wheels; non-SPIN button audio; explicit QUICK PLAY consent on each enable.

Run offline Node tests:

```sh
node --test codex-work/native72-20261119/changes/multihot40-live-r2/*.test.mjs
```

With Playwright and Chromium installed, run `node browser-qa.cjs <artifact-directory>` from this directory. It overlays the local three modules onto the existing page, intercepts all financial requests, and uses verified original artwork/audio. It tests receipt-driven reels, double-SPIN, blur, audio buffer events, AUTO, Quick Play, touch geometry, launch gates and loader recovery. It creates only invented QA receipts; it does not establish live ETB settlement.

`node live-smoke.cjs <artifact-directory>` loads the actual deployed modules without overrides, blocks mutations, verifies source SHA-256/release headers and checks the public route, mobile controls, Quick Play and rules. It expects a 401 Player state when unauthenticated.

Evidence: `../../qa/evidence/mh40-r3/`. The original demo video excerpt has no audio track; separate WebAudio observations record original clip hashes and playback events. Screenshots, video and the local browser QA do not establish complete visual/audio parity, audited probability/RTP or authenticated Player settlement. Game #1 remains `FIXED_PENDING_TEST`; batch #1–#10 remains 0/10 completed.
