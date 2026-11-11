import {configurePublicColorGamble} from '../public-gamble.mjs';

export function configureOfficialGame(d){
  if(d?.id!=='ind74_official_bookoffuturia'||d.family!=='slots')throw new TypeError('The independent Book of Futuria definition is required.');
  d.rules=[
    'This partial independent Book of Futuria model retains its five-reel, three-row regular-symbol engine, authored twenty-line chart and authored symbol prizes. Provider geometry, the full line chart and prizes are not verified.',
    'Each regular cell chooses uniformly among eight original symbols. Winning lines pay left to right; each award is floor(total accepted stake times the authored line prize divided by twenty). X2 and collection never debit another stake.',
    'The exact active title Help documents a red/black X2 feature separately from its paid B+ Bonus Risk wheel. This implementation supports only the ordinary held-award X2/collection lifecycle.',
    'Book Wild/Scatter, the three-Book trigger, ten free spins and retriggers, selected-symbol expansion, bonus purchase and B+ progress/paid Risk remain unimplemented. Their partial documentation does not establish complete bonus geometry, purchase price or persistent-state behavior; unsupported options are rejected.',
  ];
  configurePublicColorGamble(d);
  d.provenance={...d.provenance,publicGambleSource:'references/official-bookoffuturia-help-en-20261111.json:help.slot.bookoffuturia.x2.description',
    distinctUnimplementedBonusRiskSource:'references/official-bookoffuturia-help-en-20261111.json:help.slot.bookoffuturia.bonus.description'};
  d.releaseReview={realMoneyAdmissionBlocked:true,codes:['PUBLIC_MECHANICS_INCOMPLETE','REFERENCE_PAYTABLE_AND_CHART_UNVERIFIED'],
    requiredAction:'Complete and verify the title-specific Book bonus and B+ lifecycle, geometry, public prizes/chart and independent distribution before financial admission. Red/black X2 does not implement paid Bonus Risk.'};
  d.implementationStatus='independent-partial-model; real-money-admission-blocked; Book-bonus-and-B+-features-missing';
  d.rules.push('REAL-MONEY ADMISSION IS BLOCKED while the documented Book bonus and B+ features, reference geometry, regular prizes and chart remain incomplete or unverified. Passing X2 and ledger tests does not clear that restriction.');
  return d;
}

export default {
  "id": "ind74_bookoffuturia",
  "title": "Book of Futuria — Independent",
  "catalogName": "Book of Futuria",
  "sourceCategory": "Slots",
  "mathVersion": "independent-bookoffuturia-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 67",
    "colors": [
      "#301195",
      "#2a99ec",
      "#68f12b"
    ]
  },
  "limits": {
    "minBetMinor": "20",
    "maxBetMinor": "100000",
    "betStepMinor": "20",
    "maxWinMinor": "149900000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/book-of-futuria",
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
    ]
  ],
  "symbols": [
    {
      "id": "bookoffuturia-symbol-0",
      "label": "Citrus Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 23,
        "4": 117,
        "5": 1219
      }
    },
    {
      "id": "bookoffuturia-symbol-1",
      "label": "Orchard Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 25,
        "4": 121,
        "5": 1259
      }
    },
    {
      "id": "bookoffuturia-symbol-2",
      "label": "Velvet Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 27,
        "4": 125,
        "5": 1299
      }
    },
    {
      "id": "bookoffuturia-symbol-3",
      "label": "Amber Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 29,
        "4": 129,
        "5": 1339
      }
    },
    {
      "id": "bookoffuturia-symbol-4",
      "label": "Prism Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 31,
        "4": 133,
        "5": 1379
      }
    },
    {
      "id": "bookoffuturia-symbol-5",
      "label": "Ivory Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 33,
        "4": 137,
        "5": 1419
      }
    },
    {
      "id": "bookoffuturia-symbol-6",
      "label": "Ruby Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 35,
        "4": 141,
        "5": 1459
      }
    },
    {
      "id": "bookoffuturia-symbol-7",
      "label": "Copper Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 37,
        "4": 145,
        "5": 1499
      }
    }
  ],
  "rules": [
    "This original five-reel, three-row slot has 20 published paylines. The stake divides equally over those lines.",
    "Every cell independently selects one of eight equally likely original symbols.",
    "Only three, four or five consecutive identical symbols from the first reel pay. Each line awards its longest match once; winning line awards add.",
    "Each symbol prize multiplies one line's stake. Wilds, scatters, free spins and provider bonus mechanics are absent."
  ],
  "nominalReturn": {
    "numerator": "3956",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
