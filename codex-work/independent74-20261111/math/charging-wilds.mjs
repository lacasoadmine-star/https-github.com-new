// Persistent paid-spin feature. Carry enters only through a trusted server
// transaction context; it is never a browser option or a process-local cache.
import {baseRound,draw,error} from './engines/shared.mjs';
import {evaluatePublicWildGrid} from './official72-mechanics.mjs';

export const CHARGING_WILD_IDS=Object.freeze(['ind74_official_multifruitschargingwilds','ind74_official_gemscrownchargingwilds']);
const FRUITS=CHARGING_WILD_IDS[0],MAX_MONEY=999999999999999n,COUNTER_CAPACITY=1000000;
const copy=value=>structuredClone(value);
const key=wild=>wild.row+':'+wild.col;
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const canonical=value=>JSON.stringify(value,(_,item)=>record(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const equal=(a,b)=>canonical(a)===canonical(b);
const largestPrize=d=>Math.max(...d.symbols.map(symbol=>symbol.pays[3]));

export const emptyChargingCarry=()=>({schemaVersion:1,initialized:false,paidSpins:'0',wilds:[]});

export function configureChargingWilds(d){
  if(!CHARGING_WILD_IDS.includes(d?.id)||d.family!=='slots'||d.rows!==3||d.cols!==3||d.paylines.length!==5)
    throw new TypeError('The observed3-by3 Charging Wilds definition is required.');
  const fruits=d.id===FRUITS,ns=d.id.slice('ind74_official_'.length);
  d.mathVersion='official72-'+ns+(fruits?'-r5':'-r6');d.model='independent-transactional-charging-wilds';
  d.slotMechanic='charging-wilds';delete d.multiplierValues;
  d.wildSymbol={id:ns+'-wild',label:'Charging Wild',glyph:'W'};
  d.wildRule={columns:[0,1,2],substitutesRegularSymbols:true,expandWhenWinning:false,
    allWildAward:'highest-eligible-regular-award',regularSymbolWeight:32,wildWeight:1,
    probabilityModel:'independent-per-empty-cell-tickets',providerProbabilitiesVerified:false};
  d.chargingFeature={source:'references/official-slot-help-en-20261111.json:help.slots.'+ns+'.multiplier.reel.description',
    schemaVersion:1,anteValues:fruits?[1,5,10]:[1],defaultAnte:1,stakeMeaning:'total-effective-debit',
    totalStakeStepMinor:fruits?{'1':'100','5':'500','10':'1000'}:{'1':'100'},
    awardBasis:'derived-base-stake',providerAnteAwardBasisVerified:false,
    firstAnteSpinGuaranteesWild:fruits,newWildMultiplier:'selected-ante',
    multipleWildRule:'sum-per-winning-line',normalMultipleWildRuleVerified:false,
    chargeTiming:'after-each-nonwinning-paid-spin-including-landing',chargeTimingVerified:false,
    persistentScope:['player','game','mathVersion','baseBetMinor','ante'],
    transactionContextRequired:true,dynamicPayoutBound:true,maximumMultiplierScope:'fresh-carry-only',
    counterCapacity:COUNTER_CAPACITY,counterCapacityKind:'operator-technical-admission-limit',
    atCapacity:'reject-next-start-before-debit-preserve-carry',
    providerPublishedMaximum:390,providerMaximumCouplingVerified:false,
    providerProbabilitiesVerified:false};
  d.nominalReturn={verified:false,description:'Independent symbol tickets, awards, line chart, carry timing and optional fair-color gamble. No provider RTP or390x coupling is inferred.'};
  d.provenance={...d.provenance,documentedPersistentFeatureSource:d.chargingFeature.source,
    designed:'Transactional saved Wild positions and multipliers per player/game/version/base-stake/ANTE bucket; authored awards, probabilities, normal multi-Wild aggregation and charge timing.'};
  const gambleRules=d.rules.filter(rule=>/X2:|Choose holdWin|equally likely red\/black/.test(rule));
  d.rules=[
    'The observed board has3reels and3rows with5fixed active paylines. This independent implementation uses five authored line shapes and regular-symbol prizes; only the highest left-to-right three-symbol award pays on each line.',
    'A Wild substitutes for any regular symbol. A Wild participating in any winning line contributes its current multiplier to each such line and is removed from the carry board after the paid spin. Nonparticipating Wilds remain at their exact cells for the next accepted paid spin.',
    'This independent timing uses the displayed current multiplier to score the spin, then increases every nonwinning Wild by1, including a newly landed Wild. A normal new Wild starts at1x. Provider first-landing increment timing remains unverified.',
    'When a line uses multiple Wilds, this implementation adds their multipliers before multiplying the line award. The ANTE Help explicitly documents addition; using the same addition in ordinary mode is an independent interpretation. An all-Wild line uses the highest eligible regular-symbol prize.',
    'Carry is saved separately for the authenticated player, title, model version, derived base stake and ANTE selection. Changing a bet or ANTE selection uses a different saved bucket; switching back restores that bucket. The authoritative previous carry and next carry commit inside the existing wallet transaction; a failed or replayed request cannot charge another spin or increment a Wild twice.',
    fruits?'ANTE5 and ANTE10 cost5x or10x the derived base stake on every paid spin. At least one Wild is guaranteed on the first accepted spin of a previously unused ANTE bucket; all new Wilds in that mode start at5x or10x. Later spins preserve saved Wilds and use normal independent new-Wild draws.':'The exact Gems Crown Help does not document ANTE purchase controls. This title accepts ordinary mode only; Multi Fruits ANTE rules are not copied into it.',
    'The accepted stake is the total effective debit. In ANTE modes the base stake is total divided by5or10 and must be an exact whole ETB. This independent award basis multiplies the base stake/5 line award, not the ANTE surcharge; the provider ANTE award basis remains unverified.',
    'Each nonheld cell has32tickets for each of eight regular symbols and one Wild ticket. Locked Wild cells consume no new symbol draw. These weights, line chart, symbol prizes and ambiguous rule choices are independently authored.',
    'The Help states390x but does not explain its coupling with growing Wild multipliers. No390x payout clamp is applied. The full worst-case prize for the actual prior carry and every possible new Wild is reserved before accepting the spin; optional X2 reserves all three possible doublings.',
    'The explicitly configured technical Wild counter capacity is1000000, not a provider game limit. If saved carry reaches that capacity, another start is rejected before debit until the operator reviews model capacity. Earned carry is preserved, never silently flattened. Payouts must also fit the retained15-digit money contract and configured account/house limits.',
    ...gambleRules,
  ];
  return d;
}

export function chargingOptions(d,options={}){
  if(!record(options)||Object.keys(options).some(name=>!['ante','holdWin'].includes(name))||
    options.holdWin!==undefined&&typeof options.holdWin!=='boolean'||
    !d.chargingFeature.anteValues.includes(options.ante??1))error('INVALID_OPTIONS','Choose a supported ANTE and optional held win.');
  return{ante:options.ante??1,holdWin:options.holdWin===true};
}

export function chargingCarryBucket(d,totalBetMinor,options={}){
  const {ante}=chargingOptions(d,options);
  if(typeof totalBetMinor!=='string'||!/^[1-9][0-9]*$/.test(totalBetMinor))error('INVALID_BET','Use a canonical total minor-unit stake.');
  const total=BigInt(totalBetMinor),unit=100n*BigInt(ante);
  if(total>MAX_MONEY||total%unit)error('INVALID_BET','The total stake must contain an exact whole-ETB base for the selected ANTE.');
  return{baseBetMinor:(total/BigInt(ante)).toString(),ante};
}

function checkedCarry(d,carry,{starting=false}={}){
  const expected=['initialized','paidSpins','schemaVersion','wilds'];
  if(!record(carry)||!equal(Object.keys(carry).sort(),expected)||carry.schemaVersion!==1||typeof carry.initialized!=='boolean'||
    typeof carry.paidSpins!=='string'||!/^(0|[1-9][0-9]*)$/.test(carry.paidSpins)||BigInt(carry.paidSpins)>MAX_MONEY||
    !Array.isArray(carry.wilds)||carry.wilds.length>9||carry.initialized!==(carry.paidSpins!=='0'))
    error('INVALID_CARRY','The trusted Charging carry schema is invalid.');
  if(!carry.initialized&&carry.wilds.length)error('INVALID_CARRY','An unused bucket cannot contain charged Wilds.');
  const seen=new Set();
  for(const wild of carry.wilds){
    if(!record(wild)||!equal(Object.keys(wild).sort(),['col','multiplier','row'])||!Number.isInteger(wild.row)||wild.row<0||wild.row>=3||
      !Number.isInteger(wild.col)||wild.col<0||wild.col>=3||!Number.isSafeInteger(wild.multiplier)||wild.multiplier<1||
      wild.multiplier>d.chargingFeature.counterCapacity||seen.has(key(wild)))error('INVALID_CARRY','A saved Wild position or multiplier is invalid.');
    seen.add(key(wild));
    if(starting&&wild.multiplier===d.chargingFeature.counterCapacity)error('CHARGING_COUNTER_CAPACITY','This saved bucket requires an operator capacity review before another paid spin.');
  }
  if(starting&&BigInt(carry.paidSpins)===MAX_MONEY)error('CHARGING_COUNTER_CAPACITY','The saved paid-spin counter has reached technical capacity.');
  return copy({...carry,wilds:[...carry.wilds].sort((a,b)=>a.row-b.row||a.col-b.col)});
}

function trustedContext(d,total,options,context,{starting=true}={}){
  if(!record(context)||!record(context.bucket)||!record(context.priorCarry))error('TRANSACTIONAL_CARRY_REQUIRED','A trusted transaction-scoped prior carry is required.');
  const bucket=chargingCarryBucket(d,total,options);
  if(!equal(context.bucket,bucket))error('INVALID_CARRY','The saved carry belongs to a different base stake or ANTE bucket.');
  const priorCarry=checkedCarry(d,context.priorCarry,{starting});
  for(const wild of priorCarry.wilds)if(wild.multiplier<bucket.ante||BigInt(wild.multiplier)>BigInt(bucket.ante)+BigInt(priorCarry.paidSpins))
    error('INVALID_CARRY','The saved Wild charge disagrees with its bucket or accepted spin count.');
  return{bucket,priorCarry};
}

export function chargingFreshMaximumMultiplierBps(d){return largestPrize(d)*3*10000*(d.gamble?.enabled?2**d.gamble.maxRounds:1);}

export function maximumChargingPayout(d,totalBetMinor,options={},context){
  const selected=chargingOptions(d,options),{bucket,priorCarry}=trustedContext(d,totalBetMinor,selected,context);
  const wilds=new Map(priorCarry.wilds.map(wild=>[key(wild),wild.multiplier]));
  const lineBase=BigInt(bucket.baseBetMinor)*BigInt(largestPrize(d))/BigInt(d.paylines.length);
  const baseMaximum=d.paylines.reduce((sum,line)=>sum+lineBase*BigInt(line.reduce((factor,row,col)=>factor+(wilds.get(row+':'+col)??bucket.ante),0)),0n);
  const maximum=baseMaximum*BigInt(selected.holdWin?2**d.gamble.maxRounds:1);
  if(maximum>MAX_MONEY)error('INVALID_BET','The dynamic charged-Wild reserve exceeds the retained money capacity.');
  return maximum.toString();
}

export function startChargingWilds(d,{betMinor,options={},context,rng}){
  const round=baseRound(d,betMinor),selected=chargingOptions(d,options);
  const {bucket,priorCarry}=trustedContext(d,round.betMinor,selected,context);
  // Validate the entire optional gamble exposure before any outcome draw.
  maximumChargingPayout(d,round.betMinor,selected,context);
  const trace=[],source=bound=>{const value=draw(rng,bound);trace.push(value);return value;};
  const wilds=new Map(priorCarry.wilds.map(wild=>[key(wild),copy(wild)])),newWilds=[];
  const regularTickets=d.symbols.length*d.wildRule.regularSymbolWeight;
  const grid=Array.from({length:3},(_,row)=>Array.from({length:3},(_,col)=>{
    if(wilds.has(row+':'+col))return d.wildSymbol.id;
    const ticket=draw(source,regularTickets+1);
    if(ticket<regularTickets)return d.symbols[ticket%d.symbols.length].id;
    const wild={row,col,multiplier:bucket.ante};wilds.set(key(wild),wild);newWilds.push(copy(wild));return d.wildSymbol.id;
  }));
  let guaranteedWildAdded=false;
  if(bucket.ante>1&&!priorCarry.initialized&&wilds.size===0){
    const cell=draw(source,9),wild={row:Math.floor(cell/3),col:cell%3,multiplier:bucket.ante};
    grid[wild.row][wild.col]=d.wildSymbol.id;wilds.set(key(wild),wild);newWilds.push(copy(wild));guaranteedWildAdded=true;
  }
  const base=evaluatePublicWildGrid(d,bucket.baseBetMinor,grid),participating=new Set();
  const lineWins=base.lineWins.map(line=>{
    const wildMultiplier=line.wildPositions.length?line.wildPositions.reduce((sum,position)=>sum+wilds.get(key(position)).multiplier,0):1;
    for(const position of line.wildPositions)participating.add(key(position));
    return{...line,baseWinMinor:line.winMinor,wildMultiplier,winMinor:(BigInt(line.winMinor)*BigInt(wildMultiplier)).toString()};
  });
  const charged=[...wilds.values()].filter(wild=>!participating.has(key(wild))).map(wild=>({...wild,multiplier:wild.multiplier+1}));
  const carryAfter=checkedCarry(d,{schemaVersion:1,initialized:true,paidSpins:(BigInt(priorCarry.paidSpins)+1n).toString(),wilds:charged});
  const win=lineWins.reduce((sum,line)=>sum+BigInt(line.winMinor),0n);
  const sorted=[...wilds.values()].sort((a,b)=>a.row-b.row||a.col-b.col);
  return{...round,ante:bucket.ante,baseBetMinor:bucket.baseBetMinor,totalBetMinor:round.betMinor,
    carryBucket:bucket,carryBefore:priorCarry,carryAfter,status:win===0n?'lost':'collected',winMinor:win.toString(),step:1,
    multiplierBps:Number(win*10000n/BigInt(round.betMinor)),private:{draws:trace},
    outcome:{kind:'slots',featureType:'charging-wilds',grid,lineWins,ante:bucket.ante,baseBetMinor:bucket.baseBetMinor,totalBetMinor:round.betMinor,
      carryBucket:copy(bucket),carryBefore:copy(priorCarry),carryAfter:copy(carryAfter),wildsThisSpin:copy(sorted),newWilds,
      winningWilds:sorted.filter(wild=>participating.has(key(wild))),retainedWilds:copy(carryAfter.wilds),
      guaranteedWildAdded,initialAnteGuarantee:bucket.ante>1&&!priorCarry.initialized,
      baseAwardMinor:win.toString(),settlement:'one-paid-spin'}};
}

export function validateChargingRound(d,round){
  const trace=round.private?.draws;
  if(!Array.isArray(trace)||trace.length>10||trace.some(value=>!Number.isSafeInteger(value)||value<0)||round.step!==1||round.history.length)
    error('INVALID_ROUND','The stored Charging draw transcript is invalid.');
  let expected,cursor=0;
  try{
    expected=startChargingWilds(d,{betMinor:round.betMinor,options:{ante:round.ante,holdWin:round.holdWin===true},
      context:{bucket:round.carryBucket,priorCarry:round.carryBefore},rng:()=>trace[cursor++]});
  }catch{error('INVALID_ROUND','The stored Charging carry or result cannot be reproduced.');}
  if(cursor!==trace.length||!equal(expected.outcome,round.outcome)||!equal(expected.carryAfter,round.carryAfter)||
    !equal(expected.carryBefore,round.carryBefore)||!equal(expected.carryBucket,round.carryBucket)||
    ['ante','baseBetMinor','totalBetMinor'].some(name=>expected[name]!==round[name])||
    expected.winMinor!==(round.holdWin===true?round.baseWinMinor:round.winMinor)||
    round.holdWin!==true&&expected.status!==round.status)
    error('INVALID_ROUND','The stored Charging award or next carry disagrees with its accepted server draws.');
  const displayMinor=round.holdWin===true&&round.gambleRounds>0&&Array.isArray(round.gambleHistory)?round.gambleHistory.at(-1)?.pendingAfterMinor:expected.winMinor;
  if(typeof displayMinor!=='string'||!/^(0|[1-9][0-9]*)$/.test(displayMinor))error('INVALID_ROUND','The displayed Charging award is invalid.');
  const displayed=BigInt(displayMinor);
  if(round.multiplierBps!==Number(displayed*10000n/BigInt(round.betMinor)))error('INVALID_ROUND','The displayed Charging award multiplier is inconsistent.');
}
