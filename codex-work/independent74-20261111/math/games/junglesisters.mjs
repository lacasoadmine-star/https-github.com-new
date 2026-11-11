export default {
  "id": "ind74_junglesisters",
  "title": "Jungle Sisters — Independent",
  "catalogName": "Jungle Sisters",
  "sourceCategory": "Slots",
  "mathVersion": "independent-junglesisters-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 62",
    "colors": [
      "#6b1371",
      "#7d567c",
      "#9cec6c"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "128400000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/jungle-sisters",
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
      "id": "junglesisters-symbol-0",
      "label": "Amber Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 123,
        "5": 1004
      }
    },
    {
      "id": "junglesisters-symbol-1",
      "label": "Prism Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 127,
        "5": 1044
      }
    },
    {
      "id": "junglesisters-symbol-2",
      "label": "Ivory Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 131,
        "5": 1084
      }
    },
    {
      "id": "junglesisters-symbol-3",
      "label": "Ruby Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 135,
        "5": 1124
      }
    },
    {
      "id": "junglesisters-symbol-4",
      "label": "Copper Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 139,
        "5": 1164
      }
    },
    {
      "id": "junglesisters-symbol-5",
      "label": "Citrus Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 143,
        "5": 1204
      }
    },
    {
      "id": "junglesisters-symbol-6",
      "label": "Orchard Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 147,
        "5": 1244
      }
    },
    {
      "id": "junglesisters-symbol-7",
      "label": "Velvet Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 151,
        "5": 1284
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
    "numerator": "3951",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

import {configureJungleSisters,JUNGLE_SISTERS_ID} from '../jungle-sisters.mjs';
export function configureOfficialGame(definition){
 if(definition?.id!==JUNGLE_SISTERS_ID)throw new TypeError('The Jungle Sisters definition is required.');
 return configureJungleSisters(definition);
}
