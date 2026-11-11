# 74-game build and official-demo observation protocol

## User direction

Finish the game construction first. Transfer to the intended production website only after the construction and release checks are complete. Keep Multi Hot 5 and Foxy Hot 20 unchanged. Inspect their official references without changing their existing implementations.

The latest user direction on 2026-11-11 replaces the former 10,000-round plan with **20 confirmed completed official-demo rounds per title: 74 × 20 = 1,480 target credits**. Preserve the actual historical count when it exceeds 20, but credit at most 20 toward that title's target. Do not start additional rounds for any title already at or above 20. A surplus on one title does not fulfill another title's quota.

Use 1–20 ETB as initial and test stake presets. Actual demo currency may have a provider-controlled minimum; record that conflict, do not represent DMO as ETB. Larger production stakes and wins, including amounts above 40,000 ETB, require explicit server game policy, the existing account's capacity checks and funded house liability. There is no fixed 4,000 ETB betting policy. Monetary values use exact integer minor units; browser state never supplies an outcome or balance.

## Evidence and counts

- Open only the public official launch URL with `Token=DEMO` for observational play. Confirm that the displayed balance is demo currency before pressing Play. No production account or player wallet is used.
- For each title record its public page and demo URL, the observed UI, geometry, stake choices, controls, round progression, result, payout display, optional features and recovery behavior.
- Count a round only when a public result, history row or completed native autoplay counter confirms it. A click, an animation start, an autoplay setting or an intended batch does not prove completion.
- Record exact verified counts, conservative lower bounds and unconfirmed attempts separately. Do not extrapolate a selected autoplay count into a completed count.
- Keep official-demo observations separate from locally generated mathematical simulations, unit tests, fixture ledger rounds and browser scripts that have not actually run.
- A sampled feature can establish visible behavior. Sampling cannot recover private reel strips, private RNG distributions, certified return, every rare feature or complete provider equivalence.
- Conflicting primary sources are recorded as conflicts. Do not silently choose whichever statement makes the implementation appear complete.

## Build alongside observation

1. Record the observation and safe public source URL; exclude ephemeral session tokens.
2. Identify the precise difference between the reference and the current machine.
3. Change the relevant model, public state, renderer or controller. Version any mathematical change.
4. Add focused verification for the changed behavior, liability bound, privacy and settlement where applicable.
5. Mark the feature as implemented, observed but incomplete, conflicting or unverified. Keep the production release gate closed until the required evidence exists.
6. Persist the source, observation journal and verification report in the project's GitHub feature branch. Do not edit production balances, initialize another wallet or deploy as part of an observation batch.

## Execution and evidence

The former checkpoint could not run its local Chromium suite. The current managed environment can run Chromium and reach the isolated localhost harness; retain the new browser report and its actual pass/failure, rather than carrying the old environment blocker forward. Browser fixture wagers, responsive checks and screenshots are not official-demo rounds. Coordinate public demo sessions because the provider may allow only one slot table at a time. Persist each confirmed receipt or completed history/counter with its timestamp and game ID immediately.

Maintain separate fields for directly observed behavior, public documented rules, implemented behavior, executed verification and unknowns. Record screen geometry, controls, animation sequence, observed stake/win/loss/multiplier/balance, rare features, reload/open-round recovery, disagreements and missing evidence. Twenty rounds do not establish private probabilities, reel strips, feature frequency, RTP or every rare bonus.

## Continuation record

`tests/evidence/official-demo-observations-root.json`, the corresponding agent observation files, and `tests/evidence/official-demo-progress.json` carry the observations and verified counts. `tests/math-official72-audit.json` records model coverage and remaining gaps. They are complementary records, not interchangeable measures of completion.
