import {configurePublicColorGamble} from '../public-gamble.mjs';

export function configureOfficialGame(d){
  if(d?.id!=='ind74_official_vampires'||d.family!=='slots')throw new TypeError('The independent Vampires definition is required.');
  d.rules=[
    'This partial independent Vampires model retains its five-reel, three-row regular-symbol engine, authored ten-line chart and authored symbol prizes. Provider geometry, the full line chart and prizes are not verified.',
    'Each regular cell chooses uniformly among eight original symbols. Winning lines pay left to right; each award is floor(total accepted stake times the authored line prize divided by ten). No X2 or collection action adds another stake.',
    'The active title Help documents Wild on reels2–5 and a SMARTSOFT symbol on reel5 that changes itself and some other symbols into Wild. Those transformation mechanics remain unimplemented; the number and selection of other cells are not specified.',
    'The 3/4/5bonus-symbol to3/5/7free-spin text belongs to a Dark caption inside a commented-out HTML section. It is excluded from the active Vampires specification, and this implementation does not add that unverified feature.',
  ];
  configurePublicColorGamble(d);
  d.provenance={...d.provenance,publicGambleSource:'reports/current74-evidence-slots-secondary/ind74_official_vampires-official-help-en.json:help.slots.vampires.riskGame.description',
    excludedCommentedFeature:'reports/current74-evidence-slots-secondary/ind74_official_vampires-official-help.html:commented help.slots.dark.bonusSymbol.description'};
  d.releaseReview={realMoneyAdmissionBlocked:true,codes:['PUBLIC_MECHANICS_INCOMPLETE','REFERENCE_PAYTABLE_AND_CHART_UNVERIFIED'],
    requiredAction:'Complete and verify the active title Wild/SMARTSOFT behavior, regular prizes, line chart and independent distribution before financial admission. Commented unrelated captions are not a title specification.'};
  d.implementationStatus='independent-partial-model; real-money-admission-blocked; public-transforming-Wild-feature-missing';
  d.rules.push('REAL-MONEY ADMISSION IS BLOCKED while the documented Wild/SMARTSOFT feature and reference regular prizes/chart remain incomplete or unverified. Passing X2 and ledger tests does not clear that restriction.');
  return d;
}

export default {
  "id": "ind74_vampires",
  "title": "Vampires — Independent",
  "catalogName": "Vampires",
  "sourceCategory": "Slots",
  "mathVersion": "independent-vampires-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 70",
    "colors": [
      "#d7bf81",
      "#81fa21",
      "#8f875d"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "118700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/vampires",
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
      "id": "vampires-symbol-0",
      "label": "Amber Comet",
      "glyph": "◆",
      "weight": 1,
      "pays": {
        "3": 26,
        "4": 138,
        "5": 907
      }
    },
    {
      "id": "vampires-symbol-1",
      "label": "Prism Bell",
      "glyph": "♧",
      "weight": 1,
      "pays": {
        "3": 28,
        "4": 142,
        "5": 947
      }
    },
    {
      "id": "vampires-symbol-2",
      "label": "Ivory Sun",
      "glyph": "☀",
      "weight": 1,
      "pays": {
        "3": 30,
        "4": 146,
        "5": 987
      }
    },
    {
      "id": "vampires-symbol-3",
      "label": "Ruby Leaf",
      "glyph": "❧",
      "weight": 1,
      "pays": {
        "3": 32,
        "4": 150,
        "5": 1027
      }
    },
    {
      "id": "vampires-symbol-4",
      "label": "Copper Pearl",
      "glyph": "●",
      "weight": 1,
      "pays": {
        "3": 34,
        "4": 154,
        "5": 1067
      }
    },
    {
      "id": "vampires-symbol-5",
      "label": "Citrus Star",
      "glyph": "★",
      "weight": 1,
      "pays": {
        "3": 36,
        "4": 158,
        "5": 1107
      }
    },
    {
      "id": "vampires-symbol-6",
      "label": "Orchard Lantern",
      "glyph": "✧",
      "weight": 1,
      "pays": {
        "3": 38,
        "4": 162,
        "5": 1147
      }
    },
    {
      "id": "vampires-symbol-7",
      "label": "Velvet Crown",
      "glyph": "♛",
      "weight": 1,
      "pays": {
        "3": 40,
        "4": 166,
        "5": 1187
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
    "numerator": "3959",
    "denominator": "4096",
    "proof": "For eachsymbol payout A,B,C,the contribution is(56A+7B+C)/32768.Sum8symbols.Equal stake splitting preserves the return with integer line stakes."
  }
};
