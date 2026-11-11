export default {
  "id": "ind74_bookofbonanza",
  "title": "Book of Bonanza — Independent",
  "catalogName": "Book of Bonanza",
  "sourceCategory": "Slots",
  "mathVersion": "independent-bookofbonanza-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 68",
    "colors": [
      "#0a2ff5",
      "#201c4e",
      "#d5c74c"
    ]
  },
  "limits": {
    "minBetMinor": "25",
    "maxBetMinor": "100000",
    "betStepMinor": "25",
    "maxWinMinor": "139500000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/book-of-bonanza",
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
    ],
    [
      0,
      0,
      1,
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
      0,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0,
      1
    ],
    [
      0,
      0,
      2,
      0,
      2
    ]
  ],
  "symbols": [
    {
      "id": "bookofbonanza-symbol-0",
      "label": "Orchard Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 124,
        "5": 1115
      }
    },
    {
      "id": "bookofbonanza-symbol-1",
      "label": "Velvet Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 128,
        "5": 1155
      }
    },
    {
      "id": "bookofbonanza-symbol-2",
      "label": "Amber Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 132,
        "5": 1195
      }
    },
    {
      "id": "bookofbonanza-symbol-3",
      "label": "Prism Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 136,
        "5": 1235
      }
    },
    {
      "id": "bookofbonanza-symbol-4",
      "label": "Ivory Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 140,
        "5": 1275
      }
    },
    {
      "id": "bookofbonanza-symbol-5",
      "label": "Ruby Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 144,
        "5": 1315
      }
    },
    {
      "id": "bookofbonanza-symbol-6",
      "label": "Copper Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 148,
        "5": 1355
      }
    },
    {
      "id": "bookofbonanza-symbol-7",
      "label": "Citrus Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 152,
        "5": 1395
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 25 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3957",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
