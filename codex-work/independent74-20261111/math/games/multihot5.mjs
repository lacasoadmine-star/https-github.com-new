export default {
  "id": "ind74_multihot5",
  "title": "Multi Hot 5 — Independent",
  "catalogName": "Multi Hot 5",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot5-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 36",
    "colors": [
      "#4ce9bc",
      "#9a2c77",
      "#076670"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "120900000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-5",
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
      "id": "multihot5-symbol-0",
      "label": "Orchard Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 146,
        "5": 929
      }
    },
    {
      "id": "multihot5-symbol-1",
      "label": "Velvet Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 150,
        "5": 969
      }
    },
    {
      "id": "multihot5-symbol-2",
      "label": "Amber Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 154,
        "5": 1009
      }
    },
    {
      "id": "multihot5-symbol-3",
      "label": "Prism Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 158,
        "5": 1049
      }
    },
    {
      "id": "multihot5-symbol-4",
      "label": "Ivory Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 162,
        "5": 1089
      }
    },
    {
      "id": "multihot5-symbol-5",
      "label": "Ruby Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 166,
        "5": 1129
      }
    },
    {
      "id": "multihot5-symbol-6",
      "label": "Copper Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 170,
        "5": 1169
      }
    },
    {
      "id": "multihot5-symbol-7",
      "label": "Citrus Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 174,
        "5": 1209
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
    "numerator": "3925",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
