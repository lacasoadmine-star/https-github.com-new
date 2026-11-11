// Public Mariachi collector/coin feature, with consumed server draws retained
// for deterministic recovery. Provider reel strips and RTP are not inferred.
import {baseRound,draw,error} from './engines/shared.mjs';
import {evaluatePublicWildGrid,publicHeldSlot} from './official72-mechanics.mjs';

export const MARIACHI_COINS_ID='ind74_official_mariachicoins';
const SOURCE='references/official-slot-help-en-20261111.json:help.slots.mariachicoins';
const VALUES=Object.freeze([1,2,3,5,8,10,15]);
const JACKPOTS=Object.freeze({mini:25,major:50,mega:100,grand:1000});
const copy=value=>structuredClone(value),key=value=>value.row+':'+value.col;
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const canonical=value=>JSON.stringify(value,(_,v)=>record(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const equal=(a,b)=>canonical(a)===canonical(b);
const min=(a,b)=>a<b?a:b;

export function configureMariachiCoins(d){
 if(d?.id!==MARIACHI_COINS_ID||d.family!=='slots'||d.cols!==5||d.rows!==3)throw new TypeError('The observed Mariachi five-reel/three-row definition is required.');
 d.mathVersion='official72-mariachicoins-r3';d.model='independent-mariachi-collector-respin';
 delete d.multiplierValues;
 d.wildSymbol={id:'mariachicoins-wild',label:'Wild',glyph:'W'};
 d.wildRule={columns:[0,1,2,3,4],substitutesRegularSymbols:true,expandWhenWinning:true,allWildAward:'highest-eligible-regular-award'};
 d.coinSymbol={id:'mariachicoins-coin',label:'Coin',glyph:'◉'};
 d.collectorSymbols=[{id:'mariachicoins-male',label:'Male Collector',glyph:'M',kind:'male',baseColumn:0},{id:'mariachicoins-female',label:'Female Collector',glyph:'F',kind:'female',baseColumn:4}];
 d.blockerSymbols=[d.coinSymbol.id,...d.collectorSymbols.map(symbol=>symbol.id)];
 d.mariachiFeature={source:SOURCE,initialRespins:3,fullBoardMultiplier:2,regularValues:[...VALUES],jackpotValues:{...JACKPOTS},
  trigger:'both-edge-collectors-and-at-least-one-middle-coin',baseCollectorColumns:[0,4],baseCoinColumns:[1,2,3],
  maximumFrames:36,maximumRandomDraws:512,maximumAwardMultiplier:2500,roundCapKind:'explicit-independent-cap-at-published-maximum',
  collectorTiming:'collect-on-landing-once',collectorAwardAggregation:'coins-plus-collected-values-at-feature-end',
  collectorTimingVerified:false,awardAggregationVerified:false,providerProbabilitiesVerified:false,
  buyRespin:{implemented:false,priceMultiplier:null,reason:'The exact Help gives a special price without a verified stake multiplier.'},
  publishedRtp:{base:'97.15%',buyRespin:'97.49%',appliesTo:'provider game only; not certified for this independent engine'}};
 d.gamble={enabled:true,maxRounds:3,choices:['red','black'],startOption:'holdWin',probabilityModel:'independent-fair-color',
  providerLimitVerified:false,source:SOURCE+'.double.gamble.description',rule:'Correct color doubles the held award; collect remains available. Three attempts are an independent operator limit.'};
 d.rules=[
  'The observed screen has five reels and three rows. Matching symbols pay on adjacent reels from the left. This implementation retains its explicitly independent regular-symbol awards and line chart.',
  'Wild symbols appear on all reels, substitute for regular symbols and expand a reel when they participate in a winning regular combination. Coins and collectors do not substitute. Feature triggers use the landed board before expansion; that ordering is an independent interpretation.',
  'In the base game male collectors land only on reel1, female collectors only on reel5, and regular coins on reels2–4. Regular coins carry1x,2x,3x,5x,8x,10x or15x of the accepted bet.',
  'Both collector types together with at least one middle-reel coin trigger Hold & Win. Each starting collector separately collects the visible coin total. Coins and collectors lock, and three respins begin. Any newly landed coin or collector resets the allowance to three.',
  'During the feature a regular coin, a collector, or MINI25x, MAJOR50x, MEGA100x or GRAND1000x may land in any empty cell. A full board doubles the final feature total. No feature frame places a second stake.',
  'Independent aggregation choices: each collector takes the visible coin sum once when it lands, including coins from the same respin. Existing collectors retain their amounts. The feature pays the final coin sum plus saved collector amounts once. A single base collector takes its visible middle coins without triggering the feature. These timing/aggregation details remain unverified against provider play.',
  'The total base-plus-feature award is explicitly capped at2500x the accepted bet, matching the published maximum as an independent cap policy. Reaching the cap ends the feature. Optional X2 follows that resolved award and is separately reserved.',
  'Independent tickets: each regular base symbol has32tickets, Wild has1; eligible edge collectors have2 and middle coins16. Feature cells use64tickets:8regular coins,1for each jackpot,1for each collector and50empty. Regular coin values are uniform. These are not recovered provider probabilities or certified RTP.',
  'BUY RESPIN is unavailable until its exact price is verified; the static2000.00caption is not treated as proof of a stake multiplier. The displayed97.15%base and97.49%buy RTP belong to the provider, not to this independent model.',
  'A successful reset fills at least one empty cell; with15cells and at least3trigger cells, at most36respins are required. Consumed server draws reproduce the immutable transcript; refresh, STOP and replay never generate another result.',
  'X2 retains the resolved award for red/black choice or collect. This independent engine uses fair colors and at most three attempts. AUTO collects the award; no promotional wallet is involved.',
 ];
 d.provenance={...d.provenance,publicCollectorRules:SOURCE+'.hold.description',designed:'Observed public collector/coin structure; independently disclosed frequencies, regular awards, collector timing/aggregation and capped settlement.'};
 return d;
}

export function mariachiOptions(options={}){
 if(!record(options)||Object.keys(options).some(name=>!['holdWin'].includes(name))||options.holdWin!==undefined&&typeof options.holdWin!=='boolean')error('INVALID_OPTIONS','Only the documented held-win choice is available; the purchase price is unverified.');
 return{holdWin:options.holdWin===true};
}
export const mariachiMaximumMultiplierBps=d=>d.mariachiFeature.maximumAwardMultiplier*10000*(d.gamble?.enabled?2**d.gamble.maxRounds:1);
export function maximumMariachiPayout(d,betMinor,options={}){
 const {holdWin}=mariachiOptions(options);
 return(BigInt(betMinor)*BigInt(d.mariachiFeature.maximumAwardMultiplier)*BigInt(holdWin?2**d.gamble.maxRounds:1)).toString();
}
function coin(kind,row,col,rng){return{row,col,kind,multiplier:kind==='regular'?VALUES[draw(rng,VALUES.length)]:JACKPOTS[kind]};}
const coinSum=(coins,bet)=>coins.reduce((sum,item)=>sum+BigInt(item.multiplier)*BigInt(bet),0n);
function collectorsWithValue(collectors,coins,bet){const total=coinSum(coins,bet).toString();return collectors.map(item=>({...item,collectedMinor:total}));}
function lockedGrid(d,coins,collectors){const grid=Array.from({length:3},()=>Array(5).fill(null));for(const item of coins)grid[item.row][item.col]=d.coinSymbol.id;for(const item of collectors)grid[item.row][item.col]=d.collectorSymbols.find(s=>s.kind===item.kind).id;return grid;}
function baseBoard(d,rng){
 const coins=[],collectors=[],regular=d.symbols.length*32;
 const grid=Array.from({length:3},(_,row)=>Array.from({length:5},(_,col)=>{
  const edge=col===0||col===4,ticket=draw(rng,regular+1+(edge?2:16));
  if(ticket<regular)return d.symbols[ticket%d.symbols.length].id;
  if(ticket===regular)return d.wildSymbol.id;
  if(edge){const kind=col===0?'male':'female';collectors.push({row,col,kind});return d.collectorSymbols.find(s=>s.kind===kind).id;}
  coins.push(coin('regular',row,col,rng));return d.coinSymbol.id;
 }));
 return{grid,coins,collectors};
}
function expandedBase(d,bet,original){
 let scored=evaluatePublicWildGrid(d,bet,original);
 const expandedColumns=[...new Set(scored.lineWins.flatMap(line=>line.wildPositions.map(p=>p.col)))].sort((a,b)=>a-b);
 const grid=original.map(row=>row.map((id,col)=>expandedColumns.includes(col)?d.wildSymbol.id:id));
 if(expandedColumns.length)scored=evaluatePublicWildGrid(d,bet,grid);
 return{...scored,grid,expandedColumns};
}
const featureAmount=(coins,collectors,bet,full)=>
 (coinSum(coins,bet)+collectors.reduce((sum,item)=>sum+BigInt(item.collectedMinor),0n))*BigInt(full?2:1);

function resolveMariachi(d,{betMinor,options={},rng}){
 mariachiOptions(options);const round=baseRound(d,betMinor),trace=[];
 const random=bound=>{const value=draw(rng,bound);trace.push(value);if(trace.length>d.mariachiFeature.maximumRandomDraws)error('INVALID_MARIACHI_FEATURE','Consumed draw bound exceeded.');return value;};
 const initial=baseBoard(d,random),base=expandedBase(d,round.betMinor,initial.grid),cap=BigInt(round.betMinor)*2500n;
 let coins=copy(initial.coins),collectors=collectorsWithValue(initial.collectors,coins,round.betMinor),remaining=3;
 const bonusTriggered=coins.length>0&&collectors.some(c=>c.kind==='male')&&collectors.some(c=>c.kind==='female');
 const baseCollection=bonusTriggered?0n:collectors.reduce((sum,c)=>sum+BigInt(c.collectedMinor),0n);
 const baseAward=min(BigInt(base.winMinor)+baseCollection,cap),available=cap-baseAward,bonusFrames=[];
 let rawFeature=bonusTriggered?featureAmount(coins,collectors,round.betMinor,coins.length+collectors.length===15):0n;
 while(bonusTriggered&&remaining>0&&coins.length+collectors.length<15&&rawFeature<available){
  const occupied=new Set([...coins,...collectors].map(key)),newCoins=[],newCollectors=[];
  for(let row=0;row<3;row++)for(let col=0;col<5;col++)if(!occupied.has(row+':'+col)){
   const ticket=draw(random,64);
   if(ticket<8)newCoins.push(coin('regular',row,col,random));
   else if(ticket<12)newCoins.push(coin(['mini','major','mega','grand'][ticket-8],row,col,random));
   else if(ticket<14)newCollectors.push({row,col,kind:ticket===12?'male':'female'});
  }
  coins.push(...newCoins);collectors.push(...collectorsWithValue(newCollectors,coins,round.betMinor));
  remaining=newCoins.length+newCollectors.length?3:remaining-1;
  const full=coins.length+collectors.length===15;rawFeature=featureAmount(coins,collectors,round.betMinor,full);
  const award=min(rawFeature,available),capReached=baseAward+award===cap;
  bonusFrames.push({index:bonusFrames.length+1,grid:lockedGrid(d,coins,collectors),coinValues:copy(coins),collectors:copy(collectors),
   newCoins:newCoins.length,newCollectors:newCollectors.length,lockedCells:coins.length+collectors.length,resetLimit:3,respinsRemaining:remaining,
   rawAwardMinor:rawFeature.toString(),displayedAwardMinor:award.toString(),multiplierApplied:full?2:1,capReached,terminal:full||remaining===0||capReached});
  if(bonusFrames.length>d.mariachiFeature.maximumFrames)error('INVALID_MARIACHI_FEATURE','Locked-cell progress bound exceeded.');
 }
 const bonusAward=bonusTriggered?min(rawFeature,available):0n,total=baseAward+bonusAward,full=coins.length+collectors.length===15;
 return{...round,status:total===0n?'lost':'collected',step:1,winMinor:total.toString(),multiplierBps:Number(total*10000n/BigInt(round.betMinor)),private:{draws:trace},
  outcome:{kind:'slots',featureType:'collector-respin',grid:base.grid,originalGrid:initial.grid,lineWins:base.lineWins,expandedColumns:base.expandedColumns,
   coinValues:copy(initial.coins),collectors:collectorsWithValue(initial.collectors,initial.coins,round.betMinor),initialCoinCount:initial.coins.length,
   baseRegularAwardMinor:base.winMinor,baseCollectorAwardMinor:baseCollection.toString(),baseAwardMinor:baseAward.toString(),
   bonusTriggered,bonusFrames,finalCoinValues:copy(coins),finalCollectors:copy(collectors),bonusAwardMinor:bonusAward.toString(),
   featureResetLimit:3,featureFinishedReason:bonusTriggered?(total===cap?'maximum-award':full?'full-board':'respins-exhausted'):null,
   maximumAwardMinor:cap.toString(),capReached:total===cap,totalAwardMinor:total.toString(),settlement:'single-final-credit'}};
}
function compact(round){const{bonusFrames,...outcome}=round.outcome;return{...round,outcome:{...outcome,frameCount:bonusFrames.length,transcriptStorage:'consumed-server-draw-replay'}};}
export const startMariachiCoins=(d,args)=>compact(resolveMariachi(d,args));
export function validateMariachiRound(d,round){
 const draws=round.private?.draws;if(!Array.isArray(draws)||draws.length>d.mariachiFeature.maximumRandomDraws||draws.some(n=>!Number.isSafeInteger(n)||n<0)||round.step!==1||round.history.length)error('INVALID_ROUND','Invalid Mariachi consumed draw transcript.');
 let cursor=0,expected;try{expected=resolveMariachi(d,{betMinor:round.betMinor,rng:()=>draws[cursor++]});}catch{error('INVALID_ROUND','The accepted Mariachi transcript cannot be replayed.');}
 if(cursor!==draws.length||!equal(compact(expected).outcome,round.outcome)||expected.winMinor!==(round.holdWin===true?round.baseWinMinor:round.winMinor)||round.holdWin!==true&&(round.status!==expected.status||round.multiplierBps!==expected.multiplierBps))error('INVALID_ROUND','Mariachi award or board does not match the accepted server draws.');
 return expected;
}
export function publicMariachiRound(d,round){const replayed=validateMariachiRound(d,round);return{...publicHeldSlot(d,round),outcome:copy(replayed.outcome)};}
