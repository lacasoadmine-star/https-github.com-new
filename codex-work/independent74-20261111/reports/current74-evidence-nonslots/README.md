# Remaining non-slot official-demo observations

Source of truth: `tests/evidence/official-demo-observations-nonslots20-remaining.json`, combined by `tests/update-official-demo-progress.mjs`. The target is **20 confirmed completed rounds per title**. Run the generator before choosing another game. Keep actual historical counts above20, and never play further rounds for those titles.

Only one non-slot browser runs alongside the main and secondary slot pools. Slot pools own disjoint catalogue IDs in `reports/current74-cleared-remaining.json`; never borrow their sessions. Use the catalogue's public DEMO launch URL and visually confirm demo currency. Prefer1–20 demo units when the provider allows; these are not ETB wallet transactions. No player funds, hidden RNG edits, internal outcome mutations or animation-speed modifications.

The resumable observer is `observe.cjs`; inspect a new title with `inspect.cjs`. Both require this cloud environment's Playwright installation and Chromium. Example from the project root:

```
node reports/current74-evidence-nonslots/inspect.cjs ind74_official_mineisland
node reports/current74-evidence-nonslots/observe.cjs ind74_official_mineisland
```

A handler must verify each accepted wager's completed public result, MY BETS row or completed native counter before incrementing `verifiedCompletedRounds`. A debit, Play click or in-flight screenshot is insufficient. Save every result and screenshot immediately, use exact integer minor-unit balance equations, and preserve the live page whenever an accepted result is unresolved. Close settled or unused pages promptly to reduce rendering load. Observation and aggregate JSON writes use unique temporary files followed by atomic rename.

Original Mine Island differs from Mine Island2. Its official screen has ten ascending islands and a PLAY control; a single click can settle1.1x automatically. The original model's old5×5 mines grid is unsupported. The original game's MY BETS pane displays stake, return, multiplier and time; use its advancing completed-row count and credited balance. The pane is non-modal and can remain open while pressing PLAY. Do not blindly toggle its history icon after every round: that can close an already open pane. A previous successful result without its captured history row was conservatively excluded. The earlier generic blocker image was overwritten once; no verified result depends on it. Current blocker screenshots have unique timestamps.

Mine Island2's explicit JUMP/COLLECT behavior was directly observed separately. Do not assume that original Mine Island exposes those same controls. Press/hold semantics and higher original-game steps remain unverified unless a journal explicitly establishes them.

After each completed title, regenerate the canonical progress and74-row report. Record a precise blocker for unsupported controls, loading errors, unavailable demo balances or unconfirmed results, then continue other non-slot titles. Never label an unsupported title complete. Keep geometry, public rules, observed results, independently authored implementation and fixture tests separate; sampling does not recover provider probabilities or RTP.


The current persistent browser is `browser-host.cjs`, controlled by `command.cjs` through atomic files under `work/nonslot-browser/`. Prefer it while inspecting a new family so an accepted diagnostic wager survives between commands. Do not run two non-slot hosts. Commands are sequential; a CLI timeout means the host may still be running the command. Inspect its response ID and source pending record before sending another wager. The shared `reports/current74-observation-control.json` pause flag and current canonical quota are checked before each new wager.

`handlers/chicken-highway.cjs` uses real START/GO/CASHOUT inputs and retained public completed-board responses. Its current implementation saves a completed row before attempting the screenshot. `handlers/ui-tools.cjs` bounds capture transport to12 seconds and records an unavailable capture explicitly; a missing PNG does not manufacture or invalidate independent completed-result proof. Screenshot hash mismatches remain audit failures. Native requests and WebSocket responses are observed and sanitized; no outcomes are changed.

`ind74_official_chickenhighway-display-tables.json` records the exact EASY25, MEDIUM23 and HARD19 lane display arrays from the official public loaded script, with its source URL and hash. This documents displayed multipliers and does not establish probabilities. The earlier visible prefix stopped at1.40; a provisional visual reading1.54 was corrected to the public display literal1.55.

`handlers/read-plinkox-controls.cjs` is a read-only follow-up for the already-completed Plinko X title. It checks that20 rounds already exist, never presses HOLD & DROP/Play, forbids its primary wager area, and checks the unchanged visible DMO wallet after each risk/amount/legend interaction. Its review does not contribute additional rounds.
