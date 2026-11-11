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
