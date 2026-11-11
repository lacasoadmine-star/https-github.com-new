// Geometry and documented scoring structure from official DEMO result grids
// and exact Help namespaces. This does not implement cross-paid-spin Wild
// persistence or infer private probabilities from twenty observed rounds.
import {startThreeReelSlot} from './official72-mechanics.mjs';

export const MULTI_HOT_WAYS_ID='ind74_official_multihotways';
export const CHARGING_THREE_IDS=Object.freeze(['ind74_official_multifruitschargingwilds','ind74_official_gemscrownchargingwilds']);
export const OBSERVED_THREE_IDS=Object.freeze([MULTI_HOT_WAYS_ID,...CHARGING_THREE_IDS]);
const help='references/official-slot-help-en-20261111.json';
export function configureObservedThreeReel(d) {
  if(!OBSERVED_THREE_IDS.includes(d?.id)||d.family!=='slots')throw new TypeError('An observed three-reel title is required.');
  const ways=d.id===MULTI_HOT_WAYS_ID,ns=d.id.replace('ind74_official_','');
  d.rows=3;d.cols=3;
  d.mathVersion='official72-'+ns+(ns==='gemscrownchargingwilds'?'-r4':'-r3');
  d.symbols=d.symbols.map(symbol=>({...symbol,pays:{3:symbol.pays[3]}}));
  d.paylines=ways?[]:[[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]];
  if(ways) {
    d.ways=27;
    for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++)d.paylines.push([a,b,c]);
    d.multiplierValues=[1,2,3,4,5];
    d.rules=[
      'Twenty completed official DEMO results contain nine symbols, matching three reels and three rows. The title-specific official Help specifies 27 Reel Ways Pay and a left 1x, 2x, 3x, 4x or 5x multiplier reel.',
      'One matching symbol position from each consecutive reel, starting at the leftmost reel, forms a winning way. This independent model evaluates each of the 27 row combinations once; every matching way pays floor(total stake × authored symbol prize /27), then the left multiplier applies.',
      'The official Help additionally describes a conditional x2 when the same symbols appear on all three reels. The precise condition is unresolved and this extra feature remains unimplemented. The separate red/black X2 Gamble is also documented but not implemented for this title.',
      'The provider LinePlay value 1 is a betting field, not one fixed payline. No Wild substitution is inferred by copying Multi Hot Wild Ways. Symbol prizes, uniform regular-symbol tickets, stake/27 allocation and uniform multiplier probabilities are independent choices; provider math and complete parity are unverified.',
    ];
    d.provenance={...d.provenance,publicWaysSource:help+':help.slots.multihotways.doubleDIv.description',
      publicMultiplierSource:help+':help.slots.multihotways.multiplier.description',
      designed:'Distinct regular-symbol 27-ways model; no Wild alias, no invented conditional x2 trigger.'};
  } else {
    delete d.multiplierValues;
    d.rules=[
      'Twenty completed official DEMO result grids contain nine symbols, matching three reels and three rows. The exact title Help specifies five fixed active paylines and only the highest left-to-right win on each line.',
      'This independent regular-symbol fallback uses five authored paylines. Each matching three-symbol line pays floor(total stake × authored symbol prize /5); all line awards add.',
      'Documented but NOT implemented: a nonwinning Wild remains at its cell across new paid spins and charges +1; participating Wilds pay with their accumulated multiplier and leave the grid. Saved Wilds and multipliers belong to the selected bet value and return when that bet is selected again.',
      'The required persistent per-player, per-game and per-bet carry state must be changed atomically with the retained server wallet transaction. A single-spin replacement would not reproduce this feature. Ante-bet guarantees, feature purchase and X2 Gamble remain unimplemented.',
      'Regular-symbol tickets, symbol prizes and five-line chart are independently authored. No persistent Wild, provider probability, full reference equivalence or provider RTP is claimed by this fallback.',
    ];
    delete d.nominalReturn;
    d.provenance={...d.provenance,paylineCountSource:help+':help.slots.'+ns+'.payline.chart',
      documentedPersistentFeatureSource:help+':help.slots.'+ns+'.multiplier.reel.description',
      designed:'Three-by-three regular-symbol fallback only. Persistent charging Wilds require retained transactional carry state and are not implemented.'};
  }
  d.provenance={...d.provenance,
    geometrySource:'reports/current74-evidence-slots-remaining/'+d.id+'-initial.png',
    observed:'Twenty completed official DEMO results with nine returned symbols each, cross-checked against rendered three-by-three positions.'};
  return d;
}

export function startObservedRegularWays(d,options) {
  if(d.id!==MULTI_HOT_WAYS_ID||d.ways!==27||d.wildSymbol)throw new TypeError('Distinct regular Multi Hot Ways definition required.');
  const round=startThreeReelSlot(d,options);
  return {...round,outcome:{...round.outcome,ways:27,winningWaysCount:round.outcome.lineWins.length}};
}
