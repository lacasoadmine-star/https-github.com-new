# 72-game free-play UI evidence matrix

**72 targets recorded: 15 catalog-exposed routes, 57 pending entries, 0 UI-verified, 0 DONE.** This prepares isolated money-free presentation testing; it is not a build-completion or visual-parity report.

## Source and scope

Local source root: `/workspace/scratch/9a8b0ddfa7e7/recovery-source/codex-work/native72-20261119`. Its Git HEAD is `e47bf71c2496fbdaf26e3ac5b17319f6c9949646`; the working tree contains uncommitted changes (208 status entries, including 194 untracked entries when checked). At `2026-11-19T06:09:46.555161+00:00`, byte lengths and SHA-256 were rechecked for all **65 distinct selected local files** recorded by this matrix; there were no mismatches with the recorded file hashes. These hashes identify the selected local source files, not a clean commit or the entire working tree.

The separately verified remote anchor is `lacasoadmine-star/https-github.com-new`, branch `work/native72-session-presentation-20261119`, commit `f116c93b7bd91fc53301882c2ba6daca106b3d6b`. **Equivalence between that remote commit and the local edited source has not been established.** The original inventory timestamp is `2026-11-19T05:08:54.178Z`.

The 74-entry catalog excludes protected originals **Multi Hot 5** and **Foxy Hot 20**. **Initial 15** means exposed entries, not the first fifteen target indexes. Original target indexes are preserved; a separate QA queue places exposed entries first, then 57 pending entries.

A page/details URL, cover image or source hash does not establish correct interactive gameplay. The 57 entries remain pending, with no claim their games have been built. All per-game checks remain **UNVERIFIED**. Existing routes in the JSON are metadata only and were not executed for this matrix.

| Source file | Bytes | SHA-256 |
| --- | ---: | --- |
| `qa/game-progress.json` | 153734 | `037ef2bb228f852896dfee0d0613dc6946f496e9d72ece98a8e806f6c9d0079d` |
| `qa/game-progress-notes.md` | 4854 | `b101806b5a4168853d17b677d214d53cd24771981f3cdf7fcbc6d385ecae8453` |
| `changes/lobby-play-now/assets/catalog-data.mjs` | 61593 | `f63f386eda81b2eb28b67df15d84d3f619334f9e286460178cd9cbd259414a01` |
| `qa/next-games-source/verified-external-assets.json` | 14789 | `471fcbaf61370c044d12f44e93263236ad850fd48efe24557c2026da1ed49014` |
| `qa/wild-multi-stars-observed.md` | 5602 | `c509e07bf59f4e729ad760ab74c3bc0131e9fa8b2a1423a97618f71840754b30` |

The local catalog hash matches the expected hash in the local inventory. This does not establish remote branch or live runtime equivalence. Full identities, routes, references and individual UI-file hashes are in `evidence-matrix-72.json`. The selected-file manifest digest is `b7b5dd7ee556a96b72128ab8b607367bca5eabf5033ca9f5829e27861d263006`.

## Confirmed reuse boundaries

- Habesha and Deluxe contain byte-identical menu asset modules (`f00d8986a71bb5305741ae6bfcbcf5a0e0c397721be3bab4b5a5114c2ea3d127`) and startup asset modules (`4729e4e1c3e9f22867442dbd22069cdd5226d70596bfb3b8374e6c45a8674047`). Equal bytes do not certify that each image is appropriate for both titles.
- Their renderers explicitly import shared `motion.mjs` and `native-animation-runtime.mjs`; their audio wrappers import `native-audio.mjs`. Each title still needs its own layout, symbols, timing and sound verification.
- The Deluxe Intro regular font has a locally rechecked hash also present in recovered Multi Hot 10 and Safari media metadata: `8b0279e2a3b54cbd3b30f3bdf369d2abe5c0369c7fc554add136e6d4edff5390`. MH10/Safari media were not downloaded again for this matrix.
- No other shared presentation family or common mechanic is inferred from names, themes or catalog categories.

## Evidence still required

For each title, capture matching official free-demo and isolated-build states, then check startup layers, artwork/symbol geometry, continuous motion, controls and hit areas, AUTO confirmation, audio lifecycle, delayed/rejected mock UI recovery and portrait/landscape/wide layout. The JSON defines each check. Lobby screenshots must not replace interactive content.

The parent reports **two completed Habesha free-demo spins** plus the **AUTO / START PLAY** modal; **one completed Deluxe free-demo spin** plus the **BET selector**; and a **Multi Hot 10 spin start with a staggered reel frame**, whose completion remains pending. These are partial, attributed official-reference observations. They do not verify the local builds or overall parity.

**No local browser verification was completed:** the attempted connection was refused. Every game and QA check remains **UNVERIFIED**, with **0 DONE**. Dedicated UI sources were mapped for Habesha, Deluxe, Multi Hot 10, Safari, Multi Hot 40 and Multi Hot 100; source presence does not certify runtime behavior.

There are 71 catalog-provided official demo identities. Original JetX has no demo URL in the source and remains missing. Wild Multi Stars has an existing reference-mismatch note; no presentation equivalence is assumed. No financial-operation or production-change tasks are included.

## Complete queue

| QA queue | Original target | Group | Game | Mapped UI source | Status |
| ---: | ---: | --- | --- | --- | --- |
| 1 | 1 | Initial 15 | Habesha Fortune 5 | 11 files | UNVERIFIED |
| 2 | 2 | Initial 15 | Multi Hot 40 | 8 files | UNVERIFIED |
| 3 | 3 | Initial 15 | Safari Simba | 11 files | UNVERIFIED |
| 4 | 4 | Initial 15 | Multi Hot 10 | 9 files | UNVERIFIED |
| 5 | 6 | Initial 15 | Multi Hot 100 | 4 files | UNVERIFIED |
| 6 | 7 | Initial 15 | Multi Hot 5 Wild | Not mapped | UNVERIFIED |
| 7 | 8 | Initial 15 | Multi Hot 5 Deluxe | 13 files | UNVERIFIED |
| 8 | 10 | Initial 15 | Multi Hot 5 Super Wilds | Not mapped | UNVERIFIED |
| 9 | 11 | Initial 15 | Multi Hot Wild Ways | Not mapped | UNVERIFIED |
| 10 | 16 | Initial 15 | Burning Ice | Not mapped | UNVERIFIED |
| 11 | 17 | Initial 15 | Burning Ice 10 | Not mapped | UNVERIFIED |
| 12 | 18 | Initial 15 | Burning Ice 40 | Not mapped | UNVERIFIED |
| 13 | 19 | Initial 15 | Wild Multi Stars | Not mapped | UNVERIFIED |
| 14 | 42 | Initial 15 | JetX | Not mapped | UNVERIFIED |
| 15 | 45 | Initial 15 | Balloon | Not mapped | UNVERIFIED |
| 16 | 5 | Remaining 57 | Multi Hot 20 | Not mapped | UNVERIFIED |
| 17 | 9 | Remaining 57 | Multi Hot 5 Burn Wilds | Not mapped | UNVERIFIED |
| 18 | 12 | Remaining 57 | Multi Hot Ways | Not mapped | UNVERIFIED |
| 19 | 13 | Remaining 57 | Multi Hot Wheel | Not mapped | UNVERIFIED |
| 20 | 14 | Remaining 57 | Multi Fruits Charging Wilds | Not mapped | UNVERIFIED |
| 21 | 15 | Remaining 57 | Gems Crown Charging Wilds | Not mapped | UNVERIFIED |
| 22 | 20 | Remaining 57 | Mariachi Coins | Not mapped | UNVERIFIED |
| 23 | 21 | Remaining 57 | Hot Samba | Not mapped | UNVERIFIED |
| 24 | 22 | Remaining 57 | Power of Tiger | Not mapped | UNVERIFIED |
| 25 | 23 | Remaining 57 | Gates of Merlyn | Not mapped | UNVERIFIED |
| 26 | 24 | Remaining 57 | Dice Jungle | Not mapped | UNVERIFIED |
| 27 | 25 | Remaining 57 | Coins Of Atlantis | Not mapped | UNVERIFIED |
| 28 | 26 | Remaining 57 | Jingle Bell Bonanza | Not mapped | UNVERIFIED |
| 29 | 27 | Remaining 57 | Book of Bonanza | Not mapped | UNVERIFIED |
| 30 | 28 | Remaining 57 | Book of Futuria | Not mapped | UNVERIFIED |
| 31 | 29 | Remaining 57 | Genie's Bonanza | Not mapped | UNVERIFIED |
| 32 | 30 | Remaining 57 | Farm's Fortune | Not mapped | UNVERIFIED |
| 33 | 31 | Remaining 57 | Mad Slot | Not mapped | UNVERIFIED |
| 34 | 32 | Remaining 57 | Wilds and Gods | Not mapped | UNVERIFIED |
| 35 | 33 | Remaining 57 | Bao Slot 5X | Not mapped | UNVERIFIED |
| 36 | 34 | Remaining 57 | Jungle Sisters | Not mapped | UNVERIFIED |
| 37 | 35 | Remaining 57 | Jungle Sisters Deluxe | Not mapped | UNVERIFIED |
| 38 | 36 | Remaining 57 | Boka Jamba 10 | Not mapped | UNVERIFIED |
| 39 | 37 | Remaining 57 | Dragon's Code | Not mapped | UNVERIFIED |
| 40 | 38 | Remaining 57 | Dracula's Fortune | Not mapped | UNVERIFIED |
| 41 | 39 | Remaining 57 | Sugar Fiesta | Not mapped | UNVERIFIED |
| 42 | 40 | Remaining 57 | Vampires | Not mapped | UNVERIFIED |
| 43 | 41 | Remaining 57 | Samurai | Not mapped | UNVERIFIED |
| 44 | 43 | Remaining 57 | New Era of JetX | Not mapped | UNVERIFIED |
| 45 | 44 | Remaining 57 | BalloonX | Not mapped | UNVERIFIED |
| 46 | 46 | Remaining 57 | Plinko X | Not mapped | UNVERIFIED |
| 47 | 47 | Remaining 57 | Plinko X Classic | Not mapped | UNVERIFIED |
| 48 | 48 | Remaining 57 | Helicopter X | Not mapped | UNVERIFIED |
| 49 | 49 | Remaining 57 | Football X | Not mapped | UNVERIFIED |
| 50 | 50 | Remaining 57 | Cricket X | Not mapped | UNVERIFIED |
| 51 | 51 | Remaining 57 | CricketerX | Not mapped | UNVERIFIED |
| 52 | 52 | Remaining 57 | CarX | Not mapped | UNVERIFIED |
| 53 | 53 | Remaining 57 | AviaStar | Not mapped | UNVERIFIED |
| 54 | 54 | Remaining 57 | Smash X | Not mapped | UNVERIFIED |
| 55 | 55 | Remaining 57 | Crash Duel | Not mapped | UNVERIFIED |
| 56 | 56 | Remaining 57 | PopX | Not mapped | UNVERIFIED |
| 57 | 57 | Remaining 57 | Propel X | Not mapped | UNVERIFIED |
| 58 | 58 | Remaining 57 | World Champion X | Not mapped | UNVERIFIED |
| 59 | 59 | Remaining 57 | Mine Island | Not mapped | UNVERIFIED |
| 60 | 60 | Remaining 57 | Mine Island2 | Not mapped | UNVERIFIED |
| 61 | 61 | Remaining 57 | Chicken Ways | Not mapped | UNVERIFIED |
| 62 | 62 | Remaining 57 | Chicken Highway | Not mapped | UNVERIFIED |
| 63 | 63 | Remaining 57 | Cheesy Road | Not mapped | UNVERIFIED |
| 64 | 64 | Remaining 57 | Cheesy Road Classic | Not mapped | UNVERIFIED |
| 65 | 65 | Remaining 57 | Fortune Catch | Not mapped | UNVERIFIED |
| 66 | 66 | Remaining 57 | Bottle Mania | Not mapped | UNVERIFIED |
| 67 | 67 | Remaining 57 | Cai Balao Cappadocia | Not mapped | UNVERIFIED |
| 68 | 68 | Remaining 57 | 4 Bonuses Bonanza | Not mapped | UNVERIFIED |
| 69 | 69 | Remaining 57 | Wheel Of Destiny | Not mapped | UNVERIFIED |
| 70 | 70 | Remaining 57 | Bonus Time | Not mapped | UNVERIFIED |
| 71 | 71 | Remaining 57 | Tower X | Not mapped | UNVERIFIED |
| 72 | 72 | Remaining 57 | Roll X | Not mapped | UNVERIFIED |

## Final parent browser update

Multi Hot 10 completed its observed reference spin; a staggered reel frame and settled win display were observed. Safari also completed one reference spin and returned to ready controls with a changed grid. These are partial reference observations, not local-build acceptance. All 72 statuses remain UNVERIFIED and DONE remains zero.
