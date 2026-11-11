export default {
  "id": "ind74_coinsofatlantis",
  "title": "Coins Of Atlantis — Independent",
  "catalogName": "Coins Of Atlantis",
  "sourceCategory": "Slots",
  "mathVersion": "independent-coinsofatlantis-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 21",
    "colors": [
      "#1a6569",
      "#0c604f",
      "#a5a7b8"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "129900000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/coins-of-atlantis",
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
      "id": "coinsofatlantis-symbol-0",
      "label": "Velvet Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 123,
        "5": 1019
      }
    },
    {
      "id": "coinsofatlantis-symbol-1",
      "label": "Amber Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 127,
        "5": 1059
      }
    },
    {
      "id": "coinsofatlantis-symbol-2",
      "label": "Prism Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 131,
        "5": 1099
      }
    },
    {
      "id": "coinsofatlantis-symbol-3",
      "label": "Ivory Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 135,
        "5": 1139
      }
    },
    {
      "id": "coinsofatlantis-symbol-4",
      "label": "Ruby Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 139,
        "5": 1179
      }
    },
    {
      "id": "coinsofatlantis-symbol-5",
      "label": "Copper Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 143,
        "5": 1219
      }
    },
    {
      "id": "coinsofatlantis-symbol-6",
      "label": "Citrus Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 147,
        "5": 1259
      }
    },
    {
      "id": "coinsofatlantis-symbol-7",
      "label": "Orchard Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 39,
        "4": 151,
        "5": 1299
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
    "numerator": "3910",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// Current catalogue configuration stays in this title module. The default
// export above remains the retained independent fixture definition.
import {configurePublicSlotFeatures} from '../public-slot-features.mjs';
import {configureCoinsOfAtlantis} from '../coins-of-atlantis.mjs';
export function configureOfficialGame(d){
  if(d?.id!=='ind74_official_coinsofatlantis')throw new TypeError('The Coins Of Atlantis definition is required.');
  configurePublicSlotFeatures(d);return configureCoinsOfAtlantis(d);
}
