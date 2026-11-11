export default {
  "id": "ind74_multihot10",
  "title": "Multi Hot 10 — Independent",
  "catalogName": "Multi Hot 10",
  "sourceCategory": "Slots",
  "mathVersion": "independent-multihot10-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 19",
    "colors": [
      "#eb187e",
      "#46a641",
      "#7d27c4"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "150700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/multi-hot-10-2",
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
      "id": "multihot10-symbol-0",
      "label": "Citrus Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 109,
        "5": 1227
      }
    },
    {
      "id": "multihot10-symbol-1",
      "label": "Orchard Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 113,
        "5": 1267
      }
    },
    {
      "id": "multihot10-symbol-2",
      "label": "Velvet Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 117,
        "5": 1307
      }
    },
    {
      "id": "multihot10-symbol-3",
      "label": "Amber Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 121,
        "5": 1347
      }
    },
    {
      "id": "multihot10-symbol-4",
      "label": "Prism Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 125,
        "5": 1387
      }
    },
    {
      "id": "multihot10-symbol-5",
      "label": "Ivory Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 129,
        "5": 1427
      }
    },
    {
      "id": "multihot10-symbol-6",
      "label": "Ruby Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 133,
        "5": 1467
      }
    },
    {
      "id": "multihot10-symbol-7",
      "label": "Copper Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 137,
        "5": 1507
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
    "numerator": "3908",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};

// Current catalogue configuration stays in this title module. The default
// export above remains the retained independent fixture definition.
import {configurePublicColorGamble} from '../public-gamble.mjs';
export function configureOfficialGame(d){
  if(d?.id!=='ind74_official_multihot10'||d.family!=='slots')throw new TypeError('The Multi Hot10 definition is required.');
  d.multiplierValues=[1,2,3,4,5];
  d.symbols=[['seven','Seven','7',50,200,1000],['bell','Bell','🔔',20,100,200],['grape','Grapes','🍇',10,50,100],
    ['watermelon','Watermelon','🍉',10,50,100],['lemon','Lemon','🍋',5,10,50],['plum','Plum','●',5,10,50],
    ['orange','Orange','🍊',5,10,50],['cherry','Cherry','🍒',5,10,50]]
    .map(([id,label,glyph,three,four,five])=>({id:'multihot10-'+id,label,glyph,weight:1,pays:{3:three,4:four,5:five}}));
  d.paytable=d.symbols.map(symbol=>({label:symbol.label,...symbol.pays}));
  d.observedPaytable={source:'reports/priority10-reference-20261111/multihot10-paytable.jpg',totalBetMinor:'10',paylines:10,
    publishedMaximumMultiplier:1000,maximumCouplingVerified:false,independentFullBoardMaximumMultiplier:5000,
    observedWin:'Three plums on Line3 paid0.05DMO before4x=0.20; three lemons on Line2 paid0.05 before1x. Total stake0.10DMO.',
    conflict:'The published symbol awards combined with independently possible full-board paylines and5x permit5000x. The Help1000x maximum requires unverified provider restrictions or coupling.'};
  d.rules=[
    'The observed official board has5reels,3rows and10active lines. This implementation retains its independently authored ten-line chart.',
    'Three, four or five matching symbols from the left pay the highest regular award on each line. Each line award floors(total stake times its symbol prize divided by10), then the selected1x–5x multiplier applies.',
    'Symbol categories and prizes follow the fresh0.10DMO official paytable; five current-session rounds include direct three-plum and three-lemon award confirmation. Every cell remains independently uniform among the eight regular symbols; provider frequencies are not inferred.',
    'The Help states1000x maximum, but the displayed prizes allow an independent full-board5000x bound before optional X2. The model reserves that complete attainable bound; no hidden payout clamp replaces unverified provider reel restrictions or coupling.',
  ];
  d.rules.push('The exact title Help documents multiplier values1x,2x,3x,4x,5x, applied to the completed spin award. This independent implementation selects these values uniformly; provider weights and reel order remain unknown.');
  d.provenance={...d.provenance,publicMultiplierSource:'references/official-slot-help-en-20261111.json:help.slots.multihot10.multiplier.reel.description',
    publicPaytableSource:d.observedPaytable.source,observed:'Fresh official five-round history, held collection and paytable are saved in reports/priority10-reference-20261111/.',
    designed:'Observed regular-symbol prizes, with independent ten-line chart, uniform cells, uniform multiplier and optional three-attempt fair-color X2. Provider1000x coupling remains unverified.'};
  return configurePublicColorGamble(d);
}
