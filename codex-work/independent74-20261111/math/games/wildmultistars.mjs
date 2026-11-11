export default {
  "id": "ind74_wildmultistars",
  "title": "Wild Multi Stars — Independent",
  "catalogName": "Wild Multi Stars",
  "sourceCategory": "Slots",
  "mathVersion": "independent-wildmultistars-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 50",
    "colors": [
      "#259833",
      "#363698",
      "#34fd4b"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "151000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/wild-multi-stars",
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
      "id": "wildmultistars-symbol-0",
      "label": "Copper Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 22,
        "4": 121,
        "5": 1230
      }
    },
    {
      "id": "wildmultistars-symbol-1",
      "label": "Citrus Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 125,
        "5": 1270
      }
    },
    {
      "id": "wildmultistars-symbol-2",
      "label": "Orchard Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 129,
        "5": 1310
      }
    },
    {
      "id": "wildmultistars-symbol-3",
      "label": "Velvet Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 133,
        "5": 1350
      }
    },
    {
      "id": "wildmultistars-symbol-4",
      "label": "Amber Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 137,
        "5": 1390
      }
    },
    {
      "id": "wildmultistars-symbol-5",
      "label": "Prism Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 141,
        "5": 1430
      }
    },
    {
      "id": "wildmultistars-symbol-6",
      "label": "Ivory Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 145,
        "5": 1470
      }
    },
    {
      "id": "wildmultistars-symbol-7",
      "label": "Ruby Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 149,
        "5": 1510
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
    "numerator": "3939",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
