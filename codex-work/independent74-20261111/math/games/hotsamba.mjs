export default {
  "id": "ind74_hotsamba",
  "title": "Hot Samba — Independent",
  "catalogName": "Hot Samba",
  "sourceCategory": "Slots",
  "mathVersion": "independent-hotsamba-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 59",
    "colors": [
      "#78fb7b",
      "#7e9d61",
      "#2f8381"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "130900000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/hot-samba",
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
      "id": "hotsamba-symbol-0",
      "label": "Citrus Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 143,
        "5": 1029
      }
    },
    {
      "id": "hotsamba-symbol-1",
      "label": "Orchard Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 147,
        "5": 1069
      }
    },
    {
      "id": "hotsamba-symbol-2",
      "label": "Velvet Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 151,
        "5": 1109
      }
    },
    {
      "id": "hotsamba-symbol-3",
      "label": "Amber Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 155,
        "5": 1149
      }
    },
    {
      "id": "hotsamba-symbol-4",
      "label": "Prism Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 159,
        "5": 1189
      }
    },
    {
      "id": "hotsamba-symbol-5",
      "label": "Ivory Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 163,
        "5": 1229
      }
    },
    {
      "id": "hotsamba-symbol-6",
      "label": "Ruby Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 167,
        "5": 1269
      }
    },
    {
      "id": "hotsamba-symbol-7",
      "label": "Copper Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 171,
        "5": 1309
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
    "numerator": "3948",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
