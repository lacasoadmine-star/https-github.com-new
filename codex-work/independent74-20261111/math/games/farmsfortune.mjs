export default {
  "id": "ind74_farmsfortune",
  "title": "Farm's Fortune — Independent",
  "catalogName": "Farm's Fortune",
  "sourceCategory": "Slots",
  "mathVersion": "independent-farmsfortune-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 54",
    "colors": [
      "#9dabb0",
      "#79e927",
      "#423a23"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "138100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/farms-fortune-6n0s6",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "slots",
  "model": "lines-slot-v1",
  "rows": 3,
  "cols": 5,
  "paylines": [
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
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      1,
      1
    ],
    [
      0,
      0,
      0,
      1,
      2
    ]
  ],
  "symbols": [
    {
      "id": "farmsfortune-symbol-0",
      "label": "Amber Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 108,
        "5": 1101
      }
    },
    {
      "id": "farmsfortune-symbol-1",
      "label": "Prism Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 112,
        "5": 1141
      }
    },
    {
      "id": "farmsfortune-symbol-2",
      "label": "Ivory Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 116,
        "5": 1181
      }
    },
    {
      "id": "farmsfortune-symbol-3",
      "label": "Ruby Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 120,
        "5": 1221
      }
    },
    {
      "id": "farmsfortune-symbol-4",
      "label": "Copper Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 124,
        "5": 1261
      }
    },
    {
      "id": "farmsfortune-symbol-5",
      "label": "Citrus Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 128,
        "5": 1301
      }
    },
    {
      "id": "farmsfortune-symbol-6",
      "label": "Orchard Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 132,
        "5": 1341
      }
    },
    {
      "id": "farmsfortune-symbol-7",
      "label": "Velvet Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 136,
        "5": 1381
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 10 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3943",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
