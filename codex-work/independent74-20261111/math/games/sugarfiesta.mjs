export default {
  "id": "ind74_sugarfiesta",
  "title": "Sugar Fiesta — Independent",
  "catalogName": "Sugar Fiesta",
  "sourceCategory": "Slots",
  "mathVersion": "independent-sugarfiesta-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 69",
    "colors": [
      "#b14bab",
      "#9ab00f",
      "#ef3b91"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "129100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/sugar-fiesta",
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
      "id": "sugarfiesta-symbol-0",
      "label": "Velvet Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 131,
        "5": 1011
      }
    },
    {
      "id": "sugarfiesta-symbol-1",
      "label": "Amber Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 135,
        "5": 1051
      }
    },
    {
      "id": "sugarfiesta-symbol-2",
      "label": "Prism Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 139,
        "5": 1091
      }
    },
    {
      "id": "sugarfiesta-symbol-3",
      "label": "Ivory Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 143,
        "5": 1131
      }
    },
    {
      "id": "sugarfiesta-symbol-4",
      "label": "Ruby Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 147,
        "5": 1171
      }
    },
    {
      "id": "sugarfiesta-symbol-5",
      "label": "Copper Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 151,
        "5": 1211
      }
    },
    {
      "id": "sugarfiesta-symbol-6",
      "label": "Citrus Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 155,
        "5": 1251
      }
    },
    {
      "id": "sugarfiesta-symbol-7",
      "label": "Orchard Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 159,
        "5": 1291
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
    "numerator": "3958",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
