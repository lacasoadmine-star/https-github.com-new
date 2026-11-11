export default {
  "id": "ind74_draculasfortune",
  "title": "Dracula's Fortune — Independent",
  "catalogName": "Dracula's Fortune",
  "sourceCategory": "Slots",
  "mathVersion": "independent-draculasfortune-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 66",
    "colors": [
      "#f9fcfa",
      "#e66567",
      "#13da8d"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "160300000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/draculas-fortune-2",
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
      "id": "draculasfortune-symbol-0",
      "label": "Copper Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 22,
        "4": 110,
        "5": 1323
      }
    },
    {
      "id": "draculasfortune-symbol-1",
      "label": "Citrus Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 114,
        "5": 1363
      }
    },
    {
      "id": "draculasfortune-symbol-2",
      "label": "Orchard Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 118,
        "5": 1403
      }
    },
    {
      "id": "draculasfortune-symbol-3",
      "label": "Velvet Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 122,
        "5": 1443
      }
    },
    {
      "id": "draculasfortune-symbol-4",
      "label": "Amber Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 126,
        "5": 1483
      }
    },
    {
      "id": "draculasfortune-symbol-5",
      "label": "Prism Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 130,
        "5": 1523
      }
    },
    {
      "id": "draculasfortune-symbol-6",
      "label": "Ivory Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 134,
        "5": 1563
      }
    },
    {
      "id": "draculasfortune-symbol-7",
      "label": "Ruby Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 138,
        "5": 1603
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
    "numerator": "3955",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
