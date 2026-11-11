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

// Current catalogue configuration stays in this title module. The default
// export above remains the retained independent fixture definition.
import {configurePublicColorGamble} from '../public-gamble.mjs';
export function configureOfficialGame(d){
  if(d?.id!=='ind74_official_multihot5burnwilds'||d.family!=='slots')throw new TypeError('The Burn Wilds definition is required.');
  d.rows=3;d.cols=5;
  d.paylines=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]];
  d.symbolPrizeDivisor=2;
  d.symbols=[['seven','Seven','7',40,100,1000],['bell','Bell','🔔',10,20,100],['grape','Grapes','🍇',20,40,200],
    ['watermelon','Watermelon','🍉',20,40,200],['lemon','Lemon','🍋',5,10,50],['plum','Plum','🟣',5,10,50],
    ['orange','Orange','🍊',5,10,50],['cherry','Cherry','🍒',5,10,50]]
    .map(([id,label,glyph,a,b,c])=>({id:'multihot5burnwilds-'+id,label,glyph,weight:1,pays:{...(id==='seven'?{2:5}:{}),3:a,4:b,5:c}}));
  d.paytable=d.symbols.map(symbol=>({label:symbol.label,...Object.fromEntries(Object.entries(symbol.pays).map(([count,numerator])=>[count,numerator/2]))}));
  d.observedPaytable={source:'reports/priority10-reference-20261111/burnwilds-paytable.jpg',totalBetMinor:'10',paylines:5,
    symbolPrizeDivisor:2,publishedMaximumMultiplier:1300,maximumCouplingVerified:false,independentFullBoardMaximumMultiplier:2500,
    conflict:'The observed five-seven prize and independently possible full-board5x combination permit2500x. The Help1300x maximum requires unverified provider restrictions or coupling.'};
  d.releaseReview={realMoneyAdmissionBlocked:true,codes:['INDEPENDENT_EXPANDING_WILD_RETURN_UNREVIEWED','PROVIDER_MAXIMUM_COUPLING_UNVERIFIED'],
    independentAnalyticReturn:{verified:false,reason:'Exact expectation including winning-Wild expansion across shared paylines has not been established.'},
    requiredAction:'Review the full independent expanding-Wild probability model and maximum coupling before real-money admission; observed symbol prizes do not establish provider probabilities or RTP.'};
  d.implementationStatus='independent-model; real-money-admission-blocked; expanding-wild-return-unreviewed';
  d.wildSymbol={id:'multihot5burnwilds-wild',label:'Wild',glyph:'W'};
  d.wildRule={columns:[1,2,3],substitutesRegularSymbols:true,expandWhenWinning:true,expansionEvaluation:'initial-winning-lines-only',
    allWildAward:'highest-eligible-symbol-award',regularSymbolWeight:32,wildWeight:1,probabilityModel:'independent-per-cell-tickets',providerProbabilitiesVerified:false};
  d.multiplierValues=[1,2,3,4,5];
  d.rules=[
    'Five reels and three rows with five fixed independent paylines. The highest left-to-right match pays; Seven pays for2,3,4or5symbols, other regular symbols for3,4or5.',
    'Wild appears only on reels 2, 3 and 4. A wild used by an initial winning line expands to fill its reel; all paylines are then evaluated again.',
    'A 1x, 2x, 3x, 4x or 5x multiplier multiplies the completed line awards.',
    'This independent model gives each eligible cell 256 regular-symbol tickets and one wild ticket; regular symbols share those tickets equally. Multiplier values are equally likely.',
    'Symbol awards follow the observed0.10DMO public paytable. Integer prize numerators use divisor2, so a2.5x line award is evaluated exactly as floor(total stake times numerator divided by5lines divided by2), without floating-point money.',
    'The Help states1300x maximum, while the independent full-board five-seven5x award reaches2500x. The complete attainable2500x bound is reserved before play; no hidden clamp replaces unknown provider coupling.',
    'REAL-MONEY ADMISSION IS BLOCKED: exact expected return including correlated winning-Wild expansion has not been reviewed. The independent line chart, symbol/Wild weights and multiplier weights do not reproduce the provider96.55%RTP.',
  ];
  d.provenance={...d.provenance,publicRules:d.officialReference.page,publicPaytableSource:d.observedPaytable.source,
    designed:'Observed rational symbol awards and two-seven win; independently authored five-line chart, Wild weights and uniform multiplier. Full expansion return and1300x provider coupling remain unverified.'};
  return configurePublicColorGamble(d);
}
