# Current official source survey for the requested 90

Recorded 23 November 2026, Africa/Addis_Ababa. The exact 90 titles from the current user instruction are preserved in `official-source-manifest.json`. The old 71/Cube Nova order is not substituted for this request.

This work is source discovery and provider identity verification. It does not assert browser gameplay, seven reference rounds, audibly checked sound, implementation, financial integration, deployment or LIVE VERIFIED status. All corresponding fields remain false or zero.

## Files and current observations

- `official-source-manifest.json`: all 90 requested titles, exact order, source status, current primary page observations, public demo links, SHA-256, response size and retrieval timestamps.
- `current-primary-catalogue.json`: 75 products parsed from the current SmartSoft public catalogue, including unrelated/excluded products solely as source inventory. Excluded games are never new build entries.
- `external-primary-sources.json`: six explicitly separate providers or candidate identities, with direct source/rules URLs and the limitations of the observation.
- `survey-current-sources.py`: a bounded, standard-library metadata collector. It opens the current provider catalogue, maps exact normalized titles and reopens only the relevant provider pages with six workers. It does not send a bet or interact with a game. Re-running it refreshes the base SmartSoft survey; retain the separate external-source observations and annotation history when doing so.

The current catalogue yields 37 requested-title mappings to 36 distinct official product pages. Every one of those 36 product pages reopened with HTTP200 and the product heading. This is an identity/metadata observation, not 37 completed games.

## Identity corrections that must reach implementation

| Requested titles | Current primary finding | Required handling |
| --- | --- | --- |
| JetX3 and Aviastar | `/games/aviastar` has the AviaStar heading and a demo link with `GameName=JetX3`. | Preserve both request strings; do not count them as two independently verified official products. |
| JetX and Next Level JetX | `/games/jetx` now displays New Era of JetX; launcher uses `GameCategory=JetXNew&GameName=JetX`. | Keep the classic and new variant work separate until classic identity is established directly. |
| Burning Ice 10/40 and Blazing Hot 10/40 | Burning Ice pages use the internal keys `BlazingHot10` and `BlazingHot40`. | An internal key does not establish a second distinct product. Inspect the requested variants before duplicating their game models. |
| Crash Duel X | Current catalogue says Crash Duel and its demo uses `GameName=TugOfWar`. | Verify the exact in-game variant before assuming the requested CrashDuelX identity. |
| Cappadocia | Current catalogue has Cai Balao Cappadocia. | Keep the older requested title unresolved instead of silently replacing it with this newer product. |
| Samurai | Primary page path is `/games/samurai-deluxe`, but heading is Samurai and the demo uses `GameName=Samurai`. | Use observed heading/launcher identity rather than deriving the variant from its URL slug. |
| Multi Hot 10 | Current official link is a Google URL wrapper containing the public SmartSoft target in its `q` parameter. | Manifest keeps the exact source href and separately records its declared target; no guessed launcher parameters. |
| Dr. Shocker | Current Galaxsys demo catalogue lists it under Turbo Games. | Do not label it SmartSoft or reuse a fruit-slot model. |
| Princess of Birds | Current primary Platipus lobby index lists this title; the static lobby open returned its JavaScript shell. | Provider identity is grounded, but no product-specific launch or round was observed. |
| Caravan of Riches | Fantasma product page and English rules opened; Relax also lists this Fantasma product. | Use its own 3-4-5-4-3/20-line rules, assets and implementation. |
| Fruity Time | Current Amusnet product page, provider game ID407. | Keep its own ways-based model and source. |
| Chilli Flame 7s | Candidate primary Kalamba title is Chili Flame 7s Hold and Win. | Requested spelling/abbreviation is retained; exact in-game title still needs confirmation. |
| Sweet Kingdom | Current Pragmatic Play product and release note opened. | Its cluster/cascade mechanics require its own implementation. |

Generic table-game names such as Blackjack, Keno and Sic Bo are not assigned a provider just because another provider offers those names. The remaining exact-source research is per title; no rules, paytables, RTP or runtime are fabricated from these missing mappings.

## Actionable primary entries

| Game | Primary page | Public launcher identity |
| --- | --- | --- |
| Multi Hot 5 Burn Wilds | `https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds` | `GameName=MultiHot5BurnWilds` |
| Multi Hot 5 Super Wilds | `https://www.smartsoftgaming.com/games/multi-hot-5-super-wilds` | `GameName=MultiHot5SuperWilds` |
| Multi Hot 10 | `https://www.smartsoftgaming.com/games/multi-hot-10-2` | `GameCategory=Slots&GameName=MultiHot10` |
| Multi Hot 20 | `https://www.smartsoftgaming.com/games/multi-hot-20` | `GameCategory=Slots&GameName=MultiHot20` |
| Multi Hot 100 | `https://www.smartsoftgaming.com/games/multi-hot-100` | `GameCategory=Slots&GameName=MultiHot100` |
| SplitX | `https://www.smartsoftgaming.com/games/splitx` | `GameName=SplitX` |
| PopX | `https://www.smartsoftgaming.com/games/popx` | `GameName=PopX` |
| 4 Bonuses Bonanza | `https://www.smartsoftgaming.com/games/4-bonuses-bonanza` | `GameCategory=Games&GameName=PlinkoJoker` |
| Fortune Catch | `https://www.smartsoftgaming.com/games/fortune-catch` | `GameCategory=Games&GameName=FortuneCatch` |

Exact complete public demo hrefs are in the JSON manifest. The Burn Wilds page describes five fixed paylines, a five-reel layout, expanding Wilds on reels2–4, and a multiplier scale. These product descriptions do not supply a complete settlement model or measured visual/audio parity.

The independent English Caravan rules are available at `https://www.fantasmagames.com/wp-content/uploads/2025/02/Caravan-of-Riches_gameRules_en_us.pdf`. They expressly describe aggregation, special-symbol reel restrictions, initial/retrigger/upgrade free spins and incomplete-round recovery. The full paytable and per-outcome probabilities are not inferred from this two-page rules file.

An indexed Galaxsys2025 portfolio PDF returned404 when reopened. Its indexed RTP range was therefore not promoted to a current verified rule. The current Galaxsys demo catalogue itself opened through web retrieval and confirms Dr.Shocker's provider/category. The BetConstruct deactivation-announcement index led to a login screen; no unviewed deactivation list is claimed.

No old game, route, account, wallet, ledger, session, permission or Telebirr integration was modified by this survey.
