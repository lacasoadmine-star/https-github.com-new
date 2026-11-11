export default {
  "id": "ind74_multifruitschargingwilds",
  "title": "Multi Fruits Charging Wilds — Independent",
  "catalogName": "Multi Fruits Charging Wilds",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multifruitschargingwilds-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 9",
    "colors": [
      "#557c7f",
      "#802815",
      "#a037c7"
    ]
  },
  "limits": {
    "minBetMinor": "5",
    "maxBetMinor": "100000",
    "betStepMinor": "5",
    "maxWinMinor": "152500000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-fruits-charging-wilds",
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
      "id": "multifruitschargingwilds-symbol-0",
      "label": "Ruby Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 21,
        "4": 121,
        "5": 1245
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-1",
      "label": "Copper Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 125,
        "5": 1285
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-2",
      "label": "Citrus Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 129,
        "5": 1325
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-3",
      "label": "Orchard Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 133,
        "5": 1365
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-4",
      "label": "Velvet Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 137,
        "5": 1405
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-5",
      "label": "Amber Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 141,
        "5": 1445
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-6",
      "label": "Prism Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 145,
        "5": 1485
      }
    },
    {
      "id": "multifruitschargingwilds-symbol-7",
      "label": "Ivory Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 149,
        "5": 1525
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
    "numerator": "3898",
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
  if(d?.id!=='ind74_official_multifruitschargingwilds')throw new TypeError('The Multi Fruits Charging Wilds definition is required.');
  configureObservedThreeReel(d);configurePublicColorGamble(d);return configureChargingWilds(d);
}
