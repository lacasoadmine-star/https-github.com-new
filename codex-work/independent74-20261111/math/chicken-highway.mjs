// Public road-display coefficients only; no provider outcome logic or
// probability distribution is reproduced. Source hashes are in the journal.
export const CHICKEN_HIGHWAY_ID='ind74_official_chickenhighway';
export const CHICKEN_HIGHWAY_TABLES=Object.freeze({
  "easy": [
    10200,
    10600,
    11000,
    11500,
    12200,
    13000,
    14000,
    15500,
    17200,
    19000,
    21000,
    22500,
    25000,
    30000,
    35000,
    42000,
    50000,
    60000,
    72000,
    86000,
    103000,
    123000,
    147000,
    175000,
    200000
  ],
  "medium": [
    11200,
    13000,
    15000,
    17500,
    21000,
    28000,
    39000,
    55000,
    76000,
    107000,
    152000,
    215000,
    304000,
    434000,
    615000,
    867000,
    1236000,
    1764000,
    2505000,
    3556000,
    5067000,
    7208000,
    10000000
  ],
  "hard": [
    12500,
    15500,
    20500,
    25700,
    34500,
    56700,
    94700,
    172000,
    311000,
    562000,
    1019000,
    1841000,
    3313000,
    6017000,
    10927000,
    19829000,
    35963000,
    61754000,
    100000000
  ]
});
for(const values of Object.values(CHICKEN_HIGHWAY_TABLES))Object.freeze(values);
export function configureChickenHighway(d) {
  if(d?.id!==CHICKEN_HIGHWAY_ID||d.family!=='ladder')throw new TypeError('Chicken Highway ladder definition required.');
  d.mathVersion='official72-chickenhighway-r3';
  d.modes=['easy','medium','hard'];d.defaultMode='easy';
  d.multipliersBps=[...CHICKEN_HIGHWAY_TABLES.easy];d.maxSteps=d.multipliersBps.length;
  // This retained independent telescoping survival rule is operator math.
  // The public Help's97% provider claim is not substituted into our RNG.
  d.returnBps=9480;
  d.paytable=d.modes.map(mode=>({mode,rows:CHICKEN_HIGHWAY_TABLES[mode].map((multiplierBps,index)=>({step:index+1,label:'Lane '+(index+1),multiplierBps}))}));
  d.nominalReturn={numerator:'9480',denominator:'10000',type:'independent-before-integer-floor',verified:false,
    description:'Independent survival model:9480/first multiplier, then previous/next multiplier. This is not the documented provider97% RTP.'};
  d.rules=[
    'Chicken Highway is a horizontal road-crossing game. The official public presentation source supplies25 EASY lanes ending20x,23 MEDIUM lanes ending1000x and19 HARD lanes ending10000x. These are documented display values, not observed wins at every lane.',
    'START accepts one stake and attempts the first crossing. A safe first EASY crossing offers CASHOUT at1.02x. GO attempts the next lane without another debit; CASHOUT collects the confirmed current multiplier. A collision loses the uncollected stake and award. The final successful lane automatically collects in this independent implementation.',
    'Choose difficulty before starting. Mode and accepted stake remain fixed while the server round is active. Payouts use integer minor units and floor after multiplication; the browser cannot choose the outcome or supply a balance.',
    'Independent operator probabilities use9480/first-multiplier survival, then previous-multiplier/next-multiplier conditional survival. Those authored probabilities are not recovered provider probabilities and do not reproduce the official Help97% RTP claim.',
    'The official Help describes automatic runs with a selected cashout step and cashout after a disconnection longer than8seconds. These provider-specific autoplay and connection policies are not implemented; the retained server expiry/recovery policy still applies.',
    'The earlier visual reading of EASY lane8 as1.54 was inaccurate; the public presentation source specifies1.55. Full artwork, sound, probability and provider equivalence remain unverified.',
  ];
  d.provenance={...d.provenance,
    observed:'Official DEMO START crossed the first EASY1.02x lane; CASHOUT credited1.02DMO from a1DMO stake. The native controls become GO/CASHOUT while active.',
    publicDisplayTables:'reports/current74-evidence-nonslots/ind74_official_chickenhighway-display-tables.json',
    publicDisplaySource:'https://static.ssg-public.com/cache/b25/Games/Content/ChickenHighway/Scripts/index.js',
    publicDisplaySourceSha256:'5f4dd17e30a5a13390b41ae1e4463485ac4991a0f648f266beab4b377650f2bd',
    publicHelp:'reports/current74-evidence-nonslots/ind74_official_chickenhighway-rendered-rules.json',
    designed:'Independent survival probabilities and final-lane auto-collection; verified public coefficient tables and observed first-crossing control flow.'};
  return d;
}
