export default {
  "id": "ind74_junglesistersdeluxe",
  "title": "Jungle Sisters Deluxe — Independent",
  "catalogName": "Jungle Sisters Deluxe",
  "sourceCategory": "Slots",
  "mathVersion": "independent-junglesistersdeluxe-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 64",
    "colors": [
      "#e59f41",
      "#bf9f05",
      "#87b5ae"
    ]
  },
  "limits": {
    "minBetMinor": "25",
    "maxBetMinor": "100000",
    "betStepMinor": "25",
    "maxWinMinor": "107600000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/jungle-sisters-deluxe",
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
    ],
    [
      0,
      0,
      1,
      2,
      1
    ],
    [
      0,
      0,
      1,
      2,
      2
    ],
    [
      0,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0,
      1
    ],
    [
      0,
      0,
      2,
      0,
      2
    ]
  ],
  "symbols": [
    {
      "id": "junglesistersdeluxe-symbol-0",
      "label": "Ivory Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 137,
        "5": 796
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-1",
      "label": "Ruby Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 141,
        "5": 836
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-2",
      "label": "Copper Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 145,
        "5": 876
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-3",
      "label": "Citrus Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 149,
        "5": 916
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-4",
      "label": "Orchard Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 153,
        "5": 956
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-5",
      "label": "Velvet Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 157,
        "5": 996
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-6",
      "label": "Amber Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 161,
        "5": 1036
      }
    },
    {
      "id": "junglesistersdeluxe-symbol-7",
      "label": "Prism Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 42,
        "4": 165,
        "5": 1076
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 25 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3953",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

import {configureJungleSisters,JUNGLE_SISTERS_DELUXE_ID} from '../jungle-sisters.mjs';
export function configureOfficialGame(definition){
 if(definition?.id!==JUNGLE_SISTERS_DELUXE_ID)throw new TypeError('The Jungle Sisters Deluxe definition is required.');
 return configureJungleSisters(definition);
}
