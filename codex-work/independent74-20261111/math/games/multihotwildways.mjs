export default {
  "id": "ind74_multihotwildways",
  "title": "Multi Hot Wild Ways — Independent",
  "catalogName": "Multi Hot Wild Ways",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihotwildways-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 23",
    "colors": [
      "#27ef79",
      "#e51f68",
      "#e2739b"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "109100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-wild-ways",
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
      "id": "multihotwildways-symbol-0",
      "label": "Prism Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 137,
        "5": 811
      }
    },
    {
      "id": "multihotwildways-symbol-1",
      "label": "Ivory Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 141,
        "5": 851
      }
    },
    {
      "id": "multihotwildways-symbol-2",
      "label": "Ruby Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 145,
        "5": 891
      }
    },
    {
      "id": "multihotwildways-symbol-3",
      "label": "Copper Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 149,
        "5": 931
      }
    },
    {
      "id": "multihotwildways-symbol-4",
      "label": "Citrus Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 153,
        "5": 971
      }
    },
    {
      "id": "multihotwildways-symbol-5",
      "label": "Orchard Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 157,
        "5": 1011
      }
    },
    {
      "id": "multihotwildways-symbol-6",
      "label": "Velvet Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 161,
        "5": 1051
      }
    },
    {
      "id": "multihotwildways-symbol-7",
      "label": "Amber Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 41,
        "4": 165,
        "5": 1091
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
    "numerator": "3912",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
