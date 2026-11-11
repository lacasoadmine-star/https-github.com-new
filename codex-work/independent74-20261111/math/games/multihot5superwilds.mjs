export default {
  "id": "ind74_multihot5superwilds",
  "title": "Multi Hot 5 Super Wilds — Independent",
  "catalogName": "Multi Hot 5 Super Wilds",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot5superwilds-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 32",
    "colors": [
      "#1fa203",
      "#aecf78",
      "#d7bfdf"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "117700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-5-super-wilds",
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
      "id": "multihot5superwilds-symbol-0",
      "label": "Ivory Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 118,
        "5": 897
      }
    },
    {
      "id": "multihot5superwilds-symbol-1",
      "label": "Ruby Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 122,
        "5": 937
      }
    },
    {
      "id": "multihot5superwilds-symbol-2",
      "label": "Copper Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 126,
        "5": 977
      }
    },
    {
      "id": "multihot5superwilds-symbol-3",
      "label": "Citrus Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 130,
        "5": 1017
      }
    },
    {
      "id": "multihot5superwilds-symbol-4",
      "label": "Orchard Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 134,
        "5": 1057
      }
    },
    {
      "id": "multihot5superwilds-symbol-5",
      "label": "Velvet Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 138,
        "5": 1097
      }
    },
    {
      "id": "multihot5superwilds-symbol-6",
      "label": "Amber Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 142,
        "5": 1137
      }
    },
    {
      "id": "multihot5superwilds-symbol-7",
      "label": "Prism Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 42,
        "4": 146,
        "5": 1177
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
    "numerator": "3921",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
