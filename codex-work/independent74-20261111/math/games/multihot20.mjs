export default {
 id:'ind74_multihot20',title:'Multi Hot 20 — Independent',catalogName:'Multi Hot 20',sourceCategory:'Slots',family:'slots',model:'lines-slot-v1',mathVersion:'independent-multihot20-v1',implementationStatus:'math-tested-not-financially-verified',
 theme:{name:'Ember Orchard',colors:['#431407','#fb923c','#fef08a']},
 limits:{minBetMinor:'20',maxBetMinor:'100000',betStepMinor:'20',maxWinMinor:'134000000'},
 rows:3,cols:5,
 paylines:[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],[1,1,0,1,1],[1,1,2,1,1],[0,2,0,2,0],[2,0,2,0,2],[0,2,1,2,0]],
 symbols:[
  {id:'ember-ruby',label:'Ember Ruby',glyph:'◆',weight:1,pays:{3:23,4:136,5:1060}},
  {id:'copper-bell',label:'Copper Bell',glyph:'♧',weight:1,pays:{3:25,4:140,5:1100}},
  {id:'citrus-sun',label:'Citrus Sun',glyph:'☀',weight:1,pays:{3:27,4:144,5:1140}},
  {id:'orchard-leaf',label:'Orchard Leaf',glyph:'❧',weight:1,pays:{3:29,4:148,5:1180}},
  {id:'velvet-plum',label:'Velvet Plum',glyph:'●',weight:1,pays:{3:31,4:152,5:1220}},
  {id:'amber-star',label:'Amber Star',glyph:'★',weight:1,pays:{3:33,4:156,5:1260}},
  {id:'gold-prism',label:'Gold Prism',glyph:'✧',weight:1,pays:{3:35,4:160,5:1300}},
  {id:'orchard-crown',label:'Orchard Crown',glyph:'♛',weight:1,pays:{3:37,4:164,5:1340}}
 ],
 rules:['Our original 5-reel,3-row slot uses20published paylines.','The stake divides equally over20lines; stakes must be multiples of20minorunits.','Each cell draws independently from8equally likely original symbols.','Only3,4or5consecutive identical symbols from the first reel pay; each line pays its longest match once.','Line awards add. There are no wilds,scatters,free spins or provider bonuses.'],
 nominalReturn:{numerator:'3930',denominator:'4096',percent:'95.947265625%',proof:'For each symbol with prizes A,B,C at3,4,5matches,the contribution is(56A+7B+C)/32768. Sum all8symbols. Every line has this expectation; equal stake splitting and summing preserve it.'},
 provenance:{catalog:'Official title/category only.',observed:'No completed official Multi Hot20demo round verified.',designed:'Original20paylines,8symbol labels/glyphs,uniform distributions,all prizes,limits and mathematical model. No provider source or media reused.'}
};

// Current catalogue configuration stays in this title module. The default
// export above remains the retained independent fixture definition.
import {configurePublicColorGamble} from '../public-gamble.mjs';
export function configureOfficialGame(d){
  if(d?.id!=='ind74_official_multihot20'||d.family!=='slots')throw new TypeError('The Multi Hot20 definition is required.');
  d.multiplierValues=[1,2,3,4,5];
  d.symbols=[['seven','Seven','7',50,400,2000],['bell','Bell','🔔',20,100,200],['grape','Grapes','🍇',10,50,100],
    ['watermelon','Watermelon','🍉',10,50,100],['lemon','Lemon','🍋',5,10,50],['plum','Plum','●',5,10,50],
    ['orange','Orange','🍊',5,10,50],['cherry','Cherry','🍒',5,10,50]]
    .map(([id,label,glyph,three,four,five])=>({id:'multihot20-'+id,label,glyph,weight:1,pays:{3:three,4:four,5:five}}));
  d.paytable=d.symbols.map(symbol=>({label:symbol.label,...symbol.pays}));
  d.observedPaytable={source:'reports/priority10-reference-20261111/multihot20-paytable.jpg',totalBetMinor:'20',paylines:20,
    publishedMaximumMultiplier:1000,maximumCouplingVerified:false,independentFullBoardMaximumMultiplier:10000,
    observedWin:'Three grapes on Line5 paid0.10DMO before2x=0.20; total stake0.20DMO, then collected separately.',
    conflict:'The published symbol awards combined with independently possible full-board paylines and5x permit10000x. The Help1000x maximum requires unverified provider restrictions or coupling.'};
  d.releaseReview={realMoneyAdmissionBlocked:true,codes:['INDEPENDENT_RETURN_ABOVE_STAKE','PROVIDER_MAXIMUM_COUPLING_UNVERIFIED'],
    independentAnalyticReturn:{numerator:'198600',denominator:'163840',scope:'before-per-line-minor-unit-flooring'},
    requiredAction:'Review and version the independent probability distribution before any real-money admission. Do not substitute a provider RTP claim or silently tune unobserved weights.'};
  d.implementationStatus='independent-model; real-money-admission-blocked; independent-return-above-stake';
  d.rules=[
    'The observed official board has5reels,3rows and20active lines. This implementation retains its independently authored twenty-line chart.',
    'Three, four or five matching symbols from the left pay the highest regular award on each line. Each line award floors(total stake times its symbol prize divided by20), then the selected1x–5x multiplier applies.',
    'Symbol categories and prizes follow the fresh0.20DMO official paytable; a current-session three-grape line paid0.10DMO before2x. Every cell remains independently uniform among the eight regular symbols; provider frequencies are not inferred.',
    'The Help states1000x maximum, but the displayed prizes allow an independent full-board10000x bound before optional X2. The model reserves that complete attainable bound; no hidden payout clamp replaces unverified provider reel restrictions or coupling.',
    'REAL-MONEY ADMISSION IS BLOCKED: the retained independent uniform-symbol and uniform-multiplier distribution has analytic return198600/163840, approximately121.22%before line rounding. This is not the provider RTP. A reviewed and newly versioned independent distribution is required before production admission; functional tests cannot clear this restriction.',
  ];
  d.rules.push('The exact title Help documents multiplier values1x,2x,3x,4x,5x, applied to the completed spin award. This independent implementation selects these values uniformly; provider weights and reel order remain unknown.');
  d.provenance={...d.provenance,publicMultiplierSource:'references/official-slot-help-en-20261111.json:help.slots.multihot20.multiplier.reel.description',
    publicPaytableSource:d.observedPaytable.source,observed:'Fresh official five-round history, held collection and paytable are saved in reports/priority10-reference-20261111/.',
    designed:'Observed regular-symbol prizes, with independent twenty-line chart, uniform cells, uniform multiplier and optional three-attempt fair-color X2. Provider1000x coupling remains unverified.'};
  return configurePublicColorGamble(d);
}
