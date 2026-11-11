// Public Coins mechanics; ticket weights, repeated jackpot grouping, award
// ordering and total/base purchase interpretation are independently authored.
import {baseRound,draw,error,publicBase} from './engines/shared.mjs';
import {evaluatePublicWildGrid} from './official72-mechanics.mjs';
import {independentPaylines} from './official72-layouts.mjs';

export const COINS_ATLANTIS_ID='ind74_official_coinsofatlantis';
const VALUES=Object.freeze([1,2,3,4,5,6,7,8,9,10,15,20]);
const copy=value=>structuredClone(value),key=coin=>coin.row+':'+coin.col;
const capacity=d=>d.rows*d.cols;
const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)
  ?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const equal=(a,b)=>canonical(a)===canonical(b);
const coinSum=(coins,bet)=>coins.reduce((sum,coin)=>sum+BigInt(bet)*BigInt(coin.multiplier),0n);
const symbolFor=(d,coin)=>coin.kind==='plus-one'?d.plusRespinSymbol.id:d.coinSymbol.id;
const coinGrid=(d,coins)=>{const grid=Array.from({length:d.rows},()=>Array(d.cols).fill(null));for(const coin of coins)grid[coin.row][coin.col]=symbolFor(d,coin);return grid;};

export function configureCoinsOfAtlantis(d){
  if(d?.id!==COINS_ATLANTIS_ID||d.family!=='slots'||d.cols!==5)throw new TypeError('The Coins Of Atlantis definition is required.');
  d.mathVersion='official72-coinsofatlantis-r5';d.model='independent-atlantis-complete-coin-respin';
  d.rows=4;d.cols=5;delete d.multiplierValues;delete d.gamble;
  d.paylines=independentPaylines(5,4,d.paylines.length);
  d.coinSymbol={id:'coinsofatlantis-coin',label:'Coin',glyph:'◉'};
  d.plusRespinSymbol={id:'coinsofatlantis-plus-respin',label:'+1 Respin Coin',glyph:'+1'};
  d.blockerSymbols=[d.coinSymbol.id,d.plusRespinSymbol.id];
  d.coinFeature={source:'references/official-slot-help-en-20261111.json:help.slots.coinofatlantis',
    triggerCoins:5,initialRespins:3,plusOneResetLimit:4,fullBoardMultiplier:2,regularValues:[...VALUES],miniValue:25,majorValue:50,
    megaGroupValues:[25,175],grandGroupValues:[50,50,900],jackpotGrouping:'independent-repeated-disjoint-landing-order-groups',
    modes:['base','ante','buy60'],defaultMode:'base',costBps:{base:10000,ante:15000,buy60:600000},
    totalStakeStepMinor:{base:'100',ante:'300',buy60:'6000'},minimumBaseBetMinor:'100',stakeMeaning:'total-effective-debit',
    maximumMultiplier:2500,maximumScope:'derived-base-stake',providerMaximumCouplingVerified:false,
    baseRegularCoinTickets:16,baseMiniTickets:2,baseMajorTickets:1,baseMegaTickets:1,baseGrandTickets:1,
    anteCoinTicketFactor:2,respinTickets:64,respinRegularTickets:8,respinMiniTickets:1,respinMajorTickets:1,respinPlusOneTickets:1,
    respinMegaTickets:1,respinGrandTickets:1,maximumFrames:4*(capacity(d)-5),maximumRandomDraws:1850,
    probabilityModel:'independent-ticket-model',providerProbabilitiesVerified:false,
    baseFeatureAggregation:'independent-base-plus-final-coin-sum',coinCountTiming:'independent-before-wild-expansion',
    unsupportedCoinTypes:[]};
  d.provenance={...d.provenance,geometrySource:'reports/current74-evidence-slots-remaining/ind74_official_coinsofatlantis-initial.png',
    publicCoinRules:d.coinFeature.source,
    designed:'Documented regular/+1/MINI/MAJOR/MEGA/GRAND respins, ANTE and60x purchase; independent probabilities, recurring jackpot groups, line chart and award ordering.'};
  d.rules=[
    'The observed official entry shows5reels and4rows. This independent model uses an authored line chart; the exact provider chart and count remain unverified.',
    'Wilds on reels2–4 expand when used in a winning combination. This implementation counts landed coins before that one-pass wild expansion; provider base-plus-feature aggregation and coin/expansion ordering remain unverified.',
    'Five or more landed coins trigger3respins. Initial coins lock; only empty cells respin. A new coin resets the allowance to3. A +1RESPIN coin changes the persistent reset allowance to4, including later resets.',
    'Regular coin values are1x through10x,15x or20x; MINI is25x and MAJOR50x. A +1RESPIN coin carries a regular value. Awards use the derived base stake; the API total is the single effective debit.',
    'MEGA requires2coins: the first is25x and the second175x, totaling200x. GRAND requires3coins:50x,50x and900x, totaling1000x. Incomplete groups retain their25x or50x values.',
    'The provider rules do not specify additional same-type coins beyond those groups. This independent model repeats disjoint groups in landing order. Existing coin values stay locked; each new coin gets the next value in its group. This choice is not asserted as provider coupling.',
    'The feature ends after its3-or4 consecutive empty respins, a full board or the disclosed maximum. The final coin sum pays once; a full board doubles that sum. Intermediate boards are presentation only and do not create additional credits.',
    'Base mode costs1x, ANTE1.5x and Buy60 costs60x of the derived base. The accepted stake is always the complete debit. Buy60 guarantees at least5initial coins. ANTE doubles the independent coin ticket weights; the provider approximately2x trigger frequency is not inferred.',
    'The retained whole-ETB grid requires total stakes in1ETB steps for base,3ETB for ANTE and60ETB for Buy60. Invalid totals are rejected before generating a result. Bonus respins never debit another stake.',
    'This model explicitly caps the complete base-plus-feature award at2500times the derived base stake. At that maximum no greater payment is possible, so remaining respins finish immediately. Provider restrictions and the purchase interpretation of total-bet wording remain unverified.',
    'Every successful reset locks at least one new cell; at most4respins occur between locks. With20cells and at least5initial coins, no more than60respin frames are possible. Stored state contains only consumed server draws and a settled summary; the public transcript is reconstructed for display.',
    'Base regular symbols receive32tickets each, eligible Wilds one, regular coins16, MINI2 and MAJOR/MEGA/GRAND1each. Each empty feature cell has64tickets:8regular,1each MINI/MAJOR/+1/MEGA/GRAND and51blank. Regular values are uniform. These weights, regular prizes and line chart do not reproduce provider RNG or RTP.',
  ];
  return d;
}

export function coinsAtlantisOptions(options={}){
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>k!=='mode')||
    options.mode!==undefined&&!['base','ante','buy60'].includes(options.mode))error('INVALID_OPTIONS','Choose base, ANTE or Buy60 for Coins Of Atlantis.');
  return{mode:options.mode??'base'};
}
export function coinsAtlantisStakeTerms(d,betMinor,options={}){
  const {mode}=coinsAtlantisOptions(options),total=BigInt(betMinor),cost=d.coinFeature.costBps[mode];
  if(total<=0n||total%BigInt(d.coinFeature.totalStakeStepMinor[mode]))error('INVALID_BET','The total must exactly cover the selected cost and a whole-ETB base stake.');
  const base=total*10000n/BigInt(cost);
  if(base<100n||base%100n||base*BigInt(cost)!==total*10000n)error('INVALID_BET','The selected feature requires a whole-ETB base stake.');
  return{mode,totalBetMinor:total.toString(),baseBetMinor:base.toString(),costBps:cost,maximumAwardMinor:(base*2500n).toString()};
}
export const coinsAtlantisMaximumMultiplierBps=d=>d.coinFeature.maximumMultiplier*10000;
export const maximumCoinsAtlantisPayout=(d,bet,options={})=>coinsAtlantisStakeTerms(d,bet,options).maximumAwardMinor;

function newCoin(kind,row,col,rng){return{row,col,kind,multiplier:kind==='mini'||kind==='mega'?25:kind==='major'||kind==='grand'?50:VALUES[draw(rng,VALUES.length)]};}
export function assignAtlantisJackpotValues(coins){
  let mega=0,grand=0;
  return coins.map(coin=>coin.kind==='mega'?{...coin,multiplier:[25,175][mega++%2]}:
    coin.kind==='grand'?{...coin,multiplier:[50,50,900][grand++%3]}:{...coin});
}
function baseBoard(d,mode,rng){
  const coins=[],regularTickets=d.symbols.length*32,factor=mode==='ante'?2:1;
  const grid=Array.from({length:d.rows},(_,row)=>Array.from({length:d.cols},(_,col)=>{
    const eligible=d.wildRule.columns.includes(col),wildTickets=eligible?1:0;
    const ticket=draw(rng,regularTickets+wildTickets+21*factor);
    if(ticket<regularTickets)return d.symbols[ticket%d.symbols.length].id;
    if(eligible&&ticket===regularTickets)return d.wildSymbol.id;
    const coinTicket=Math.floor((ticket-regularTickets-wildTickets)/factor);
    const kind=coinTicket<16?'regular':coinTicket<18?'mini':coinTicket===18?'major':coinTicket===19?'mega':'grand';
    coins.push(newCoin(kind,row,col,rng));return d.coinSymbol.id;
  }));
  if(mode==='buy60'){
    const occupied=new Set(coins.map(key)),available=[];
    for(let row=0;row<d.rows;row++)for(let col=0;col<d.cols;col++)if(!occupied.has(row+':'+col))available.push({row,col});
    while(coins.length<5){const [{row,col}]=available.splice(draw(rng,available.length),1);coins.push(newCoin('regular',row,col,rng));grid[row][col]=d.coinSymbol.id;}
  }
  return{grid,coins:assignAtlantisJackpotValues(coins)};
}
function expandedBase(d,bet,original){
  let scored=evaluatePublicWildGrid(d,bet,original);
  const expandedColumns=[...new Set(scored.lineWins.flatMap(line=>line.wildPositions.map(position=>position.col)))].sort((a,b)=>a-b);
  const grid=original.map(row=>row.map((id,col)=>expandedColumns.includes(col)?d.wildSymbol.id:id));
  if(expandedColumns.length)scored=evaluatePublicWildGrid(d,bet,grid);
  return{grid,expandedColumns,...scored};
}
function resolveCoins(d,{betMinor,rng,options={}}){
  const terms=coinsAtlantisStakeTerms(d,betMinor,options),round=baseRound(d,betMinor),draws=[];
  const source=bound=>{const value=draw(rng,bound);draws.push(value);return value;};
  const initial=baseBoard(d,terms.mode,source),base=expandedBase(d,terms.baseBetMinor,initial.grid);
  const maximum=BigInt(terms.maximumAwardMinor),baseAward=BigInt(base.winMinor)>maximum?maximum:BigInt(base.winMinor),room=maximum-baseAward;
  const bonusTriggered=initial.coins.length>=5,bonusFrames=[];
  let coins=copy(initial.coins),remaining=3,resetLimit=3;
  const currentRaw=()=>coinSum(coins,terms.baseBetMinor)*BigInt(coins.length===capacity(d)?2:1);
  let capReached=baseAward===maximum||bonusTriggered&&currentRaw()>=room;
  const maximumFrames=4*(capacity(d)-initial.coins.length);
  if(bonusTriggered&&!capReached)while(coins.length<capacity(d)&&remaining>0){
    const occupied=new Set(coins.map(key)),next=copy(coins),before=coins.length;
    for(let row=0;row<d.rows;row++)for(let col=0;col<d.cols;col++)if(!occupied.has(row+':'+col)){
      const ticket=draw(source,64),kind=ticket<8?'regular':ticket===8?'mini':ticket===9?'major':ticket===10?'plus-one':ticket===11?'mega':ticket===12?'grand':null;
      if(kind){next.push(newCoin(kind,row,col,source));if(kind==='plus-one')resetLimit=4;}
    }
    const assigned=assignAtlantisJackpotValues(next),newCoins=assigned.length-before,full=assigned.length===capacity(d);
    remaining=newCoins?resetLimit:remaining-1;
    const raw=coinSum(assigned,terms.baseBetMinor),uncapped=raw*BigInt(full?2:1),award=uncapped>room?room:uncapped;
    capReached=uncapped>=room;const terminal=full||remaining===0||capReached;
    bonusFrames.push({index:bonusFrames.length+1,grid:coinGrid(d,assigned),coinValues:copy(assigned),lockedCells:assigned.length,newCoins,
      resetLimit,respinsRemaining:capReached?0:remaining,rawAwardMinor:raw.toString(),uncappedAwardMinor:uncapped.toString(),displayedAwardMinor:award.toString(),
      multiplierApplied:full?2:1,terminal,capReached});
    coins=assigned;if(capReached)remaining=0;
    if(bonusFrames.length>maximumFrames)error('INVALID_COIN_FEATURE','The coin-capacity progress bound was exceeded.');
  }
  const full=bonusTriggered&&coins.length===capacity(d),rawBonus=bonusTriggered?currentRaw():0n,bonus=rawBonus>room?room:rawBonus;
  const win=baseAward+bonus,winMinor=win.toString();capReached=win===maximum;
  if(draws.length>d.coinFeature.maximumRandomDraws)error('INVALID_COIN_FEATURE','The coin draw transcript exceeded its proven capacity bound.');
  return{...round,...terms,status:win===0n?'lost':'collected',step:1,winMinor,multiplierBps:Number(win*10000n/BigInt(round.betMinor)),private:{draws},
    outcome:{kind:'slots',grid:base.grid,originalGrid:initial.grid,lineWins:base.lineWins,expandedColumns:base.expandedColumns,
      featureType:'coin-respin',mode:terms.mode,baseBetMinor:terms.baseBetMinor,totalBetMinor:terms.totalBetMinor,costBps:terms.costBps,
      coinValues:initial.coins,initialCoinCount:initial.coins.length,rawBaseAwardMinor:base.winMinor,baseAwardMinor:baseAward.toString(),
      bonusTriggered,bonusFrames,finalCoinValues:coins,uncappedBonusAwardMinor:rawBonus.toString(),bonusAwardMinor:bonus.toString(),
      maximumAwardMinor:maximum.toString(),capReached,totalAwardMinor:winMinor,
      featureResetLimit:resetLimit,featureFinishedReason:bonusTriggered?(capReached?'maximum-award':full?'full-board':'respins-exhausted'):null,
      featureAggregation:'independent-base-plus-final-coin-sum'}};
}
const compact=round=>{const {bonusFrames,...summary}=round.outcome;return{...round,outcome:{...summary,bonusFrameCount:bonusFrames.length,transcriptStorage:'consumed-server-draw-replay'}};};
export const startCoinsOfAtlantis=(d,args)=>compact(resolveCoins(d,args));
export function validateCoinsAtlantisRound(d,round){
  const draws=round.private?.draws;
  if(!Array.isArray(draws)||draws.length>d.coinFeature.maximumRandomDraws||draws.some(n=>!Number.isSafeInteger(n)||n<0)||round.step!==1||round.history.length)
    error('INVALID_ROUND','The stored coin result has an invalid bounded draw transcript.');
  let cursor=0,expected;
  try{expected=resolveCoins(d,{betMinor:round.betMinor,options:{mode:round.mode},rng:()=>draws[cursor++]});}catch{error('INVALID_ROUND','The stored coin draw transcript does not resolve a legal feature.');}
  if(cursor!==draws.length||!equal(compact(expected).outcome,round.outcome)||
    ['winMinor','status','multiplierBps','mode','baseBetMinor','totalBetMinor','costBps','maximumAwardMinor'].some(k=>round[k]!==expected[k]))
    error('INVALID_ROUND','The coin feature award or state disagrees with the accepted server draws.');
  return expected;
}
export function publicCoinsAtlantisRound(d,round){
  const full=validateCoinsAtlantisRound(d,round);
  return{...publicBase(round),mode:round.mode,baseBetMinor:round.baseBetMinor,totalBetMinor:round.totalBetMinor,costBps:round.costBps,
    outcome:copy(full.outcome),collectibleMinor:'0',allowedActions:[]};
}
