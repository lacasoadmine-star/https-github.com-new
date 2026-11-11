export default {
  "id": "ind74_multihot5burnwilds",
  "title": "Multi Hot 5 Burn Wilds — Independent",
  "catalogName": "Multi Hot 5 Burn Wilds",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot5burnwilds-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 25",
    "colors": [
      "#01d3df",
      "#75d70c",
      "#e156c7"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "161800000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds",
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
      "id": "multihot5burnwilds-symbol-0",
      "label": "Ruby Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 21,
        "4": 110,
        "5": 1338
      }
    },
    {
      "id": "multihot5burnwilds-symbol-1",
      "label": "Copper Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 114,
        "5": 1378
      }
    },
    {
      "id": "multihot5burnwilds-symbol-2",
      "label": "Citrus Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 118,
        "5": 1418
      }
    },
    {
      "id": "multihot5burnwilds-symbol-3",
      "label": "Orchard Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 122,
        "5": 1458
      }
    },
    {
      "id": "multihot5burnwilds-symbol-4",
      "label": "Velvet Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 126,
        "5": 1498
      }
    },
    {
      "id": "multihot5burnwilds-symbol-5",
      "label": "Amber Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 130,
        "5": 1538
      }
    },
    {
      "id": "multihot5burnwilds-symbol-6",
      "label": "Prism Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 134,
        "5": 1578
      }
    },
    {
      "id": "multihot5burnwilds-symbol-7",
      "label": "Ivory Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 138,
        "5": 1618
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
    "numerator": "3914",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
