# Superwin / ZPLAY continuation — 2026-11-11

Work continues from the actual GitHub checkpoint `f636b93dd38f59173587e3e36979deeb7595a422`, fetched directly by SHA. The three advertised independent74 branches still pointed to its parent `ef0cf91`; `origin/main` was `88f5ec5`. The new feature branch is `work/independent74-20rounds-20261111`. Do not force-push or push to main.

## Latest user direction

Keep all 74 games on the existing **https://superwin-player.apdiy61.workers.dev/** homepage and its existing accounts, matching the supplied two-column covers and bottom-sheet Play Now flow. The latest messages remove the public Demo button: show **Play Now · ETB**. Keep the separate server-owned free-credit DEMO route for verification; never label those credits as real ETB. No new website, domain, financial service or database is authorized or needed.

The official reference quota is **20 completed rounds per title**, 1,480 target credits. Preserve actual historical counts above 20; do not replay such titles. Current official evidence records **312 actual completed rounds**, **180/1,480 target credits**, **1,300 remaining**, with **9 titles meeting 20**. Plinko X Classic retains its historical 152. Per-title journals, result receipts, screenshots, hashes and unknowns are in `tests/evidence/` and `reports/current74-*`. Clicks, pending wins, fixture rounds and our own free DEMO rounds are not official-reference completions.

Initial/test presets are **1–20 ETB**. The obsolete fixed 4,000 ETB policy is removed from client, gateway, adapter, definitions and tests. Larger stakes and awards above 40,000 ETB require server game limits, the existing account capacity check and a fully funded house reserve. Fixture 50,000 ETB limits are synthetic test configuration, not production policy. Monetary operations use canonical integer minor units.

## Implemented and verified

- All 72 independent machines have account-only client/controller/renderers and retained LibraryService integration source; Multi Hot 5 and Foxy Hot 20 remain protected.
- Root homepage enhancement mounts 74 covers and the requested poster/details/Play Now bottom sheet while preserving existing header, authentication and navigation. Public Demo controls are hidden; direct DEMO QA mode uses a distinct API, currency and pending-request key.
- Free QA outcomes, balance, requests, recovery and history run on the server in isolated IDs and keys of the existing `LOCAL_DEMO_WALLETS` namespace. No player wallet, house balance or native financial route is used for free-credit play.
- Documented X2/collect is implemented for Multi Hot 5 Wild and Burn Wilds, with new math versions and full 8× liability; authored card probabilities/caps are disclosed. Roll X has a reference-based green/black dial and fixed pointer. Provider multiplier semantics remain unverified. Plinko starts at the release point before its first frame; STOP never changes the server result.
- Fresh full suite: **681 passed, 0 failed** at the latest completed run (`work/current74-final-tests.txt`). Retained SQL checks include a stake and collected award above 40,000 ETB, one debit/payout, replay, exact conservation, insufficient funds, account capacity, house reserve, rollback and recovery.
- Actual Chromium account-fixture checks: **72 games, 288 layouts**, widths 360/390/430/1280, STOP, active/settled reload, history, AUTO and all three held-win flows (`tests/machine74-browser-report.json`). These are fixture checks, not production wagers or official parity evidence.
- Free DEMO Chromium flow and root-lobby checks pass; see `reports/current74-demo-ui/` and `reports/current74-root-lobby-browser.json`. All three existing portal builds and 9 root Python tests passed.
- Actual production schema was recovered from an already-deployed read-only audit's 163 log chunks and SHA-256 verified. It confirms integer wallets, account limits, request uniqueness, one-active-round index and immutable ledger/transfer trigger definitions. Account limit values, game policy and available live house capacity remain to be verified. See `server/artifacts/production-schema-readonly-*`.

## Release state and remaining work

At the last verified remote read, production remained r5: version `00a0e443-b3ce-4554-81d3-46304bea2b85`, deployment `597ca5e8-a2fe-4e96-aaf0-360a62c87035`. r6 is being packaged for the existing Worker only. Do not call a candidate upload a deployment; verify active version, homepage, routes, assets and free DEMO after activation. The release must preserve all 304 inherited source modules byte-for-byte, all bindings/exports/assets config and protected routes. Only the old four independent74 modules may be replaced. New demo code delegates every legacy Durable Object request to the unchanged parent class. No class migration or namespace creation is needed.

The Worker is near its uncompressed size limit. Client minification and sharing one server catalogue avoid duplicate source; do not append another full release. Stage and verify a candidate, then activate with the existing version/deployment API. Rollback is r5 at 100%; code rollback does not undo database or demo-storage writes.

The actual existing Railway backend needs the additive 72-route installer on its retained service, with existing signature verifier and session resolver. A source-preserving bootstrap candidate is prepared. Do not accept the unrelated staged Railway environment patch. Default new-round financial gates remain closed unless actual policy/funding and release conditions are verified. A healthy old service or an unsigned 401 is not successful integration evidence.

Full provider artwork/audio/feature parity and the remaining 65 official-reference quotas are unfinished. Public source conflicts and independent probabilities remain explicit. Do not claim completion, all-title ETB enablement, production wallet verification or provider RNG/RTP equivalence from these tests.

## Continue

Read `REFERENCE_OBSERVATION_PROTOCOL.md`, `server/EXISTING_LIBRARY74_INTEGRATION.md`, the per-ID journals and current release evidence before editing. File ownership was coordinated across financial/demo, presentation, public rules, official slot observations and other demo observations. Continue without restarting completed official quotas.
