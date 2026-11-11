export default {
  "id": "ind74_foxyhot20",
  "title": "Foxy Hot 20 — Independent",
  "catalogName": "Foxy Hot 20",
  "sourceCategory": "Slots",
  "mathVersion": "independent-foxyhot20-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 41",
    "colors": [
      "#cad69f",
      "#d1c448",
      "#46939a"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "142400000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/foxy-hot-20",
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
      "id": "foxyhot20-symbol-0",
      "label": "Ruby Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 21,
        "4": 140,
        "5": 1144
      }
    },
    {
      "id": "foxyhot20-symbol-1",
      "label": "Copper Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 144,
        "5": 1184
      }
    },
    {
      "id": "foxyhot20-symbol-2",
      "label": "Citrus Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 148,
        "5": 1224
      }
    },
    {
      "id": "foxyhot20-symbol-3",
      "label": "Orchard Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 152,
        "5": 1264
      }
    },
    {
      "id": "foxyhot20-symbol-4",
      "label": "Velvet Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 156,
        "5": 1304
      }
    },
    {
      "id": "foxyhot20-symbol-5",
      "label": "Amber Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 160,
        "5": 1344
      }
    },
    {
      "id": "foxyhot20-symbol-6",
      "label": "Prism Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 164,
        "5": 1384
      }
    },
    {
      "id": "foxyhot20-symbol-7",
      "label": "Ivory Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 168,
        "5": 1424
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
    "numerator": "3930",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
