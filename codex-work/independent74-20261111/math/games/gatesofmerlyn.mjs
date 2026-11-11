export default {
  "id": "ind74_gatesofmerlyn",
  "title": "Gates of Merlyn — Independent",
  "catalogName": "Gates of Merlyn",
  "sourceCategory": "Slots",
  "mathVersion": "independent-gatesofmerlyn-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 11",
    "colors": [
      "#a6c215",
      "#e70f37",
      "#d7e997"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "131700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/gates-of-merlyn",
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
      "id": "gatesofmerlyn-symbol-0",
      "label": "Citrus Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 135,
        "5": 1037
      }
    },
    {
      "id": "gatesofmerlyn-symbol-1",
      "label": "Orchard Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 139,
        "5": 1077
      }
    },
    {
      "id": "gatesofmerlyn-symbol-2",
      "label": "Velvet Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 143,
        "5": 1117
      }
    },
    {
      "id": "gatesofmerlyn-symbol-3",
      "label": "Amber Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 147,
        "5": 1157
      }
    },
    {
      "id": "gatesofmerlyn-symbol-4",
      "label": "Prism Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 151,
        "5": 1197
      }
    },
    {
      "id": "gatesofmerlyn-symbol-5",
      "label": "Ivory Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 155,
        "5": 1237
      }
    },
    {
      "id": "gatesofmerlyn-symbol-6",
      "label": "Ruby Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 159,
        "5": 1277
      }
    },
    {
      "id": "gatesofmerlyn-symbol-7",
      "label": "Copper Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 163,
        "5": 1317
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
    "numerator": "3900",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
