# Scope reconciliation notice — 22 November 2026

The 72-entry matrix below is the retained candidate inventory for the explicit 57-name request plus 15 current official products. The later leading scope instruction in [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md) still targets 72 but also asks for three replacements within a 74-card order; that membership conflict remains open. This preserved matrix must not be mistaken for approval of an unresolved replacement list. All shared identities and independent tasks continue, with public activation closed and zero new games release-ready.

Current comparison: [official 75, rendered 74 and retained 71](codex-work/new-games72-20261121/references/scope-reconciliation-20261122/SCOPE_RECONCILIATION.md). Current product-rule ambiguity and owned next actions: [partial official-rule refresh](codex-work/new-games72-20261121/references/product-rules-refresh-20261122.json). No history screenshot, new round count or completed-game claim is introduced by this notice.

---

# ZPLAY / Superwin — 72 additional games matrix

This is the active additive scope requested on 21 November 2026 (Africa/Addis_Ababa). It preserves the prior game catalog and unfinished prior work. It does not count an old game or a reserved path as a new playable implementation.

Registry: [new-games72-20261121-r1](codex-work/new-games72-20261121/registry.json). Registry SHA-256: `1dc1ec6f406e80622f3b02b63eadce808b79ceda443e3029474657a780b8ef17`.

## Current totals

| Measure | Verified count / state |
|---|---|
| New identities in this scope | 72 |
| Names supplied by user / additional fresh official names | 57 / 15 |
| Retained legacy source-catalog entries | 74 — source inventory, not 74 verified live games |
| Games with seven separate manual reference rounds | 2 |
| Counted manual reference rounds | 14; AUTO/STOP extra rounds tracked separately in the game records |
| New games RELEASE_READY or later | 0 |
| New games LIVE_VERIFIED or COMPLETED | 0 |
| Public activation | false |

Current work states: `REFERENCE_BLOCKED` = 2; `REFERENCE_PARTIAL` = 2; `REFERENCE_PENDING` = 68.

## Identity rules and preservation

The fresh official catalog supplied 75 distinct product/launcher identities. Multi Hot 5, Foxy Hot 20 and Habesha Fortune 5 are protected and excluded from the new set. The first 57 entries follow the user's supplied names; entries 58–72 complete the requested set using current official catalog products. A same-name old module keeps its old internal identity and route. The new implementation must still be authored and tested independently from current per-game evidence.

AviaStar / JetX3, Crash Duel / TugOfWar, Double X / SlicerX and 4 Bonuses Bonanza / PlinkoJoker are single product/launcher mappings, not additional games. The JetX launcher of New Era of JetX is counted once. The source register records variant and marketing-copy conflicts; those conflicts are not silently converted into payout rules.

Preservation baseline: [1d0f4c9ddc9d14aacc436021ed0bcb2b27dd85f0](codex-work/new-games72-20261121/preservation/baseline.json). All existing game source/assets/routes and prior progress history are retained. Existing database, wallet, ledger, accounts, sessions, permissions, Agent/Admin and Telebirr have not been migrated or reset by this preparation.

## State semantics

Prerequisites use `REFERENCE_PENDING`, `REFERENCE_PARTIAL` or `REFERENCE_BLOCKED`. A product page or title-screen entry alone is not `REFERENCE_CAPTURED`. The required advancement is:

`REFERENCE_CAPTURED → RULES_VERIFIED → IMPLEMENTING → TESTING → FIXED_PENDING_RETEST → RELEASE_READY → LIVE_VERIFIED → COMPLETED`

`FIXED_PENDING_RETEST` applies while an actual fix awaits its failed-action retest; it is not required when no defect occurred. A game can have verified code for a small subset while its overall reference state remains partial. Missing observations of a rare feature do not prove that feature absent. Confirmed rules drive controlled fixtures; unverified financial rules remain blocked.

## Work ownership and concurrency

Every game below has eight persistent task owners: reference, rules, assets, frontend, backend, controls, sound/animation and QA. These task names survive agent/session changes. Cohorts of ten are reporting groups, not sequential gates. Independent tasks may run concurrently within the four-worker limit. A blocked game does not cancel any other game's task.

| Coordination area | Responsible task | Boundary |
|---|---|---|
| Registry, matrix, integration and publication | `release-coordinator` | Owns shared registry and root progress; rechecks current remote head before publication |
| Authentication, ETB and network recovery | `shared-recovery` | Existing API/ledger only; no new wallet or hidden guessed refund |
| Per-game source and evidence | Per-game tasks listed below | Write only assigned game paths; evidence is never runtime gameplay |
| Cross-review and release gate | `architecture-audit` | Retest defects; all 72 required before activation |

## Exact identity mapping

Routes below are reserved new routes. They are not served live merely because they appear in this table. Backend configurations are disabled for every game at this checkpoint.

| # | Exact official name | Reference provider / launcher variant | New stable gameId | Frontend route | Current official source |
|---:|---|---|---|---|---|
| 1 | Multi Hot 5 Deluxe | SmartSoft Gaming / `MultiHot5Deluxe` | `zplay72_multi_hot_5_deluxe_v1` | `/new-games72/multi-hot-5-deluxe/` | [Official page](https://www.smartsoftgaming.com/games/multi-hot-5-deluxe) |
| 2 | Multi Hot 5 Wild | SmartSoft Gaming / `MultiHot5Wild` | `zplay72_multi_hot_5_wild_v1` | `/new-games72/multi-hot-5-wild/` | [Official page](https://www.smartsoftgaming.com/games/multi-hot-5-wild) |
| 3 | Multi Hot 10 | SmartSoft Gaming / `MultiHot10` | `zplay72_multi_hot_10_v1` | `/new-games72/multi-hot-10/` | [Official page](https://www.smartsoftgaming.com/games/multi-hot-10-2) |
| 4 | Multi Hot 20 | SmartSoft Gaming / `MultiHot20` | `zplay72_multi_hot_20_v1` | `/new-games72/multi-hot-20/` | [Official page](https://www.smartsoftgaming.com/games/multi-hot-20) |
| 5 | Multi Hot 40 | SmartSoft Gaming / `MultiHot40` | `zplay72_multi_hot_40_v1` | `/new-games72/multi-hot-40/` | [Official page](https://www.smartsoftgaming.com/games/multi-hot-40) |
| 6 | Multi Hot 100 | SmartSoft Gaming / `MultiHot100` | `zplay72_multi_hot_100_v1` | `/new-games72/multi-hot-100/` | [Official page](https://www.smartsoftgaming.com/games/multi-hot-100) |
| 7 | Multi Hot 5 Burn Wilds | SmartSoft Gaming / `MultiHot5BurnWilds` | `zplay72_multi_hot_5_burn_wilds_v1` | `/new-games72/multi-hot-5-burn-wilds/` | [Official page](https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds) |
| 8 | Multi Hot 5 Super Wilds | SmartSoft Gaming / `MultiHot5SuperWilds` | `zplay72_multi_hot_5_super_wilds_v1` | `/new-games72/multi-hot-5-super-wilds/` | [Official page](https://www.smartsoftgaming.com/games/multi-hot-5-super-wilds) |
| 9 | Multi Hot Ways | SmartSoft Gaming / `MultiHotWays` | `zplay72_multi_hot_ways_v1` | `/new-games72/multi-hot-ways/` | [Official page](https://www.smartsoftgaming.com/games/multi-hot-ways) |
| 10 | Multi Hot Wild Ways | SmartSoft Gaming / `MultiHotWildWays` | `zplay72_multi_hot_wild_ways_v1` | `/new-games72/multi-hot-wild-ways/` | [Official page](https://www.smartsoftgaming.com/games/multi-hot-wild-ways) |
| 11 | Burning Ice | SmartSoft Gaming / `BlazingHot` | `zplay72_burning_ice_v1` | `/new-games72/burning-ice/` | [Official page](https://www.smartsoftgaming.com/games/burning-ice-41) |
| 12 | Burning Ice 10 | SmartSoft Gaming / `BlazingHot10` | `zplay72_burning_ice_10_v1` | `/new-games72/burning-ice-10/` | [Official page](https://www.smartsoftgaming.com/games/blazing-hot-10) |
| 13 | Burning Ice 40 | SmartSoft Gaming / `BlazingHot40` | `zplay72_burning_ice_40_v1` | `/new-games72/burning-ice-40/` | [Official page](https://www.smartsoftgaming.com/games/burning-ice-40) |
| 14 | Wild Multi Stars | SmartSoft Gaming / `WildMultiStars` | `zplay72_wild_multi_stars_v1` | `/new-games72/wild-multi-stars/` | [Official page](https://www.smartsoftgaming.com/games/wild-multi-stars) |
| 15 | Multi Fruits Charging Wilds | SmartSoft Gaming / `MultiFruitsChargingWilds` | `zplay72_multi_fruits_charging_wilds_v1` | `/new-games72/multi-fruits-charging-wilds/` | [Official page](https://www.smartsoftgaming.com/games/multi-fruits-charging-wilds) |
| 16 | Gems Crown Charging Wilds | SmartSoft Gaming / `GemsCrownChargingWilds` | `zplay72_gems_crown_charging_wilds_v1` | `/new-games72/gems-crown-charging-wilds/` | [Official page](https://www.smartsoftgaming.com/games/gems-crown-charging-wilds) |
| 17 | Safari Simba | SmartSoft Gaming / `SafariSimba` | `zplay72_safari_simba_v1` | `/new-games72/safari-simba/` | [Official page](https://www.smartsoftgaming.com/games/safari-simba-2) |
| 18 | Bao Slot 5X | SmartSoft Gaming / `BaoSlot5X` | `zplay72_bao_slot_5x_v1` | `/new-games72/bao-slot-5x/` | [Official page](https://www.smartsoftgaming.com/games/bao-slot-5) |
| 19 | Boka Jamba 10 | SmartSoft Gaming / `BokaJamba10` | `zplay72_boka_jamba_10_v1` | `/new-games72/boka-jamba-10/` | [Official page](https://www.smartsoftgaming.com/games/boca-jamba-10) |
| 20 | Hot Samba | SmartSoft Gaming / `HotSamba` | `zplay72_hot_samba_v1` | `/new-games72/hot-samba/` | [Official page](https://www.smartsoftgaming.com/games/hot-samba) |
| 21 | Mariachi Coins | SmartSoft Gaming / `MariachiCoins` | `zplay72_mariachi_coins_v1` | `/new-games72/mariachi-coins/` | [Official page](https://www.smartsoftgaming.com/games/mariachi-coins) |
| 22 | Power of Tiger | SmartSoft Gaming / `PowerOfTiger` | `zplay72_power_of_tiger_v1` | `/new-games72/power-of-tiger/` | [Official page](https://www.smartsoftgaming.com/games/power-of-tiger) |
| 23 | Gates of Merlyn | SmartSoft Gaming / `GatesOfMerlyn` | `zplay72_gates_of_merlyn_v1` | `/new-games72/gates-of-merlyn/` | [Official page](https://www.smartsoftgaming.com/games/gates-of-merlyn) |
| 24 | Dice Jungle | SmartSoft Gaming / `DiceJungle` | `zplay72_dice_jungle_v1` | `/new-games72/dice-jungle/` | [Official page](https://www.smartsoftgaming.com/games/dice-jungle) |
| 25 | Coins Of Atlantis | SmartSoft Gaming / `CoinsOfAtlantis` | `zplay72_coins_of_atlantis_v1` | `/new-games72/coins-of-atlantis/` | [Official page](https://www.smartsoftgaming.com/games/coins-of-atlantis) |
| 26 | Jingle Bell Bonanza | SmartSoft Gaming / `JingleBellBonanza` | `zplay72_jingle_bell_bonanza_v1` | `/new-games72/jingle-bell-bonanza/` | [Official page](https://www.smartsoftgaming.com/games/jingle-bell-bonanza) |
| 27 | Book of Bonanza | SmartSoft Gaming / `BookOfBonanza` | `zplay72_book_of_bonanza_v1` | `/new-games72/book-of-bonanza/` | [Official page](https://www.smartsoftgaming.com/games/book-of-bonanza) |
| 28 | Book of Futuria | SmartSoft Gaming / `BookOfFuturia` | `zplay72_book_of_futuria_v1` | `/new-games72/book-of-futuria/` | [Official page](https://www.smartsoftgaming.com/games/book-of-futuria) |
| 29 | Genie's Bonanza | SmartSoft Gaming / `GeniesBonanza` | `zplay72_genie_s_bonanza_v1` | `/new-games72/genie-s-bonanza/` | [Official page](https://www.smartsoftgaming.com/games/genies-bonanza) |
| 30 | Farm's Fortune | SmartSoft Gaming / `FarmsFortune` | `zplay72_farm_s_fortune_v1` | `/new-games72/farm-s-fortune/` | [Official page](https://www.smartsoftgaming.com/games/farms-fortune-6n0s6) |
| 31 | Mad Slot | SmartSoft Gaming / `MadSlot` | `zplay72_mad_slot_v1` | `/new-games72/mad-slot/` | [Official page](https://www.smartsoftgaming.com/games/mad-slot) |
| 32 | Wilds and Gods | SmartSoft Gaming / `WildsAndGods` | `zplay72_wilds_and_gods_v1` | `/new-games72/wilds-and-gods/` | [Official page](https://www.smartsoftgaming.com/games/wilds-and-gods) |
| 33 | Jungle Sisters | SmartSoft Gaming / `JungleSisters` | `zplay72_jungle_sisters_v1` | `/new-games72/jungle-sisters/` | [Official page](https://www.smartsoftgaming.com/games/jungle-sisters) |
| 34 | Jungle Sisters Deluxe | SmartSoft Gaming / `JungleSistersDeluxe` | `zplay72_jungle_sisters_deluxe_v1` | `/new-games72/jungle-sisters-deluxe/` | [Official page](https://www.smartsoftgaming.com/games/jungle-sisters-deluxe) |
| 35 | Dragon's Code | SmartSoft Gaming / `DragonsCode` | `zplay72_dragon_s_code_v1` | `/new-games72/dragon-s-code/` | [Official page](https://www.smartsoftgaming.com/games/dragons-code) |
| 36 | Dracula's Fortune | SmartSoft Gaming / `DraculasFortune` | `zplay72_dracula_s_fortune_v1` | `/new-games72/dracula-s-fortune/` | [Official page](https://www.smartsoftgaming.com/games/draculas-fortune-2) |
| 37 | Sugar Fiesta | SmartSoft Gaming / `SugarFiesta` | `zplay72_sugar_fiesta_v1` | `/new-games72/sugar-fiesta/` | [Official page](https://www.smartsoftgaming.com/games/sugar-fiesta) |
| 38 | Vampires | SmartSoft Gaming / `Vampires` | `zplay72_vampires_v1` | `/new-games72/vampires/` | [Official page](https://www.smartsoftgaming.com/games/vampires) |
| 39 | Samurai | SmartSoft Gaming / `Samurai` | `zplay72_samurai_v1` | `/new-games72/samurai/` | [Official page](https://www.smartsoftgaming.com/games/samurai-deluxe) |
| 40 | Multi Hot Wheel | SmartSoft Gaming / `MultiHotWheel` | `zplay72_multi_hot_wheel_v1` | `/new-games72/multi-hot-wheel/` | [Official page](https://www.smartsoftgaming.com/games/multi-hot-wheel) |
| 41 | Plinko X Classic | SmartSoft Gaming / `PlinkoXClassic` | `zplay72_plinko_x_classic_v1` | `/new-games72/plinko-x-classic/` | [Official page](https://www.smartsoftgaming.com/games/plinko-x-classic) |
| 42 | Plinko X | SmartSoft Gaming / `PlinkoX` | `zplay72_plinko_x_v1` | `/new-games72/plinko-x/` | [Official page](https://www.smartsoftgaming.com/games/plinkox) |
| 43 | Mine Island | SmartSoft Gaming / `MineIsland` | `zplay72_mine_island_v1` | `/new-games72/mine-island/` | [Official page](https://www.smartsoftgaming.com/games/mine-island) |
| 44 | Mine Island2 | SmartSoft Gaming / `MineIsland2` | `zplay72_mine_island2_v1` | `/new-games72/mine-island2/` | [Official page](https://www.smartsoftgaming.com/games/mine-island2) |
| 45 | Chicken Ways | SmartSoft Gaming / `Chickenways` | `zplay72_chicken_ways_v1` | `/new-games72/chicken-ways/` | [Official page](https://www.smartsoftgaming.com/games/chicken-ways) |
| 46 | Chicken Highway | SmartSoft Gaming / `ChickenHighway` | `zplay72_chicken_highway_v1` | `/new-games72/chicken-highway/` | [Official page](https://www.smartsoftgaming.com/games/chicken-highway) |
| 47 | Cheesy Road Classic | SmartSoft Gaming / `CheesyRoadClassic` | `zplay72_cheesy_road_classic_v1` | `/new-games72/cheesy-road-classic/` | [Official page](https://www.smartsoftgaming.com/games/cheesy-road-classic) |
| 48 | Cheesy Road | SmartSoft Gaming / `CheesyRoad` | `zplay72_cheesy_road_v1` | `/new-games72/cheesy-road/` | [Official page](https://www.smartsoftgaming.com/games/cheesy-road) |
| 49 | Wheel Of Destiny | SmartSoft Gaming / `WheelofDestiny` | `zplay72_wheel_of_destiny_v1` | `/new-games72/wheel-of-destiny/` | [Official page](https://www.smartsoftgaming.com/games/wheel-of-destiny) |
| 50 | Bonus Time | SmartSoft Gaming / `BonusTime` | `zplay72_bonus_time_v1` | `/new-games72/bonus-time/` | [Official page](https://www.smartsoftgaming.com/games/bonus-time) |
| 51 | 4 Bonuses Bonanza | SmartSoft Gaming / `PlinkoJoker` | `zplay72_4_bonuses_bonanza_v1` | `/new-games72/4-bonuses-bonanza/` | [Official page](https://www.smartsoftgaming.com/games/4-bonuses-bonanza) |
| 52 | Fortune Catch | SmartSoft Gaming / `FortuneCatch` | `zplay72_fortune_catch_v1` | `/new-games72/fortune-catch/` | [Official page](https://www.smartsoftgaming.com/games/fortune-catch) |
| 53 | Bottle Mania | SmartSoft Gaming / `BottleMania` | `zplay72_bottle_mania_v1` | `/new-games72/bottle-mania/` | [Official page](https://www.smartsoftgaming.com/games/bottle-mania) |
| 54 | Cai Balao Cappadocia | SmartSoft Gaming / `CaiBalaoCappadocia` | `zplay72_cai_balao_cappadocia_v1` | `/new-games72/cai-balao-cappadocia/` | [Official page](https://www.smartsoftgaming.com/games/cai-balao-cappadocia) |
| 55 | Tower X | SmartSoft Gaming / `TowerX` | `zplay72_tower_x_v1` | `/new-games72/tower-x/` | [Official page](https://www.smartsoftgaming.com/games/tower-x) |
| 56 | Roll X | SmartSoft Gaming / `RollX` | `zplay72_roll_x_v1` | `/new-games72/roll-x/` | [Official page](https://www.smartsoftgaming.com/games/rollx) |
| 57 | Balloon | SmartSoft Gaming / `Balloon` | `zplay72_balloon_v1` | `/new-games72/balloon/` | [Official page](https://www.smartsoftgaming.com/games/balloon) |
| 58 | SplitX | SmartSoft Gaming / `SplitX` | `zplay72_splitx_v1` | `/new-games72/splitx/` | [Official page](https://www.smartsoftgaming.com/games/splitx) |
| 59 | PopX | SmartSoft Gaming / `PopX` | `zplay72_popx_v1` | `/new-games72/popx/` | [Official page](https://www.smartsoftgaming.com/games/popx) |
| 60 | New Era of JetX | SmartSoft Gaming / `JetX` | `zplay72_new_era_of_jetx_v1` | `/new-games72/new-era-of-jetx/` | [Official page](https://www.smartsoftgaming.com/games/jetx) |
| 61 | BalloonX | SmartSoft Gaming / `BalloonX` | `zplay72_balloonx_v1` | `/new-games72/balloonx/` | [Official page](https://www.smartsoftgaming.com/games/balloonx) |
| 62 | Propel X | SmartSoft Gaming / `PropelX` | `zplay72_propel_x_v1` | `/new-games72/propel-x/` | [Official page](https://www.smartsoftgaming.com/games/propel-x) |
| 63 | World Champion X | SmartSoft Gaming / `WorldChampionX` | `zplay72_world_champion_x_v1` | `/new-games72/world-champion-x/` | [Official page](https://www.smartsoftgaming.com/games/world-champion-x) |
| 64 | CarX | SmartSoft Gaming / `CarX` | `zplay72_carx_v1` | `/new-games72/carx/` | [Official page](https://www.smartsoftgaming.com/games/carx) |
| 65 | Helicopter X | SmartSoft Gaming / `HelicopterX` | `zplay72_helicopter_x_v1` | `/new-games72/helicopter-x/` | [Official page](https://www.smartsoftgaming.com/games/helicopter-x) |
| 66 | Football X | SmartSoft Gaming / `FootballX` | `zplay72_football_x_v1` | `/new-games72/football-x/` | [Official page](https://www.smartsoftgaming.com/games/fotballx) |
| 67 | Cricket X | SmartSoft Gaming / `CricketX` | `zplay72_cricket_x_v1` | `/new-games72/cricket-x/` | [Official page](https://www.smartsoftgaming.com/games/cricket-x) |
| 68 | CricketerX | SmartSoft Gaming / `CricketerX` | `zplay72_cricketerx_v1` | `/new-games72/cricketerx/` | [Official page](https://www.smartsoftgaming.com/games/cricketerx) |
| 69 | Crash Duel | SmartSoft Gaming / `TugOfWar` | `zplay72_crash_duel_v1` | `/new-games72/crash-duel/` | [Official page](https://www.smartsoftgaming.com/games/crash-duel) |
| 70 | AviaStar | SmartSoft Gaming / `JetX3` | `zplay72_aviastar_v1` | `/new-games72/aviastar/` | [Official page](https://www.smartsoftgaming.com/games/aviastar) |
| 71 | Smash X | SmartSoft Gaming / `SmashX` | `zplay72_smash_x_v1` | `/new-games72/smash-x/` | [Official page](https://www.smartsoftgaming.com/games/smash-x) |
| 72 | Double X | SmartSoft Gaming / `SlicerX` | `zplay72_double_x_v1` | `/new-games72/double-x/` | [Official page](https://www.smartsoftgaming.com/games/doublex) |

## Per-game files, evidence, status and next action

An absent path is explicitly marked RESERVED. A directory containing only evidence is not a gameplay module. Version hashes are in each real evidence/test report; release versions remain unset until verified.

### 01. Multi Hot 5 Deluxe

**Identity:** `zplay72_multi_hot_5_deluxe_v1`; SmartSoft Gaming; launcher `MultiHot5Deluxe`; cohort 01-10.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-hot-5-deluxe/`; NOT_DEPLOYED |
| Module | [codex-work/new-games72-20261121/games/multi-hot-5-deluxe](codex-work/new-games72-20261121/games/multi-hot-5-deluxe); ARITHMETIC_COMPONENT_PRESENT_FULL_ENGINE_NOT_IMPLEMENTED |
| Backend configuration | [codex-work/new-games72-20261121/games/multi-hot-5-deluxe/specification.json](codex-work/new-games72-20261121/games/multi-hot-5-deluxe/specification.json); enabled=false |
| Payout evaluator | [codex-work/new-games72-20261121/games/multi-hot-5-deluxe/evaluator.mjs](codex-work/new-games72-20261121/games/multi-hot-5-deluxe/evaluator.mjs) |
| Assets | [codex-work/new-games72-20261121/games/multi-hot-5-deluxe/assets-manifest.json](codex-work/new-games72-20261121/games/multi-hot-5-deluxe/assets-manifest.json); runtime prefix `/new-games72/multi-hot-5-deluxe/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-hot-5-deluxe); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot5Deluxe&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | [codex-work/new-games72-20261121/games/multi-hot-5-deluxe/evidence-index.json](codex-work/new-games72-20261121/games/multi-hot-5-deluxe/evidence-index.json); manual rounds=7; video=true; audible sound verified=false |
| Rules | [codex-work/new-games72-20261121/games/multi-hot-5-deluxe/specification.json](codex-work/new-games72-20261121/games/multi-hot-5-deluxe/specification.json); release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PARTIAL` / `SEVEN_MANUAL_ROUNDS_AND_CANVAS_VIDEO_CONTROLS_PARTIAL` |
| Build / tests / deployment | `IMPLEMENTING_VERIFIED_ARITHMETIC` / `23_ARITHMETIC_TESTS_PASSED_ENGINE_AND_LIVE_UNVERIFIED` / `NOT_DEPLOYED` |
| Open issues | `REF-SOURCE-003` |

**Task owners:** reference = `reference-01-10`; rules = `rules-01-10`; assets = `assets-01-10`; frontend = `frontend-01-10`; backend = `backend-01-10`; controls = `controls-01-10`; soundAnimation = `soundAnimation-01-10`; qa = `qa-01-10`.

**Next action:** Complete outcome-legality, maximum-win and independent probability specifications before settlement; continue renderer and remaining control work from retained current-task evidence. Preserve the canonical seven rounds and keep supplemental desktop results uncounted.

### 02. Multi Hot 5 Wild

**Identity:** `zplay72_multi_hot_5_wild_v1`; SmartSoft Gaming; launcher `MultiHot5Wild`; cohort 01-10.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-hot-5-wild/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/multi-hot-5-wild` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/multi-hot-5-wild/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/multi-hot-5-wild/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/multi-hot-5-wild/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/multi-hot-5-wild/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-hot-5-wild); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MultiHot5Wild&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/multi-hot-5-wild/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/multi-hot-5-wild/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_BLOCKED` / `PROVIDER_COUNTRY_RESTRICTION_AFTER_ENTRY_PROMPT_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |
| Later access observation | [codex-work/new-games72-20261121/references/access-survey/multi-hot-5-wild-followup-blocker.json](codex-work/new-games72-20261121/references/access-survey/multi-hot-5-wild-followup-blocker.json); `PROVIDER_COUNTRY_RESTRICTION`; `2026-11-21T20:25:32.514Z`; earlier entry observation retained |

**Task owners:** reference = `reference-01-10`; rules = `rules-01-10`; assets = `assets-01-10`; frontend = `frontend-01-10`; backend = `backend-01-10`; controls = `controls-01-10`; soundAnimation = `soundAnimation-01-10`; qa = `qa-01-10`.

**Next action:** Resume same-variant gameplay reference work through provider-authorized access; preserve the earlier entry-only sound prompt and later restriction as separate observations. Verify available official rules while access remains blocked. No completed gameplay rounds have been observed.

### 03. Multi Hot 10

**Identity:** `zplay72_multi_hot_10_v1`; SmartSoft Gaming; launcher `MultiHot10`; cohort 01-10.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-hot-10/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/multi-hot-10` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/multi-hot-10/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/multi-hot-10/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/multi-hot-10/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/multi-hot-10/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-hot-10-2); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot10&Token=DEMO&PortalName=demo) |
| Captured evidence | `codex-work/new-games72-20261121/games/multi-hot-10/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/multi-hot-10/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `ENTRY_SOUND_PROMPT_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-01-10`; rules = `rules-01-10`; assets = `assets-01-10`; frontend = `frontend-01-10`; backend = `backend-01-10`; controls = `controls-01-10`; soundAnimation = `soundAnimation-01-10`; qa = `qa-01-10`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 04. Multi Hot 20

**Identity:** `zplay72_multi_hot_20_v1`; SmartSoft Gaming; launcher `MultiHot20`; cohort 01-10.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-hot-20/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/multi-hot-20` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/multi-hot-20/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/multi-hot-20/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/multi-hot-20/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/multi-hot-20/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-hot-20); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot20&Token=DEMO&PortalName=demo) |
| Captured evidence | `codex-work/new-games72-20261121/games/multi-hot-20/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/multi-hot-20/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `ENTRY_SOUND_PROMPT_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | `REF-SOURCE-004` |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-01-10`; rules = `rules-01-10`; assets = `assets-01-10`; frontend = `frontend-01-10`; backend = `backend-01-10`; controls = `controls-01-10`; soundAnimation = `soundAnimation-01-10`; qa = `qa-01-10`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 05. Multi Hot 40

**Identity:** `zplay72_multi_hot_40_v1`; SmartSoft Gaming; launcher `MultiHot40`; cohort 01-10.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-hot-40/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/multi-hot-40` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/multi-hot-40/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/multi-hot-40/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/multi-hot-40/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/multi-hot-40/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-hot-40); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot40&Token=DEMO&PortalName=demo) |
| Captured evidence | `codex-work/new-games72-20261121/games/multi-hot-40/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/multi-hot-40/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `ENTRY_SOUND_PROMPT_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-01-10`; rules = `rules-01-10`; assets = `assets-01-10`; frontend = `frontend-01-10`; backend = `backend-01-10`; controls = `controls-01-10`; soundAnimation = `soundAnimation-01-10`; qa = `qa-01-10`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 06. Multi Hot 100

**Identity:** `zplay72_multi_hot_100_v1`; SmartSoft Gaming; launcher `MultiHot100`; cohort 01-10.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-hot-100/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/multi-hot-100` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/multi-hot-100/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/multi-hot-100/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/multi-hot-100/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/multi-hot-100/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-hot-100); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot100&Token=DEMO&PortalName=demo) |
| Captured evidence | `codex-work/new-games72-20261121/games/multi-hot-100/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/multi-hot-100/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `ENTRY_SOUND_PROMPT_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-01-10`; rules = `rules-01-10`; assets = `assets-01-10`; frontend = `frontend-01-10`; backend = `backend-01-10`; controls = `controls-01-10`; soundAnimation = `soundAnimation-01-10`; qa = `qa-01-10`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 07. Multi Hot 5 Burn Wilds

**Identity:** `zplay72_multi_hot_5_burn_wilds_v1`; SmartSoft Gaming; launcher `MultiHot5BurnWilds`; cohort 01-10.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-hot-5-burn-wilds/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/multi-hot-5-burn-wilds` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/multi-hot-5-burn-wilds/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/multi-hot-5-burn-wilds/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/multi-hot-5-burn-wilds/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/multi-hot-5-burn-wilds/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MultiHot5BurnWilds&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/multi-hot-5-burn-wilds/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/multi-hot-5-burn-wilds/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `ENTRY_SOUND_PROMPT_LOADING_BACKGROUND_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-01-10`; rules = `rules-01-10`; assets = `assets-01-10`; frontend = `frontend-01-10`; backend = `backend-01-10`; controls = `controls-01-10`; soundAnimation = `soundAnimation-01-10`; qa = `qa-01-10`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 08. Multi Hot 5 Super Wilds

**Identity:** `zplay72_multi_hot_5_super_wilds_v1`; SmartSoft Gaming; launcher `MultiHot5SuperWilds`; cohort 01-10.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-hot-5-super-wilds/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/multi-hot-5-super-wilds` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/multi-hot-5-super-wilds/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/multi-hot-5-super-wilds/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/multi-hot-5-super-wilds/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/multi-hot-5-super-wilds/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-hot-5-super-wilds); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MultiHot5SuperWilds&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/multi-hot-5-super-wilds/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/multi-hot-5-super-wilds/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `ENTRY_SOUND_PROMPT_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-01-10`; rules = `rules-01-10`; assets = `assets-01-10`; frontend = `frontend-01-10`; backend = `backend-01-10`; controls = `controls-01-10`; soundAnimation = `soundAnimation-01-10`; qa = `qa-01-10`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 09. Multi Hot Ways

**Identity:** `zplay72_multi_hot_ways_v1`; SmartSoft Gaming; launcher `MultiHotWays`; cohort 01-10.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-hot-ways/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/multi-hot-ways` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/multi-hot-ways/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/multi-hot-ways/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/multi-hot-ways/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/multi-hot-ways/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-hot-ways); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHotWays&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/multi-hot-ways/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/multi-hot-ways/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `ENTRY_SOUND_PROMPT_LOADING_BACKGROUND_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | `REF-SOURCE-001` |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-01-10`; rules = `rules-01-10`; assets = `assets-01-10`; frontend = `frontend-01-10`; backend = `backend-01-10`; controls = `controls-01-10`; soundAnimation = `soundAnimation-01-10`; qa = `qa-01-10`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 10. Multi Hot Wild Ways

**Identity:** `zplay72_multi_hot_wild_ways_v1`; SmartSoft Gaming; launcher `MultiHotWildWays`; cohort 01-10.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-hot-wild-ways/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/multi-hot-wild-ways` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/multi-hot-wild-ways/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/multi-hot-wild-ways/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/multi-hot-wild-ways/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/multi-hot-wild-ways/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-hot-wild-ways); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MultiHotWildWays&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/multi-hot-wild-ways/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/multi-hot-wild-ways/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `ENTRY_SOUND_PROMPT_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | `REF-SOURCE-008` |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-01-10`; rules = `rules-01-10`; assets = `assets-01-10`; frontend = `frontend-01-10`; backend = `backend-01-10`; controls = `controls-01-10`; soundAnimation = `soundAnimation-01-10`; qa = `qa-01-10`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 11. Burning Ice

**Identity:** `zplay72_burning_ice_v1`; SmartSoft Gaming; launcher `BlazingHot`; cohort 11-20.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/burning-ice/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/burning-ice` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/burning-ice/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/burning-ice/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/burning-ice/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/burning-ice/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/burning-ice-41); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BlazingHot&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/burning-ice/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/burning-ice/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `INTRO_LOADING_ONLY_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-11-20`; rules = `rules-11-20`; assets = `assets-11-20`; frontend = `frontend-11-20`; backend = `backend-11-20`; controls = `controls-11-20`; soundAnimation = `soundAnimation-11-20`; qa = `qa-11-20`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 12. Burning Ice 10

**Identity:** `zplay72_burning_ice_10_v1`; SmartSoft Gaming; launcher `BlazingHot10`; cohort 11-20.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/burning-ice-10/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/burning-ice-10` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/burning-ice-10/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/burning-ice-10/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/burning-ice-10/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/burning-ice-10/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/blazing-hot-10); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BlazingHot10&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/burning-ice-10/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/burning-ice-10/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `ENTRY_SOUND_PROMPT_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-11-20`; rules = `rules-11-20`; assets = `assets-11-20`; frontend = `frontend-11-20`; backend = `backend-11-20`; controls = `controls-11-20`; soundAnimation = `soundAnimation-11-20`; qa = `qa-11-20`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 13. Burning Ice 40

**Identity:** `zplay72_burning_ice_40_v1`; SmartSoft Gaming; launcher `BlazingHot40`; cohort 11-20.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/burning-ice-40/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/burning-ice-40` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/burning-ice-40/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/burning-ice-40/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/burning-ice-40/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/burning-ice-40/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/burning-ice-40); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BlazingHot40&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/burning-ice-40/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/burning-ice-40/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `ENTRY_SOUND_PROMPT_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-11-20`; rules = `rules-11-20`; assets = `assets-11-20`; frontend = `frontend-11-20`; backend = `backend-11-20`; controls = `controls-11-20`; soundAnimation = `soundAnimation-11-20`; qa = `qa-11-20`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 14. Wild Multi Stars

**Identity:** `zplay72_wild_multi_stars_v1`; SmartSoft Gaming; launcher `WildMultiStars`; cohort 11-20.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/wild-multi-stars/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/wild-multi-stars` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/wild-multi-stars/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/wild-multi-stars/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/wild-multi-stars/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/wild-multi-stars/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/wild-multi-stars); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=WildMultiStars&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/wild-multi-stars/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/wild-multi-stars/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `ENTRY_SOUND_PROMPT_LOADING_BACKGROUND_ZERO_ROUNDS` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |
| Entry/access survey | [codex-work/new-games72-20261121/references/access-survey/survey-results.json](codex-work/new-games72-20261121/references/access-survey/survey-results.json); entry-only evidence does not count a round |

**Task owners:** reference = `reference-11-20`; rules = `rules-11-20`; assets = `assets-11-20`; frontend = `frontend-11-20`; backend = `backend-11-20`; controls = `controls-11-20`; soundAnimation = `soundAnimation-11-20`; qa = `qa-11-20`.

**Next action:** Begin a separate inspected gameplay reference session; observe the exact game, its controls and seven independent completed rounds. Entry images cannot be reused as round results.

### 15. Multi Fruits Charging Wilds

**Identity:** `zplay72_multi_fruits_charging_wilds_v1`; SmartSoft Gaming; launcher `MultiFruitsChargingWilds`; cohort 11-20.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-fruits-charging-wilds/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/multi-fruits-charging-wilds` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/multi-fruits-charging-wilds/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/multi-fruits-charging-wilds/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/multi-fruits-charging-wilds/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/multi-fruits-charging-wilds/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-fruits-charging-wilds); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiFruitsChargingWilds&Token=DEMO&PortalName=demo) |
| Captured evidence | `codex-work/new-games72-20261121/games/multi-fruits-charging-wilds/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/multi-fruits-charging-wilds/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | `REF-SOURCE-007` |

**Task owners:** reference = `reference-11-20`; rules = `rules-11-20`; assets = `assets-11-20`; frontend = `frontend-11-20`; backend = `backend-11-20`; controls = `controls-11-20`; soundAnimation = `soundAnimation-11-20`; qa = `qa-11-20`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 16. Gems Crown Charging Wilds

**Identity:** `zplay72_gems_crown_charging_wilds_v1`; SmartSoft Gaming; launcher `GemsCrownChargingWilds`; cohort 11-20.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/gems-crown-charging-wilds/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/gems-crown-charging-wilds` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/gems-crown-charging-wilds/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/gems-crown-charging-wilds/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/gems-crown-charging-wilds/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/gems-crown-charging-wilds/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/gems-crown-charging-wilds); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=GemsCrownChargingWilds&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/gems-crown-charging-wilds/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/gems-crown-charging-wilds/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-11-20`; rules = `rules-11-20`; assets = `assets-11-20`; frontend = `frontend-11-20`; backend = `backend-11-20`; controls = `controls-11-20`; soundAnimation = `soundAnimation-11-20`; qa = `qa-11-20`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 17. Safari Simba

**Identity:** `zplay72_safari_simba_v1`; SmartSoft Gaming; launcher `SafariSimba`; cohort 11-20.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/safari-simba/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/safari-simba` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/safari-simba/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/safari-simba/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/safari-simba/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/safari-simba/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/safari-simba-2); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=SafariSimba&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/safari-simba/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/safari-simba/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-11-20`; rules = `rules-11-20`; assets = `assets-11-20`; frontend = `frontend-11-20`; backend = `backend-11-20`; controls = `controls-11-20`; soundAnimation = `soundAnimation-11-20`; qa = `qa-11-20`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 18. Bao Slot 5X

**Identity:** `zplay72_bao_slot_5x_v1`; SmartSoft Gaming; launcher `BaoSlot5X`; cohort 11-20.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/bao-slot-5x/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/bao-slot-5x` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/bao-slot-5x/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/bao-slot-5x/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/bao-slot-5x/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/bao-slot-5x/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/bao-slot-5); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BaoSlot5X&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/bao-slot-5x/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/bao-slot-5x/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-11-20`; rules = `rules-11-20`; assets = `assets-11-20`; frontend = `frontend-11-20`; backend = `backend-11-20`; controls = `controls-11-20`; soundAnimation = `soundAnimation-11-20`; qa = `qa-11-20`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 19. Boka Jamba 10

**Identity:** `zplay72_boka_jamba_10_v1`; SmartSoft Gaming; launcher `BokaJamba10`; cohort 11-20.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/boka-jamba-10/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/boka-jamba-10` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/boka-jamba-10/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/boka-jamba-10/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/boka-jamba-10/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/boka-jamba-10/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/boca-jamba-10); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BokaJamba10&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/boka-jamba-10/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/boka-jamba-10/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-11-20`; rules = `rules-11-20`; assets = `assets-11-20`; frontend = `frontend-11-20`; backend = `backend-11-20`; controls = `controls-11-20`; soundAnimation = `soundAnimation-11-20`; qa = `qa-11-20`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 20. Hot Samba

**Identity:** `zplay72_hot_samba_v1`; SmartSoft Gaming; launcher `HotSamba`; cohort 11-20.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/hot-samba/`; NOT_DEPLOYED |
| Module | [codex-work/new-games72-20261121/games/hot-samba](codex-work/new-games72-20261121/games/hot-samba); ACCESS_EVIDENCE_PRESENT_ENGINE_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/hot-samba/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/hot-samba/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/hot-samba/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/hot-samba/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/hot-samba); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=HotSamba&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/hot-samba/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/hot-samba/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_BLOCKED` / `PROVIDER_COUNTRY_RESTRICTION` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | `REF-SOURCE-002` |

**Task owners:** reference = `reference-11-20`; rules = `rules-11-20`; assets = `assets-11-20`; frontend = `frontend-11-20`; backend = `backend-11-20`; controls = `controls-11-20`; soundAnimation = `soundAnimation-11-20`; qa = `qa-11-20`.

**Next action:** Use an authorized provider demo path for this environment or authoritative same-variant rules; no region/proxy substitution. Keep current source conflict open.

### 21. Mariachi Coins

**Identity:** `zplay72_mariachi_coins_v1`; SmartSoft Gaming; launcher `MariachiCoins`; cohort 21-30.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/mariachi-coins/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/mariachi-coins` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/mariachi-coins/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/mariachi-coins/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/mariachi-coins/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/mariachi-coins/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/mariachi-coins); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=MariachiCoins&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/mariachi-coins/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/mariachi-coins/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-21-30`; rules = `rules-21-30`; assets = `assets-21-30`; frontend = `frontend-21-30`; backend = `backend-21-30`; controls = `controls-21-30`; soundAnimation = `soundAnimation-21-30`; qa = `qa-21-30`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 22. Power of Tiger

**Identity:** `zplay72_power_of_tiger_v1`; SmartSoft Gaming; launcher `PowerOfTiger`; cohort 21-30.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/power-of-tiger/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/power-of-tiger` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/power-of-tiger/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/power-of-tiger/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/power-of-tiger/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/power-of-tiger/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/power-of-tiger); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=PowerOfTiger&Token=DEMO&PortalName=demo) |
| Captured evidence | `codex-work/new-games72-20261121/games/power-of-tiger/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/power-of-tiger/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-21-30`; rules = `rules-21-30`; assets = `assets-21-30`; frontend = `frontend-21-30`; backend = `backend-21-30`; controls = `controls-21-30`; soundAnimation = `soundAnimation-21-30`; qa = `qa-21-30`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 23. Gates of Merlyn

**Identity:** `zplay72_gates_of_merlyn_v1`; SmartSoft Gaming; launcher `GatesOfMerlyn`; cohort 21-30.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/gates-of-merlyn/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/gates-of-merlyn` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/gates-of-merlyn/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/gates-of-merlyn/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/gates-of-merlyn/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/gates-of-merlyn/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/gates-of-merlyn); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=GatesOfMerlyn&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/gates-of-merlyn/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/gates-of-merlyn/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-21-30`; rules = `rules-21-30`; assets = `assets-21-30`; frontend = `frontend-21-30`; backend = `backend-21-30`; controls = `controls-21-30`; soundAnimation = `soundAnimation-21-30`; qa = `qa-21-30`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 24. Dice Jungle

**Identity:** `zplay72_dice_jungle_v1`; SmartSoft Gaming; launcher `DiceJungle`; cohort 21-30.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/dice-jungle/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/dice-jungle` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/dice-jungle/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/dice-jungle/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/dice-jungle/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/dice-jungle/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/dice-jungle); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=DiceJungle&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/dice-jungle/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/dice-jungle/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-21-30`; rules = `rules-21-30`; assets = `assets-21-30`; frontend = `frontend-21-30`; backend = `backend-21-30`; controls = `controls-21-30`; soundAnimation = `soundAnimation-21-30`; qa = `qa-21-30`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 25. Coins Of Atlantis

**Identity:** `zplay72_coins_of_atlantis_v1`; SmartSoft Gaming; launcher `CoinsOfAtlantis`; cohort 21-30.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/coins-of-atlantis/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/coins-of-atlantis` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/coins-of-atlantis/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/coins-of-atlantis/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/coins-of-atlantis/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/coins-of-atlantis/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/coins-of-atlantis); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=CoinsOfAtlantis&Token=DEMO&PortalName=demo) |
| Captured evidence | `codex-work/new-games72-20261121/games/coins-of-atlantis/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/coins-of-atlantis/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | `REF-SOURCE-006` |

**Task owners:** reference = `reference-21-30`; rules = `rules-21-30`; assets = `assets-21-30`; frontend = `frontend-21-30`; backend = `backend-21-30`; controls = `controls-21-30`; soundAnimation = `soundAnimation-21-30`; qa = `qa-21-30`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 26. Jingle Bell Bonanza

**Identity:** `zplay72_jingle_bell_bonanza_v1`; SmartSoft Gaming; launcher `JingleBellBonanza`; cohort 21-30.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/jingle-bell-bonanza/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/jingle-bell-bonanza` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/jingle-bell-bonanza/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/jingle-bell-bonanza/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/jingle-bell-bonanza/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/jingle-bell-bonanza/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/jingle-bell-bonanza); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=JingleBellBonanza&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/jingle-bell-bonanza/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/jingle-bell-bonanza/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-21-30`; rules = `rules-21-30`; assets = `assets-21-30`; frontend = `frontend-21-30`; backend = `backend-21-30`; controls = `controls-21-30`; soundAnimation = `soundAnimation-21-30`; qa = `qa-21-30`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 27. Book of Bonanza

**Identity:** `zplay72_book_of_bonanza_v1`; SmartSoft Gaming; launcher `BookOfBonanza`; cohort 21-30.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/book-of-bonanza/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/book-of-bonanza` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/book-of-bonanza/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/book-of-bonanza/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/book-of-bonanza/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/book-of-bonanza/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/book-of-bonanza); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BookOfBonanza&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/book-of-bonanza/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/book-of-bonanza/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-21-30`; rules = `rules-21-30`; assets = `assets-21-30`; frontend = `frontend-21-30`; backend = `backend-21-30`; controls = `controls-21-30`; soundAnimation = `soundAnimation-21-30`; qa = `qa-21-30`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 28. Book of Futuria

**Identity:** `zplay72_book_of_futuria_v1`; SmartSoft Gaming; launcher `BookOfFuturia`; cohort 21-30.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/book-of-futuria/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/book-of-futuria` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/book-of-futuria/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/book-of-futuria/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/book-of-futuria/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/book-of-futuria/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/book-of-futuria); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=BookOfFuturia&Token=DEMO&PortalName=demo) |
| Captured evidence | `codex-work/new-games72-20261121/games/book-of-futuria/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/book-of-futuria/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-21-30`; rules = `rules-21-30`; assets = `assets-21-30`; frontend = `frontend-21-30`; backend = `backend-21-30`; controls = `controls-21-30`; soundAnimation = `soundAnimation-21-30`; qa = `qa-21-30`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 29. Genie's Bonanza

**Identity:** `zplay72_genie_s_bonanza_v1`; SmartSoft Gaming; launcher `GeniesBonanza`; cohort 21-30.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/genie-s-bonanza/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/genie-s-bonanza` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/genie-s-bonanza/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/genie-s-bonanza/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/genie-s-bonanza/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/genie-s-bonanza/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/genies-bonanza); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=GeniesBonanza&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/genie-s-bonanza/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/genie-s-bonanza/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | `REF-SOURCE-005` |

**Task owners:** reference = `reference-21-30`; rules = `rules-21-30`; assets = `assets-21-30`; frontend = `frontend-21-30`; backend = `backend-21-30`; controls = `controls-21-30`; soundAnimation = `soundAnimation-21-30`; qa = `qa-21-30`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 30. Farm's Fortune

**Identity:** `zplay72_farm_s_fortune_v1`; SmartSoft Gaming; launcher `FarmsFortune`; cohort 21-30.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/farm-s-fortune/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/farm-s-fortune` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/farm-s-fortune/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/farm-s-fortune/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/farm-s-fortune/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/farm-s-fortune/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/farms-fortune-6n0s6); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=FarmsFortune&Token=DEMO&PortalName=demo) |
| Captured evidence | `codex-work/new-games72-20261121/games/farm-s-fortune/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/farm-s-fortune/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-21-30`; rules = `rules-21-30`; assets = `assets-21-30`; frontend = `frontend-21-30`; backend = `backend-21-30`; controls = `controls-21-30`; soundAnimation = `soundAnimation-21-30`; qa = `qa-21-30`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 31. Mad Slot

**Identity:** `zplay72_mad_slot_v1`; SmartSoft Gaming; launcher `MadSlot`; cohort 31-40.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/mad-slot/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/mad-slot` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/mad-slot/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/mad-slot/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/mad-slot/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/mad-slot/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/mad-slot); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MadSlot&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/mad-slot/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/mad-slot/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-31-40`; rules = `rules-31-40`; assets = `assets-31-40`; frontend = `frontend-31-40`; backend = `backend-31-40`; controls = `controls-31-40`; soundAnimation = `soundAnimation-31-40`; qa = `qa-31-40`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 32. Wilds and Gods

**Identity:** `zplay72_wilds_and_gods_v1`; SmartSoft Gaming; launcher `WildsAndGods`; cohort 31-40.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/wilds-and-gods/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/wilds-and-gods` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/wilds-and-gods/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/wilds-and-gods/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/wilds-and-gods/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/wilds-and-gods/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/wilds-and-gods); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=WildsAndGods&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/wilds-and-gods/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/wilds-and-gods/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-31-40`; rules = `rules-31-40`; assets = `assets-31-40`; frontend = `frontend-31-40`; backend = `backend-31-40`; controls = `controls-31-40`; soundAnimation = `soundAnimation-31-40`; qa = `qa-31-40`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 33. Jungle Sisters

**Identity:** `zplay72_jungle_sisters_v1`; SmartSoft Gaming; launcher `JungleSisters`; cohort 31-40.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/jungle-sisters/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/jungle-sisters` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/jungle-sisters/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/jungle-sisters/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/jungle-sisters/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/jungle-sisters/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/jungle-sisters); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=JungleSisters&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/jungle-sisters/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/jungle-sisters/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-31-40`; rules = `rules-31-40`; assets = `assets-31-40`; frontend = `frontend-31-40`; backend = `backend-31-40`; controls = `controls-31-40`; soundAnimation = `soundAnimation-31-40`; qa = `qa-31-40`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 34. Jungle Sisters Deluxe

**Identity:** `zplay72_jungle_sisters_deluxe_v1`; SmartSoft Gaming; launcher `JungleSistersDeluxe`; cohort 31-40.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/jungle-sisters-deluxe/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/jungle-sisters-deluxe` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/jungle-sisters-deluxe/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/jungle-sisters-deluxe/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/jungle-sisters-deluxe/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/jungle-sisters-deluxe/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/jungle-sisters-deluxe); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=JungleSistersDeluxe&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/jungle-sisters-deluxe/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/jungle-sisters-deluxe/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-31-40`; rules = `rules-31-40`; assets = `assets-31-40`; frontend = `frontend-31-40`; backend = `backend-31-40`; controls = `controls-31-40`; soundAnimation = `soundAnimation-31-40`; qa = `qa-31-40`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 35. Dragon's Code

**Identity:** `zplay72_dragon_s_code_v1`; SmartSoft Gaming; launcher `DragonsCode`; cohort 31-40.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/dragon-s-code/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/dragon-s-code` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/dragon-s-code/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/dragon-s-code/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/dragon-s-code/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/dragon-s-code/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/dragons-code); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=DragonsCode&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/dragon-s-code/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/dragon-s-code/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-31-40`; rules = `rules-31-40`; assets = `assets-31-40`; frontend = `frontend-31-40`; backend = `backend-31-40`; controls = `controls-31-40`; soundAnimation = `soundAnimation-31-40`; qa = `qa-31-40`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 36. Dracula's Fortune

**Identity:** `zplay72_dracula_s_fortune_v1`; SmartSoft Gaming; launcher `DraculasFortune`; cohort 31-40.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/dracula-s-fortune/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/dracula-s-fortune` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/dracula-s-fortune/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/dracula-s-fortune/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/dracula-s-fortune/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/dracula-s-fortune/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/draculas-fortune-2); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=DraculasFortune&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/dracula-s-fortune/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/dracula-s-fortune/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-31-40`; rules = `rules-31-40`; assets = `assets-31-40`; frontend = `frontend-31-40`; backend = `backend-31-40`; controls = `controls-31-40`; soundAnimation = `soundAnimation-31-40`; qa = `qa-31-40`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 37. Sugar Fiesta

**Identity:** `zplay72_sugar_fiesta_v1`; SmartSoft Gaming; launcher `SugarFiesta`; cohort 31-40.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/sugar-fiesta/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/sugar-fiesta` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/sugar-fiesta/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/sugar-fiesta/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/sugar-fiesta/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/sugar-fiesta/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/sugar-fiesta); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=SugarFiesta&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/sugar-fiesta/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/sugar-fiesta/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-31-40`; rules = `rules-31-40`; assets = `assets-31-40`; frontend = `frontend-31-40`; backend = `backend-31-40`; controls = `controls-31-40`; soundAnimation = `soundAnimation-31-40`; qa = `qa-31-40`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 38. Vampires

**Identity:** `zplay72_vampires_v1`; SmartSoft Gaming; launcher `Vampires`; cohort 31-40.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/vampires/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/vampires` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/vampires/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/vampires/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/vampires/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/vampires/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/vampires); [public demo](http://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=Vampires&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/vampires/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/vampires/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-31-40`; rules = `rules-31-40`; assets = `assets-31-40`; frontend = `frontend-31-40`; backend = `backend-31-40`; controls = `controls-31-40`; soundAnimation = `soundAnimation-31-40`; qa = `qa-31-40`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 39. Samurai

**Identity:** `zplay72_samurai_v1`; SmartSoft Gaming; launcher `Samurai`; cohort 31-40.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/samurai/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/samurai` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/samurai/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/samurai/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/samurai/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/samurai/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/samurai-deluxe); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=Samurai&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/samurai/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/samurai/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-31-40`; rules = `rules-31-40`; assets = `assets-31-40`; frontend = `frontend-31-40`; backend = `backend-31-40`; controls = `controls-31-40`; soundAnimation = `soundAnimation-31-40`; qa = `qa-31-40`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 40. Multi Hot Wheel

**Identity:** `zplay72_multi_hot_wheel_v1`; SmartSoft Gaming; launcher `MultiHotWheel`; cohort 31-40.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/multi-hot-wheel/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/multi-hot-wheel` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/multi-hot-wheel/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/multi-hot-wheel/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/multi-hot-wheel/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/multi-hot-wheel/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/multi-hot-wheel); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=MultiHotWheel&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/multi-hot-wheel/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/multi-hot-wheel/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-31-40`; rules = `rules-31-40`; assets = `assets-31-40`; frontend = `frontend-31-40`; backend = `backend-31-40`; controls = `controls-31-40`; soundAnimation = `soundAnimation-31-40`; qa = `qa-31-40`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 41. Plinko X Classic

**Identity:** `zplay72_plinko_x_classic_v1`; SmartSoft Gaming; launcher `PlinkoXClassic`; cohort 41-50.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/plinko-x-classic/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/plinko-x-classic` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/plinko-x-classic/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/plinko-x-classic/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/plinko-x-classic/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/plinko-x-classic/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/plinko-x-classic); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=PlinkoXClassic&Token=DEMO&PortalName=demo) |
| Captured evidence | `codex-work/new-games72-20261121/games/plinko-x-classic/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/plinko-x-classic/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-41-50`; rules = `rules-41-50`; assets = `assets-41-50`; frontend = `frontend-41-50`; backend = `backend-41-50`; controls = `controls-41-50`; soundAnimation = `soundAnimation-41-50`; qa = `qa-41-50`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 42. Plinko X

**Identity:** `zplay72_plinko_x_v1`; SmartSoft Gaming; launcher `PlinkoX`; cohort 41-50.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/plinko-x/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/plinko-x` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/plinko-x/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/plinko-x/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/plinko-x/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/plinko-x/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/plinkox); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=PlinkoX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/plinko-x/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/plinko-x/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-41-50`; rules = `rules-41-50`; assets = `assets-41-50`; frontend = `frontend-41-50`; backend = `backend-41-50`; controls = `controls-41-50`; soundAnimation = `soundAnimation-41-50`; qa = `qa-41-50`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 43. Mine Island

**Identity:** `zplay72_mine_island_v1`; SmartSoft Gaming; launcher `MineIsland`; cohort 41-50.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/mine-island/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/mine-island` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/mine-island/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/mine-island/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/mine-island/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/mine-island/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/mine-island); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=MineIsland&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/mine-island/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/mine-island/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-41-50`; rules = `rules-41-50`; assets = `assets-41-50`; frontend = `frontend-41-50`; backend = `backend-41-50`; controls = `controls-41-50`; soundAnimation = `soundAnimation-41-50`; qa = `qa-41-50`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 44. Mine Island2

**Identity:** `zplay72_mine_island2_v1`; SmartSoft Gaming; launcher `MineIsland2`; cohort 41-50.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/mine-island2/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/mine-island2` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/mine-island2/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/mine-island2/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/mine-island2/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/mine-island2/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/mine-island2); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=MineIsland2&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/mine-island2/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/mine-island2/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-41-50`; rules = `rules-41-50`; assets = `assets-41-50`; frontend = `frontend-41-50`; backend = `backend-41-50`; controls = `controls-41-50`; soundAnimation = `soundAnimation-41-50`; qa = `qa-41-50`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 45. Chicken Ways

**Identity:** `zplay72_chicken_ways_v1`; SmartSoft Gaming; launcher `Chickenways`; cohort 41-50.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/chicken-ways/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/chicken-ways` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/chicken-ways/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/chicken-ways/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/chicken-ways/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/chicken-ways/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/chicken-ways); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=Chickenways&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/chicken-ways/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/chicken-ways/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-41-50`; rules = `rules-41-50`; assets = `assets-41-50`; frontend = `frontend-41-50`; backend = `backend-41-50`; controls = `controls-41-50`; soundAnimation = `soundAnimation-41-50`; qa = `qa-41-50`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 46. Chicken Highway

**Identity:** `zplay72_chicken_highway_v1`; SmartSoft Gaming; launcher `ChickenHighway`; cohort 41-50.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/chicken-highway/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/chicken-highway` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/chicken-highway/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/chicken-highway/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/chicken-highway/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/chicken-highway/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/chicken-highway); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=ChickenHighway&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/chicken-highway/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/chicken-highway/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-41-50`; rules = `rules-41-50`; assets = `assets-41-50`; frontend = `frontend-41-50`; backend = `backend-41-50`; controls = `controls-41-50`; soundAnimation = `soundAnimation-41-50`; qa = `qa-41-50`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 47. Cheesy Road Classic

**Identity:** `zplay72_cheesy_road_classic_v1`; SmartSoft Gaming; launcher `CheesyRoadClassic`; cohort 41-50.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/cheesy-road-classic/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/cheesy-road-classic` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/cheesy-road-classic/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/cheesy-road-classic/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/cheesy-road-classic/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/cheesy-road-classic/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/cheesy-road-classic); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=CheesyRoadClassic&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/cheesy-road-classic/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/cheesy-road-classic/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-41-50`; rules = `rules-41-50`; assets = `assets-41-50`; frontend = `frontend-41-50`; backend = `backend-41-50`; controls = `controls-41-50`; soundAnimation = `soundAnimation-41-50`; qa = `qa-41-50`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 48. Cheesy Road

**Identity:** `zplay72_cheesy_road_v1`; SmartSoft Gaming; launcher `CheesyRoad`; cohort 41-50.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/cheesy-road/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/cheesy-road` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/cheesy-road/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/cheesy-road/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/cheesy-road/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/cheesy-road/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/cheesy-road); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=CheesyRoad&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/cheesy-road/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/cheesy-road/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-41-50`; rules = `rules-41-50`; assets = `assets-41-50`; frontend = `frontend-41-50`; backend = `backend-41-50`; controls = `controls-41-50`; soundAnimation = `soundAnimation-41-50`; qa = `qa-41-50`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 49. Wheel Of Destiny

**Identity:** `zplay72_wheel_of_destiny_v1`; SmartSoft Gaming; launcher `WheelofDestiny`; cohort 41-50.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/wheel-of-destiny/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/wheel-of-destiny` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/wheel-of-destiny/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/wheel-of-destiny/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/wheel-of-destiny/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/wheel-of-destiny/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/wheel-of-destiny); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=WheelofDestiny&Token=DEMO&PortalName=demo&ReturnUrl=http%3A%2F%2Fgoogle.com5) |
| Captured evidence | `codex-work/new-games72-20261121/games/wheel-of-destiny/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/wheel-of-destiny/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-41-50`; rules = `rules-41-50`; assets = `assets-41-50`; frontend = `frontend-41-50`; backend = `backend-41-50`; controls = `controls-41-50`; soundAnimation = `soundAnimation-41-50`; qa = `qa-41-50`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 50. Bonus Time

**Identity:** `zplay72_bonus_time_v1`; SmartSoft Gaming; launcher `BonusTime`; cohort 41-50.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/bonus-time/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/bonus-time` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/bonus-time/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/bonus-time/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/bonus-time/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/bonus-time/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/bonus-time); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=BonusTime&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/bonus-time/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/bonus-time/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-41-50`; rules = `rules-41-50`; assets = `assets-41-50`; frontend = `frontend-41-50`; backend = `backend-41-50`; controls = `controls-41-50`; soundAnimation = `soundAnimation-41-50`; qa = `qa-41-50`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 51. 4 Bonuses Bonanza

**Identity:** `zplay72_4_bonuses_bonanza_v1`; SmartSoft Gaming; launcher `PlinkoJoker`; cohort 51-60.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/4-bonuses-bonanza/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/4-bonuses-bonanza` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/4-bonuses-bonanza/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/4-bonuses-bonanza/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/4-bonuses-bonanza/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/4-bonuses-bonanza/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/4-bonuses-bonanza); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=PlinkoJoker&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/4-bonuses-bonanza/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/4-bonuses-bonanza/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-51-60`; rules = `rules-51-60`; assets = `assets-51-60`; frontend = `frontend-51-60`; backend = `backend-51-60`; controls = `controls-51-60`; soundAnimation = `soundAnimation-51-60`; qa = `qa-51-60`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 52. Fortune Catch

**Identity:** `zplay72_fortune_catch_v1`; SmartSoft Gaming; launcher `FortuneCatch`; cohort 51-60.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/fortune-catch/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/fortune-catch` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/fortune-catch/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/fortune-catch/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/fortune-catch/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/fortune-catch/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/fortune-catch); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=FortuneCatch&Token=DEMO&PortalName=DEMO) |
| Captured evidence | `codex-work/new-games72-20261121/games/fortune-catch/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/fortune-catch/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-51-60`; rules = `rules-51-60`; assets = `assets-51-60`; frontend = `frontend-51-60`; backend = `backend-51-60`; controls = `controls-51-60`; soundAnimation = `soundAnimation-51-60`; qa = `qa-51-60`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 53. Bottle Mania

**Identity:** `zplay72_bottle_mania_v1`; SmartSoft Gaming; launcher `BottleMania`; cohort 51-60.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/bottle-mania/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/bottle-mania` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/bottle-mania/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/bottle-mania/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/bottle-mania/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/bottle-mania/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/bottle-mania); [public demo](https://eu-server.ssgportal.com/GameLauncher/loader.aspx?GameCategory=&GameName=BottleMania&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/bottle-mania/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/bottle-mania/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-51-60`; rules = `rules-51-60`; assets = `assets-51-60`; frontend = `frontend-51-60`; backend = `backend-51-60`; controls = `controls-51-60`; soundAnimation = `soundAnimation-51-60`; qa = `qa-51-60`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 54. Cai Balao Cappadocia

**Identity:** `zplay72_cai_balao_cappadocia_v1`; SmartSoft Gaming; launcher `CaiBalaoCappadocia`; cohort 51-60.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/cai-balao-cappadocia/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/cai-balao-cappadocia` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/cai-balao-cappadocia/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/cai-balao-cappadocia/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/cai-balao-cappadocia/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/cai-balao-cappadocia/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/cai-balao-cappadocia); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=CaiBalaoCappadocia&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/cai-balao-cappadocia/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/cai-balao-cappadocia/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-51-60`; rules = `rules-51-60`; assets = `assets-51-60`; frontend = `frontend-51-60`; backend = `backend-51-60`; controls = `controls-51-60`; soundAnimation = `soundAnimation-51-60`; qa = `qa-51-60`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 55. Tower X

**Identity:** `zplay72_tower_x_v1`; SmartSoft Gaming; launcher `TowerX`; cohort 51-60.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/tower-x/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/tower-x` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/tower-x/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/tower-x/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/tower-x/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/tower-x/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/tower-x); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=TowerX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/tower-x/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/tower-x/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-51-60`; rules = `rules-51-60`; assets = `assets-51-60`; frontend = `frontend-51-60`; backend = `backend-51-60`; controls = `controls-51-60`; soundAnimation = `soundAnimation-51-60`; qa = `qa-51-60`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 56. Roll X

**Identity:** `zplay72_roll_x_v1`; SmartSoft Gaming; launcher `RollX`; cohort 51-60.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/roll-x/`; NOT_DEPLOYED |
| Module | [codex-work/new-games72-20261121/games/roll-x](codex-work/new-games72-20261121/games/roll-x); PARTIAL_IMPLEMENTATION_PRESENT |
| Backend configuration | [codex-work/new-games72-20261121/games/roll-x/specification.json](codex-work/new-games72-20261121/games/roll-x/specification.json); enabled=false |
| Payout evaluator | [codex-work/new-games72-20261121/games/roll-x/evaluator.mjs](codex-work/new-games72-20261121/games/roll-x/evaluator.mjs) |
| Assets | [codex-work/new-games72-20261121/games/roll-x/assets-manifest.json](codex-work/new-games72-20261121/games/roll-x/assets-manifest.json); runtime prefix `/new-games72/roll-x/assets/v1/`; rights=ORIGINAL_CODE_ASSETS_PROVIDER_PARITY_UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/rollx); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=RollX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | [codex-work/new-games72-20261121/games/roll-x/evidence-index.json](codex-work/new-games72-20261121/games/roll-x/evidence-index.json); manual rounds=7; video=false; audible sound verified=false |
| Rules | [codex-work/new-games72-20261121/games/roll-x/specification.json](codex-work/new-games72-20261121/games/roll-x/specification.json); release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PARTIAL` / `SEVEN_MANUAL_ROUNDS_AND_CONTROLS_CAPTURED_NO_VIDEO` |
| Build / tests / deployment | `IMPLEMENTING_VERIFIED_SUBSET` / `57_LOCAL_TESTS_PASSED_BROWSER_CI_PENDING` / `NOT_DEPLOYED` |
| Open issues | `ROLLX-007`, `ROLLX-FIX-005`, `ROLLX-FIX-006` |

**Task owners:** reference = `reference-51-60`; rules = `rules-51-60`; assets = `assets-51-60`; frontend = `frontend-51-60`; backend = `backend-51-60`; controls = `controls-51-60`; soundAnimation = `soundAnimation-51-60`; qa = `qa-51-60`.

**Next action:** Run the reviewed public-source isolated browser CI and retest editable AUTO bet/target, held-key and BFCache behavior; capture missing motion and sound evidence; verify full targets, stake limits and rounding, then bind the chosen target and retained accepted-model versions to the existing server before cash activation.

### 57. Balloon

**Identity:** `zplay72_balloon_v1`; SmartSoft Gaming; launcher `Balloon`; cohort 51-60.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/balloon/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/balloon` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/balloon/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/balloon/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/balloon/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/balloon/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/balloon); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=Balloon&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/balloon/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/balloon/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-51-60`; rules = `rules-51-60`; assets = `assets-51-60`; frontend = `frontend-51-60`; backend = `backend-51-60`; controls = `controls-51-60`; soundAnimation = `soundAnimation-51-60`; qa = `qa-51-60`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 58. SplitX

**Identity:** `zplay72_splitx_v1`; SmartSoft Gaming; launcher `SplitX`; cohort 51-60.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/splitx/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/splitx` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/splitx/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/splitx/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/splitx/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/splitx/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/splitx); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=SplitX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/splitx/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/splitx/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-51-60`; rules = `rules-51-60`; assets = `assets-51-60`; frontend = `frontend-51-60`; backend = `backend-51-60`; controls = `controls-51-60`; soundAnimation = `soundAnimation-51-60`; qa = `qa-51-60`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 59. PopX

**Identity:** `zplay72_popx_v1`; SmartSoft Gaming; launcher `PopX`; cohort 51-60.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/popx/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/popx` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/popx/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/popx/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/popx/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/popx/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/popx); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=PopX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/popx/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/popx/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-51-60`; rules = `rules-51-60`; assets = `assets-51-60`; frontend = `frontend-51-60`; backend = `backend-51-60`; controls = `controls-51-60`; soundAnimation = `soundAnimation-51-60`; qa = `qa-51-60`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 60. New Era of JetX

**Identity:** `zplay72_new_era_of_jetx_v1`; SmartSoft Gaming; launcher `JetX`; cohort 51-60.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/new-era-of-jetx/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/new-era-of-jetx` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/new-era-of-jetx/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/new-era-of-jetx/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/new-era-of-jetx/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/new-era-of-jetx/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/jetx); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=JetXNew&GameName=JetX&Token=DEMO_EXH&PortalName=DEMO) |
| Captured evidence | `codex-work/new-games72-20261121/games/new-era-of-jetx/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/new-era-of-jetx/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-51-60`; rules = `rules-51-60`; assets = `assets-51-60`; frontend = `frontend-51-60`; backend = `backend-51-60`; controls = `controls-51-60`; soundAnimation = `soundAnimation-51-60`; qa = `qa-51-60`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 61. BalloonX

**Identity:** `zplay72_balloonx_v1`; SmartSoft Gaming; launcher `BalloonX`; cohort 61-70.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/balloonx/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/balloonx` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/balloonx/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/balloonx/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/balloonx/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/balloonx/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/balloonx); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameName=BalloonX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/balloonx/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/balloonx/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-61-70`; rules = `rules-61-70`; assets = `assets-61-70`; frontend = `frontend-61-70`; backend = `backend-61-70`; controls = `controls-61-70`; soundAnimation = `soundAnimation-61-70`; qa = `qa-61-70`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 62. Propel X

**Identity:** `zplay72_propel_x_v1`; SmartSoft Gaming; launcher `PropelX`; cohort 61-70.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/propel-x/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/propel-x` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/propel-x/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/propel-x/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/propel-x/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/propel-x/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/propel-x); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=PropelX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/propel-x/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/propel-x/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-61-70`; rules = `rules-61-70`; assets = `assets-61-70`; frontend = `frontend-61-70`; backend = `backend-61-70`; controls = `controls-61-70`; soundAnimation = `soundAnimation-61-70`; qa = `qa-61-70`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 63. World Champion X

**Identity:** `zplay72_world_champion_x_v1`; SmartSoft Gaming; launcher `WorldChampionX`; cohort 61-70.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/world-champion-x/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/world-champion-x` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/world-champion-x/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/world-champion-x/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/world-champion-x/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/world-champion-x/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/world-champion-x); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=WorldChampionX&Token=DEMO&PortalName=demo) |
| Captured evidence | `codex-work/new-games72-20261121/games/world-champion-x/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/world-champion-x/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-61-70`; rules = `rules-61-70`; assets = `assets-61-70`; frontend = `frontend-61-70`; backend = `backend-61-70`; controls = `controls-61-70`; soundAnimation = `soundAnimation-61-70`; qa = `qa-61-70`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 64. CarX

**Identity:** `zplay72_carx_v1`; SmartSoft Gaming; launcher `CarX`; cohort 61-70.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/carx/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/carx` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/carx/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/carx/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/carx/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/carx/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/carx); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=CarX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/carx/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/carx/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-61-70`; rules = `rules-61-70`; assets = `assets-61-70`; frontend = `frontend-61-70`; backend = `backend-61-70`; controls = `controls-61-70`; soundAnimation = `soundAnimation-61-70`; qa = `qa-61-70`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 65. Helicopter X

**Identity:** `zplay72_helicopter_x_v1`; SmartSoft Gaming; launcher `HelicopterX`; cohort 61-70.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/helicopter-x/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/helicopter-x` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/helicopter-x/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/helicopter-x/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/helicopter-x/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/helicopter-x/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/helicopter-x); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=HelicopterX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/helicopter-x/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/helicopter-x/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-61-70`; rules = `rules-61-70`; assets = `assets-61-70`; frontend = `frontend-61-70`; backend = `backend-61-70`; controls = `controls-61-70`; soundAnimation = `soundAnimation-61-70`; qa = `qa-61-70`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 66. Football X

**Identity:** `zplay72_football_x_v1`; SmartSoft Gaming; launcher `FootballX`; cohort 61-70.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/football-x/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/football-x` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/football-x/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/football-x/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/football-x/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/football-x/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/fotballx); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=FootballX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/football-x/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/football-x/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-61-70`; rules = `rules-61-70`; assets = `assets-61-70`; frontend = `frontend-61-70`; backend = `backend-61-70`; controls = `controls-61-70`; soundAnimation = `soundAnimation-61-70`; qa = `qa-61-70`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 67. Cricket X

**Identity:** `zplay72_cricket_x_v1`; SmartSoft Gaming; launcher `CricketX`; cohort 61-70.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/cricket-x/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/cricket-x` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/cricket-x/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/cricket-x/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/cricket-x/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/cricket-x/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/cricket-x); [public demo](http://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=CricketX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/cricket-x/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/cricket-x/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-61-70`; rules = `rules-61-70`; assets = `assets-61-70`; frontend = `frontend-61-70`; backend = `backend-61-70`; controls = `controls-61-70`; soundAnimation = `soundAnimation-61-70`; qa = `qa-61-70`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 68. CricketerX

**Identity:** `zplay72_cricketerx_v1`; SmartSoft Gaming; launcher `CricketerX`; cohort 61-70.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/cricketerx/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/cricketerx` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/cricketerx/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/cricketerx/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/cricketerx/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/cricketerx/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/cricketerx); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=&GameName=CricketerX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%2F) |
| Captured evidence | `codex-work/new-games72-20261121/games/cricketerx/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/cricketerx/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-61-70`; rules = `rules-61-70`; assets = `assets-61-70`; frontend = `frontend-61-70`; backend = `backend-61-70`; controls = `controls-61-70`; soundAnimation = `soundAnimation-61-70`; qa = `qa-61-70`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 69. Crash Duel

**Identity:** `zplay72_crash_duel_v1`; SmartSoft Gaming; launcher `TugOfWar`; cohort 61-70.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/crash-duel/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/crash-duel` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/crash-duel/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/crash-duel/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/crash-duel/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/crash-duel/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/crash-duel); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=TugOfWar&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/crash-duel/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/crash-duel/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-61-70`; rules = `rules-61-70`; assets = `assets-61-70`; frontend = `frontend-61-70`; backend = `backend-61-70`; controls = `controls-61-70`; soundAnimation = `soundAnimation-61-70`; qa = `qa-61-70`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 70. AviaStar

**Identity:** `zplay72_aviastar_v1`; SmartSoft Gaming; launcher `JetX3`; cohort 61-70.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/aviastar/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/aviastar` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/aviastar/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/aviastar/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/aviastar/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/aviastar/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/aviastar); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=JetX3&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/aviastar/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/aviastar/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-61-70`; rules = `rules-61-70`; assets = `assets-61-70`; frontend = `frontend-61-70`; backend = `backend-61-70`; controls = `controls-61-70`; soundAnimation = `soundAnimation-61-70`; qa = `qa-61-70`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 71. Smash X

**Identity:** `zplay72_smash_x_v1`; SmartSoft Gaming; launcher `SmashX`; cohort 71-72.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/smash-x/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/smash-x` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/smash-x/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/smash-x/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/smash-x/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/smash-x/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/smash-x); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=SmashX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/smash-x/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/smash-x/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-71-72`; rules = `rules-71-72`; assets = `assets-71-72`; frontend = `frontend-71-72`; backend = `backend-71-72`; controls = `controls-71-72`; soundAnimation = `soundAnimation-71-72`; qa = `qa-71-72`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

### 72. Double X

**Identity:** `zplay72_double_x_v1`; SmartSoft Gaming; launcher `SlicerX`; cohort 71-72.

| Item | Current record |
|---|---|
| Frontend route | `/new-games72/double-x/`; NOT_DEPLOYED |
| Module | `codex-work/new-games72-20261121/games/double-x` — RESERVED, absent; RESERVED_NOT_IMPLEMENTED |
| Backend configuration | `codex-work/new-games72-20261121/games/double-x/specification.json` — RESERVED, absent; enabled=false |
| Payout evaluator | `codex-work/new-games72-20261121/games/double-x/evaluator.mjs` — RESERVED, absent |
| Assets | `codex-work/new-games72-20261121/games/double-x/assets-manifest.json` — RESERVED, absent; runtime prefix `/new-games72/double-x/assets/v1/`; rights=UNVERIFIED |
| Official references | [Product](https://www.smartsoftgaming.com/games/doublex); [public demo](https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=XGames&GameName=SlicerX&Token=DEMO&PortalName=DEMO&ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com&Lang=en) |
| Captured evidence | `codex-work/new-games72-20261121/games/double-x/evidence-index.json` — RESERVED, absent; manual rounds=0; video=false; audible sound verified=false |
| Rules | `codex-work/new-games72-20261121/games/double-x/specification.json` — RESERVED, absent; release rules version=`None`; release engine version=`None` |
| Overall / reference | `REFERENCE_PENDING` / `IDENTITY_VERIFIED` |
| Build / tests / deployment | `NOT_STARTED` / `NOT_RUN` / `NOT_DEPLOYED` |
| Open issues | No individual defect registered; incomplete release prerequisites still apply. |

**Task owners:** reference = `reference-71-72`; rules = `rules-71-72`; assets = `assets-71-72`; frontend = `frontend-71-72`; backend = `backend-71-72`; controls = `controls-71-72`; soundAnimation = `soundAnimation-71-72`; qa = `qa-71-72`.

**Next action:** Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.

## Defects, retests and evidence limitations

- [Source conflicts 01–30](codex-work/new-games72-20261121/references/source-conflicts-01-30.json) and [58–72](codex-work/new-games72-20261121/references/source-conflicts-58-72.json) retain unresolved official-page inconsistencies and missing full specifications.
- [Peer review and retests](codex-work/new-games72-20261121/release/peer-review.json) record reproduced capture/recovery/lifecycle defects, changed files, exact retests and limits.
- [Roll X specification](codex-work/new-games72-20261121/games/roll-x/specification.json) separates observed arithmetic, original implementation, unverified probability/rounding/target rules and the required existing-server target binding.
- [Multi Hot 5 Deluxe specification](codex-work/new-games72-20261121/games/multi-hot-5-deluxe/specification.json) resolves bound base-paytable scaling for deterministic five-line arithmetic; full outcome legality, maximum-win behavior, probability model and remaining controls stay unverified. Supplemental desktop result images add zero canonical rounds.
- [Multi Hot 5 Wild follow-up restriction](codex-work/new-games72-20261121/references/access-survey/multi-hot-5-wild-followup-blocker.json) records a country block after the separate earlier entry-only sound prompt. Both observations remain preserved; zero gameplay rounds were counted.
- [Retained-asset regression review](codex-work/new-games72-20261121/integration/asset-router-review.json) records three reproduced failures and verified fixes. Exact retained historical asset URLs remain available independently of a closed or invalid current publication; there is no old-release substitution.
- [Hot Samba restriction](codex-work/new-games72-20261121/games/hot-samba/evidence/2026-11-21/observation.json) is an observed provider country block. Zero rounds were counted and no region/proxy bypass was attempted.
- [Actual registry validation](codex-work/new-games72-20261121/release/actual-registry-validation.json) and [release review](codex-work/new-games72-20261121/release/actual-release-review.json) are separate: valid identities do not mean release permission.

Every test report identifies its environment and source hashes. Synthetic fixtures do not verify actual ETB settlement, independent RNG, provider audio parity or live deployment. Demo credit, tokens and session data remain separate from operator accounts. Only public DEMO launch links and redacted observations belong in this repository.

## One-release activation and rollback

All 72 games must reach RELEASE_READY with verified rules, individual code/controls/animation/sound, isolated wallet/recovery tests, mobile/lifecycle tests and lawful runtime assets. The source commit, frontend/backend/rules versions, asset hashes and evidence are pinned in the release manifest. Before activation, recapture the current live service/module/configuration baseline and preserve intervening work. Platform SUCCESS or a Git push is not live verification.

Rollback can disable only new-game future rounds. It must preserve accepted-round lookup/settlement, historical rules/assets, ledger rows, prior payouts and correct balances. It cannot restore an older balance snapshot or delete transactions. Existing game traffic stays on its original paths.

Continue from [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md), this matrix, the current registry and the per-game evidence/task records. Regenerate this file with `python codex-work/new-games72-20261121/update-matrix.py`; do not rerun the one-time registry importer over existing work.
