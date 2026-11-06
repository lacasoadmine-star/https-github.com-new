# Two-game fidelity register r12

Scope: Multi Hot 5 and Foxy Hot 20. Status: source integration in progress; final native animation, combined browser and deployment verification are pending.

| Area | Implemented in r12 source | Remaining verification or difference |
|---|---|---|
| Original artwork | Native backgrounds, symbol crops, multiplier textures, frames, control/footer artwork and Intro fonts; source URLs and hashes recorded | Final device layouts, rasterization, clipping and source-relative placement; original assets alone do not prove full-screen identity |
| MH5 presentation | Native nine-symbol artwork, selected multiplier components, logo/line/winning-cell/multiplier sprite sequences and win popup timelines | Final animation pose, timing, line-sequence and multiplier-neighbor comparison |
| Foxy presentation | Native wheel/shield and foreground; authored logo/bird and forest timelines; animations for all eight original symbols and native win tiers | Detailed pose, mesh, layering, clipping and timing validation is underway |
| Foxy Quick Play | Native gold arrows/yellow lightning when enabled; normal face restored on disable; NO, close and Escape cancel without wagering | Final combined-source browser rerun after animation integration; focused cancellation/control checks already pass |
| Full music | Original MH5 and Foxy MP3 bytes, approximately 87.17s and 96s in Chromium; selected-game loading after sound consent | Physical-device listening and final combined-source playback; existing user volume/limiter means no whole-mix waveform identity claim |
| Foreground sound | MH5 seven native clips and Foxy fifteen; verified gains, win tiers, indexed stops, fast stop and Foxy one-shot movement | Final alignment with native animation timelines and high-win presentation; no added MH5 reel/wheel cue where the source defines none |
| Audio lifecycle | Consent, mute, hidden/resume, disposal and context replacement; late Foxy decode uses elapsed native time, never fallback-loop completion | Final integrated browser rerun; 44 focused audio tests and the original-audio browser checks pass |
| Entry and results | Existing authoritative receipts, balance display and history restoration retained | Final receipt/history, STOP, AUTO, HOLD and recovery checks against the frozen r12 source |
| Symbol and feature model | Existing registry math, wallet adapter and server settlement retained | Official Foxy has eight presentation symbols; local model has nine including `scatter` and its free-spin feature. Mathematical and feature equivalence remain unverified |
| Other games | Selected-game gates; existing MH100/Stars audio banks and background assets retained | Final preservation smoke checks and deployment readback |
| Packaging and notices | Native source manifests and runtime copyright/license notices retained | Final asset size/hosting verification; preserve `public/native-animation-LICENSES.txt` in distribution |
| Publication | r11 / Worker305 is the previously recorded baseline | r12 source freeze, final manifest, deployment/version IDs, actual rollback target and live verification are PENDING |

Do not mark a row complete solely because its original asset was retrieved or decoded. Final review must distinguish source-asset equality, correct animation rendering, observed interaction behavior and independent settlement mechanics. Static fallback manifests describe those fallback captures; native timeline validation requires its own evidence.

For regressions, reproduce with synthetic `player-qa-server` sessions, record trusted interactions and authoritative receipts, fix the cause, then rerun the affected checks. Before publication, freeze the final public-source manifest, complete selected-game and preservation checks, verify the deployed assets/settings and record rollback evidence. Current aggregate verification and publication placeholders are in [RELEASE-r12.md](RELEASE-r12.md).
