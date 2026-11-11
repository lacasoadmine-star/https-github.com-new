export default {
  "id": "ind74_madslot",
  "title": "Mad Slot — Independent",
  "catalogName": "Mad Slot",
  "sourceCategory": "Slots",
  "mathVersion": "independent-madslot-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 55",
    "colors": [
      "#a1ee96",
      "#b58fa7",
      "#57cc4e"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "127700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/mad-slot",
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
    ],
    [
      0,
      0,
      0,
      2,
      0
    ],
    [
      0,
      0,
      0,
      2,
      1
    ],
    [
      0,
      0,
      0,
      2,
      2
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      1
    ],
    [
      0,
      0,
      1,
      0,
      2
    ],
    [
      0,
      0,
      1,
      1,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1
    ],
    [
      0,
      0,
      1,
      1,
      2
    ],
    [
      0,
      0,
      1,
      2,
      0
    ]
  ],
  "symbols": [
    {
      "id": "madslot-symbol-0",
      "label": "Prism Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 115,
        "5": 997
      }
    },
    {
      "id": "madslot-symbol-1",
      "label": "Ivory Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 119,
        "5": 1037
      }
    },
    {
      "id": "madslot-symbol-2",
      "label": "Ruby Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 123,
        "5": 1077
      }
    },
    {
      "id": "madslot-symbol-3",
      "label": "Copper Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 127,
        "5": 1117
      }
    },
    {
      "id": "madslot-symbol-4",
      "label": "Citrus Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 131,
        "5": 1157
      }
    },
    {
      "id": "madslot-symbol-5",
      "label": "Orchard Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 135,
        "5": 1197
      }
    },
    {
      "id": "madslot-symbol-6",
      "label": "Velvet Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 139,
        "5": 1237
      }
    },
    {
      "id": "madslot-symbol-7",
      "label": "Amber Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 41,
        "4": 143,
        "5": 1277
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3944",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
