// Public Jungle Sisters bonus transitions with explicitly independent tickets.
// The provider's private distribution, complete prizes and line chart are unknown.
import {baseRound,draw,error} from './engines/shared.mjs';
import {evaluatePublicWildGrid,publicHeldSlot} from './official72-mechanics.mjs';
import {independentPaylines} from './official72-layouts.mjs';
import {configurePublicColorGamble} from './public-gamble.mjs';

export const JUNGLE_SISTERS_ID='ind74_official_junglesisters';
export const JUNGLE_SISTERS_DELUXE_ID='ind74_official_junglesistersdeluxe';
export const JUNGLE_SISTERS_IDS=Object.freeze([JUNGLE_SISTERS_ID,JUNGLE_SISTERS_DELUXE_ID]);
const BONUS_POOL=Object.freeze([1,2,3,4,5,10,20,30,40,50,100]);
const SOURCE='references/official-slot-help-en-20261111.json';
const copy=value=>structuredClone(value);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const canonical=value=>JSON.stringify(value,(_,v)=>record(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const equal=(a,b)=>canonical(a)===canonical(b);
const min=(a,b)=>a<b?a:b;

export function configureJungleSisters(d){
 if(!JUNGLE_SISTERS_IDS.includes(d?.id)||d.family!=='slots')throw new TypeError('A Jungle Sisters title definition is required.');
 const deluxe=d.id===JUNGLE_SISTERS_DELUXE_ID,slug=deluxe?'junglesistersdeluxe':'junglesisters';
 configurePublicColorGamble(d);
 d.mathVersion=deluxe?'official72-junglesistersdeluxe-r4':'official72-junglesisters-r3';
 d.model='independent-jungle-sisters-free-spins';d.slotMechanic='jungle-free-spins';
 d.rows=3;d.cols=5;d.paylines=independentPaylines(5,3,20);
 d.multiplierValues=deluxe?[1,2,3,4,5,10]:[1,2,3,4,5];
 d.wildSymbol={id:slug+'-wild',label:'Wild',glyph:'W'};
 d.wildRule={columns:[0,1,2,3,4],substitutesRegularSymbols:true,expandWhenWinning:false,
  regularSymbolWeight:32,wildWeight:1,allWildAward:'highest-eligible-regular-award',providerProbabilitiesVerified:false};
 d.scatterSymbol={id:slug+'-scatter',label:'Bonus Scatter',glyph:'S'};
 d.blockerSymbols=[d.scatterSymbol.id];
 d.jungleFeature={source:SOURCE,captionPrefix:deluxe?'help.slots.jungleSistersDeluxe':'help.slots.jungleSisters',
  variant:deluxe?'deluxe':'standard',triggerScatters:7,initialFreeSpins:10,maximumFrames:10,
  scatterColumns:[1,2,3],scattersInFreeSpins:!deluxe,retrigger:false,
  scatterPaytable:[{minimumCount:7,multiplier:3},{minimumCount:8,multiplier:5},{minimumCount:9,multiplier:10}],
  scatterAwardBasis:'total-base-stake-independent-interpretation',scatterAwardBasisVerified:false,
  baseMultiplierValues:[...d.multiplierValues],baseMultiplierValuesVerified:!deluxe,
  bonusMultiplierValues:deluxe?[...BONUS_POOL]:[1,2,3,4,5,10,20],
  multiplierValues:deluxe?[...BONUS_POOL]:[1,2,3,4,5,10,20],
  selectedBonusMultiplierCount:deluxe?5:null,selectedMultiplierCount:deluxe?5:null,selection:'uniform-without-replacement-independent',
  maximumAwardMultiplier:deluxe?2500:1500,maximumRandomDraws:181,
  ticketWeights:{regular:32,wild:1,scatter:4},providerProbabilitiesVerified:false,
  paytableVerified:false,paylineChartVerified:false,
  buyBonus:{implemented:false,priceMultiplier:null,reason:'A numeric price ratio and purchase lifecycle have not been verified.'},
  maximumScope:'base-plus-free-spins-before-optional-independent-X2',settlement:'single-final-credit'};
 d.provenance={...d.provenance,publicFeatureRules:SOURCE+':'+d.jungleFeature.captionPrefix,
  paylineCountSource:SOURCE+':help.slots.jungleSisters.about.the.game.description',
  paylineSource:'Independent twenty-line chart; rendered provider chart is unverified.',
  designed:'Documented Wild, seven-Scatter trigger, ten non-retriggering free spins, title-specific multiplier selection and X2. Regular prizes, line chart, cell tickets and Scatter award basis remain independent.'};
 d.nominalReturn={verified:false,description:'Independent regular prizes, tickets, multiplier selection and Scatter award basis; provider RTP is not reproduced.'};
 d.releaseReview={realMoneyAdmissionBlocked:true,codes:['INDEPENDENT_BONUS_DISTRIBUTION_UNREVIEWED','REFERENCE_PAYTABLE_AND_CHART_UNVERIFIED'],
  requiredAction:'Review and version the independent complete feature distribution and verify the title-specific public prizes/chart before real-money admission.'};
 d.implementationStatus='independent-feature-model; real-money-admission-blocked; public-prizes-and-distribution-review-required';
 d.rules=[
  'The public Jungle Sisters Help specifies twenty paylines. This implementation retains its authored five-reel, three-row board, regular-symbol prizes and an explicitly independent twenty-line chart; the complete rendered reference chart and regular paytable are not verified.',
  'Wild can land on every reel and substitutes for regular symbols, never for Scatter. Each left-to-right line pays its highest eligible regular prize once. Scatter may land only on reels2,3,4.',
  'Seven or more Scatters trigger ten free spins after the base result. The public Scatter tiers are7=3x,8=5x,9=10x. This model interprets those prizes as multiples of the total base stake; that award basis still requires rendered verification.',
  deluxe?'During Deluxe free spins no Scatter can land and the feature cannot retrigger. Before the feature, five distinct multipliers are selected from1,2,3,4,5,10,20,30,40,50,100. Each free spin uses one of those five values. Independent selection is uniform without replacement; provider weights are unknown.'
   :'During ordinary Jungle Sisters free spins, Scatters remain confined to reels2,3,4 and cannot retrigger. The multiplier reel retains1,2,3,4,5 and adds10,20. This model scores the same Scatter cash tiers during the feature without adding free spins.',
  deluxe?'Deluxe Help says five base multipliers but lists six:1,2,3,4,5,10. This independent interpretation uses all six listed values and marks the conflict unverified; no provider probability or resolved reference interpretation is claimed.'
   :'The base multiplier reel uses the documented1,2,3,4,5 values. This independent engine selects a value before evaluating each board and applies it to combined regular and Scatter prizes.',
  'Regular line prizes use integer minor units: floor(total stake times the authored line prize divided by20), followed by the selected multiplier. The multiplier also applies to the independently interpreted Scatter cash award. The base and all free-spin awards combine into one final credit; free spins never debit another stake.',
  'A published maximum of'+(deluxe?'2500':'1500')+'times the base stake is applied openly to the combined base and free-spin award. Reaching that cap cancels any unplayed free spins. Optional independent X2 follows the capped result and has its own fully reserved bound; the provider maximum/X2 coupling remains unverified.',
  'Each regular symbol has32tickets, Wild1, and an eligible Scatter4. Board cells, multiplier picks and Deluxe distinct selections use independent draws. These choices do not recover the provider RNG, reel strips, feature frequency or certified RTP.',
  'The entire accepted round resolves on the server. At most ten bonus boards and181consumed draws are retained for deterministic replay. Reload, STOP and visual replay cannot create another result or debit.',
  'BUY BONUS remains unavailable because the generic Help quote does not establish a verified scalable price. Unsupported purchase/progress inputs are rejected. The promotional bonus wallet is never involved.',
  'X2 and Collect use the shared held-win lifecycle. Fair red/black draws and a three-attempt limit are explicit independent choices. AUTO collects instead of choosing a gamble color.',
  'REAL-MONEY ADMISSION IS BLOCKED while this independent complete feature distribution and the reference regular prizes/chart remain unreviewed. Passing lifecycle tests does not remove that requirement.',
 ];
 return d;
}

export const jungleMaximumMultiplierBps=d=>d.jungleFeature.maximumAwardMultiplier*10000*2**d.gamble.maxRounds;
export function maximumJunglePayout(d,betMinor,options={}){
 return(BigInt(betMinor)*BigInt(d.jungleFeature.maximumAwardMultiplier)*BigInt(options.holdWin===true?2**d.gamble.maxRounds:1)).toString();
}
function board(d,rng,free){
 const regular=d.symbols.length*d.jungleFeature.ticketWeights.regular,wild=d.jungleFeature.ticketWeights.wild;
 return Array.from({length:d.rows},()=>Array.from({length:d.cols},(_,col)=>{
  const scatter=d.jungleFeature.scatterColumns.includes(col)&&(!free||d.jungleFeature.scattersInFreeSpins)?d.jungleFeature.ticketWeights.scatter:0;
  const ticket=draw(rng,regular+wild+scatter);
  return ticket<regular?d.symbols[ticket%d.symbols.length].id:ticket<regular+wild?d.wildSymbol.id:d.scatterSymbol.id;
 }));
}
export function evaluateJungleBoard(d,betMinor,grid,spinMultiplier,{free=false}={}){
 const possible=free?d.jungleFeature.bonusMultiplierValues:d.jungleFeature.baseMultiplierValues;
 if(!possible.includes(spinMultiplier))error('INVALID_GRID','The selected multiplier must belong to this title and phase.');
 const regular=evaluatePublicWildGrid(d,betMinor,grid),scatterPositions=[];
 for(let row=0;row<d.rows;row++)for(let col=0;col<d.cols;col++)if(grid[row][col]===d.scatterSymbol.id){
  if(!d.jungleFeature.scatterColumns.includes(col)||free&&!d.jungleFeature.scattersInFreeSpins)error('INVALID_GRID','Scatter is not permitted in this column or feature phase.');
  scatterPositions.push({row,col});
 }
 const scatterCount=scatterPositions.length,tier=d.jungleFeature.scatterPaytable.filter(t=>scatterCount>=t.minimumCount).at(-1);
 const plainScatter=BigInt(betMinor)*BigInt(tier?.multiplier??0),multiplier=BigInt(spinMultiplier);
 const regularAward=BigInt(regular.winMinor)*multiplier,scatterAward=plainScatter*multiplier;
 return{lineWins:regular.lineWins.map(line=>({...line,winMinor:(BigInt(line.winMinor)*multiplier).toString()})),
  scatterPositions,scatterCount,spinMultiplier,regularAwardMinor:regularAward.toString(),scatterAwardMinor:scatterAward.toString(),
  unmultipliedRegularAwardMinor:regular.winMinor,unmultipliedScatterAwardMinor:plainScatter.toString(),
  rawAwardMinor:(regularAward+scatterAward).toString()};
}
function selectBonusMultipliers(d,rng){
 const pool=[...d.jungleFeature.bonusMultiplierValues];
 if(d.jungleFeature.variant!=='deluxe')return pool;
 const selected=[];
 for(let n=0;n<d.jungleFeature.selectedBonusMultiplierCount;n++)selected.push(pool.splice(draw(rng,pool.length),1)[0]);
 return selected.sort((a,b)=>a-b);
}
function resolveJungle(d,{betMinor,rng}){
 const round=baseRound(d,betMinor),trace=[];
 const random=bound=>{const value=draw(rng,bound);trace.push(value);if(trace.length>d.jungleFeature.maximumRandomDraws)error('INVALID_JUNGLE_FEATURE','Consumed draw bound exceeded.');return value;};
 const baseMultiplier=d.multiplierValues[draw(random,d.multiplierValues.length)],initialGrid=board(d,random,false);
 const base=evaluateJungleBoard(d,round.betMinor,initialGrid,baseMultiplier),cap=BigInt(round.betMinor)*BigInt(d.jungleFeature.maximumAwardMultiplier);
 const baseAward=min(BigInt(base.rawAwardMinor),cap),bonusTriggered=base.scatterCount>=d.jungleFeature.triggerScatters;
 let total=baseAward,remaining=bonusTriggered?d.jungleFeature.initialFreeSpins:0,cancelled=0,finalGrid=initialGrid;
 const bonusFrames=[],selectedBonusMultipliers=remaining&&total<cap?selectBonusMultipliers(d,random):[];
 if(total===cap){cancelled=remaining;remaining=0;}
 while(remaining>0){
  remaining--;
  const spinMultiplier=selectedBonusMultipliers[draw(random,selectedBonusMultipliers.length)],grid=board(d,random,true);
  const scored=evaluateJungleBoard(d,round.betMinor,grid,spinMultiplier,{free:true}),award=min(BigInt(scored.rawAwardMinor),cap-total);
  total+=award;const capReached=total===cap;
  if(capReached){cancelled=remaining;remaining=0;}
  bonusFrames.push({index:bonusFrames.length+1,grid,...scored,awardMinor:award.toString(),totalAwardMinor:total.toString(),
   freeSpinsAwarded:0,freeSpinsRemaining:remaining,freeSpinsCancelledAtMaximum:capReached?cancelled:0,capReached});
  finalGrid=grid;
 }
 return{...round,status:total===0n?'lost':'collected',step:1,winMinor:total.toString(),multiplierBps:Number(total*10000n/BigInt(round.betMinor)),private:{draws:trace},
  outcome:{kind:'slots',featureType:'jungle-free-spins',variant:d.jungleFeature.variant,initialGrid,grid:finalGrid,
   lineWins:base.lineWins,baseLineWins:base.lineWins,baseSpinMultiplier:baseMultiplier,reelMultiplier:baseMultiplier,
   baseScatterCount:base.scatterCount,baseScatterPositions:base.scatterPositions,baseRegularAwardMinor:base.regularAwardMinor,
   baseScatterAwardMinor:base.scatterAwardMinor,baseRawAwardMinor:base.rawAwardMinor,baseAwardMinor:baseAward.toString(),
   bonusTriggered,selectedBonusMultipliers,bonusFrames,freeSpinsAwarded:bonusTriggered?10:0,freeSpinsPlayed:bonusFrames.length,
   freeSpinsRemaining:0,freeSpinsCancelledAtMaximum:cancelled,maximumAwardMinor:cap.toString(),capReached:total===cap,
   totalAwardMinor:total.toString(),settlement:'single-final-credit'}};
}
function compact(round){const{bonusFrames,...summary}=round.outcome;return{...round,outcome:{...summary,bonusFrameCount:bonusFrames.length,transcriptStorage:'consumed-server-draw-replay'}};}
export const startJungleSisters=(d,args)=>compact(resolveJungle(d,args));
export function validateJungleRound(d,round){
 const draws=round.private?.draws;
 if(!Array.isArray(draws)||draws.length>d.jungleFeature.maximumRandomDraws||draws.some(n=>!Number.isSafeInteger(n)||n<0)||round.step!==1||round.history.length)error('INVALID_ROUND','Invalid Jungle consumed draw transcript.');
 let cursor=0,expected;
 try{expected=resolveJungle(d,{betMinor:round.betMinor,rng:()=>draws[cursor++]});}catch{error('INVALID_ROUND','The accepted Jungle transcript cannot be replayed.');}
 if(cursor!==draws.length||!equal(compact(expected).outcome,round.outcome)||expected.winMinor!==(round.holdWin===true?round.baseWinMinor:round.winMinor)||
   round.holdWin!==true&&(round.status!==expected.status||round.multiplierBps!==expected.multiplierBps))error('INVALID_ROUND','The Jungle award or feature board disagrees with the accepted server draws.');
 return expected;
}
export function publicJungleRound(d,round){const resolved=validateJungleRound(d,round);return{...publicHeldSlot(d,round),outcome:copy(resolved.outcome)};}
