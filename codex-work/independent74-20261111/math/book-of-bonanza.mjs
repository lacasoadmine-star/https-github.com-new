// Public Book line chart/prizes and a disclosed independent choice
// for the documented3-cell expansion on the observed4-row base board.
import {baseRound,draw,error,publicBase} from './engines/shared.mjs';
import {BOOK_BONANZA_PAYLINES} from './book-bonanza-paylines.mjs';
export const BOOK_BONANZA_ID='ind74_official_bookofbonanza';
const copy=value=>structuredClone(value);
const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)
  ?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const equal=(a,b)=>canonical(a)===canonical(b);
export function configureBookOfBonanza(d){
  if(d?.id!==BOOK_BONANZA_ID||d.family!=='slots')throw new TypeError('The Book of Bonanza definition is required.');
  d.mathVersion='official72-bookofbonanza-r4';d.model='independent-book-expanding-free-spins';d.slotMechanic='book-free-spins';
  d.rows=4;d.cols=6;d.paylines=BOOK_BONANZA_PAYLINES.map(line=>[...line]);
  // At the observed0.40DMO total, each of40lines has0.01DMO stake.
  // Published amounts therefore give these exact integer line multipliers.
  const symbols=[['emperor','Emperor','♛',{2:40,3:80,4:400,5:2000,6:5000}],
    ['dragon','Dragon','龍',{2:20,3:60,4:200,5:800,6:2000}],
    ['lotus','Lotus','❀',{2:20,3:40,4:100,5:400,6:800}],
    ['gong','Gong','◉',{2:20,3:40,4:100,5:400,6:800}],
    ['lantern','Lantern','燈',{2:20,3:40,4:100,5:400,6:800}],
    ['ace','A','A',{3:20,4:60,5:150,6:300}],['king','K','K',{3:20,4:60,5:150,6:300}],
    ['queen','Q','Q',{3:20,4:40,5:100,6:200}],['jack','J','J',{3:20,4:40,5:100,6:200}],
    ['ten','10','10',{3:20,4:40,5:100,6:200}]];
  d.symbols=symbols.map(([id,label,glyph,pays])=>({id:'bookofbonanza-'+id,label,glyph,weight:1,pays}));
  delete d.multiplierValues;delete d.gamble;
  d.bookSymbol={id:'bookofbonanza-book',label:'Book Wild / Scatter',glyph:'▣'};
  d.wildSymbol={...d.bookSymbol};
  d.wildRule={columns:[0,1,2,3,4,5],substitutesRegularSymbols:true,expandWhenWinning:false,
    allWildAward:'highest-eligible-regular-award',regularSymbolWeight:32,wildWeight:1,providerProbabilitiesVerified:false};
  d.bookFeature={source:'reports/current74-evidence-slots-secondary/ind74_official_bookofbonanza-official-help-en.json',
    geometrySource:'reports/priority10-reference-20261111/book-ready-geometry.jpg',
    triggerScatters:4,initialFreeSpins:10,retriggerScatters:3,retriggerFreeSpins:10,
    expansionRows:3,minimumExpandingReels:2,
    minimumExpandingReelsBySymbol:Object.fromEntries(d.symbols.map(symbol=>[symbol.id,Math.min(...Object.keys(symbol.pays).map(Number))])),
    expansionTrigger:'at-least-the-selected-symbol-minimum-paying-reel-count',
    expansionWindow:'three-contiguous-rows-starting-at-min(first-symbol-row,1)',
    expansionGeometryVerified:false,bonusBookSubstitutesSelectedSymbol:false,
    scatterPaytable:[],scatterCashAwardListed:false,
    maximumMultiplier:5000,maximumBonusSpins:128,maximumRandomDraws:3097,
    processingGuarantee:'award-full-maximum-if-free-spins-remain',providerProbabilitiesVerified:false,
    paytableVerified:true,paylinesVerified:true,
    paytableSource:{displayedTotalBetMinor:'40',lineCount:40,
      regular:['reports/priority10-reference-20261111/book-paytable-upper.jpg','reports/priority10-reference-20261111/book-paytable-lower.jpg'],
      paylines:'reports/priority10-reference-20261111/book-forty-paylines.jpg',
      awardBasis:'displayed-symbol-award-divided-by-one-fortieth-of-displayed-total-stake'},
    observedBuyQuote:{baseBetDmo:'0.40',totalPriceDmo:'40.00',ratio:100,source:'reports/priority10-reference-20261111/book-ready-geometry.jpg'},
    buyPriceVerified:false,unsupportedOptions:['buyBonus','bonusBet','bonusRisk'],
  };
  d.nominalReturn={verified:false,description:'Fresh rendered forty-line chart and symbol prizes; independently authored per-cell tickets, bonus selection, expansion window and processing guarantee. Provider RTP is not reproduced.'};
  d.provenance={...d.provenance,geometrySource:d.bookFeature.geometrySource,publicFeatureRules:d.bookFeature.source,
    publicPaytableSource:d.bookFeature.paytableSource,
    designed:'Observed6-by4 board,40public paylines and exact regular prizes; documented Book Wild/Scatter,10free spins,+10retrigger and selected expanding symbol. Probabilities and3-cell expansion window remain independent.'};
  d.rules=[
    'Fresh official DEMO captures show6columns,4rows and the complete40-payline chart. The rendered table at0.40DMO establishes ten regular symbol categories and their2-to6-match line prizes. The accepted total stake divides equally over those40lines.',
    'Book symbols substitute for regular symbols in left-to-right line wins and also count as Scatters. Four or more Books anywhere trigger10free spins after the base award. Three or more during free spins add10more; the originally selected expanding symbol remains the same.',
    'One regular expanding symbol is selected at the beginning of the bonus. During free spins Book wilds cannot substitute for that selected symbol, but may substitute for other regular symbols.',
    'Regular line awards pay first. The published Book entry gives Wild substitution and the4-Scatter bonus trigger without a separate cash prize, so this model does not add an invented Book-Scatter cash award. Retriggers still add their documented free spins.',
    'Expansion requires enough selected symbols for a paying combination: at least2different reels for Emperor, Dragon, Lotus, Gong or Lantern, or3for A,K,Q,Jor10. The qualifying reels expand and an additional selected-symbol award is evaluated on every active line, including nonadjacent reels.',
    'Evidence conflict: Help describes expansion covering3positions, while the saved base board has4rows. This independent implementation paints a3-cell contiguous window on each eligible reel, starting at min(first selected row,1), and preserves existing cells outside the window. Provider bonus geometry and exact expansion window remain unverified.',
    'Each line pays its highest eligible regular award once. The additional expansion award pays its highest selected-symbol count on that line once. Line prizes use floor(total stake times the public line multiplier divided by40); regular and expansion awards add into one final credit.',
    'The complete accepted round is capped openly at5000times the total stake. Reaching the maximum ends remaining free spins. At most128bonus spins are evaluated; if free spins remain, an independent processing guarantee pays the full maximum instead of discarding their possible awards.',
    'Each cell has32tickets for each of ten regular symbols and one Book ticket. Bonus-symbol selection is uniform. These frequencies, bonus expansion interpretation and processing guarantee are independent operator choices; the observed public prizes and chart do not establish provider probabilities or certified RTP.',
    'The fresh ready screen quotes40.00DMO for Buy Bonus at0.40DMO base, a100x observed quote. The purchase lifecycle and interactions with B+ progress and Risk have not been verified, so Buy Bonus, B+25%surcharge,100-Scatter progress and progress-dependent Risk remain closed; unsupported inputs are rejected.',
  ];
  // A conservative regular-prefix subset is already above one accepted bet.
  // Ignore every Book-containing win and all bonus value: n equal regulars
  // followed by a different regular (or all6equal) form disjoint paying cases.
  // Every published prize times a whole-ETB stake divides exactly by40lines.
  const tickets=BigInt(d.symbols.length*32+1),otherRegular=BigInt((d.symbols.length-1)*32),denominator=tickets**6n;
  let numerator=0n;
  for(let count=2;count<=6;count++){
    const prizes=d.symbols.reduce((sum,symbol)=>sum+BigInt(symbol.pays[count]??0),0n);
    numerator+=prizes*32n**BigInt(count)*(count===6?1n:otherRegular*tickets**BigInt(5-count));
  }
  const lowerBound={numerator:numerator.toString(),denominator:denominator.toString(),bound:'lower',
    scope:'base-regular-prefix-awards-only; excludes-Book-substitution-and-all-bonus-value; exact-for-whole-ETB-grid'};
  d.nominalReturn.baseRegularOnlyLowerBound=lowerBound;
  d.releaseReview={realMoneyAdmissionBlocked:true,codes:['INDEPENDENT_BASE_RETURN_LOWER_BOUND_ABOVE_STAKE'],
    independentAnalyticReturn:lowerBound,
    requiredAction:'Review and newly version the independently chosen probability distribution before real-money admission. Preserve the observed public prizes; do not infer or silently invent provider weights.'};
  d.implementationStatus='independent-model; real-money-admission-blocked; independent-base-return-lower-bound-above-stake';
  d.rules.push('REAL-MONEY ADMISSION IS BLOCKED: even a subset of base regular-symbol awards has independent return at least'+numerator+'/'+denominator+' of the stake, above100percent. This lower bound excludes Book substitution and all free-spin value. It is not a provider RTP estimate. The complete distribution requires a reviewed, newly versioned model; passing feature or ledger tests cannot clear this block.');
  return d;
}
export const maximumBookBonanzaPayout=(d,bet)=>(BigInt(bet)*BigInt(d.bookFeature.maximumMultiplier)).toString();
const positions=d=>Array.from({length:d.rows*d.cols},(_,index)=>({row:Math.floor(index/d.cols),col:index%d.cols}));
function grid(d,rng){
  const regular=d.symbols.length*32;
  return Array.from({length:d.rows},()=>Array.from({length:d.cols},()=>{
    const ticket=draw(rng,regular+1);return ticket===regular?d.bookSymbol.id:d.symbols[ticket%d.symbols.length].id;
  }));
}
export function evaluateBookBonanzaGrid(d,betMinor,board,selectedSymbolId){
  if(!Array.isArray(board)||board.length!==d.rows||board.some(row=>!Array.isArray(row)||row.length!==d.cols||row.some(id=>id!==d.bookSymbol.id&&!d.symbols.some(symbol=>symbol.id===id))))error('INVALID_GRID','Use the configured6-by4 Book board.');
  if(selectedSymbolId!==undefined&&!d.symbols.some(symbol=>symbol.id===selectedSymbolId))error('INVALID_GRID','The selected bonus symbol is invalid.');
  const lineWins=[];
  for(const[lineIndex,line]of d.paylines.entries()){
    let best;
    for(const symbol of d.symbols){
      let count=0;
      while(count<d.cols&&(board[line[count]][count]===symbol.id||board[line[count]][count]===d.bookSymbol.id&&symbol.id!==selectedSymbolId))count++;
      const prize=symbol.pays[count];if(!prize)continue;
      const win=BigInt(betMinor)*BigInt(prize)/BigInt(d.paylines.length);
      if(!best||win>BigInt(best.winMinor))best={lineIndex,payline:[...line],symbolId:symbol.id,matches:count,multiplier:prize,
        winMinor:win.toString(),positions:line.slice(0,count).map((row,col)=>({row,col}))};
    }
    if(best)lineWins.push(best);
  }
  return{lineWins,winMinor:lineWins.reduce((sum,line)=>sum+BigInt(line.winMinor),0n).toString()};
}
function scatter(d,bet,board,free){
  const count=board.flat().filter(id=>id===d.bookSymbol.id).length;
  const tier=d.bookFeature.scatterPaytable.filter(tier=>count>=tier.minimumCount&&(!tier.freeOnly||free)).at(-1);
  return{count,awardMinor:tier?(BigInt(bet)*BigInt(tier.multiplier)).toString():'0'};
}
export function expandBookBonanzaSymbol(d,bet,board,selectedSymbolId){
  const symbol=d.symbols.find(symbol=>symbol.id===selectedSymbolId);if(!symbol)error('INVALID_GRID','The selected expansion symbol is invalid.');
  const columns=Array.from({length:d.cols},(_,col)=>col).filter(col=>board.some(row=>row[col]===selectedSymbolId));
  const expandedGrid=copy(board),expandedColumns=[],expandedPositions=[],lineWins=[];
  if(columns.length>=d.bookFeature.minimumExpandingReelsBySymbol[selectedSymbolId]){
    for(const col of columns){
      const first=board.findIndex(row=>row[col]===selectedSymbolId),start=Math.min(first,d.rows-d.bookFeature.expansionRows);
      for(let row=start;row<start+d.bookFeature.expansionRows;row++){expandedGrid[row][col]=selectedSymbolId;expandedPositions.push({row,col});}
      expandedColumns.push(col);
    }
    for(const[lineIndex,line]of d.paylines.entries()){
      const matches=columns.filter(col=>expandedGrid[line[col]][col]===selectedSymbolId);
      const prize=symbol.pays[matches.length];if(!prize)continue;
      lineWins.push({lineIndex,payline:[...line],symbolId:selectedSymbolId,matches:matches.length,multiplier:prize,
        winMinor:(BigInt(bet)*BigInt(prize)/BigInt(d.paylines.length)).toString(),positions:matches.map(col=>({row:line[col],col}))});
    }
  }
  return{expandedGrid,expandedColumns,expandedPositions,lineWins,winMinor:lineWins.reduce((sum,line)=>sum+BigInt(line.winMinor),0n).toString()};
}
function resolveBook(d,{betMinor,rng}){
  const round=baseRound(d,betMinor),draws=[],source=bound=>{const n=draw(rng,bound);draws.push(n);return n;};
  const initialGrid=grid(d,source),base=evaluateBookBonanzaGrid(d,round.betMinor,initialGrid),baseScatter=scatter(d,round.betMinor,initialGrid,false);
  const maximum=BigInt(maximumBookBonanzaPayout(d,round.betMinor)),baseRaw=BigInt(base.winMinor)+BigInt(baseScatter.awardMinor);
  const baseAward=baseRaw>maximum?maximum:baseRaw,bonusTriggered=baseScatter.count>=d.bookFeature.triggerScatters;
  let total=baseAward,remaining=bonusTriggered?10:0,awarded=remaining,played=0,cancelled=0,selectedSymbolId=null,finalGrid=initialGrid,processingAward=0n;
  const bonusFrames=[];
  if(total===maximum){cancelled=remaining;remaining=0;}
  if(remaining)selectedSymbolId=d.symbols[draw(source,d.symbols.length)].id;
  while(remaining>0){
    remaining--;played++;
    const board=grid(d,source),regular=evaluateBookBonanzaGrid(d,round.betMinor,board,selectedSymbolId),books=scatter(d,round.betMinor,board,true);
    const expanded=expandBookBonanzaSymbol(d,round.betMinor,board,selectedSymbolId);
    const extra=books.count>=d.bookFeature.retriggerScatters?10:0;remaining+=extra;awarded+=extra;
    const raw=BigInt(regular.winMinor)+BigInt(books.awardMinor)+BigInt(expanded.winMinor),earned=raw>maximum-total?maximum-total:raw;
    const forceMaximum=played===d.bookFeature.maximumBonusSpins&&remaining>0&&total+earned<maximum;
    const guarantee=forceMaximum?maximum-total-earned:0n,award=earned+guarantee;processingAward+=guarantee;total+=award;
    const capReached=total===maximum;if(capReached){cancelled=remaining;remaining=0;}
    bonusFrames.push({index:played,grid:board,expandedGrid:expanded.expandedGrid,expandedColumns:expanded.expandedColumns,
      expandedPositions:expanded.expandedPositions,selectedSymbolId,lineWins:regular.lineWins,expandedLineWins:expanded.lineWins,
      regularAwardMinor:regular.winMinor,scatterCount:books.count,scatterAwardMinor:books.awardMinor,expandingAwardMinor:expanded.winMinor,
      rawAwardMinor:raw.toString(),earnedAwardMinor:earned.toString(),processingMaximumAwardMinor:guarantee.toString(),awardMinor:award.toString(),totalAwardMinor:total.toString(),
      freeSpinsAwarded:extra,freeSpinsRemaining:remaining,freeSpinsCancelledAtMaximum:capReached?cancelled:0,capReached});
    finalGrid=expanded.expandedGrid;
  }
  if(played>d.bookFeature.maximumBonusSpins||draws.length>d.bookFeature.maximumRandomDraws)error('INVALID_BOOK_FEATURE','The Book feature exceeded its processing bound.');
  return{...round,status:total===0n?'lost':'collected',step:1,winMinor:total.toString(),multiplierBps:Number(total*10000n/BigInt(round.betMinor)),private:{draws},
    outcome:{kind:'slots',featureType:'book-free-spins',initialGrid,grid:finalGrid,lineWins:base.lineWins,baseLineWins:base.lineWins,
      baseRegularAwardMinor:base.winMinor,baseScatterCount:baseScatter.count,baseScatterAwardMinor:baseScatter.awardMinor,baseAwardMinor:baseAward.toString(),
      bonusTriggered,selectedSymbolId,bonusFrames,freeSpinsAwarded:awarded,freeSpinsPlayed:played,freeSpinsRemaining:0,
      freeSpinsCancelledAtMaximum:cancelled,maximumAwardMinor:maximum.toString(),capReached:total===maximum,
      processingMaximumAwardMinor:processingAward.toString(),totalAwardMinor:total.toString(),settlement:'single-final-credit'}};
}
const compact=round=>{const {bonusFrames,...summary}=round.outcome;return{...round,outcome:{...summary,bonusFrameCount:bonusFrames.length,transcriptStorage:'consumed-server-draw-replay'}};};
export const startBookOfBonanza=(d,args)=>compact(resolveBook(d,args));
export function validateBookBonanzaRound(d,round){
  const draws=round.private?.draws;
  if(!Array.isArray(draws)||draws.length>d.bookFeature.maximumRandomDraws||draws.some(n=>!Number.isSafeInteger(n)||n<0)||round.step!==1||round.history.length)
    error('INVALID_ROUND','The stored Book result has an invalid bounded draw transcript.');
  let cursor=0,expected;
  try{expected=resolveBook(d,{betMinor:round.betMinor,rng:()=>draws[cursor++]});}catch{error('INVALID_ROUND','The stored Book draw transcript does not resolve a legal feature.');}
  if(cursor!==draws.length||!equal(compact(expected).outcome,round.outcome)||['winMinor','status','multiplierBps'].some(key=>expected[key]!==round[key]))
    error('INVALID_ROUND','The Book payout or feature state disagrees with the accepted server draws.');
  return expected;
}
export function publicBookBonanzaRound(d,round){
  const full=validateBookBonanzaRound(d,round);
  return{...publicBase(round),outcome:copy(full.outcome),collectibleMinor:'0',allowedActions:[]};
}
