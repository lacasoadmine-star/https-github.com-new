// Multi-selection wheel backed by public labels, fifty visual segments and an
// observed matched-cell3x gross payout. Bonus rules come from official Help.
// Uniform visual-segment tickets below are an independent operator choice,
// not provider RNG, even though the wheel geometry is documented.
import {baseRound,draw,error,payout} from './engines/shared.mjs';
export const WHEEL_OF_DESTINY_ID='ind74_official_wheelofdestiny';
const DISPLAY_ORDER=Object.freeze([8, 0, 1, 3, 0, 5, 1, 0, 4, 2, 0, 1, 0, 3, 0, 6, 1, 0, 4, 1, 3, 0, 5, 1, 0, 7, 2, 0, 3, 1, 0, 2, 0, 1, 4, 0, 1, 2, 1, 0, 6, 0, 3, 1, 2, 5, 1, 4, 0, 2]);
const BONUS_ORDER=Object.freeze([8, 2, 7, 1, 0, 8, 4, 2, 3, 1, 8, 0, 5, 0, 2, 8, 3, 4, 0, 2, 8, 0, 6, 0, 1, 8, 3, 0, 4, 0, 8, 1, 5, 0, 2, 8, 1, 6, 0, 3, 8, 1, 0, 4, 2, 8, 5, 1, 0, 3]);
const BONUS_PRIZES=Object.freeze([10,13,20,25,50,75,100,150]);
const PRIZES=Object.freeze([30000,40000,80000,96000,120000,160000,240000,480000]);
export function configureWheelOfDestiny(d) {
 if(d?.id!==WHEEL_OF_DESTINY_ID||d.family!=='wheel')throw new TypeError('Wheel Of Destiny definition required.');
 d.mathVersion='official72-wheelofdestiny-r4';d.model='observed-fifty-segment-independent-bonus-v2';
 d.displayWheelSymbolIndexes=[...DISPLAY_ORDER];d.defaultBetSymbolIndex=0;
 d.bonusDisplaySymbolIndexes=[...BONUS_ORDER];d.bonusPrizes=[...BONUS_PRIZES];d.destinyBonus={enabled:true,maxDoubles:2,maxFrames:3,maximumMultiplier:1200,providerProbabilitiesVerified:false,source:'reports/current74-evidence-nonslots/ind74_official_wheelofdestiny-official-help-tables.json'};
 d.betFields=[...PRIZES.map((multiplierBps,symbolIndex)=>({symbolIndex,label:String(multiplierBps/10000)+'x',multiplierBps,implemented:true})),
  {symbolIndex:8,label:'BONUS up to1200x',multiplierBps:null,maximumMultiplierBps:12000000,implemented:true}];
 d.sectors=DISPLAY_ORDER.map((symbolIndex,index)=>({id:'wod-segment-'+index,label:symbolIndex===8?'BONUS':d.betFields[symbolIndex].label,
  symbolIndex,weight:1,multiplierBps:symbolIndex===8?0:PRIZES[symbolIndex]}));
 d.paytable=d.betFields.map(field=>({...field}));
 d.nominalReturn={verified:false,scope:'Independent per-selected-field expectations; no single global or provider RTP claim',
  regular:{numerator:'24',denominator:'25'},bonus:{numerator:'60009',denominator:'62500'},
  description:'Authored uniform50 main and bonus segment tickets give96% gross expectation on regular allocations and96.0144% on BONUS allocations before floors. Mixed-allocation expectation is weighted by those amounts. The public Help96.00% is a provider document claim, not proof of these authored probabilities.'};
 d.rules=[
  'The public Wheel Of Destiny presentation defines50 main-ring display segments, separately from the betting grid. The grid has3x,4x,8x,9.6x,12x,16x,24x,48x and BONUS. The number of selectable fields is not the wheel segment count.',
  'Allocate the TOTAL accepted stake across one or more multiplier fields. Every selected field must contain a canonical whole-ETB amount of at least1ETB, fields must be unique, and the selected amounts must sum exactly to the accepted total. Omitting bets selects3x for the whole total by default.',
  'One server result selects one field. A matching regular field returns its allocated stake times its gross multiplier, including the stake. Unmatched allocations lose. One accepted total is debited, the maximum possible matching allocation award is reserved, and one aggregate payout is settled. Official round6 directly confirmed1DMO on3x returning3DMO.',
  'The independent main result and each bonus spin use50 equally weighted display-segment tickets. This is an operator probability choice, not an inference about provider RNG. Regular allocations have an independent96% expectation, BONUS allocations96.0144%; mixed expectations depend on allocation amounts. The official Help96.00% is not claimed as reproduced.',
  'The official Help documents a selectedBONUS-field hit entering a bonus wheel with10x,13x,20x,25x,50x,75x,100x,150x andDOUBLE. DOUBLE doubles current numeric prizes at mosttwice. AftertwoDOUBLE results, the third/final spin replaces allDOUBLE segments with1200x. A numeric result ends the bonus; all completed bonus frames belong to one accepted stake and one payout. No feature purchase or extra wager is added.',
  'The server resolves the full main-and-bonus round before animation. STOP only presents that immutable receipt faster. All arithmetic uses integer minor units; multiple selections do not create multiple wallet debits.',
 ];
 d.provenance={...d.provenance,observed:'Official DEMO regular selection0(3x), nine betting cells and fifty-ring public display source; matched3x gross return and unmatched-selection losses confirmed.',
  publicGeometrySource:'references/wheel-of-destiny-display-20261111.json',
  publicBonusRules:'reports/current74-evidence-nonslots/ind74_official_wheelofdestiny-rendered-rules.json',publicBonusTable:'reports/current74-evidence-nonslots/ind74_official_wheelofdestiny-official-help-tables.json',
  directObservation:'tests/evidence/official-demo-observations-nonslots20-remaining.json',
  designed:'Independent uniform50 tickets on the documented main and bonus displays, exact multi-allocation settlement and at mostthree source-backed bonus frames. Feature probabilities and provider RTP remain unverified.'};
 return d;
}
export function wheelOfDestinyBets(totalMinor,options={}) {
 const selected=options.bets??[{symbolIndex:0,amountMinor:totalMinor}];
 if(!Array.isArray(selected)||selected.length<1||selected.length>9)error('INVALID_WHEEL_BETS','Select one through nine multiplier fields.');
 const seen=new Set();let total=0n;
 for(const item of selected) {
  if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(k=>!['symbolIndex','amountMinor'].includes(k))||
   !Number.isInteger(item.symbolIndex)||item.symbolIndex<0||item.symbolIndex>8||typeof item.amountMinor!=='string'||
   !/^[1-9][0-9]{0,14}$/.test(item.amountMinor)||BigInt(item.amountMinor)<100n||BigInt(item.amountMinor)%100n!==0n||seen.has(item.symbolIndex))error('INVALID_WHEEL_BETS','Use unique fields and canonical whole-ETB allocation amounts.');
  seen.add(item.symbolIndex);total+=BigInt(item.amountMinor);
 }
 if(total!==BigInt(totalMinor))error('INVALID_WHEEL_BETS','Allocated amounts must equal the one accepted TOTAL stake.');
 return selected.map(item=>({...item})).sort((a,b)=>a.symbolIndex-b.symbolIndex);
}
export function maximumWheelOfDestinyPayout(d,totalMinor,options={}) {
 return wheelOfDestinyBets(totalMinor,options).reduce((max,bet)=>{const award=BigInt(payout(bet.amountMinor,bet.symbolIndex===8?12000000:PRIZES[bet.symbolIndex]));return award>max?award:max;},0n).toString();
}
function bonusFrame(d,index,doublesBefore) {
 const symbolIndex=BONUS_ORDER[index],double=symbolIndex===8&&doublesBefore<2,prizeScaleBefore=2**doublesBefore;
 const multiplierBps=double?null:symbolIndex===8?12000000:BONUS_PRIZES[symbolIndex]*prizeScaleBefore*10000;
 return {segmentIndex:index,symbolIndex,kind:double?'double':'prize',label:double?'DOUBLE':String(multiplierBps/10000)+'x',
  doublesBefore,doublesAfter:double?doublesBefore+1:doublesBefore,prizeScaleBefore,prizeScaleAfter:double?prizeScaleBefore*2:prizeScaleBefore,
  doubleSegmentsTransformed:doublesBefore===2,terminal:!double,multiplierBps};
}
function resolveBonus(d,rng) {
 const frames=[];let doubles=0;
 for(let i=0;i<3;i++){const frame=bonusFrame(d,draw(rng,50),doubles);frames.push({...frame,index:i});if(frame.terminal)return frames;doubles=frame.doublesAfter;}
 error('INVALID_BONUS','The documented three-spin bound did not terminate.');
}
export function startWheelOfDestiny(d,{betMinor,rng,options={}}) {
 const bets=wheelOfDestinyBets(betMinor,options),round=baseRound(d,betMinor),index=draw(rng,50),sector=d.sectors[index];
 const matched=bets.find(bet=>bet.symbolIndex===sector.symbolIndex),bonusTriggered=sector.symbolIndex===8&&!!matched;
 const bonusFrames=bonusTriggered?resolveBonus(d,rng):[],bonusMultiplierBps=bonusTriggered?bonusFrames.at(-1).multiplierBps:0;
 const resultMultiplierBps=bonusTriggered?bonusMultiplierBps:sector.multiplierBps,award=matched?payout(matched.amountMinor,resultMultiplierBps):'0';
 const settledBets=bets.map(bet=>({...bet,payoutMinor:bet===matched?award:'0'}));
 return {...round,bets,status:award==='0'?'lost':'collected',step:1,winMinor:award,multiplierBps:Number(BigInt(award)*10000n/BigInt(betMinor)),
  outcome:{kind:'wheel',sector:sector.id,sectorIndex:index,symbolIndex:sector.symbolIndex,label:sector.label,
   resultMultiplierBps,matchedStakeMinor:matched?.amountMinor??'0',settledBets,bonusTriggered,bonusMultiplierBps,bonusFrames}};
}
export function validateWheelOfDestinyRound(d,round) {
 if(!Array.isArray(round.bets))error('INVALID_ROUND','Stored allocation list required.');
 const bets=wheelOfDestinyBets(round.betMinor,{bets:round.bets}),o=round.outcome,sector=o&&Number.isInteger(o.sectorIndex)&&d.sectors[o.sectorIndex];
 if(!sector||o.kind!=='wheel'||o.sector!==sector.id||o.symbolIndex!==sector.symbolIndex||o.label!==sector.label)error('INVALID_ROUND','The stored wheel receipt does not match its display sector.');
 const matched=bets.find(bet=>bet.symbolIndex===sector.symbolIndex),bonusTriggered=sector.symbolIndex===8&&!!matched;
 if(o.bonusTriggered!==bonusTriggered||!Array.isArray(o.bonusFrames)||o.bonusFrames.length>(bonusTriggered?3:0))error('INVALID_ROUND','The stored bonus trigger is invalid.');
 let doubles=0;
 if(bonusTriggered) {
  if(o.bonusFrames.length<1)error('INVALID_ROUND','Completed bonus frames required.');
  for(const[index,frame]of o.bonusFrames.entries()) {
   if(!frame||!Number.isInteger(frame.segmentIndex)||frame.segmentIndex<0||frame.segmentIndex>=50)error('INVALID_ROUND','Invalid bonus segment.');
   const expected={...bonusFrame(d,frame.segmentIndex,doubles),index};
   if(Object.keys(expected).some(key=>expected[key]!==frame[key])||frame.terminal!==(index===o.bonusFrames.length-1))error('INVALID_ROUND','Stored bonus continuation is inconsistent.');
   doubles=frame.doublesAfter;
  }
 }
 const bonusMultiplierBps=bonusTriggered?o.bonusFrames.at(-1).multiplierBps:0,resultMultiplierBps=bonusTriggered?bonusMultiplierBps:sector.multiplierBps;
 const award=matched?payout(matched.amountMinor,resultMultiplierBps):'0',expected=bets.map(bet=>({...bet,payoutMinor:bet===matched?award:'0'}));
 if(o.bonusMultiplierBps!==bonusMultiplierBps||o.resultMultiplierBps!==resultMultiplierBps||o.matchedStakeMinor!==(matched?.amountMinor??'0')||!Array.isArray(o.settledBets)||o.settledBets.length!==expected.length||o.settledBets.some((item,index)=>!item||item.symbolIndex!==expected[index].symbolIndex||item.amountMinor!==expected[index].amountMinor||item.payoutMinor!==expected[index].payoutMinor)||round.winMinor!==award||
  round.status!==(award==='0'?'lost':'collected')||round.multiplierBps!==Number(BigInt(award)*10000n/BigInt(round.betMinor)))error('INVALID_ROUND','Stored wheel allocation settlement is inconsistent.');
}
