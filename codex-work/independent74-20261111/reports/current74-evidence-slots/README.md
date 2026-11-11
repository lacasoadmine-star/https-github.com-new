# Official slot demo receipts, 20-round continuation

The source record is `tests/evidence/official-demo-observations-slots20.json`. Counts there are **fresh verified completed rounds only**. `historicalCompletedRounds` refers to already recorded earlier observations and must not be added a second time when aggregating observation files. The fresh ordinal is a local receipt sequence; the provider spin ID identifies the actual demo result. Separate DEMO launches can have separate 20,000 DMO balances.

`work/official-slots20.cjs` uses the public official DEMO launcher, native canvas controls, and publicly returned result fields. It does not synthesize betting API calls, modify game state, use production sessions, or inspect private random probabilities. Currency must be visibly DMO before play. Bets below the requested 1–20 range are changed through the native dollar button and bet menu before any wager. These are DMO observations, not player ETB transactions.

Each counted result has a distinct spin ID, returned result grid/win/balance, stopped-result screenshot, and restored ready presentation. A positive award additionally requires the native collect control and a confirmed public balance credit. Interrupted positive results are preserved separately and excluded. A received debit, Play click, unfinished animation, or pending collect is not sufficient. Existing titles with at least 20 rounds are skipped; historical counts greater than 20 are not reduced.

Public PIXI text-node arrays can include clipped offscreen menu rows. They are diagnostic render-tree observations, not a claim that every array item was simultaneously visible. Screenshots establish the actual visible state; the selected BET display establishes the chosen wager. Raw `UserWin` and `TotalWin` values are provider credits; the displayed DMO payout and confirmed collect balance are recorded separately.

All screenshots were captured at 1280×800. No mobile-reference or full audio parity claim follows from this batch. Rare bonuses, provider reel strips/probabilities/RTP, complete artwork equivalence, and every game-specific feature remain unverified unless a separate source establishes them.

Run `node work/audit-official-slots20.cjs` to check receipt uniqueness, stake range, positive-award collect evidence, screenshot existence, and SHA-256 manifests. Its report is `receipt-integrity.json`; it verifies this evidence collection and is separate from application tests or provider mathematics.
