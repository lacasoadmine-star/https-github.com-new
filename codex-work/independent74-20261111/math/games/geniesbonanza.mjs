export default {
  "id": "ind74_geniesbonanza",
  "title": "Genie's Bonanza — Independent",
  "catalogName": "Genie's Bonanza",
  "sourceCategory": "Slots",
  "mathVersion": "independent-geniesbonanza-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 52",
    "colors": [
      "#d6a11d",
      "#f8d2c6",
      "#cd1e3a"
    ]
  },
  "limits": {
    "minBetMinor": "25",
    "maxBetMinor": "100000",
    "betStepMinor": "25",
    "maxWinMinor": "130200000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/genies-bonanza",
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
      "id": "geniesbonanza-symbol-0",
      "label": "Orchard Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 135,
        "5": 1022
      }
    },
    {
      "id": "geniesbonanza-symbol-1",
      "label": "Velvet Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 139,
        "5": 1062
      }
    },
    {
      "id": "geniesbonanza-symbol-2",
      "label": "Amber Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 143,
        "5": 1102
      }
    },
    {
      "id": "geniesbonanza-symbol-3",
      "label": "Prism Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 147,
        "5": 1142
      }
    },
    {
      "id": "geniesbonanza-symbol-4",
      "label": "Ivory Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 151,
        "5": 1182
      }
    },
    {
      "id": "geniesbonanza-symbol-5",
      "label": "Ruby Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 155,
        "5": 1222
      }
    },
    {
      "id": "geniesbonanza-symbol-6",
      "label": "Copper Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 159,
        "5": 1262
      }
    },
    {
      "id": "geniesbonanza-symbol-7",
      "label": "Citrus Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 163,
        "5": 1302
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
    "numerator": "3941",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// Current catalogue configuration stays in this title module. The default
// export above remains the retained independent fixture definition.
import {configureGeniesBonanza} from '../genies-bonanza.mjs';
export function configureOfficialGame(d){
  if(d?.id!=='ind74_official_geniesbonanza')throw new TypeError('The Genie definition is required.');
  return configureGeniesBonanza(d);
}
