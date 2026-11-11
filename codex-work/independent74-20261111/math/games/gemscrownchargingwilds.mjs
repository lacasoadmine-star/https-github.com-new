export default {
  "id": "ind74_gemscrownchargingwilds",
  "title": "Gems Crown Charging Wilds — Independent",
  "catalogName": "Gems Crown Charging Wilds",
  "sourceCategory": "Slots",
  "mathVersion": "independent-gemscrownchargingwilds-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 10",
    "colors": [
      "#19d392",
      "#c61b10",
      "#2450e0"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "142100000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/gems-crown-charging-wilds",
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
      "id": "gemscrownchargingwilds-symbol-0",
      "label": "Copper Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 22,
        "4": 128,
        "5": 1141
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-1",
      "label": "Citrus Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 24,
        "4": 132,
        "5": 1181
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-2",
      "label": "Orchard Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 136,
        "5": 1221
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-3",
      "label": "Velvet Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 140,
        "5": 1261
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-4",
      "label": "Amber Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 144,
        "5": 1301
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-5",
      "label": "Prism Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 148,
        "5": 1341
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-6",
      "label": "Ivory Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 152,
        "5": 1381
      }
    },
    {
      "id": "gemscrownchargingwilds-symbol-7",
      "label": "Ruby Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 156,
        "5": 1421
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
    "numerator": "3899",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// Current catalogue configuration stays in this title module. The default
// export above remains the retained independent fixture definition.
import {configureObservedThreeReel} from '../observed-three-reel.mjs';
import {configurePublicColorGamble} from '../public-gamble.mjs';
import {configureChargingWilds} from '../charging-wilds.mjs';
export function configureOfficialGame(d){
  if(d?.id!=='ind74_official_gemscrownchargingwilds')throw new TypeError('The Gems Crown Charging Wilds definition is required.');
  configureObservedThreeReel(d);configurePublicColorGamble(d);return configureChargingWilds(d);
}
