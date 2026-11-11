// Documented player-facing feature structure; every probability, award chart
// and unresolved aggregation choice is an explicit independent operator rule.
import {baseRound,draw,error} from './engines/shared.mjs';

export const POWER_TIGER_ID='ind74_official_poweroftiger';
const FACTORS=Object.freeze([5,10,15,20]);
const SOURCE='https://www.smartsoftgaming.com/games/power-of-tiger';
const copy=value=>structuredClone(value);
const largestPrize=d=>Math.max(...d.symbols.map(symbol=>symbol.pays[3]));
const emptyGrid=()=>Array.from({length:3},()=>Array(3).fill(null));
const lockedCount=grid=>grid.flat().filter(value=>value!==null).length;
const validFactor=value=>FACTORS.includes(value);

export function configurePowerOfTiger(d) {
  if(d?.id!==POWER_TIGER_ID||d.family!=='slots'||d.rows!==3||d.cols!==3||d.paylines?.length!==5)throw new TypeError('The observed3-by-3 Power of Tiger definition is required.');
  d.mathVersion='official72-poweroftiger-r4';
  d.model='independent-tiger-wild-and-respin';
  d.wildSymbol={id:'poweroftiger-wild',label:'Tiger Wild',glyph:'W'};
  d.wildRule={columns:[0,1,2],substitutesRegularSymbols:true,expandWhenWinning:false,
    allWildAward:'highest-eligible-symbol-award',regularSymbolWeight:32,wildWeight:1,
    probabilityModel:'independent-per-cell-tickets',providerProbabilitiesVerified:false};
  delete d.multiplierValues;
  d.baseGameMultiplier={values:[...FACTORS],trigger:'identical-full-board-or-all-five-lines-win',source:SOURCE};
  d.respinFeature={values:[...FACTORS],source:SOURCE,triggerTickets:128,triggerTicket:0,
    cellTickets:64,selectedSymbolTickets:8,wildTickets:1,
    initialBoard:'independent-empty-board',awardAggregation:'independent-base-plus-final-feature-only',
    maximumFrames:9,maximumFramesProof:'Every continuing frame locks at least one of nine cells; a no-new-lock frame stops immediately.',
    providerProbabilitiesVerified:false,providerAggregationVerified:false,
    fullBoardIncludesWildForMultiplier:true,providerFullBoardWildMultiplierVerified:false};
  d.rules=[
    'The observed official demo has three reels, three rows and five active lines. Wild substitutes for regular symbols.',
    'The official public rule applies a randomly selected 5x, 10x, 15x or 20x multiplier when the whole base board is identical or all five active lines win.',
    'The documented random respin selects a regular symbol and a 5x, 10x, 15x or 20x factor. Only that symbol, wilds and blanks appear; selected symbols and wilds lock. A new lock continues the feature; no new locks or a full board ends it. The feature factor applies only to a full board.',
    'Independent operator choices: regular base symbols have 32 tickets each and wild has one; respin triggers on one of 128 tickets; selected symbols and factors are uniform. Each unlocked respin cell has 64 tickets: 8 selected-symbol, 1 wild and 55 blank. Provider probabilities are not established.',
    'Unresolved provider aggregation is not claimed as verified. This independent implementation starts its respin board blank, retains the base award, scores only the final feature board once, and adds that award to the base award. Intermediate feature boards do not create extra payments.',
    'The five-line chart, symbol prizes, all-wild highest-prize treatment, blank initial board, base-plus-feature aggregation and final-grid-only scoring are independently authored. Provider initial holds and award aggregation remain unverified.',
    'The English Help ends the respin on a full selected-symbol and/or-wild board, but its multiplier sentence mentions a full selected-symbol board. This independent implementation counts substituting wilds as filled for that multiplier; the provider wording remains ambiguous.',
    'A maximum of nine respin frames follows from nine lockable cells and immediate stopping on no new locks. One stake is debited; all feature frames resolve on the server as one settled result. STOP only accelerates presentation.',
    'The public 2500x marketing maximum is not used as a hidden payout clamp or claimed as this independent model maximum. Liability reserves the full independently attainable base-plus-feature bound before accepting the stake.',
  ];
  d.provenance={...d.provenance,publicFeatureSource:SOURCE,
    publicHelpSource:'reports/current74-evidence-slots-remaining/poweroftiger-official-help-en.json',
    designed:'Documented conditional base multiplier and locked-symbol respin structure with explicitly independent probabilities, symbols, five-line chart, blank initial feature board and award aggregation.'};
  return d;
}

export function evaluateTigerLines(d,betMinor,grid,{selectedSymbolId}={}) {
  const regular=selectedSymbolId?d.symbols.filter(symbol=>symbol.id===selectedSymbolId):d.symbols;
  const allowed=new Set([...regular.map(symbol=>symbol.id),d.wildSymbol.id,null]);
  if(regular.length===0||!Array.isArray(grid)||grid.length!==3||grid.some(row=>!Array.isArray(row)||row.length!==3||row.some(id=>!allowed.has(id))))error('INVALID_GRID','The Tiger board contains invalid positions or symbols.');
  const lineWins=[];let total=0n;
  for(const [lineIndex,path]of d.paylines.entries()) {
    let best;
    for(const symbol of regular) {
      if(!path.every((row,col)=>[symbol.id,d.wildSymbol.id].includes(grid[row][col])))continue;
      const win=BigInt(betMinor)*BigInt(symbol.pays[3])/5n;
      if(!best||win>best.win)best={win,symbolId:symbol.id,multiplier:symbol.pays[3]};
    }
    if(best){total+=best.win;lineWins.push({lineIndex,payline:[...path],symbolId:best.symbolId,matches:3,multiplier:best.multiplier,
      winMinor:best.win.toString(),positions:path.map((row,col)=>({row,col}))});}
  }
  return{winMinor:total.toString(),lineWins};
}

export function powerTigerMaximumMultiplierBps(d){return largestPrize(d)*40*10000;}
export function maximumPowerTigerPayout(d,betMinor){return(5n*(BigInt(betMinor)*BigInt(largestPrize(d))/5n)*40n).toString();}

function baseQualifiers(grid,lineWins){return{identicalFullBoard:grid.flat().every(id=>id===grid[0][0]),allFiveLinesWin:lineWins.length===5};}

export function startPowerOfTiger(d,{betMinor,rng}) {
  const round=baseRound(d,betMinor),regularTickets=d.symbols.length*32;
  const grid=Array.from({length:3},()=>Array.from({length:3},()=>{
    const ticket=draw(rng,regularTickets+1);
    return ticket===regularTickets?d.wildSymbol.id:d.symbols[ticket%d.symbols.length].id;
  }));
  const base=evaluateTigerLines(d,round.betMinor,grid),qualifiers=baseQualifiers(grid,base.lineWins);
  const baseMultiplier=qualifiers.identicalFullBoard||qualifiers.allFiveLinesWin?FACTORS[draw(rng,4)]:1;
  const baseAwardMinor=(BigInt(base.winMinor)*BigInt(baseMultiplier)).toString();
  const bonusTriggered=draw(rng,d.respinFeature.triggerTickets)===d.respinFeature.triggerTicket;
  const bonusFrames=[];let bonusAwardMinor='0',selectedSymbolId=null,featureMultiplier=null,featureFinishedReason=null;
  if(bonusTriggered) {
    selectedSymbolId=d.symbols[draw(rng,d.symbols.length)].id;
    featureMultiplier=FACTORS[draw(rng,4)];
    let current=emptyGrid();
    while(true) {
      const before=lockedCount(current),next=copy(current);
      for(let row=0;row<3;row++)for(let col=0;col<3;col++)if(next[row][col]===null){
        const ticket=draw(rng,d.respinFeature.cellTickets);
        if(ticket<d.respinFeature.selectedSymbolTickets)next[row][col]=selectedSymbolId;
        else if(ticket<d.respinFeature.selectedSymbolTickets+d.respinFeature.wildTickets)next[row][col]=d.wildSymbol.id;
      }
      const locked=lockedCount(next),newLocks=locked-before,full=locked===9;
      const scored=evaluateTigerLines(d,round.betMinor,next,{selectedSymbolId});
      const award=(BigInt(scored.winMinor)*BigInt(full?featureMultiplier:1)).toString();
      featureFinishedReason=full?'full-board':newLocks===0?'no-new-locks':null;
      bonusFrames.push({index:bonusFrames.length+1,grid:copy(next),lockedCells:locked,newLocks,
        lineWins:scored.lineWins,rawAwardMinor:scored.winMinor,displayedAwardMinor:award,
        multiplierApplied:full?featureMultiplier:1,terminal:featureFinishedReason!==null});
      current=next;
      if(featureFinishedReason!==null){bonusAwardMinor=award;break;}
      if(bonusFrames.length>=9)error('INVALID_TIGER_FEATURE','The lock-progress proof was violated.');
    }
  }
  const winMinor=(BigInt(baseAwardMinor)+BigInt(bonusAwardMinor)).toString();
  return{...round,status:winMinor==='0'?'lost':'collected',step:1,winMinor,
    multiplierBps:Number(BigInt(winMinor)*10000n/BigInt(round.betMinor)),
    outcome:{kind:'slots',grid,originalGrid:copy(grid),lineWins:base.lineWins.map(line=>({...line,winMinor:(BigInt(line.winMinor)*BigInt(baseMultiplier)).toString()})),
      baseQualifiers:qualifiers,baseMultiplier,baseRawAwardMinor:base.winMinor,baseAwardMinor,
      bonusTriggered,bonusFrames,selectedSymbolId,featureMultiplier,featureFinishedReason,bonusAwardMinor,
      featureAggregation:'independent-base-plus-final-feature-only'}};
}

export function validatePowerTigerRound(d,round) {
  const o=round.outcome;
  if(!o||o.kind!=='slots'||!Array.isArray(o.bonusFrames)||o.bonusFrames.length>9||!Array.isArray(o.grid)||
    o.grid.some(row=>!Array.isArray(row)||row.some(value=>value===null)))error('INVALID_ROUND','The Tiger result is malformed.');
  const base=evaluateTigerLines(d,round.betMinor,o.grid),qualifiers=baseQualifiers(o.grid,base.lineWins);
  if(o.baseRawAwardMinor!==base.winMinor||o.baseQualifiers?.identicalFullBoard!==qualifiers.identicalFullBoard||
    o.baseQualifiers?.allFiveLinesWin!==qualifiers.allFiveLinesWin||
    (qualifiers.identicalFullBoard||qualifiers.allFiveLinesWin?!validFactor(o.baseMultiplier):o.baseMultiplier!==1)||
    o.baseAwardMinor!==(BigInt(base.winMinor)*BigInt(o.baseMultiplier)).toString())error('INVALID_ROUND','The Tiger base award is inconsistent.');
  let bonus='0';
  if(o.bonusTriggered===true) {
    if(!d.symbols.some(symbol=>symbol.id===o.selectedSymbolId)||!validFactor(o.featureMultiplier)||o.bonusFrames.length===0)error('INVALID_ROUND','The Tiger feature identity is invalid.');
    let previous=emptyGrid();
    for(const [index,frame]of o.bonusFrames.entries()) {
      const score=evaluateTigerLines(d,round.betMinor,frame.grid,{selectedSymbolId:o.selectedSymbolId});
      const locked=lockedCount(frame.grid),newLocks=locked-lockedCount(previous),full=locked===9,last=index===o.bonusFrames.length-1;
      if(previous.some((row,r)=>row.some((id,c)=>id!==null&&frame.grid[r][c]!==id))||newLocks<0||frame.index!==index+1||
        frame.lockedCells!==locked||frame.newLocks!==newLocks||frame.rawAwardMinor!==score.winMinor||
        frame.multiplierApplied!==(full?o.featureMultiplier:1)||frame.displayedAwardMinor!==(BigInt(score.winMinor)*BigInt(full?o.featureMultiplier:1)).toString()||
        frame.terminal!==(full||newLocks===0)||(!last&&(full||newLocks===0))||(last&&!full&&newLocks!==0))error('INVALID_ROUND','The Tiger feature lock progression is inconsistent.');
      if(last){bonus=frame.displayedAwardMinor;if(o.featureFinishedReason!==(full?'full-board':'no-new-locks'))error('INVALID_ROUND','The Tiger feature ending is inconsistent.');}
      previous=frame.grid;
    }
  }else if(o.bonusTriggered!==false||o.bonusFrames.length!==0||o.bonusAwardMinor!=='0')error('INVALID_ROUND','An untriggered Tiger feature cannot pay.');
  const total=(BigInt(o.baseAwardMinor)+BigInt(bonus)).toString();
  if(o.bonusAwardMinor!==bonus||round.winMinor!==total||BigInt(total)>BigInt(maximumPowerTigerPayout(d,round.betMinor))||
    round.status!==(total==='0'?'lost':'collected'))error('INVALID_ROUND','The Tiger total award is inconsistent.');
}
