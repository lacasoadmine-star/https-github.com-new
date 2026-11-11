# 74-game build and official-demo observation protocol

## User direction

Finish the game construction first. Transfer to the intended production website only after the construction and release checks are complete. Keep Multi Hot 5 and Foxy Hot 20 unchanged. Inspect their official references without changing their existing implementations.

On 2026-11-11 the user additionally requested playing the official demos while recording the observed behavior and implementing the corresponding machines. The current working interpretation is **10,000 official-demo rounds in total across the 74 titles**. This interpretation was stated to the user. It is not 10,000 verified rounds yet.

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

## Current execution limitations

The browser test script for the new local machines exists, but its completion must be verified separately. The terminal sandbox currently denies Chromium's process socket; an attempt to run the isolated browser suite outside that sandbox was automatically rejected because sandbox escalation is disabled. The provided cloud browser also cannot reach the terminal's loopback test server. These failures are not successful browser tests and must not be reported as such. The supported cloud browser can still inspect the public official demos.

## Continuation record

`tests/evidence/official-demo-observations-root.json`, the corresponding agent observation files, and `tests/evidence/official-demo-progress.json` carry the observations and verified counts. `tests/math-official72-audit.json` records model coverage and remaining gaps. They are complementary records, not interchangeable measures of completion.
