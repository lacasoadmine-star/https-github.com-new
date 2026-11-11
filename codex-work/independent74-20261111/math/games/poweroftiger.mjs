export default {
  "id": "ind74_poweroftiger",
  "title": "Power of Tiger — Independent",
  "catalogName": "Power of Tiger",
  "sourceCategory": "Slots",
  "mathVersion": "independent-poweroftiger-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 8",
    "colors": [
      "#a4e848",
      "#a861ce",
      "#ad4aa5"
    ]
  },
  "limits": {
    "minBetMinor": "25",
    "maxBetMinor": "100000",
    "betStepMinor": "25",
    "maxWinMinor": "118100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/power-of-tiger",
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
      "id": "poweroftiger-symbol-0",
      "label": "Ivory Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 114,
        "5": 901
      }
    },
    {
      "id": "poweroftiger-symbol-1",
      "label": "Ruby Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 118,
        "5": 941
      }
    },
    {
      "id": "poweroftiger-symbol-2",
      "label": "Copper Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 122,
        "5": 981
      }
    },
    {
      "id": "poweroftiger-symbol-3",
      "label": "Citrus Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 126,
        "5": 1021
      }
    },
    {
      "id": "poweroftiger-symbol-4",
      "label": "Orchard Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 130,
        "5": 1061
      }
    },
    {
      "id": "poweroftiger-symbol-5",
      "label": "Velvet Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 134,
        "5": 1101
      }
    },
    {
      "id": "poweroftiger-symbol-6",
      "label": "Amber Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 138,
        "5": 1141
      }
    },
    {
      "id": "poweroftiger-symbol-7",
      "label": "Prism Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 42,
        "4": 142,
        "5": 1181
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
    "numerator": "3897",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// Current catalogue configuration stays in this title module. The default
// export above remains the retained independent fixture definition.
import {configurePowerOfTiger} from '../power-of-tiger.mjs';
export function configureOfficialGame(d){
  if(d?.id!=='ind74_official_poweroftiger')throw new TypeError('The Power of Tiger definition is required.');
  return configurePowerOfTiger(d);
}
