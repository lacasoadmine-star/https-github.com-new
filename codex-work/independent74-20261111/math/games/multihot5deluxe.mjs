export default {
  "id": "ind74_multihot5deluxe",
  "title": "Multi Hot 5 Deluxe — Independent",
  "catalogName": "Multi Hot 5 Deluxe",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot5deluxe-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 27",
    "colors": [
      "#b22742",
      "#51147e",
      "#fd83f1"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "141000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-5-deluxe",
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
      "id": "multihot5deluxe-symbol-0",
      "label": "Citrus Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 124,
        "5": 1130
      }
    },
    {
      "id": "multihot5deluxe-symbol-1",
      "label": "Orchard Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 128,
        "5": 1170
      }
    },
    {
      "id": "multihot5deluxe-symbol-2",
      "label": "Velvet Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 132,
        "5": 1210
      }
    },
    {
      "id": "multihot5deluxe-symbol-3",
      "label": "Amber Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 136,
        "5": 1250
      }
    },
    {
      "id": "multihot5deluxe-symbol-4",
      "label": "Prism Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 140,
        "5": 1290
      }
    },
    {
      "id": "multihot5deluxe-symbol-5",
      "label": "Ivory Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 144,
        "5": 1330
      }
    },
    {
      "id": "multihot5deluxe-symbol-6",
      "label": "Ruby Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 148,
        "5": 1370
      }
    },
    {
      "id": "multihot5deluxe-symbol-7",
      "label": "Copper Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 152,
        "5": 1410
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
    "numerator": "3916",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
