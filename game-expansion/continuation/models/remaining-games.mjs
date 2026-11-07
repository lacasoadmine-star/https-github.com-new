// Unpublished ZPLAY continuation candidates; production registration is gated.
import {createRemainingEngine,slotScales,linePaths,towerXDistribution,minesPayout,mineChoices,mineBoostActive,mineSafeProbability,towerFrozenValue} from './remaining-engine.mjs';
export const remainingPublicConfigs = [
  {
    "id": "moonstone_native",
    "name": "Moonstone",
    "type": "slots",
    "family": "cascade",
    "columns": 5,
    "rows": 3,
    "paylines": 0,
    "symbols": [
      {
        "id": "moon",
        "label": "Moon",
        "mark": "☾",
        "color": "#d6e9ff"
      },
      {
        "id": "wolf",
        "label": "Wolf",
        "mark": "♠",
        "color": "#c9d5ef"
      },
      {
        "id": "owl",
        "label": "Owl",
        "mark": "◉",
        "color": "#b5a4ef"
      },
      {
        "id": "gem",
        "label": "Moonstone",
        "mark": "◆",
        "color": "#6fddff"
      },
      {
        "id": "candle",
        "label": "Candle",
        "mark": "♜",
        "color": "#eeb28b"
      },
      {
        "id": "a",
        "label": "Ace",
        "mark": "A",
        "color": "#ce9fff"
      },
      {
        "id": "k",
        "label": "King",
        "mark": "K",
        "color": "#9bc9ff"
      },
      {
        "id": "q",
        "label": "Queen",
        "mark": "Q",
        "color": "#83d8d1"
      },
      {
        "id": "j",
        "label": "Jack",
        "mark": "J",
        "color": "#b8ce8d"
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#f3d5ff"
      },
      {
        "id": "scatter",
        "label": "Bonus",
        "mark": "☽",
        "color": "#c1f1ff"
      }
    ],
    "theme": {
      "bg": "#100e2b",
      "accent": "#b99cff",
      "secondary": "#73d8ff"
    },
    "featureDescription": "243 ways, rolling reels, 15/20/25 free spins and a rolling multiplier up to 10× during free spins.",
    "version": "superwin-moonstone-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact public symbol paytable and symbol mapping",
        "Optional buy bonus and complete demo controls",
        "Official presentation and audio"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100
    },
    "ways": 243,
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 10000,
      "capTimesTotalStake": 100
    }
  },
  {
    "id": "magicgarden_native",
    "name": "Magic Garden",
    "type": "slots",
    "family": "slots",
    "columns": 5,
    "rows": 3,
    "paylines": 20,
    "symbols": [
      {
        "id": "seven",
        "label": "Seven",
        "mark": "7",
        "color": "#ff465f"
      },
      {
        "id": "bell",
        "label": "Bell",
        "mark": "♧",
        "color": "#ffc74a"
      },
      {
        "id": "grape",
        "label": "Grapes",
        "mark": "●",
        "color": "#a984ff"
      },
      {
        "id": "melon",
        "label": "Melon",
        "mark": "◒",
        "color": "#ff6a7e"
      },
      {
        "id": "orange",
        "label": "Orange",
        "mark": "●",
        "color": "#ffad41"
      },
      {
        "id": "lemon",
        "label": "Lemon",
        "mark": "◆",
        "color": "#ffe869"
      },
      {
        "id": "cherry",
        "label": "Cherries",
        "mark": "●",
        "color": "#ff4669"
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#eaff78"
      },
      {
        "id": "scatter",
        "label": "Scatter",
        "mark": "S",
        "color": "#6beaff"
      },
      {
        "id": "magic",
        "label": "Magic",
        "mark": "✧",
        "color": "#bafc8e"
      }
    ],
    "theme": {
      "bg": "#102c25",
      "accent": "#9bdf54",
      "secondary": "#dc9dff"
    },
    "featureDescription": "Three lucky boxes multiply qualifying lines. A magic symbol on reel five changes symbols to wilds.",
    "version": "superwin-magicgarden-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact base-game payline geometry and numeric public paytable",
        "Optional gamble",
        "Official presentation and audio"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100
    },
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 10000,
      "capTimesTotalStake": 100
    }
  },
  {
    "id": "bookofmagic_native",
    "name": "Book of Magic",
    "type": "slots",
    "family": "slots",
    "columns": 5,
    "rows": 3,
    "paylines": 20,
    "symbols": [
      {
        "id": "wizard",
        "label": "Wizard",
        "mark": "♔",
        "color": "#eaf3ff",
        "providerSymbolId": 10
      },
      {
        "id": "princess",
        "label": "Sorceress",
        "mark": "♛",
        "color": "#f0a7d9",
        "providerSymbolId": 9
      },
      {
        "id": "chest",
        "label": "Treasure chest",
        "mark": "▣",
        "color": "#ffc867",
        "providerSymbolId": 8
      },
      {
        "id": "sceptre",
        "label": "Sceptre",
        "mark": "✧",
        "color": "#9bdc63",
        "providerSymbolId": 7
      },
      {
        "id": "amulet",
        "label": "Amulet",
        "mark": "◇",
        "color": "#d794ff",
        "providerSymbolId": 6
      },
      {
        "id": "a",
        "label": "Ace",
        "mark": "A",
        "color": "#ffc879",
        "providerSymbolId": 5
      },
      {
        "id": "k",
        "label": "King",
        "mark": "K",
        "color": "#ff9b70",
        "providerSymbolId": 4
      },
      {
        "id": "q",
        "label": "Queen",
        "mark": "Q",
        "color": "#80d991",
        "providerSymbolId": 3
      },
      {
        "id": "j",
        "label": "Jack",
        "mark": "J",
        "color": "#76beef",
        "providerSymbolId": 2
      },
      {
        "id": "ten",
        "label": "Ten",
        "mark": "10",
        "color": "#ba99ef",
        "providerSymbolId": 1
      },
      {
        "id": "nine",
        "label": "Nine",
        "mark": "9",
        "color": "#f39fdf",
        "providerSymbolId": 0
      },
      {
        "id": "wild",
        "label": "Book Wild",
        "mark": "W",
        "color": "#f8d883",
        "providerSymbolId": 11
      },
      {
        "id": "scatter",
        "label": "Crystal ball Scatter",
        "mark": "S",
        "color": "#ea94ee",
        "providerSymbolId": 12
      }
    ],
    "theme": {
      "bg": "#17132d",
      "accent": "#e1b85c",
      "secondary": "#a38afa"
    },
    "featureDescription": "Three or more Scatters award15 free spins at3×; retriggers add15. Substituting Book Wilds double a line once. The20 verified paths are used.",
    "version": "superwin-bookofmagic-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Numeric symbol paytable injected by public demo startup",
        "Optional line selection, gamble and Jackpot Cards",
        "Official presentation and audio"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100
    },
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 10000,
      "capTimesTotalStake": 100,
      "verifiedPaths": [
        [
          1,
          1,
          1,
          1,
          1
        ],
        [
          0,
          0,
          0,
          0,
          0
        ],
        [
          2,
          2,
          2,
          2,
          2
        ],
        [
          0,
          1,
          2,
          1,
          0
        ],
        [
          2,
          1,
          0,
          1,
          2
        ],
        [
          0,
          0,
          1,
          2,
          2
        ],
        [
          2,
          2,
          1,
          0,
          0
        ],
        [
          1,
          2,
          2,
          2,
          1
        ],
        [
          1,
          0,
          0,
          0,
          1
        ],
        [
          0,
          1,
          1,
          1,
          0
        ],
        [
          2,
          1,
          1,
          1,
          2
        ],
        [
          1,
          2,
          1,
          0,
          1
        ],
        [
          1,
          0,
          1,
          2,
          1
        ],
        [
          0,
          1,
          0,
          1,
          0
        ],
        [
          2,
          1,
          2,
          1,
          2
        ],
        [
          1,
          1,
          2,
          1,
          1
        ],
        [
          1,
          1,
          0,
          1,
          1
        ],
        [
          0,
          2,
          0,
          2,
          0
        ],
        [
          2,
          0,
          2,
          0,
          2
        ],
        [
          1,
          0,
          2,
          0,
          1
        ]
      ]
    }
  },
  {
    "id": "darkhorus_native",
    "name": "Dark Horus",
    "type": "slots",
    "family": "slots",
    "columns": 5,
    "rows": 3,
    "paylines": 20,
    "symbols": [
      {
        "id": "crown",
        "label": "Crown",
        "mark": "♛",
        "color": "#f5ce65"
      },
      {
        "id": "chalice",
        "label": "Chalice",
        "mark": "♜",
        "color": "#e6bf79"
      },
      {
        "id": "ring",
        "label": "Ring",
        "mark": "◎",
        "color": "#f5d990"
      },
      {
        "id": "hourglass",
        "label": "Hourglass",
        "mark": "⌛",
        "color": "#8be8f7"
      },
      {
        "id": "ruby",
        "label": "Ruby",
        "mark": "◆",
        "color": "#ff6488"
      },
      {
        "id": "emerald",
        "label": "Emerald",
        "mark": "◆",
        "color": "#49d9a3"
      },
      {
        "id": "sapphire",
        "label": "Sapphire",
        "mark": "◆",
        "color": "#65a7ff"
      },
      {
        "id": "amethyst",
        "label": "Amethyst",
        "mark": "◆",
        "color": "#cc82ff"
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#ffef97"
      },
      {
        "id": "scatter",
        "label": "Temple",
        "mark": "Ω",
        "color": "#ffed9b"
      },
      {
        "id": "multiplier",
        "label": "Multiplier",
        "mark": "×",
        "color": "#ffe48a"
      }
    ],
    "theme": {
      "bg": "#131820",
      "accent": "#e2bd64",
      "secondary": "#56d8cf"
    },
    "featureDescription": "Unpublished design study: exact official title and reference remain unresolved.",
    "version": "superwin-darkhorus-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": false,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100
    }
  },
  {
    "id": "samurai_native",
    "name": "Samurai",
    "type": "slots",
    "family": "cascade",
    "columns": 5,
    "rows": 3,
    "paylines": 0,
    "symbols": [
      {
        "id": "samurai",
        "label": "Samurai",
        "mark": "侍",
        "color": "#f1c4b6"
      },
      {
        "id": "katana",
        "label": "Katana",
        "mark": "⚔",
        "color": "#e7efff"
      },
      {
        "id": "helmet",
        "label": "Helmet",
        "mark": "兜",
        "color": "#f2bf62"
      },
      {
        "id": "fan",
        "label": "Fan",
        "mark": "◒",
        "color": "#ef9ac1"
      },
      {
        "id": "pagoda",
        "label": "Pagoda",
        "mark": "塔",
        "color": "#d6a479"
      },
      {
        "id": "a",
        "label": "Ace",
        "mark": "A",
        "color": "#fe8585"
      },
      {
        "id": "k",
        "label": "King",
        "mark": "K",
        "color": "#f6bc77"
      },
      {
        "id": "q",
        "label": "Queen",
        "mark": "Q",
        "color": "#beb1ed"
      },
      {
        "id": "j",
        "label": "Jack",
        "mark": "J",
        "color": "#96bfdb"
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#fff0a9"
      },
      {
        "id": "scatter",
        "label": "Bonus",
        "mark": "紋",
        "color": "#e1a5ff"
      }
    ],
    "theme": {
      "bg": "#24111a",
      "accent": "#f17361",
      "secondary": "#eec976"
    },
    "featureDescription": "243 ways with rolling reels; 15/20/25 free spins and rolling multipliers up to 10×.",
    "version": "superwin-samurai-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact public symbol paytable and symbol mapping",
        "Optional buy bonus and complete demo controls",
        "Official presentation and audio"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100
    },
    "ways": 243,
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 10000,
      "capTimesTotalStake": 100
    }
  },
  {
    "id": "vegasnights_native",
    "name": "Vegas Nights",
    "type": "slots",
    "family": "slots",
    "columns": 5,
    "rows": 3,
    "paylines": 25,
    "symbols": [
      {
        "id": "vegas3",
        "label": "Reference symbol 3",
        "mark": "3",
        "color": "#cfc4ff",
        "providerSymbolId": 3
      },
      {
        "id": "vegas4",
        "label": "Reference symbol 4",
        "mark": "4",
        "color": "#cfc4ff",
        "providerSymbolId": 4
      },
      {
        "id": "vegas5",
        "label": "Reference symbol 5",
        "mark": "5",
        "color": "#cfc4ff",
        "providerSymbolId": 5
      },
      {
        "id": "vegas6",
        "label": "Reference symbol 6",
        "mark": "6",
        "color": "#cfc4ff",
        "providerSymbolId": 6
      },
      {
        "id": "vegas7",
        "label": "Reference symbol 7",
        "mark": "7",
        "color": "#cfc4ff",
        "providerSymbolId": 7
      },
      {
        "id": "vegas8",
        "label": "Reference symbol 8",
        "mark": "8",
        "color": "#cfc4ff",
        "providerSymbolId": 8
      },
      {
        "id": "vegas9",
        "label": "Reference symbol 9",
        "mark": "9",
        "color": "#cfc4ff",
        "providerSymbolId": 9
      },
      {
        "id": "vegas10",
        "label": "Reference symbol 10",
        "mark": "10",
        "color": "#cfc4ff",
        "providerSymbolId": 10
      },
      {
        "id": "vegas11",
        "label": "Reference symbol 11",
        "mark": "11",
        "color": "#cfc4ff",
        "providerSymbolId": 11
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#fff1b4",
        "providerSymbolId": 2
      },
      {
        "id": "scatter",
        "label": "Scatter",
        "mark": "S",
        "color": "#ff9dce",
        "providerSymbolId": 1
      },
      {
        "id": "gold",
        "label": "Super Wild",
        "mark": "★",
        "color": "#ffd24e",
        "providerSymbolId": 13
      },
      {
        "id": "royal-wild",
        "label": "Converted royal Wild",
        "mark": "W",
        "color": "#b997f5",
        "providerSymbolId": 12
      }
    ],
    "theme": {
      "bg": "#210f35",
      "accent": "#ef73dc",
      "secondary": "#70e8f3"
    },
    "featureDescription": "Three Scatters on reels2–4 award5 free spins and2× total stake; retriggers add5. A middle Super Wild on reel5 adds3 extra-wild respins. Free-spin Wild and Super Wild factors are2×/3×; converted royals have no factor.",
    "version": "superwin-vegasnights-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact symbol artwork mapping and full presentation/audio",
        "All official menu/optional controls",
        "Independent uniform-stop model return evaluation"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100,
      "paytableStatus": "Exact public numeric line table and25paths; no prize scaling.",
      "rng": "Independent uniform sampling of publicly exposed presentation strips; provider stop probabilities are not verified.",
      "freeSpinWildFactors": {
        "wild": [
          2,
          3
        ],
        "superWild": [
          2,
          3
        ],
        "convertedRoyal": 1,
        "combination": "Multiply factors on the winning line; maximum81."
      }
    },
    "paytable": {
      "basis": "Per active line bet;25 fixed lines",
      "verifiedPublicTable": true,
      "byProviderSymbolId": {
        "0": {},
        "1": {},
        "2": {},
        "3": {
          "5": 150,
          "4": 75,
          "3": 10
        },
        "4": {
          "5": 125,
          "4": 50,
          "3": 5
        },
        "5": {
          "5": 100,
          "4": 25,
          "3": 5
        },
        "6": {
          "5": 100,
          "4": 25,
          "3": 5
        },
        "7": {
          "5": 75,
          "4": 20,
          "3": 5
        },
        "8": {
          "5": 50,
          "4": 20,
          "3": 5
        },
        "9": {
          "5": 50,
          "4": 10,
          "3": 5
        },
        "10": {
          "5": 50,
          "4": 10,
          "3": 5
        },
        "11": {
          "5": 50,
          "4": 10,
          "3": 5
        },
        "12": {},
        "13": {}
      },
      "scatter": {
        "count": 3,
        "totalStakeMultiplier": 2,
        "freeSpins": 5
      },
      "paths": [
        [
          1,
          1,
          1,
          1,
          1
        ],
        [
          0,
          0,
          0,
          0,
          0
        ],
        [
          2,
          2,
          2,
          2,
          2
        ],
        [
          0,
          1,
          2,
          1,
          0
        ],
        [
          2,
          1,
          0,
          1,
          2
        ],
        [
          1,
          0,
          0,
          0,
          1
        ],
        [
          1,
          2,
          2,
          2,
          1
        ],
        [
          0,
          0,
          1,
          2,
          2
        ],
        [
          2,
          2,
          1,
          0,
          0
        ],
        [
          1,
          2,
          1,
          0,
          1
        ],
        [
          1,
          0,
          1,
          2,
          1
        ],
        [
          0,
          1,
          1,
          1,
          0
        ],
        [
          2,
          1,
          1,
          1,
          2
        ],
        [
          0,
          1,
          0,
          1,
          0
        ],
        [
          2,
          1,
          2,
          1,
          2
        ],
        [
          1,
          1,
          0,
          1,
          1
        ],
        [
          1,
          1,
          2,
          1,
          1
        ],
        [
          0,
          0,
          2,
          0,
          0
        ],
        [
          2,
          2,
          0,
          2,
          2
        ],
        [
          0,
          2,
          2,
          2,
          0
        ],
        [
          2,
          0,
          0,
          0,
          2
        ],
        [
          1,
          2,
          0,
          2,
          1
        ],
        [
          1,
          0,
          2,
          0,
          1
        ],
        [
          0,
          2,
          0,
          2,
          0
        ],
        [
          2,
          0,
          2,
          0,
          2
        ]
      ]
    }
  },
  {
    "id": "assassins_native",
    "name": "Assassins",
    "type": "slots",
    "family": "slots",
    "columns": 5,
    "rows": 4,
    "paylines": 30,
    "symbols": [
      {
        "id": "crown",
        "label": "Crown",
        "mark": "♛",
        "color": "#f5ce65"
      },
      {
        "id": "chalice",
        "label": "Chalice",
        "mark": "♜",
        "color": "#e6bf79"
      },
      {
        "id": "ring",
        "label": "Ring",
        "mark": "◎",
        "color": "#f5d990"
      },
      {
        "id": "hourglass",
        "label": "Hourglass",
        "mark": "⌛",
        "color": "#8be8f7"
      },
      {
        "id": "ruby",
        "label": "Ruby",
        "mark": "◆",
        "color": "#ff6488"
      },
      {
        "id": "emerald",
        "label": "Emerald",
        "mark": "◆",
        "color": "#49d9a3"
      },
      {
        "id": "sapphire",
        "label": "Sapphire",
        "mark": "◆",
        "color": "#65a7ff"
      },
      {
        "id": "amethyst",
        "label": "Amethyst",
        "mark": "◆",
        "color": "#cc82ff"
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#ffef97"
      },
      {
        "id": "scatter",
        "label": "Temple",
        "mark": "Ω",
        "color": "#ffed9b"
      },
      {
        "id": "multiplier",
        "label": "Multiplier",
        "mark": "×",
        "color": "#ffe48a"
      }
    ],
    "theme": {
      "bg": "#111a26",
      "accent": "#e55968",
      "secondary": "#8f92e4"
    },
    "featureDescription": "Unpublished design study: exact official title and reference remain unresolved.",
    "version": "superwin-assassins-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": false,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100
    }
  },
  {
    "id": "towerx_native",
    "name": "Tower X",
    "type": "tower",
    "family": "tower",
    "columns": 1,
    "rows": 8,
    "paylines": 0,
    "symbols": [],
    "theme": {
      "bg": "#101d36",
      "accent": "#ed9bff",
      "secondary": "#66e5f1"
    },
    "featureDescription": "Automatic building sequence: five building types add multipliers. Total stake contains 100 base units; the round ends with the umbrella jump.",
    "version": "superwin-towerx-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)",
      "mode": "atomic",
      "baseUnitsPerStake": 100
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Complete official building presentation, art, animations, audio and controls"
      ]
    },
    "maxWinMultiplier": 50,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Exact discrete expectation, not Monte Carlo.",
      "targetReturn": "Exactly97% before minor-unit rounding.",
      "basis": "E[building sum]=97;total cost100base units; maximumsum5000."
    },
    "paytable": {
      "basis": "Total stake contains100base units; payout=totalStake×buildingSum/100.",
      "verifiedPublicRanges": true,
      "buildingRanges": {
        "suburb": [
          1,
          5
        ],
        "city": [
          6,
          10
        ],
        "green": [
          15,
          40
        ],
        "elite": [
          50,
          90
        ],
        "neon": [
          100,
          1000
        ]
      },
      "maximumSum": 5000
    }
  },
  {
    "id": "towerrush_native",
    "name": "Tower Rush",
    "type": "tower",
    "family": "tower",
    "columns": 1,
    "rows": 10,
    "paylines": 0,
    "symbols": [],
    "theme": {
      "bg": "#122738",
      "accent": "#ffd06c",
      "secondary": "#71d8ce"
    },
    "featureDescription": "Build or cash out. Frozen Floor protects the entire current win; no further bonuses after a freeze. Temple wheel has9 multiplier sections plus freeze. Triple Build adds3 automatic floors.",
    "version": "superwin-towerrush-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [
      "step",
      "cashout"
    ],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Complete official presentation/audio/controls",
        "Provider1-hour disconnect policy differs from platform30-minute settlement safeguard"
      ]
    },
    "maxWinMultiplier": null,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Analytic optimal-stopping value, tested with integer payouts; independent of provider probabilities.",
      "targetReturn": "97% for an optimal continuation policy before rounding/caps; early collection of a freeze can return less.",
      "basis": "Unfrozen landing odds normalize the exact continuation option value of a full bank. Frozen continuation succeeds with probability1/2 at1.5×; full bank is paid on collapse."
    },
    "paytable": {
      "basis": "Current cashout multiplies by successful floor factors; after freeze a collapse pays the full bank.",
      "verifiedPublicBonusValues": true,
      "templeWheel": [
        1.5,
        1.5,
        2,
        2,
        3,
        3,
        5,
        5,
        7,
        "freeze"
      ],
      "nativeNormalFactor": 1.25,
      "nativePostFreezeFactor": 1.5,
      "nativeTripleAdditionalFactors": [
        1.25,
        1.25,
        1.25
      ]
    }
  },
  {
    "id": "egyptianlegends_native",
    "name": "Egyptian Legends",
    "type": "slots",
    "family": "cascade",
    "columns": 6,
    "rows": 5,
    "paylines": 0,
    "symbols": [
      {
        "id": "ankh",
        "label": "Ankh",
        "mark": "☥",
        "color": "#f7d86c",
        "providerSymbolId": 2
      },
      {
        "id": "eyeOfHorus",
        "label": "Eye of Horus",
        "mark": "◉",
        "color": "#71c9e4",
        "providerSymbolId": 3
      },
      {
        "id": "book",
        "label": "Book",
        "mark": "▣",
        "color": "#dfb376",
        "providerSymbolId": 4
      },
      {
        "id": "papyrus",
        "label": "Papyrus",
        "mark": "▤",
        "color": "#e4cc99",
        "providerSymbolId": 5
      },
      {
        "id": "redGem",
        "label": "Red gem",
        "mark": "◆",
        "color": "#f06475",
        "providerSymbolId": 6
      },
      {
        "id": "purpleGem",
        "label": "Purple gem",
        "mark": "◆",
        "color": "#bf8df2",
        "providerSymbolId": 7
      },
      {
        "id": "blueGem",
        "label": "Blue gem",
        "mark": "◆",
        "color": "#77b9ff",
        "providerSymbolId": 8
      },
      {
        "id": "greenGem",
        "label": "Green gem",
        "mark": "◆",
        "color": "#75d8a0",
        "providerSymbolId": 9
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#f4d77b",
        "providerSymbolId": 1
      },
      {
        "id": "scatter",
        "label": "Pyramid Scatter",
        "mark": "△",
        "color": "#f6df84",
        "providerSymbolId": 10
      },
      {
        "id": "multiplier",
        "label": "Multiplier",
        "mark": "×",
        "color": "#e8cf75",
        "providerSymbolId": 11
      }
    ],
    "theme": {
      "bg": "#251c24",
      "accent": "#edc46a",
      "secondary": "#8fd4df"
    },
    "featureDescription": "6×5 pay-anywhere cascades. Crashed symbols unlock Bastet, Sobek, Isis, Anubis and Horus at20/40/60/85/110 points. Bonus10 free spins; verified retriggers add2/3/5/10.",
    "version": "superwin-egyptianlegends-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact numeric public symbol paytable",
        "Buy bonus, ante bet and all official selectable modes",
        "Official presentation/audio and controls",
        "Exact Anubis cell increment and cell-sum scope",
        "Super Bonus and paid feature selection"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100,
      "paytableStatus": "Independent review coefficients; exact runtime GetPayTable coefficients are unresolved.",
      "explicitReviewAssumptions": [
        "Anubis adds1 to each involved marked cell; exact increment and sum scope remain unverified.",
        "Feature-generated cascades do not refill the ordinary progress bar during an active power.",
        "Multiplier appearance weights and numeric symbol prizes are independent review values.",
        "Base-game scatter award is unverified and not paid in this disabled prototype.",
        "Buy bonus, ante bet, super bonus and paid power selection remain unavailable."
      ]
    },
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 10000,
      "capTimesTotalStake": 100
    }
  },
  {
    "id": "olympianlegends_native",
    "name": "Olympian Legends",
    "type": "slots",
    "family": "cascade",
    "columns": 6,
    "rows": 5,
    "paylines": 0,
    "symbols": [
      {
        "id": "majorYellow",
        "label": "Major yellow gem",
        "mark": "◆",
        "color": "#f5d767",
        "providerSymbolId": 2
      },
      {
        "id": "majorRed",
        "label": "Major red gem",
        "mark": "◆",
        "color": "#f47386",
        "providerSymbolId": 3
      },
      {
        "id": "majorBlue",
        "label": "Major blue gem",
        "mark": "◆",
        "color": "#81b5fc",
        "providerSymbolId": 4
      },
      {
        "id": "majorGreen",
        "label": "Major green gem",
        "mark": "◆",
        "color": "#7cdbad",
        "providerSymbolId": 5
      },
      {
        "id": "simpleYellow",
        "label": "Yellow gem",
        "mark": "◆",
        "color": "#d9ba55",
        "providerSymbolId": 6
      },
      {
        "id": "simpleRed",
        "label": "Red gem",
        "mark": "◆",
        "color": "#ce6b79",
        "providerSymbolId": 7
      },
      {
        "id": "simpleBlue",
        "label": "Blue gem",
        "mark": "◆",
        "color": "#70a0d9",
        "providerSymbolId": 8
      },
      {
        "id": "simpleGreen",
        "label": "Green gem",
        "mark": "◆",
        "color": "#67b88e",
        "providerSymbolId": 9
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#f2e9a7",
        "providerSymbolId": 1
      },
      {
        "id": "scatter",
        "label": "Scatter",
        "mark": "S",
        "color": "#e8d69c",
        "providerSymbolId": 10
      }
    ],
    "theme": {
      "bg": "#172446",
      "accent": "#f0d898",
      "secondary": "#a3baff"
    },
    "featureDescription": "6×5 pay-anywhere cascades. Queued Poseidon, Hecate, Atlas, Hephaestus and Zeus powers unlock at20/40/60/85/110 points. Four or more Scatters award12 free spins.",
    "version": "superwin-olympianlegends-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact numeric public symbol paytable",
        "Buy bonus, ante bet and all official selectable modes",
        "Official presentation/audio and controls",
        "Exact Atlas block dimensions and scatter/retrigger table"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100,
      "paytableStatus": "Independent review coefficients; exact runtime GetPayTable coefficients are unresolved.",
      "explicitReviewAssumptions": [
        "Atlas uses a3×3 review rectangle; provider dimensions are unverified.",
        "Free-spin retrigger and scatter payout table remain unavailable.",
        "Feature-generated cascades do not refill the ordinary progress bar during an active power.",
        "Buy bonus and ante bet remain unavailable."
      ]
    },
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 10000,
      "capTimesTotalStake": 100
    }
  },
  {
    "id": "coinminer_native",
    "name": "Coin Miner",
    "type": "mines",
    "family": "mines",
    "columns": 5,
    "rows": 5,
    "paylines": 0,
    "symbols": [
      {
        "id": "coin",
        "label": "Gold coin",
        "mark": "●",
        "color": "#f4ce69"
      },
      {
        "id": "mine",
        "label": "Mine",
        "mark": "✹",
        "color": "#f16d6d"
      }
    ],
    "theme": {
      "bg": "#132423",
      "accent": "#efca68",
      "secondary": "#76cfc8"
    },
    "featureDescription": "5×5 dynamic reveals using the current official94-variant multiplier table. TreasureBoost activates after18 safes for3mines, after1 for5mines, and immediately for7/10/17/20. Rescued picks are marked.",
    "version": "superwin-coinminer-3",
    "controls": {
      "stakeLabel": "Total stake (ETB)",
      "mines": {
        "min": 1,
        "max": 24,
        "default": 3,
        "choices": [
          1,
          2,
          3,
          5,
          7,
          10,
          17,
          20,
          24
        ],
        "values": [
          1,
          2,
          3,
          5,
          7,
          10,
          17,
          20,
          24
        ]
      }
    },
    "actions": [
      "pick",
      "cashout"
    ],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "requestedName": "CoinMin",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Complete official presentation/audio and controls",
        "Provider exact private rescue probabilities are not verified; independent rule disclosed",
        "Current demo monetary bet limits are injected at startup and remain unverified; ETB limits are explicit platform limits."
      ]
    },
    "maxWinMultiplier": null,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Finite table and conditional-probability validation; not provider private RNG.",
      "paytableStatus": "Exact coin_miner_94 displayed table, matching the current official Play Demo link.",
      "targetReturn": "Independent conditional model targets94% on boost steps before rounding/caps; baseline/table rounding can yield up to94.40%.",
      "basis": "Current public94-variant payout table. Baseline combinatorial odds before boost; independent rescue odds normalize near94% without predetermining tile positions. Tile choice cannot alter the distribution.",
      "boostStartAfterSafePicks": {
        "3": 18,
        "5": 1,
        "7": 0,
        "10": 0,
        "17": 0,
        "20": 0
      }
    },
    "paytable": {
      "basis": "Multiply total stake by the entry for successful picks, floor to minor units, then apply platform cap.",
      "verifiedPublicTable": true,
      "providerVariant": "coin_miner_94",
      "rows": [
        {
          "mines": 1,
          "multi": [
            0.98,
            1.02,
            1.07,
            1.12,
            1.18,
            1.24,
            1.31,
            1.38,
            1.47,
            1.57,
            1.68,
            1.81,
            1.96,
            2.14,
            2.35,
            2.61,
            2.94,
            3.36,
            3.92,
            4.7,
            5.88,
            7.83,
            11.75,
            23.5
          ]
        },
        {
          "mines": 2,
          "multi": [
            1.02,
            1.11,
            1.22,
            1.34,
            1.48,
            1.65,
            1.84,
            2.07,
            2.35,
            2.69,
            3.1,
            3.62,
            4.27,
            5.13,
            6.27,
            7.83,
            10.07,
            13.43,
            18.8,
            28.2,
            47.0,
            94.0,
            282.0
          ]
        },
        {
          "mines": 3,
          "multi": [
            1.07,
            1.22,
            1.4,
            1.63,
            1.9,
            2.23,
            2.65,
            3.18,
            3.86,
            4.75,
            5.94,
            7.56,
            9.83,
            13.1,
            18.02,
            25.74,
            38.61,
            61.77,
            102.95,
            187.19,
            374.37,
            985.19
          ]
        },
        {
          "mines": 5,
          "multi": [
            1.18,
            1.45,
            1.81,
            2.27,
            2.87,
            3.65,
            4.69,
            6.05,
            8.06,
            11.04,
            15.34,
            21.6,
            30.86,
            45.38,
            67.74,
            104.21,
            162.83,
            262.63,
            468.98,
            997.82
          ]
        },
        {
          "mines": 7,
          "multi": [
            1.31,
            1.47,
            1.69,
            1.94,
            2.23,
            2.56,
            2.94,
            3.59,
            4.38,
            5.34,
            6.51,
            7.94,
            13.23,
            22.05,
            36.75,
            61.25,
            175.01,
            972.29
          ]
        },
        {
          "mines": 10,
          "multi": [
            1.46,
            2.28,
            3.56,
            5.56,
            8.69,
            13.57,
            21.21,
            33.66,
            53.43,
            84.81,
            134.63,
            213.69,
            339.19,
            538.4,
            997.04
          ]
        },
        {
          "mines": 17,
          "multi": [
            1.71,
            3.42,
            7.6,
            17.67,
            43.09,
            105.09,
            284.02,
            979.37
          ]
        },
        {
          "mines": 20,
          "multi": [
            2.69,
            8.95,
            29.84,
            99.47,
            994.71
          ]
        },
        {
          "mines": 24,
          "multi": [
            23.5
          ]
        }
      ]
    }
  }
];

const engine = createRemainingEngine(remainingPublicConfigs);
export const remainingGames = engine.adapter;
export const sampleRawSlot = engine.sampleRawSlot;
export const evaluateDraftGrid = engine.evaluateDraftGrid;
export const createIsolatedDraftAdapter = engine.createIsolatedDraftAdapter;
export const evaluateDraftRound = (id, options, rng, now) => createIsolatedDraftAdapter().start(id, options, rng, now);
export const unresolvedDrafts = remainingPublicConfigs.filter(config => ['darkhorus_native','assassins_native'].includes(config.id));
export {slotScales,linePaths,towerXDistribution,minesPayout,mineChoices,mineBoostActive,mineSafeProbability,towerFrozenValue};
export default remainingGames;
