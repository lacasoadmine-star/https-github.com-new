# ZPLAY / Superwin — NEW_GAMES_72_MATRIX

21 Nofeembar 2026, Africa/Addis_Ababa. Diiwaanka shaqadii hore waxa ku yaal [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md).

## Natiijada hubinta

- Codsigu wuxuu magacaabay 57 cinwaan oo gaar ah. Waxaa ka maqan 15 magac xitaa ka hor hubinta katalogga jira.
- Dhammaan 57 waxaa hore loogu diiwaangeliyey katalogga ZPLAY ee 74-ka ah. 13 waxay muujiyeen Play Now. 44 waxay muujiyeen Weli lama heli karo. Isku darka katalogga oo dhan wuxuu leeyahay 17 available iyo 57 preparing. Play Now waa xaalad kaarka iyo link-ga ah. Tijaabo SPIN ama ETB ah ma xaqiijin.
- [Diiwaankii hore ee 72-ka](codex-work/native72-20261119/qa/game-progress.json) wuxuu ku salaysan yahay isla 74-ka card, iyadoo laga reebay Multi Hot 5 iyo Foxy Hot 20. Waa shaqo hore oo jirta, waxaana loo hayaa si madax-bannaan. Sii-deynta cusub waxay u baahan tahay 72 aqoonsi oo waafaqsan xadka shaqada cusub.
- Natiijada codsigan cusub waa 0/72 la hirgeliyey, 0/72 la geeyey live. GameId, route, backend config, module, commit gameplay, asset hash, tijaabo iyo release version cusub weli lama qoondeyn. Ma jiro debit ama payout production ah.
- Mas’uulka hubinta waa hawsha audit-ka katalogga. Tallaabada baaxadda cusub waxay u baahan tahay catalog asal ah oo ZPLAY ah ama provider integration la oggolaaday. Ciyaaraha SmartSoft ee jadwalku tilmaamayo waa cinwaannada la baaray.

## Diiwaanka 57-ka cinwaan ee la soo qoray

Provider: **SmartSoft Gaming**. Magaca ku jira jadwalku wuxuu tilmaamayaa variant-ka rasmiga ah. Lambaradu waxay raacaan kala horraynta codsiga cusub. Aqoonsiyada iyo routes-ku waxay ka yimaadeen Player-ka jira; bogga rasmiga ahi waa tixraac aqoonsi.

| # | Magaca iyo variant-ka | Aqoonsiga hadda jira | Route-ka catalog-ga jira | Xaaladda kaarka | Bogga rasmiga ah |
| --- | --- | --- | --- | --- | --- |
| 1 | Multi Hot 5 Deluxe | `ind74_official_multihot5deluxe` | `/games/multi_hot_5_deluxe_native` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/multi-hot-5-deluxe) |
| 2 | Multi Hot 5 Wild | `ind74_official_multihot5wild` | `/games/multihot5wild_native` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/multi-hot-5-wild) |
| 3 | Multi Hot 10 | `ind74_official_multihot10` | `/zplay74/multi-hot-10/` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/multi-hot-10-2) |
| 4 | Multi Hot 20 | `ind74_official_multihot20` | `/zplay-restored/20261117/multihot20/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/multi-hot-20) |
| 5 | Multi Hot 40 | `ind74_official_multihot40` | `/games/multihot40_native` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/multi-hot-40) |
| 6 | Multi Hot 100 | `ind74_official_multihot100` | `/games/multihot100_native` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/multi-hot-100) |
| 7 | Multi Hot 5 Burn Wilds | `ind74_official_multihot5burnwilds` | `/zplay-restored/20261117/multihot5burnwilds/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds) |
| 8 | Multi Hot 5 Super Wilds | `ind74_official_multihot5superwilds` | `/games/multihot5superwilds_native` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/multi-hot-5-super-wilds) |
| 9 | Multi Hot Ways | `ind74_official_multihotways` | `/zplay-restored/20261117/multihotways/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/multi-hot-ways) |
| 10 | Multi Hot Wild Ways | `ind74_official_multihotwildways` | `/games/multihotwildways_native` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/multi-hot-wild-ways) |
| 11 | Burning Ice | `ind74_official_burningice` | `/games/burningice_native` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/burning-ice-41) |
| 12 | Burning Ice 10 | `ind74_official_burningice10` | `/games/burningice10_native` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/blazing-hot-10) |
| 13 | Burning Ice 40 | `ind74_official_burningice40` | `/games/burningice40_native` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/burning-ice-40) |
| 14 | Wild Multi Stars | `ind74_official_wildmultistars` | `/games/wild_multi_stars` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/wild-multi-stars) |
| 15 | Multi Fruits Charging Wilds | `ind74_official_multifruitschargingwilds` | `/zplay-restored/20261117/multifruitschargingwilds/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/multi-fruits-charging-wilds) |
| 16 | Gems Crown Charging Wilds | `ind74_official_gemscrownchargingwilds` | `/zplay-restored/20261117/gemscrownchargingwilds/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/gems-crown-charging-wilds) |
| 17 | Safari Simba | `ind74_official_safarisimba` | `/new74/037-safari-simba/` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/safari-simba-2) |
| 18 | Bao Slot 5X | `ind74_official_baoslot5x` | `/zplay-restored/20261117/baoslot5x/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/bao-slot-5) |
| 19 | Boka Jamba 10 | `ind74_official_bokajamba10` | `/zplay-restored/20261117/bokajamba10/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/boca-jamba-10) |
| 20 | Hot Samba | `ind74_official_hotsamba` | `/zplay-restored/20261117/hotsamba/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/hot-samba) |
| 21 | Mariachi Coins | `ind74_official_mariachicoins` | `/zplay-restored/20261117/mariachicoins/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/mariachi-coins) |
| 22 | Power of Tiger | `ind74_official_poweroftiger` | `/zplay-restored/20261117/poweroftiger/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/power-of-tiger) |
| 23 | Gates of Merlyn | `ind74_official_gatesofmerlyn` | `/zplay-restored/20261117/gatesofmerlyn/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/gates-of-merlyn) |
| 24 | Dice Jungle | `ind74_official_dicejungle` | `/zplay-restored/20261117/dicejungle/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/dice-jungle) |
| 25 | Coins Of Atlantis | `ind74_official_coinsofatlantis` | `/zplay-restored/20261117/coinsofatlantis/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/coins-of-atlantis) |
| 26 | Jingle Bell Bonanza | `ind74_official_jinglebellbonanza` | `/zplay-restored/20261117/jinglebellbonanza/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/jingle-bell-bonanza) |
| 27 | Book of Bonanza | `ind74_official_bookofbonanza` | `/zplay-restored/20261117/bookofbonanza/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/book-of-bonanza) |
| 28 | Book of Futuria | `ind74_official_bookoffuturia` | `/zplay-restored/20261117/bookoffuturia/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/book-of-futuria) |
| 29 | Genie's Bonanza | `ind74_official_geniesbonanza` | `/zplay-restored/20261117/geniesbonanza/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/genies-bonanza) |
| 30 | Farm's Fortune | `ind74_official_farmsfortune` | `/zplay-restored/20261117/farmsfortune/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/farms-fortune-6n0s6) |
| 31 | Mad Slot | `ind74_official_madslot` | `/zplay-restored/20261117/madslot/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/mad-slot) |
| 32 | Wilds and Gods | `ind74_official_wildsandgods` | `/zplay-restored/20261117/wildsandgods/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/wilds-and-gods) |
| 33 | Jungle Sisters | `ind74_official_junglesisters` | `/zplay-restored/20261117/junglesisters/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/jungle-sisters) |
| 34 | Jungle Sisters Deluxe | `ind74_official_junglesistersdeluxe` | `/zplay-restored/20261117/junglesistersdeluxe/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/jungle-sisters-deluxe) |
| 35 | Dragon's Code | `ind74_official_dragonscode` | `/zplay-restored/20261117/dragonscode/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/dragons-code) |
| 36 | Dracula's Fortune | `ind74_official_draculasfortune` | `/zplay-restored/20261117/draculasfortune/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/draculas-fortune-2) |
| 37 | Sugar Fiesta | `ind74_official_sugarfiesta` | `/zplay-restored/20261117/sugarfiesta/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/sugar-fiesta) |
| 38 | Vampires | `ind74_official_vampires` | `/zplay-restored/20261117/vampires/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/vampires) |
| 39 | Samurai | `ind74_official_samurai` | `/zplay-restored/20261117/samurai/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/samurai-deluxe) |
| 40 | Multi Hot Wheel | `ind74_official_multihotwheel` | `/zplay-restored/20261117/multihotwheel/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/multi-hot-wheel) |
| 41 | Plinko X Classic | `ind74_official_plinkoxclassic` | `/zplay-restored/20261117/plinkoxclassic/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/plinko-x-classic) |
| 42 | Plinko X | `ind74_official_plinkox` | `/zplay-restored/20261117/plinkox/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/plinkox) |
| 43 | Mine Island | `ind74_official_mineisland` | `/zplay-restored/20261117/mineisland/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/mine-island) |
| 44 | Mine Island2 | `ind74_official_mineisland2` | `/zplay-restored/20261117/mineisland2/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/mine-island2) |
| 45 | Chicken Ways | `ind74_official_chickenways` | `/zplay-restored/20261117/chickenways/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/chicken-ways) |
| 46 | Chicken Highway | `ind74_official_chickenhighway` | `/zplay-restored/20261117/chickenhighway/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/chicken-highway) |
| 47 | Cheesy Road Classic | `ind74_official_cheesyroadclassic` | `/zplay-restored/20261117/cheesyroadclassic/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/cheesy-road-classic) |
| 48 | Cheesy Road | `ind74_official_cheesyroad` | `/zplay-restored/20261117/cheesyroad/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/cheesy-road) |
| 49 | Wheel Of Destiny | `ind74_official_wheelofdestiny` | `/zplay-restored/20261117/wheelofdestiny/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/wheel-of-destiny) |
| 50 | Bonus Time | `ind74_official_bonustime` | `/zplay-restored/20261117/bonustime/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/bonus-time) |
| 51 | 4 Bonuses Bonanza | `ind74_official_4bonusesbonanza` | `/zplay-restored/20261117/4bonusesbonanza/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/4-bonuses-bonanza) |
| 52 | Fortune Catch | `ind74_official_fortunecatch` | `/zplay-restored/20261117/fortunecatch/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/fortune-catch) |
| 53 | Bottle Mania | `ind74_official_bottlemania` | `/zplay-restored/20261117/bottlemania/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/bottle-mania) |
| 54 | Cai Balao Cappadocia | `ind74_official_caibalaocappadocia` | `/zplay-restored/20261117/caibalaocappadocia/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/cai-balao-cappadocia) |
| 55 | Tower X | `ind74_official_towerx` | `/zplay-restored/20261117/towerx/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/tower-x) |
| 56 | Roll X | `ind74_official_rollx` | `/zplay-restored/20261117/rollx/` | Weli lama heli karo | [SmartSoft](https://www.smartsoftgaming.com/games/rollx) |
| 57 | Balloon | `ind74_official_balloon` | `/games/balloon_native` | Play Now | [SmartSoft](https://www.smartsoftgaming.com/games/balloon) |

## Caddeynta iyo xadka tijaabada

- Player-ka ZPLAY v2.12.0 waxaa lagu arkay browser-ka iyadoo laga maqan yahay session ciyaartoy. Cinwaannada waxaa la waafajiyey module-ka catalog-ga live oo leh 74 diiwaan. SHA-256 ee module-ka waa `f63f386eda81b2eb28b67df15d84d3f619334f9e286460178cd9cbd259414a01`. [Player](https://superwin-player.apdiy61.workers.dev/) · [Module-ka catalog-ga live](https://superwin-player.apdiy61.workers.dev/zplay-player-20261119-play-now-r1/catalog-data.mjs)
- Multi Hot 5 Deluxe waxaa laga furay Play Demo ee bogga SmartSoft. Gameplay-ga wuxuu soo muuqday desktop landscape 1363×936 iyadoo balance-ka lagu muujiyey DMO. Muuqaalka bilowga waxaa ka muuqday saddex reels, multiplier iyo badhamada ciyaarta. Toddobo wareeg, audio, timing iyo paytable lama xaqiijin. Bogga provider-ku wuxuu cinwaanka ka muujiyey Deluxe, halka specification-ka Game Title uu ku qoray Multi Hot 5. Xogtaas laguma ansixin rules ama payout.
- Katalogga rasmiga ahi wuxuu kala muujiyey Plinko X iyo Classic, Cheesy Road iyo Classic, iyo Mine Island iyo Mine Island2. Launcher-ka 4 Bonuses Bonanza wuxuu isticmaalaa `PlinkoJoker`. Bogga Samurai wuxuu isticmaalaa slug-ga `samurai-deluxe`; launcher-ku wuxuu adeegsadaa `Samurai`. [Katalogga SmartSoft](https://www.smartsoftgaming.com/games)
- Launcher HTTP response keliya ma caddeeyo SPIN ama controls. Launcher-ka Multi Hot 10 wuxuu maraa Google redirect halka isku xirka Book of Bonanza uu u baahan yahay xaqiijin kale. Ciyaarna looma calaamadin `REFERENCE_CAPTURED`, `RULES_VERIFIED`, `RELEASE_READY` ama `LIVE_VERIFIED` baaritaankan.
- Multi Hot 20 waa hawl hore oo furan. Checkpoint-kii hore wuxuu diiwaangeliyey tijaabooyin go’doonsan iyo natiijooyin deploy oo aan runtime identity-ga loogu xaqiijin. Live-ka hadda card-ku weli wuxuu muujinayaa Weli lama heli karo. [Diiwaanka shaqada hore](PROJECT_PROGRESS.md)

## Aqoonsiyada cusub 01–72

Dhammaan 72-ka boos waxay sugayaan cinwaanno u qalma sii-deynta cusub. Marka aqoonsi cusub la go’aamiyo, diiwaankiisu wuxuu u baahan yahay frontend route, backend configuration, module, rules version, caddeynta controls iyo rounds, wallet iyo recovery tests, release manifest iyo live verification. Kala horraynta xaaladaha waa `REFERENCE_CAPTURED → RULES_VERIFIED → IMPLEMENTING → TESTING → RELEASE_READY → LIVE_VERIFIED → COMPLETED`. Cilad code lagu saxay waxay sii ahaanaysaa `FIXED_PENDING_RETEST` ilaa dib loo xaqiijiyo.
