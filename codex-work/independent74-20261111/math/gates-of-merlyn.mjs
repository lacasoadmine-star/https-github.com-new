// Public Help mechanics with independently authored count awards, draws and
// ambiguous feature ordering. No provider reel strip, RNG or RTP is implied.
import {baseRound,draw,error,publicBase} from './engines/shared.mjs';

export const GATES_MERLYN_ID='ind74_official_gatesofmerlyn';
const MULTIPLIERS=Object.freeze([2,3,4,5,6,7,8,9,10,15,20,30,40,50,100,250,500]);
const MODES=Object.freeze(['base','ante','buy100','buy500']);
const COSTS=Object.freeze({base:10000,ante:15000,buy100:1000000,buy500:5000000});
const TOTAL_STEPS=Object.freeze({base:'100',ante:'300',buy100:'10000',buy500:'50000'});
const copy=value=>structuredClone(value);
const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)
  ?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const equal=(a,b)=>canonical(a)===canonical(b);

export function configureGatesOfMerlyn(d){
  if(d?.id!==GATES_MERLYN_ID||d.family!=='slots')throw new TypeError('The Gates of Merlyn definition is required.');
  d.mathVersion='official72-gatesofmerlyn-r4';
  d.model='independent-count-tumble-free-spins';d.slotMechanic='tumble';
  d.rows=5;d.cols=6;d.paylines=[];d.proratedStake=false;
  delete d.multiplierValues;delete d.wildSymbol;delete d.wildRule;delete d.gamble;
  const symbols=[['sapphire','White crystal','◇',2000,6000,20000],['emerald','Green crystal','⬟',4000,8000,40000],
    ['amethyst','Purple crystal','♦',8000,15000,80000],['quartz','Yellow crystal','◇',5000,10000,50000],
    ['ruby','Red crystal','♦',10000,20000,100000],['staff','Green staff','⚚',30000,50000,200000],
    ['key','Key','⚿',20000,40000,150000],['book','Spell book','▣',15000,30000,120000],
    ['crown','Crown','♛',50000,100000,500000]];
  d.symbols=symbols.map(([id,label,glyph])=>({id:'gatesofmerlyn-'+id,label,glyph,weight:1,pays:{}}));
  d.scatterSymbol={id:'gatesofmerlyn-scatter',label:'Scatter',glyph:'S'};
  d.magicSymbol={id:'gatesofmerlyn-magic',label:'Magic',glyph:'✦'};
  d.multiplierSymbol={id:'gatesofmerlyn-multiplier',label:'Multiplier',glyph:'×'};
  d.tumbleFeature={source:'references/official-slot-help-en-20261111.json:help.slots.gatesofmerlyn',
    geometrySource:'reports/current74-evidence-slots-remaining/ind74_official_gatesofmerlyn-initial.png',
    modes:[...MODES],defaultMode:'base',costBps:{...COSTS},stakeMeaning:'total-effective-debit',
    totalStakeStepMinor:{...TOTAL_STEPS},minimumBaseBetMinor:'100',
    minimumMatch:8,minimumMatchVerified:true,countPaytable:symbols.map(([id,,,eight,ten,twelve])=>({
      symbolId:'gatesofmerlyn-'+id,tiers:[{minimumCount:8,multiplierBps:eight},{minimumCount:10,multiplierBps:ten},{minimumCount:12,multiplierBps:twelve}]})),
    scatterPaytable:[{minimumCount:4,multiplierBps:20000},{minimumCount:5,multiplierBps:50000},{minimumCount:6,multiplierBps:200000}],
    paytableVerified:true,paytableSource:{displayedTotalBetMinor:'1000',
      regularAndScatter:['reports/priority10-reference-20261111/gates-paytable-upper.jpg','reports/priority10-reference-20261111/gates-paytable-lower.jpg'],
      awardBasis:'displayed-symbol-award-divided-by-displayed-total-stake'},
    multiplierValues:[...MULTIPLIERS],initialFreeSpins:15,retriggerScatters:3,retriggerFreeSpins:5,
    triggerScatters:4,maximumMultiplier:5000,
    magicRule:{target:'one-regular-cell',consumeTriggeringOrb:true,maximumActivationsPerSequence:1,providerInterpretationVerified:false},
    ticketWeights:{regular:32,scatter:8,anteScatter:11,multiplier:1,magic:1},
    probabilityModel:'independent-cell-tickets-and-uniform-multiplier-values',providerProbabilitiesVerified:false,
    processingSafety:{maximumBoards:256,maximumRandomDraws:15620,action:'award-full-maximum-and-finish',operatorRule:true},
    aggregation:'one-total-debit-and-one-final-credit',
  };
  d.nominalReturn={verified:false,description:'Count/scatter prizes follow the rendered public paytable. Symbol tickets, multiplier frequencies and processing guarantee remain independently authored; provider RTP is not reproduced or claimed.'};
  d.provenance={...d.provenance,geometrySource:d.tumbleFeature.geometrySource,
    publicFeatureRules:d.tumbleFeature.source,
    publicPaytableSource:d.tumbleFeature.paytableSource,
    designed:'Observed6-by5 geometry, rendered count/scatter awards and documented tumble/free-spin mechanics; independent probabilities, MAGIC interpretation, cap ordering and processing guarantee.'};
  d.rules=[
    'The observed board has6columns and5rows. Equal regular symbols pay anywhere; there are no paylines. Fresh rendered official paytable screenshots at10.00DMO establish8–9,10–11and12+count tiers and their symbol awards. This model scales those awards by the derived base stake.',
    'Each winning group pays its count award once. All winning regular symbols disappear together; other symbols fall within their columns and only the vacant cells refill. The sequence continues until no group wins, the5000x maximum is reached, or the disclosed processing guarantee applies.',
    'Multiplier symbols carry2x,3x,4x,5x,6x,7x,8x,9x,10x,15x,20x,30x,40x,50x,100x,250x or500x. At the end of a base sequence their on-screen values add and multiply the sequence award; without multipliers the award is unchanged.',
    'The rendered Scatter table pays2x at4Scatters,5x at5and20x at6or more. Four or more final Scatters trigger15free spins. Three or more during a free spin award5additional spins;3Scatters do not receive an invented coin award. Scatters survive regular tumbles; this implementation scores them once at the end of each sequence.',
    'On a winning free-spin sequence, its on-screen multiplier sum adds to the persistent free-spin multiplier. The accumulated multiplier applies to that sequence and later winning free spins. A sequence with no award adds no multiplier.',
    'MAGIC activates only on a board without a regular winning group. The independent interpretation consumes one triggering orb and one uniformly selected regular-symbol cell, then applies gravity/refill. At most one MAGIC activation is allowed per sequence; provider cell-versus-symbol-type targeting and repeated activation are unverified.',
    'Mode base costs1x; ANTE costs1.5x; Buy100 costs100x; Buy500 costs500x of the base stake. The accepted stake is always the complete debit, never an instruction for a second charge. Buy modes guarantee at least4initial Scatters. Buy500 excludes multiplier values below10x throughout the purchased round.',
    'The retained whole-ETB stake grid requires total stakes in1ETB steps for base,3ETB steps for ANTE,100ETB steps for Buy100 and500ETB steps for Buy500. The derived base is a whole ETB; invalid totals are rejected before any round is generated.',
    'All base and free-spin awards add into one final credit, capped openly at5000times the derived base stake. Reaching that maximum finishes the entire round and cancels remaining free spins because no larger award is available.',
    'Independent processing guarantee: at most256boards are evaluated. If unfinished tumbles, MAGIC or free spins remain at that point, the player receives the full5000x maximum and the round finishes. Pending awards are never silently discarded at a computation limit; this guarantee is not a documented provider rule.',
    'Each regular symbol has32tickets; Scatter has8 (11in ANTE), Multiplier1 and MAGIC1. Multiplier values are uniform in the selected mode. ANTE increases this independent bonus chance; the provider approximately3x bonus probability is not claimed. The observed awards do not establish provider probabilities, scatter/multiplier aggregation or certified RTP; those transition choices and processing rules remain independent.',
  ];
  return d;
}

export function gatesMerlynOptions(options={},d){
  const modes=d?.tumbleFeature?.modes??MODES;
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>key!=='mode')||
    options.mode!==undefined&&!modes.includes(options.mode))error('INVALID_OPTIONS','Choose a supported tumble-game mode.');
  return{mode:options.mode??'base'};
}

export function gatesMerlynStakeTerms(d,betMinor,options={}){
  const {mode}=gatesMerlynOptions(options,d),total=BigInt(betMinor),cost=d.tumbleFeature.costBps[mode];
  if(total<=0n||total%BigInt(d.tumbleFeature.totalStakeStepMinor[mode]))error('INVALID_BET','The total stake is not divisible by the selected feature cost and whole-ETB base stake.');
  const base=total*10000n/BigInt(cost);
  if(base<100n||base%100n||base*BigInt(cost)!==total*10000n)error('INVALID_BET','The feature requires an exact whole-ETB base stake.');
  return{mode,baseBetMinor:base.toString(),totalBetMinor:total.toString(),costBps:cost,maximumAwardMinor:(base*BigInt(d.tumbleFeature.maximumMultiplier)).toString()};
}
export const maximumGatesMerlynPayout=(d,bet,options={})=>gatesMerlynStakeTerms(d,bet,options).maximumAwardMinor;

const positions=d=>Array.from({length:d.rows*d.cols},(_,i)=>({row:Math.floor(i/d.cols),col:i%d.cols}));
const positionKey=position=>position.row+':'+position.col;
const ids=board=>board.map(row=>row.map(cell=>cell.symbolId));
const multipliers=(d,board)=>positions(d).filter(({row,col})=>board[row][col].symbolId===d.multiplierSymbol.id)
  .map(({row,col})=>({row,col,value:board[row][col].value}));
const countSymbol=(board,id)=>board.reduce((sum,row)=>sum+row.filter(cell=>cell.symbolId===id).length,0);
const pay=(base,bps)=>(BigInt(base)*BigInt(bps)/10000n).toString();

function newCell(d,mode,rng,phase='base'){
  const weights=d.tumbleFeature.ticketWeights,regular=d.symbols.length*weights.regular;
  const scatter=mode==='ante'?weights.anteScatter:weights.scatter;
  const multiplier=phase==='base'&&d.tumbleFeature.bonusOnlyMultipliers?0:weights.multiplier;
  const magic=d.magicSymbol?weights.magic:0;
  const ticket=draw(rng,regular+scatter+multiplier+magic);
  if(ticket<regular)return{symbolId:d.symbols[ticket%d.symbols.length].id};
  if(ticket<regular+scatter)return{symbolId:d.scatterSymbol.id};
  if(ticket<regular+scatter+multiplier){
    const values=mode==='buy500'?d.tumbleFeature.multiplierValues.filter(value=>value>=10):d.tumbleFeature.multiplierValues;
    return{symbolId:d.multiplierSymbol.id,value:values[draw(rng,values.length)]};
  }
  return{symbolId:d.magicSymbol.id};
}
function initialBoard(d,mode,rng,purchased,phase){
  const clouds=new Map();let carpet;
  const feature=d.tumbleFeature.carpetFeature;
  if(phase==='free'&&feature&&draw(rng,feature.totalTickets)<feature.triggerTickets){
    const cloudCount=feature.minimumClouds+draw(rng,feature.maximumClouds-feature.minimumClouds+1);
    const symbolId=d.symbols[draw(rng,d.symbols.length)].id,available=positions(d),cloudsPublic=[];
    for(let i=0;i<cloudCount;i++){
      const [position]=available.splice(draw(rng,available.length),1);
      const multiplier=draw(rng,feature.cloudOutcomeTickets)<feature.cloudMultiplierTickets;
      const cell=multiplier?{symbolId:d.multiplierSymbol.id,value:d.tumbleFeature.multiplierValues[draw(rng,d.tumbleFeature.multiplierValues.length)]}:{symbolId};
      clouds.set(positionKey(position),cell);cloudsPublic.push({...position,symbolId:cell.symbolId,...(cell.value?{value:cell.value}:{})});
    }
    carpet={cloudCount,symbolId,positions:cloudsPublic};
  }
  const board=Array.from({length:d.rows},(_,row)=>Array.from({length:d.cols},(_,col)=>clouds.get(row+':'+col)??newCell(d,mode,rng,phase)));
  if(purchased){
    const remaining=positions(d);
    for(let i=0;i<d.tumbleFeature.triggerScatters;i++){
      const [position]=remaining.splice(draw(rng,remaining.length),1);
      board[position.row][position.col]={symbolId:d.scatterSymbol.id};
    }
  }
  return{board,...(carpet?{carpet}:{})};
}

export function evaluateGatesMerlynGrid(d,baseBetMinor,grid){
  if(!Array.isArray(grid)||grid.length!==d.rows||grid.some(row=>!Array.isArray(row)||row.length!==d.cols))error('INVALID_GRID','Use the6-by5 Gates board.');
  const allowed=new Set([...d.symbols.map(symbol=>symbol.id),d.scatterSymbol.id,d.magicSymbol?.id,d.multiplierSymbol.id].filter(Boolean));
  if(grid.flat().some(id=>!allowed.has(id)))error('INVALID_GRID','The Gates board contains an unknown symbol.');
  const winningGroups=[];
  for(const entry of d.tumbleFeature.countPaytable){
    const matches=positions(d).filter(({row,col})=>grid[row][col]===entry.symbolId);
    const tier=entry.tiers.filter(item=>matches.length>=item.minimumCount).at(-1);
    if(tier)winningGroups.push({symbolId:entry.symbolId,count:matches.length,multiplierBps:tier.multiplierBps,
      positions:matches,awardMinor:pay(baseBetMinor,tier.multiplierBps)});
  }
  return{winningGroups,rawAwardMinor:winningGroups.reduce((sum,group)=>sum+BigInt(group.awardMinor),0n).toString()};
}

function scatterAward(d,base,board,phase){
  const count=countSymbol(board,d.scatterSymbol.id);
  const tier=d.tumbleFeature.scatterPaytable.filter(item=>count>=item.minimumCount&&(!item.freeOnly||phase==='free')).at(-1);
  return{count,awardMinor:tier?pay(base,tier.multiplierBps):'0'};
}
function gravityRefill(d,board,removed,mode,rng,phase){
  const removedKeys=new Set(removed.map(positionKey)),next=Array.from({length:d.rows},()=>Array(d.cols)),refills=[];
  for(let col=0;col<d.cols;col++){
    const survivors=board.map((row,index)=>({cell:row[col],row:index})).filter(item=>!removedKeys.has(item.row+':'+col)).map(item=>item.cell);
    const vacancies=d.rows-survivors.length;
    for(let row=0;row<vacancies;row++){
      const cell=newCell(d,mode,rng,phase);next[row][col]=cell;
      refills.push({row,col,symbolId:cell.symbolId,...(cell.value?{value:cell.value}:{})});
    }
    for(let row=vacancies;row<d.rows;row++)next[row][col]=copy(survivors[row-vacancies]);
  }
  return{board:next,refills};
}

function sequence(d,terms,board,phase,previousMultiplier,remainingAward,runtime,rng){
  const frames=[];let raw=0n,magicUsed=false,processingLimit=false,finishedReason;
  const limit=d.tumbleFeature.processingSafety.maximumBoards;
  for(;;){
    runtime.boards++;
    const scored=evaluateGatesMerlynGrid(d,terms.baseBetMinor,ids(board));raw+=BigInt(scored.rawAwardMinor);
    const multiplierSymbols=multipliers(d,board),sum=multiplierSymbols.reduce((total,item)=>total+item.value,0);
    const scatter=scatterAward(d,terms.baseBetMinor,board,phase),sequenceRaw=raw+BigInt(scatter.awardMinor);
    const persistent=d.tumbleFeature.multiplierPersistence!=='sequence';
    const applied=Math.max(1,phase==='free'&&persistent?previousMultiplier+(sequenceRaw>0n?sum:0):sum);
    const frame={index:frames.length,grid:ids(board),winningGroups:scored.winningGroups,rawAwardMinor:scored.rawAwardMinor,
      sequenceRawAwardMinor:raw.toString(),multiplierSymbols,removedPositions:[],refills:[]};
    const orb=!magicUsed&&d.magicSymbol?positions(d).find(({row,col})=>board[row][col].symbolId===d.magicSymbol.id):null;
    const regular=new Set(d.symbols.map(symbol=>symbol.id));
    const targets=orb?positions(d).filter(({row,col})=>regular.has(board[row][col].symbolId)):[];
    if(sequenceRaw*BigInt(applied)>=remainingAward){
      frame.action='maximum-award';finishedReason='maximum-award';frames.push(frame);break;
    }
    if(!scored.winningGroups.length&&(!orb||!targets.length)){
      frame.action='end';finishedReason='no-winning-groups';frames.push(frame);break;
    }
    if(runtime.boards>=limit){
      frame.action='processing-maximum-award';processingLimit=true;finishedReason=frame.action;frames.push(frame);break;
    }
    if(scored.winningGroups.length){
      frame.action='tumble';frame.removedPositions=scored.winningGroups.flatMap(group=>group.positions);
    }else{
      const target=targets[draw(rng,targets.length)];magicUsed=true;
      frame.action='magic';frame.magic={orb:{...orb},target:{...target},scope:'one-regular-cell'};
      frame.removedPositions=[{...orb},{...target}];
    }
    const next=gravityRefill(d,board,frame.removedPositions,terms.mode,rng,phase);
    frame.refills=next.refills;frames.push(frame);board=next.board;
  }
  const multiplierSymbols=multipliers(d,board),landedMultiplierTotal=multiplierSymbols.reduce((sum,item)=>sum+item.value,0);
  const scatter=scatterAward(d,terms.baseBetMinor,board,phase),sequenceRaw=raw+BigInt(scatter.awardMinor);
  const persistent=d.tumbleFeature.multiplierPersistence!=='sequence';
  const accumulatedMultiplier=phase==='free'&&persistent?previousMultiplier+(sequenceRaw>0n?landedMultiplierTotal:0):previousMultiplier;
  const appliedMultiplier=Math.max(1,phase==='free'&&persistent?accumulatedMultiplier:landedMultiplierTotal);
  const unclipped=sequenceRaw*BigInt(appliedMultiplier),earned=unclipped>remainingAward?remainingAward:unclipped;
  return{board,frames,rawAwardMinor:raw.toString(),scatterCount:scatter.count,scatterAwardMinor:scatter.awardMinor,
    sequenceAwardMinor:sequenceRaw.toString(),landedMultiplierTotal,accumulatedMultiplier,appliedMultiplier,
    unclippedAwardMinor:unclipped.toString(),earnedAwardMinor:earned.toString(),processingLimit,finishedReason};
}

function resolveGatesOfMerlyn(d,{betMinor,options={},rng}){
  const round=baseRound(d,betMinor),terms=gatesMerlynStakeTerms(d,round.betMinor,options),trace=[];
  const source=bound=>{const value=draw(rng,bound);trace.push(value);return value;};
  const runtime={boards:0},spins=[];let total=0n,freeRemaining=0,freeAwarded=0,freePlayed=0,accumulated=0;
  let baseGrid,baseMultipliers,finalBoard,processingGuarantee=0n,cancelled=0;
  const maximum=BigInt(terms.maximumAwardMinor),limit=d.tumbleFeature.processingSafety.maximumBoards;
  do{
    const phase=spins.length?'free':'base';
    if(phase==='free'){freeRemaining--;freePlayed++;}
    const initial=initialBoard(d,terms.mode,source,phase==='base'&&terms.mode.startsWith('buy'),phase),board=initial.board;
    if(phase==='base'){baseGrid=ids(board);baseMultipliers=multipliers(d,board);}
    const current=sequence(d,terms,board,phase,accumulated,maximum-total,runtime,source);
    const awarded=phase==='base'?(current.scatterCount>=d.tumbleFeature.triggerScatters?d.tumbleFeature.initialFreeSpins:0)
      :(current.scatterCount>=d.tumbleFeature.retriggerScatters?d.tumbleFeature.retriggerFreeSpins:0);
    freeRemaining+=awarded;freeAwarded+=awarded;accumulated=current.accumulatedMultiplier;
    const earned=BigInt(current.earnedAwardMinor);
    const forceMaximum=current.processingLimit||(runtime.boards>=limit&&freeRemaining>0&&total+earned<maximum);
    const guarantee=forceMaximum?maximum-total-earned:0n;
    const award=earned+guarantee;processingGuarantee+=guarantee;total+=award;
    const capReached=total===maximum;
    if(capReached){cancelled=freeRemaining;freeRemaining=0;}
    const {board:resolved,...publicSequence}=current;
    delete publicSequence.processingLimit;
    spins.push({index:spins.length,phase,...publicSequence,...(initial.carpet?{carpet:initial.carpet}:{}),grid:ids(resolved),
      multiplierSymbols:multipliers(d,resolved),awardMinor:award.toString(),processingMaximumAwardMinor:guarantee.toString(),
      totalAwardMinor:total.toString(),freeSpinsAwarded:awarded,freeSpinsRemaining:freeRemaining,
      freeSpinsCancelledAtMaximum:capReached?cancelled:0,capReached,
      finishedReason:forceMaximum?'processing-maximum-award':current.finishedReason});
    finalBoard=resolved;
    if(capReached)break;
  }while(freeRemaining>0);
  if(runtime.boards>limit||trace.length>d.tumbleFeature.processingSafety.maximumRandomDraws)error('INVALID_GATES_FEATURE','The feature exceeded its disclosed processing bound.');
  return{...round,...terms,status:total===0n?'lost':'collected',step:1,winMinor:total.toString(),
    multiplierBps:Number(total*10000n/BigInt(round.betMinor)),private:{draws:trace},
    outcome:{kind:'slots',featureType:'tumble-free-spins',mode:terms.mode,baseBetMinor:terms.baseBetMinor,totalBetMinor:terms.totalBetMinor,
      costBps:terms.costBps,initialGrid:baseGrid,initialMultiplierSymbols:baseMultipliers,grid:ids(finalBoard),
      multiplierSymbols:multipliers(d,finalBoard),lineWins:[],spins,boardsEvaluated:runtime.boards,
      freeSpinsAwarded:freeAwarded,freeSpinsPlayed:freePlayed,freeSpinsRemaining:0,freeSpinsCancelledAtMaximum:cancelled,
      accumulatedMultiplier:accumulated,maximumAwardMinor:terms.maximumAwardMinor,capReached:total===maximum,
      processingMaximumAwardMinor:processingGuarantee.toString(),processingLimitReached:spins.some(spin=>spin.finishedReason==='processing-maximum-award'),
      totalAwardMinor:total.toString(),settlement:'single-final-credit'}};
}

function compactRound(round){
  const {spins,...summary}=round.outcome;
  // LibraryService stores at most128KiB per transition. Already consumed,
  // bounded server draws reproduce every public frame without persisting
  // hundreds of duplicate grids. No seed or future draw is accepted/exposed.
  return{...round,outcome:{...summary,spinCount:spins.length,transcriptStorage:'consumed-server-draw-replay'}};
}

export const startGatesOfMerlyn=(d,args)=>compactRound(resolveGatesOfMerlyn(d,args));

export function validateGatesMerlynRound(d,round){
  const draws=round.private?.draws;
  if(!Array.isArray(draws)||draws.length>d.tumbleFeature.processingSafety.maximumRandomDraws||
    draws.some(value=>!Number.isSafeInteger(value)||value<0)||round.step!==1||round.history.length!==0)
    error('INVALID_ROUND','The stored Gates round or bounded server draw transcript is invalid.');
  let cursor=0,expected;
  try{
    expected=resolveGatesOfMerlyn(d,{betMinor:round.betMinor,options:{mode:round.mode},rng:()=>draws[cursor++]});
  }catch{error('INVALID_ROUND','The stored Gates draw transcript does not reproduce a legal round.');}
  if(cursor!==draws.length||!equal(compactRound(expected).outcome,round.outcome)||
    ['mode','baseBetMinor','totalBetMinor','costBps','maximumAwardMinor','status','winMinor','multiplierBps'].some(key=>expected[key]!==round[key]))
    error('INVALID_ROUND','The stored Gates awards or feature progression disagree with the accepted server draws.');
  return expected;
}

export function publicGatesMerlynRound(d,round){
  const replayed=validateGatesMerlynRound(d,round);
  return{...publicBase(round),mode:round.mode,baseBetMinor:round.baseBetMinor,totalBetMinor:round.totalBetMinor,
    costBps:round.costBps,outcome:copy(replayed.outcome),collectibleMinor:'0',allowedActions:[]};
}
