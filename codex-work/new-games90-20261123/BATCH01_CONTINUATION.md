# ZPLAY NEW90 - work continuation, 23 November 2026

## Scope and order
The live user request covers exactly 90 new, distinct games, not 72. Preserve historical 72 directory prefixes and IDs only when already established. Registry: codex-work/new-games90-20261123/catalogue/registry.json. Do not delete or count prior 74 games as additions. Excluded original exact names MultiHot5, FoxyHot20 and HabeshaFortune5 are preserved unchanged and not counted as newly built games.

Nine batches: 1-10, 11-20, 21-30, 31-40, 41-50, 51-60, 61-70, 71-80, 81-90. The current batch is 1-10. The current game is #1 Multi Hot 5 Burn Wilds. Do NOT start a new app or restart this game from scratch.

| No. | Game | Real status |
| --- | --- | --- |
| 1 | Multi Hot 5 Burn Wilds | IN_PROGRESS: own renderer/controller/paytable/audio hooks and new isolated host transport, payout auditing, server transaction and replay-only recovery; not mounted or verified live |
| 2 | Multi Hot 5 Super Wilds | IN_PROGRESS: existing separate components and historical Player page; live ETB settlement not verified |
| 3 | Multi Hot 10 | IN_PROGRESS: read-only visual preview and reference evidence; not cash enabled |
| 4 | Multi Hot 20 | IN_PROGRESS: individual gameplay source and historical Player page; final live acceptance not verified |
| 5 | Multi Hot 100 | REFERENCE_RECORDED: seven official rounds in registry; no release completion |
| 6 | Multi Hot Ways | NOT_STARTED: reserved identity, provider rules not confirmed |
| 7 | Burning Ice | NOT_STARTED: reserved identity, no completed proof |
| 8 | Burning Ice 10 | NOT_STARTED: reserved identity, no completed proof |
| 9 | Burning Ice 40 | NOT_STARTED: reserved identity, official rules pending |
| 10 | Hot Samba | NOT_STARTED: reserved identity, official rules pending |

The order is exact. No placeholder card, source test, or screenshot is a completed LIVE game.

## Latest verified game-engine implementation

Commit 2b2242cab21571f24397e208526e566ac85c9c4c added a distinct Burn Wilds candidate-math module and twenty-game-round atomic settlement test, with GitHub Actions run 45121217666 passing **67/67 tests, zero failed**; the follow-up cash-gate regression at source 905f67ab1e63de08f1f36a48950462f463e62236 passed **68/68 tests, zero failed**, GitHub Actions run 45121544726. It samples new five-column grids with a cryptographic entropy interface and rejection sampling, handles a winning WILD's own middle-column expansion, uses this game's observed five paylines, and validates every generated payout against its own evaluator. The 20 test rounds exercised unique request tokens, replay-only recovery and a disposable balanced ledger. No seven-round screenshot playback or client-side wallet is used.

IMPORTANT: These are *new ZPLAY candidate* random weights, not the provider's proven RTP/reel distribution. The candidate has approved:false and all verification flags false, and is neither deployed nor cash activated. Artwork rights, a mathematically reviewed own RTP model, actual server callbacks and authenticated Player acceptance remain required.

## Source checkpoint
GitHub branch: work/new90-burn-outcome-20261123 (based on the existing work/new90-live-20261123 code). Game #1 files: codex-work/new-games90-20261123/burn-wilds and server/ subdirectory. Source QA: .github/workflows/new90-burn-outcome-qa.yml.

The latest fixes allow the authenticated Player to load the game while an approved bet ladder is absent, without inventing a bet. The original immutable round token and old model identity can be replayed after the release closes or a model rotates, but never sent as a NEW wager. New spins still require a valid current session, approved model and bet level, adequate balance and server financial release. Cross-account recovery and forged receipts fail closed. Disposable in-memory backend tests prove rollback/idempotency in isolation, not production ETB settlement.

Current observed Cloudflare Player release: version 472 at 100% (473 staged, not active). Original Worker routes, prior modules, 18 bindings and migration schema remain untouched. External Browser Rendering probe showed 404 for the URL; this is not an authenticated live game test. No production cash spin, DB reset, account creation or bonus mutation took place in this continuation.

## Requirements before calling game #1 COMPLETED
1. Verify rights for its current unique symbols, artwork, music and sound. Do not copy provider assets unless authorized.
2. Review own legal outcome generator, distinct probability/reel distribution, RTP and maximum liability. Demo rounds cannot establish these weights.
3. Attach the new financial lifecycle to the ACTUAL existing Railway/Cloudflare authenticated transaction callbacks, account identity and ledger, and test the actual database in a disposable environment.
4. Stage and read back byte-pinned client and server changes without overriding older game routes or the existing wallet; deploy only after the preserved Worker hash/configuration checks pass.
5. Complete the 15-point authenticated Player acceptance, including mobile/desktop controls, graphics, reels, payout, sound, multi/speed/auto, touch, network, logging and exactly-once ETB ledger reconciliation.
6. Document actual live SPIN result and recovery after network loss. Do not label production-ready until verified.

The production count remains LIVE_VERIFIED 0/90. Continue #1 before #2 and the remaining batches. Historical references and old source are preserved, but they are not proof of new financial acceptance.
