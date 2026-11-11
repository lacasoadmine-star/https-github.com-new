// Count-anywhere tumble engine shares only compatible transitions with Gates:
// Genie has10initial free spins, per-sequence bonus-only multipliers and Carpet.
export const GENIES_BONANZA_ID='ind74_official_geniesbonanza';
export function configureGeniesBonanza(d){
  if(d?.id!==GENIES_BONANZA_ID||d.family!=='slots')throw new TypeError('The Genie definition is required.');
  d.mathVersion='official72-geniesbonanza-r4';d.model='independent-genie-count-tumble';d.slotMechanic='tumble';
  d.rows=5;d.cols=6;d.paylines=[];d.proratedStake=false;
  for(const name of ['wildSymbol','wildRule','multiplierValues','gamble'])delete d[name];
  // The rendered table at0.20DMO supplies count awards, not reel weights.
  // Keep the existing IDs and independently chosen per-symbol ticket weight.
  const symbols=[['blue-gem','Blue gem','◆',4000,8000,40000],['green-gem','Green gem','▰',6000,10000,50000],
    ['pink-gem','Pink gem','⬢',8000,12000,70000],['red-gem','Red gem','▲',10000,15000,80000],
    ['yellow-gem','Yellow gem','♦',2000,6000,20000],['necklace','Necklace','◯',12000,20000,100000],
    ['ring','Ring','♢',25000,60000,200000],['hourglass','Hourglass','⌛',15000,25000,120000],
    ['lamp','Lamp','⚱',20000,40000,150000],['crown','Crown','♛',50000,100000,500000]];
  d.symbols=symbols.map(([id,label,glyph])=>({id:'geniesbonanza-'+id,label,glyph,weight:1,pays:{}}));
  d.scatterSymbol={id:'geniesbonanza-scatter',label:'Genie Scatter',glyph:'S'};
  d.multiplierSymbol={id:'geniesbonanza-multiplier',label:'Bonus multiplier',glyph:'×'};
  d.tumbleFeature={source:'references/official-slot-help-en-20261111.json:help.slots.geniesbonanza',
    geometrySource:'reports/current74-evidence-slots-remaining/ind74_official_geniesbonanza-initial.png',
    modes:['base','buy100'],defaultMode:'base',costBps:{base:10000,buy100:1000000},stakeMeaning:'total-effective-debit',
    totalStakeStepMinor:{base:'100',buy100:'10000'},minimumBaseBetMinor:'100',minimumMatch:8,minimumMatchVerified:true,
    countPaytable:symbols.map(([id,,,eight,ten,twelve])=>({symbolId:'geniesbonanza-'+id,tiers:[
      {minimumCount:8,multiplierBps:eight},{minimumCount:10,multiplierBps:ten},
      {minimumCount:12,multiplierBps:twelve}]})),paytableVerified:true,
    paytableSource:{displayedTotalBetMinor:'20',regular:'reports/priority10-reference-20261111/genie-paytable.jpg',
      scatter:'tests/evidence/official-demo-observations-frontend-five20261111.json:ind74_official_geniesbonanza.paytable.scatter4Plus',
      awardBasis:'displayed-symbol-award-divided-by-displayed-total-stake'},
    scatterPaytable:[{minimumCount:4,multiplierBps:50000}],
    multiplierValues:[2,3,4,5,6,7,8,9,10,12,15,18,20,25,30,40,50,60,80,90,100],
    bonusOnlyMultipliers:true,multiplierPersistence:'sequence',triggerScatters:4,initialFreeSpins:10,
    retriggerScatters:3,retriggerFreeSpins:5,maximumMultiplier:3000,
    ticketWeights:{regular:32,scatter:8,multiplier:1,magic:0},
    carpetFeature:{minimumClouds:4,maximumClouds:8,triggerTickets:1,totalTickets:64,
      cloudMultiplierTickets:1,cloudOutcomeTickets:5,providerProbabilitiesVerified:false,
      interpretation:'independent4-to8distinct-cloud-cells-transform-to-one-regular-symbol-or-a-bonus-multiplier'},
    probabilityModel:'independent-cell-and-carpet-tickets',providerProbabilitiesVerified:false,
    processingSafety:{maximumBoards:256,maximumRandomDraws:23044,action:'award-full-maximum-and-finish',operatorRule:true},
    aggregation:'one-total-debit-and-one-final-credit',unsupportedOptions:['bonusBet','bonusRisk','progressBuyDiscount'],
  };
  d.nominalReturn={verified:false,description:'Count and Scatter prizes follow the fresh rendered public table. Cell tickets, Carpet draws, feature ordering and processing guarantee remain independent; not the provider RTP.'};
  d.provenance={...d.provenance,geometrySource:d.tumbleFeature.geometrySource,publicFeatureRules:d.tumbleFeature.source,
    publicPaytableSource:d.tumbleFeature.paytableSource,
    designed:'Observed6-by5 count-anywhere tumbles and public count/Scatter awards; documented10free/+5 retrigger, bonus-only multipliers, Carpet and100x buy. Probabilities and ambiguous feature ordering remain independent; B+ carry/risk remains closed.'};
  d.rules=[
    'The official DEMO shows6columns and5rows and completed results contain30symbols. Exact Help says symbols pay anywhere with no line requirement: winning groups disappear, survivors fall within columns and holes refill until no further winning group remains.',
    'The fresh rendered paytable at0.20DMO establishes8–9,10–11and12+matching regular-symbol awards. The ten original regular-symbol illustrations follow those observed categories. Awards scale by the derived base stake; frequencies remain independently authored.',
    'Four or more final Scatter symbols pay5times the derived base stake and trigger10free spins. Three or more during a free spin add5more;3Scatters receive no invented coin award. Scatter prizes are scored once per completed tumble sequence and combine with regular awards before the sequence multiplier; that aggregation order remains an independent interpretation.',
    'Multiplier symbols occur only in free spins, with the exact documented values2,3,4,5,6,7,8,9,10,12,15,18,20,25,30,40,50,60,80,90,100. All multiplier values remaining on the final sequence board add and multiply that sequence award. They do not persist into the next free spin.',
    'During free spins, Carpet can place four or more question-cloud cells before ordinary cells fill. This independent implementation uses4to8distinct clouds: they transform into one randomly selected regular symbol, with independently selected cloud cells instead revealing a bonus multiplier. The next spin uses a newly generated board.',
    'Buy100 debits100times the derived base stake once, guarantees at least4initial Scatters and resolves the complete bonus. The API stake is the total debit; the derived base must be a whole ETB. No additional stake is charged for free spins or tumbles.',
    'The independently applied maximum is3000times the derived base stake. At the maximum the entire round finishes. The public text uses total-bet wording; its purchase-cost interpretation is not established and this base-stake cap interpretation is disclosed.',
    'For bounded atomic recovery, at most256boards are evaluated. If work remains, the independent processing guarantee awards the full3000x maximum and ends the round. It never discards unresolved potential awards at an execution limit.',
    'B+ requires a separate per-bet100-Scatter progress ledger,25% surcharge, progress-dependent Risk action and related bonus sequencing. Those controls are not implemented here and are rejected, rather than silently treated as ordinary spins. This build implements the ordinary and100x-purchased core.',
    'Each regular symbol receives32tickets, Scatter8 and a free-spin multiplier1. Carpet starts on1of64independent tickets; cloud count, regular symbol, positions and multiplier values use independent uniform choices. The public awards do not establish these probabilities or provider RNG and certified RTP.',
  ];
  return d;
}
