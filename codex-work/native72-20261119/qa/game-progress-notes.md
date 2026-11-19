# Source notes for the 72-game progress inventory

This is the **predeployment checkpoint** for the dedicated Habesha Fortune 5
and Multi Hot 5 Deluxe candidates on 19 November 2026. The full per-game record
is `qa/game-progress.json`. No game is marked DONE. A later deployment must be
verified and recorded separately; this file does not certify live availability
or visual fidelity for all games.

## Exact scope and provenance

The current catalog contains **74 unique entries**. The inventory excludes only
the protected originals **Multi Hot 5** (`/games/multi_hot_5_native`) and
**Foxy Hot 20** (`/games/foxy_hot_20_native`), leaving **72** targets.

The source is `changes/lobby-play-now/assets/catalog-data.mjs`, release
`zplay-player-20261119-play-now-r1`, **61,593 bytes**, SHA-256
`f63f386eda81b2eb28b67df15d84d3f619334f9e286460178cd9cbd259414a01`.
It matches the exact catalog size and hash pinned by the live recovered
`native72player1/worker-assets.mjs` in Worker v457
(`11ec5499-9697-4063-bf3f-92252c32f89d`). The JSON records the existing KV key
and the hashes of the supporting source files. All IDs, titles, source indexes,
routes and official links are copied from this catalog, not inferred from names.

The `playNowExposed` field uses the same eligibility check as
`changes/lobby-play-now/assets/lobby.mjs`: status `available` and an eligible
`accountPath`. The 72 targets have **15 exposed account routes** and
**57 preparing/unavailable entries**. A details/page route for a preparing
entry is not a working game route. All local `demoPath` fields remain null,
consistent with the Play Now-only lobby.

## Progress and availability are separate

| Progress state | Games | Meaning |
| --- | ---: | --- |
| Candidate awaiting live verification | 2 | Habesha and Deluxe have isolated local release candidates. |
| Baseline defects identified | 2 | Multi Hot 10 and Safari Simba have recovered-source findings. |
| Blocked by observed rules mismatch | 1 | Wild Multi Stars needs additional rules/source recovery. |
| Retained available route, unreviewed | 10 | Existing lobby route; this continuation makes no per-game completion claim. |
| Unavailable in the lobby | 57 | No account launch is exposed in the exact catalog. |
| DONE | 0 | Reserved for accepted per-game evidence and verified publication. |

Fallback behavior is recorded independently from unavailability. The only
specific nonmatching generic definition documented by this inventory is
Wild Multi Stars, based on `qa/wild-multi-stars-observed.md`. Unknown games
are not labelled working fallbacks, and an `available` catalog flag does not
establish correct settlement, rules, assets, animation or audio.

The two candidate releases are:

| Game | Existing route | Recovered live release | Candidate release |
| --- | --- | --- | --- |
| Habesha Fortune 5 | `/games/habesha_fortune_5_native` | `zplay-native-machines-20261119-habesha-r7` | `zplay-native-machines-20261119-habesha-r8` |
| Multi Hot 5 Deluxe | `/games/multi_hot_5_deluxe_native` | `zplay-native-machines-20261119-mh5deluxe-r1` | `zplay-native-machines-20261119-mh5deluxe-r2` |

Both candidates use `zplay-native-shared-20261119-r1` for the shared foundation.
Their exact existing model identities and all 3,645 reel/multiplier outcomes per
game were checked locally. That parity preserves the existing local math; it is
not a provider certification or a completion claim for all remaining games.

The correct next-pair catalog routes are `/zplay74/multi-hot-10/` and
`/new74/037-safari-simba/`. The findings in `qa/next-games-audit.md` refer to the
unmodified recovered baseline; any later candidate work needs its own evidence.

## Official reference identity

There are **71 distinct catalog-provided official demo URLs and GameName values**
among the 72 targets. Original **JetX** has no official demo URL in the source;
the inventory leaves it null. The listed reference links were not all opened
or launched for this inventory. A link's presence is not a successful demo test.

Several official launcher names differ from their catalog titles. These exact
existing aliases must be preserved rather than guessed:

| Catalog title | Exact `GameName` | Exact `GameCategory` |
| --- | --- | --- |
| Burning Ice | `BlazingHot` | `Slots` |
| Burning Ice 10 | `BlazingHot10` | `Slots` |
| Burning Ice 40 | `BlazingHot40` | `Slots` |
| New Era of JetX | `JetX` | `JetXNew` |
| AviaStar | `JetX3` | `XGames` |
| Crash Duel | `TugOfWar` | `XGames` |
| 4 Bonuses Bonanza | `PlinkoJoker` | `Games` |

Original JetX and New Era of JetX share the catalog's official product-page
URL, but remain separate catalog identities. No account routes or official
demo URLs are duplicated among the 72 targets. No live wager, gambling action,
customer balance or financial record was read or written for this inventory.
