# r9 online catalogue audit

Checked **57 current titles**: all 56 names in `config.json` plus the curated Multi Hot 100 route. Compared every name with the current 74-title [SmartSoft catalogue](https://www.smartsoftgaming.com/games), then ran quoted web searches for all 48 local originals and Fruity Wilds. No source changes, deployment, accounts, payments or spins.

Eight titles have exact official casino matches: seven SmartSoft titles, including Multi Hot 100, plus Galaxsys Fruity Wilds. Foxy 20 maps provisionally to Foxy Hot 20. Two local originals have exact official name collisions, one has a third-party collision, one has a near-name match, and 44 have no verified matching official casino title in the checked sources. This is bounded research, not proof that a name is unique.

| Game | Official observation | Existing implementation / next comparison |
|---|---|---|
| [Plinko X](https://www.smartsoftgaming.com/games/plinkox) | Public demo loaded with Low / Medium / High modes and displayed maximum wins of 200× / 1,000× / 10,000×. | Inspected local static renderer has fixed 12 bounces, 13 buckets and no risk selector; config maximum is 49.56×. Compare risk selection, board layout, amount controls and hold/drop interaction. |
| [Double X](https://www.smartsoftgaming.com/games/doublex) | Public demo loaded with timed multiplayer rounds and red 2× / green 15× / black 2× choices. | Inspected local renderer has two 50% outcomes returning 1.92×. Compare countdown, history, three choices and classic/wheel views. |
| [Safari Simba](https://www.smartsoftgaming.com/games/safari-simba-2) | Demo loaded a 3×3 board with side 1× / 3× / 5× multipliers. Product page specifies five paylines and 97.05% RTP. | Local config has five three-column paylines and 98.8876% RTP. Compare wilds, free spins, multiplier presentation and approved math. A screenshot does not validate RTP. |
| [Hot Samba](https://www.smartsoftgaming.com/games/hot-samba) | Demo stayed on its loader. Official page contradicts itself: prose says five reels / 20 paylines; specifications say 3×3 / five paylines and 97.05% RTP. | Local config says 88% RTP and 75× maximum. Resolve the official-page conflict using fully loaded demo help before adopting requirements. |
| [Fruity Wilds](https://galaxsys.co/games/Fruity-Wilds/) | Official indexed text describes five reels, 96% RTP, cascades, increasing multipliers, bonus buy, up to 20 free spins and jackpot tiers up to 500×. | Local config has five paylines, 92.4001% RTP and 2,500× maximum. Official catalogue separately lists standard, five-line and ten-line variants. Resolve the variant; jackpot maximum is not the overall cap. Direct official fetch returned 403; playable demo unverified. |
| [Multi Hot 100](https://www.smartsoftgaming.com/games/multi-hot-100) | Exact official match with public demo. Additional curated route absent from legacy config. | Dedicated 5×4 / 100-line build and interactive observations covered by priority-four audit. |
| Multi Hot 5, Foxy 20, Wild Multi Stars | Exact or provisional mappings and public demo links recorded in JSON. | Dedicated-build comparisons and interactive evidence covered by priority-four audit. |

**Plinko risk modes and Double X's green outcome are backend and game-math differences.** Presentation must not pretend those outcomes or payout rules exist. Implement and test that work separately. These findings do not modify the approved local math.

Identity findings:

- [Pearl Lagoon](https://www.playngo.com/games/pearl-lagoon): official Play’n GO title with an explicit free practice demo. The local 0–5× multiplier game is a different implementation.
- [Diamond Skies](https://www.high5games.com/games/game/diamond-skies): official High 5 Games title, published by IGT, with 178 paylines and a land-based platform listing. The local 0–5× multiplier game is different.
- [Desert Oasis](https://www.askgamblers.com/casino-games/online-slots/reviews/desert-oasis-gameplay-interactive): Gameplay Interactive attribution found through third parties; official vendor source and demo unresolved.
- [Fire Opals](https://www.intergameonline.com/igaming/products/igt-fire-opals): near-name IGT reference; local title is singular Fire Opal.

Name collisions warrant identity review; they do not authorize changing originals or copying vendor mechanics. No title was renamed.

This report does not claim all 57 games were played. Public demos loaded visually for Plinko X, Safari Simba and Double X; Hot Samba remained on its loader. Screenshots are in `r9-online-demo-evidence/`. Public launch URLs are retained; transient session tokens are redacted.

Per-name mapping, queries, URLs and uncertainty: `r9-online-catalog-audit.json`. Query evidence: `r9-online-search-0.json` through `r9-online-search-12.json`. Priority-four observations: `r9-online-reference-audit.json`.
