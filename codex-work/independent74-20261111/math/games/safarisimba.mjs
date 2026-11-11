export default {
  "id": "ind74_safarisimba",
  "title": "Safari Simba — Independent",
  "catalogName": "Safari Simba",
  "sourceCategory": "Slots",
  "mathVersion": "independent-safarisimba-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 37",
    "colors": [
      "#ae618a",
      "#ccb4c0",
      "#874d65"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "139200000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/safari-simba-2",
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
      "id": "safarisimba-symbol-0",
      "label": "Velvet Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 112,
        "5": 1112
      }
    },
    {
      "id": "safarisimba-symbol-1",
      "label": "Amber Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 116,
        "5": 1152
      }
    },
    {
      "id": "safarisimba-symbol-2",
      "label": "Prism Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 120,
        "5": 1192
      }
    },
    {
      "id": "safarisimba-symbol-3",
      "label": "Ivory Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 124,
        "5": 1232
      }
    },
    {
      "id": "safarisimba-symbol-4",
      "label": "Ruby Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 128,
        "5": 1272
      }
    },
    {
      "id": "safarisimba-symbol-5",
      "label": "Copper Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 132,
        "5": 1312
      }
    },
    {
      "id": "safarisimba-symbol-6",
      "label": "Citrus Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 136,
        "5": 1352
      }
    },
    {
      "id": "safarisimba-symbol-7",
      "label": "Orchard Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 140,
        "5": 1392
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
    "numerator": "3926",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
