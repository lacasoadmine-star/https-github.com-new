export default {
  "id": "ind74_multihot5wild",
  "title": "Multi Hot 5 Wild — Independent",
  "catalogName": "Multi Hot 5 Wild",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot5wild-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 14",
    "colors": [
      "#7a36f5",
      "#f17374",
      "#795237"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "129200000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-5-wild",
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
    ]
  ],
  "symbols": [
    {
      "id": "multihot5wild-symbol-0",
      "label": "Amber Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 115,
        "5": 1012
      }
    },
    {
      "id": "multihot5wild-symbol-1",
      "label": "Prism Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 119,
        "5": 1052
      }
    },
    {
      "id": "multihot5wild-symbol-2",
      "label": "Ivory Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 123,
        "5": 1092
      }
    },
    {
      "id": "multihot5wild-symbol-3",
      "label": "Ruby Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 127,
        "5": 1132
      }
    },
    {
      "id": "multihot5wild-symbol-4",
      "label": "Copper Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 131,
        "5": 1172
      }
    },
    {
      "id": "multihot5wild-symbol-5",
      "label": "Citrus Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 135,
        "5": 1212
      }
    },
    {
      "id": "multihot5wild-symbol-6",
      "label": "Orchard Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 139,
        "5": 1252
      }
    },
    {
      "id": "multihot5wild-symbol-7",
      "label": "Velvet Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 143,
        "5": 1292
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 5 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3903",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
