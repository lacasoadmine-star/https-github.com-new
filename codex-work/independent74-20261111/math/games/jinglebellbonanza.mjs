export default {
  "id": "ind74_jinglebellbonanza",
  "title": "Jingle Bell Bonanza — Independent",
  "catalogName": "Jingle Bell Bonanza",
  "sourceCategory": "Slots",
  "mathVersion": "independent-jinglebellbonanza-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 31",
    "colors": [
      "#c7a544",
      "#b1293d",
      "#b4ea41"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "128100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/jingle-bell-bonanza",
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
      "id": "jinglebellbonanza-symbol-0",
      "label": "Prism Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 111,
        "5": 1001
      }
    },
    {
      "id": "jinglebellbonanza-symbol-1",
      "label": "Ivory Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 115,
        "5": 1041
      }
    },
    {
      "id": "jinglebellbonanza-symbol-2",
      "label": "Ruby Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 119,
        "5": 1081
      }
    },
    {
      "id": "jinglebellbonanza-symbol-3",
      "label": "Copper Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 123,
        "5": 1121
      }
    },
    {
      "id": "jinglebellbonanza-symbol-4",
      "label": "Citrus Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 127,
        "5": 1161
      }
    },
    {
      "id": "jinglebellbonanza-symbol-5",
      "label": "Orchard Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 131,
        "5": 1201
      }
    },
    {
      "id": "jinglebellbonanza-symbol-6",
      "label": "Velvet Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 135,
        "5": 1241
      }
    },
    {
      "id": "jinglebellbonanza-symbol-7",
      "label": "Amber Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 41,
        "4": 139,
        "5": 1281
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
    "numerator": "3920",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
