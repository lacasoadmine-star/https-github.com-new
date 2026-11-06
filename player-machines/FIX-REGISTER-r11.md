# Two-game remaining fidelity register

| Area | Implemented | Remaining verification |
|---|---|---|
| MH5 multiplier | Clean glyphs, green selected inset, observed cyclic neighbors | Additional varied neighbor order seen in demo |
| Foxy reels/shield | Teal surfaces, layered border, faceted shield, animated win rim | Exact source textures, edge detail and provider-specific lighting |
| Spin controls | Existing trusted SPIN/STOP, Foxy Quick Play confirmation | Exact device-dependent animation timing; official enabled Quick Play SPIN arrows turn gold, while this release retains the existing spin artwork |
| Audio | User-sourced ambience, seven foreground clips, delayed-decode handoff | Full soundtrack equivalence; broader physical-device listening |
| Entry/results | Fresh WIN0.00; history restoration from validated receipts | Provider-specific dialogs beyond measured controls |
| Math | Existing validated server model and ledger retained | Independent provider mathematical equivalence is not established |

For regressions, reproduce using synthetic player-qa-server sessions, capture trusted clicks plus receipts and public-source hashes, fix the smallest cause, rerun affected tests, then deploy the single machine asset module with readback and rollback evidence. Do not use production money for QA.
