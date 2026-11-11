// Documented coin-respin subset. MEGA/GRAND grouping, purchases, ANTE and
// provider probabilities remain outside this independently authored model.
import {baseRound,draw,error} from './engines/shared.mjs';
import {evaluatePublicWildGrid} from './official72-mechanics.mjs';
import {independentPaylines} from './official72-layouts.mjs';

export const COINS_ATLANTIS_ID='ind74_official_coinsofatlantis';
const VALUES=Object.freeze([1,2,3,4,5,6,7,8,9,10,15,20]);
const copy=value=>structuredClone(value);
const key=coin=>coin.row+':'+coin.col;
const largestPrize=d=>Math.max(...d.symbols.flatMap(symbol=>Object.values(symbol.pays)));
const capacity=d=>d.rows*d.cols;
const emptyGrid=d=>Array.from({length:d.rows},()=>Array(d.cols).fill(null));
const coinSum=(coins,bet)=>coins.reduce((sum,coin)=>sum+BigInt(bet)*BigInt(coin.multiplier),0n);
const symbolFor=(d,coin)=>coin.kind==='plus-one'?d.plusRespinSymbol.id:d.coinSymbol.id;
const coinGrid=(d,coins)=>{const grid=emptyGrid(d);for(const coin of coins)grid[coin.row][coin.col]=symbolFor(d,coin);return grid;};

export function configureCoinsOfAtlantis(d){
  if(d?.id!==COINS_ATLANTIS_ID||d.family!=='slots'||d.cols!==5)throw new TypeError('The Coins Of Atlantis definition is required.');
  d.mathVersion='official72-coinsofatlantis-r4';d.model='independent-atlantis-coin-respin';
  d.rows=4;d.cols=5;
  delete d.multiplierValues;
  d.paylines=independentPaylines(5,4,d.paylines.length);
  d.coinSymbol={id:'coinsofatlantis-coin',label:'Coin',glyph:'◉'};
  d.plusRespinSymbol={id:'coinsofatlantis-plus-respin',label:'+1 Respin Coin',glyph:'+1'};
  d.blockerSymbols=[d.coinSymbol.id,d.plusRespinSymbol.id];
  d.coinFeature={source:'references/official-slot-help-en-20261111.json:help.slots.coinofatlantis',
    triggerCoins:5,initialRespins:3,plusOneResetLimit:4,fullBoardMultiplier:2,regularValues:[...VALUES],miniValue:25,majorValue:50,
    baseRegularCoinTickets:16,baseMiniTickets:2,baseMajorTickets:1,
    respinTickets:64,respinRegularTickets:8,respinMiniTickets:1,respinMajorTickets:1,respinPlusOneTickets:1,
    maximumFrames:4*(capacity(d)-5),
    probabilityModel:'independent-ticket-model',providerProbabilitiesVerified:false,
    baseFeatureAggregation:'independent-base-plus-final-coin-sum',coinCountTiming:'independent-before-wild-expansion',
    unsupportedCoinTypes:['mega','grand']};
  d.provenance={...d.provenance,geometrySource:'reports/current74-evidence-slots-remaining/ind74_official_coinsofatlantis-initial.png',
    publicCoinRules:'references/official-slot-help-en-20261111.json:help.slots.coinofatlantis.jackpot.win.description',
    designed:'Documented regular/+1/MINI/MAJOR coin-respin subset with independent probabilities, regular symbol awards, payline chart and base/feature ordering.'};
  d.rules=[
    'The observed official entry shows five reels and four rows. This independent model uses an authored line chart; the exact provider chart and count remain unverified.',
    'Documented wilds on reels2–4 expand when used in a winning combination. This implementation counts landed coins before that one-pass regular-spin wild expansion; provider coin/expansion order is unverified.',
    'Five or more landed coins trigger3respins. Initial coins lock; only empty cells respin. A new coin resets the allowance to3. A +1RESPIN coin changes the persistent reset allowance to4, including later resets.',
    'Regular coin values are1x through10x,15x or20x; MINI is25x and MAJOR is50x of the accepted total bet. A +1RESPIN coin carries one of the regular values.',
    'The feature ends after the current3-or4 consecutive empty respins or a full board. At the end all coin values add; a full board doubles that coin sum. Intermediate boards do not create separate payments.',
    'The feature has a finite capacity-based bound: each successful reset locks at least one new cell; between locks at most4respins occur. With20cells and at least5initial coins, at most60respin frames are possible.',
    'This independently authored aggregation retains the regular-spin award and adds the final coin feature award once. Provider base-plus-feature aggregation and coin/expansion ordering remain unverified.',
    'MEGA/GRAND multi-coin jackpot restrictions, buy bonus and ANTE are not implemented. The provider2500x marketing maximum does not establish a hidden clamp for this independent model.',
    'Base symbols receive32tickets each, eligible wilds one, regular coins16, MINI2 and MAJOR1. Each empty feature cell has64tickets:8regular-coin,1MINI,1MAJOR,1+1RESPIN and53blank. Regular coin values are uniform. These probabilities, original symbol prizes and line chart are operator choices, not provider mathematics.',
  ];
  return d;
}

export function coinsAtlantisMaximumMultiplierBps(d){return(largestPrize(d)+2*capacity(d)*50)*10000;}
export function maximumCoinsAtlantisPayout(d,bet){const lines=BigInt(d.paylines.length);return(lines*(BigInt(bet)*BigInt(largestPrize(d))/lines)+2n*BigInt(capacity(d))*50n*BigInt(bet)).toString();}

function newCoin(kind,row,col,rng){return{row,col,kind,multiplier:kind==='mini'?25:kind==='major'?50:VALUES[draw(rng,VALUES.length)]};}
function baseBoard(d,rng){
  const coins=[],regularTickets=d.symbols.length*32;
  const grid=Array.from({length:d.rows},(_,row)=>Array.from({length:d.cols},(_,col)=>{
    const eligible=d.wildRule.columns.includes(col),wildTickets=eligible?1:0;
    const ticket=draw(rng,regularTickets+wildTickets+19);
    if(ticket<regularTickets)return d.symbols[ticket%d.symbols.length].id;
    if(eligible&&ticket===regularTickets)return d.wildSymbol.id;
    const coinTicket=ticket-regularTickets-wildTickets;
    const kind=coinTicket<16?'regular':coinTicket<18?'mini':'major';
    const coin=newCoin(kind,row,col,rng);coins.push(coin);return d.coinSymbol.id;
  }));
  return{grid,coins};
}
function expandedBase(d,bet,original){
  let scored=evaluatePublicWildGrid(d,bet,original);
  const expandedColumns=[...new Set(scored.lineWins.flatMap(line=>line.wildPositions.map(position=>position.col)))].sort((a,b)=>a-b);
  const grid=original.map(row=>row.map((id,col)=>expandedColumns.includes(col)?d.wildSymbol.id:id));
  if(expandedColumns.length)scored=evaluatePublicWildGrid(d,bet,grid);
  return{grid,expandedColumns,...scored};
}

export function startCoinsOfAtlantis(d,{betMinor,rng}){
  const round=baseRound(d,betMinor),initial=baseBoard(d,rng),base=expandedBase(d,round.betMinor,initial.grid);
  const bonusTriggered=initial.coins.length>=5,bonusFrames=[];
  let coins=copy(initial.coins),remaining=3,resetLimit=3;
  const maximumFrames=4*(capacity(d)-initial.coins.length);
  if(bonusTriggered)while(coins.length<capacity(d)&&remaining>0){
    const occupied=new Set(coins.map(key)),next=copy(coins),before=coins.length;
    for(let row=0;row<d.rows;row++)for(let col=0;col<d.cols;col++)if(!occupied.has(row+':'+col)){
      const ticket=draw(rng,64);
      const kind=ticket<8?'regular':ticket===8?'mini':ticket===9?'major':ticket===10?'plus-one':null;
      if(kind){const coin=newCoin(kind,row,col,rng);next.push(coin);if(kind==='plus-one')resetLimit=4;}
    }
    const newCoins=next.length-before,full=next.length===capacity(d);
    remaining=newCoins?resetLimit:remaining-1;
    const raw=coinSum(next,round.betMinor),award=raw*BigInt(full?2:1);
    bonusFrames.push({index:bonusFrames.length+1,grid:coinGrid(d,next),coinValues:copy(next),lockedCells:next.length,newCoins,
      resetLimit,respinsRemaining:remaining,rawAwardMinor:raw.toString(),displayedAwardMinor:award.toString(),
      multiplierApplied:full?2:1,terminal:full||remaining===0});
    coins=next;
    if(bonusFrames.length>maximumFrames)error('INVALID_COIN_FEATURE','The coin-capacity progress bound was exceeded.');
  }
  const full=bonusTriggered&&coins.length===capacity(d),bonusAwardMinor=bonusTriggered?(coinSum(coins,round.betMinor)*BigInt(full?2:1)).toString():'0';
  const winMinor=(BigInt(base.winMinor)+BigInt(bonusAwardMinor)).toString();
  return{...round,status:winMinor==='0'?'lost':'collected',step:1,winMinor,
    multiplierBps:Number(BigInt(winMinor)*10000n/BigInt(round.betMinor)),
    outcome:{kind:'slots',grid:base.grid,originalGrid:initial.grid,lineWins:base.lineWins,expandedColumns:base.expandedColumns,
      featureType:'coin-respin',coinValues:initial.coins,initialCoinCount:initial.coins.length,baseAwardMinor:base.winMinor,
      bonusTriggered,bonusFrames,finalCoinValues:coins,bonusAwardMinor,
      featureResetLimit:resetLimit,featureFinishedReason:bonusTriggered?(full?'full-board':'respins-exhausted'):null,
      featureAggregation:'independent-base-plus-final-coin-sum'}};
}

function checkedCoins(d,coins,{initial=false}={}){
  if(!Array.isArray(coins)||coins.length>capacity(d))error('INVALID_ROUND','The coin list is malformed.');
  const seen=new Set();
  for(const coin of coins){
    if(!coin||!Number.isInteger(coin.row)||coin.row<0||coin.row>=d.rows||!Number.isInteger(coin.col)||coin.col<0||coin.col>=d.cols||seen.has(key(coin)))error('INVALID_ROUND','Coin coordinates are invalid.');
    seen.add(key(coin));
    const valid=coin.kind==='mini'?coin.multiplier===25:coin.kind==='major'?coin.multiplier===50:
      ['regular',...(initial?[]:['plus-one'])].includes(coin.kind)&&VALUES.includes(coin.multiplier);
    if(!valid)error('INVALID_ROUND','The coin type or value is invalid.');
  }
  return coins;
}
const sameCoins=(a,b)=>a.length===b.length&&a.every(coin=>b.some(other=>key(other)===key(coin)&&other.kind===coin.kind&&other.multiplier===coin.multiplier));

export function validateCoinsAtlantisRound(d,round){
  const o=round.outcome;
  if(!o||o.featureType!=='coin-respin'||!Array.isArray(o.bonusFrames))error('INVALID_ROUND','The coin result is malformed.');
  const initial=checkedCoins(d,o.coinValues,{initial:true});
  const base=expandedBase(d,round.betMinor,o.originalGrid);
  if(JSON.stringify(base.grid)!==JSON.stringify(o.grid)||o.baseAwardMinor!==base.winMinor||o.initialCoinCount!==initial.length||
    o.bonusTriggered!==(initial.length>=5))error('INVALID_ROUND','The base coin result is inconsistent.');
  const baseCoinPositions=[];
  for(let row=0;row<d.rows;row++)for(let col=0;col<d.cols;col++)if(o.originalGrid[row][col]===d.coinSymbol.id)baseCoinPositions.push({row,col});
  if(baseCoinPositions.length!==initial.length||!initial.every(coin=>baseCoinPositions.some(position=>key(position)===key(coin))))error('INVALID_ROUND','Initial coin positions are inconsistent.');
  let coins=initial,remaining=3,resetLimit=3;
  if(o.bonusFrames.length>4*(capacity(d)-initial.length))error('INVALID_ROUND','The feature has too many frames.');
  for(const[index,frame]of o.bonusFrames.entries()){
    const next=checkedCoins(d,frame.coinValues),newCoins=next.filter(coin=>!coins.some(previous=>key(previous)===key(coin)));
    if(!coins.every(coin=>next.some(other=>key(other)===key(coin)&&other.kind===coin.kind&&other.multiplier===coin.multiplier)))error('INVALID_ROUND','A locked coin changed.');
    if(newCoins.some(coin=>coin.kind==='plus-one'))resetLimit=4;
    remaining=newCoins.length?resetLimit:remaining-1;
    const full=next.length===capacity(d),raw=coinSum(next,round.betMinor),terminal=full||remaining===0;
    if(remaining<0||frame.index!==index+1||frame.lockedCells!==next.length||frame.newCoins!==newCoins.length||
      frame.resetLimit!==resetLimit||frame.respinsRemaining!==remaining||frame.rawAwardMinor!==raw.toString()||
      frame.displayedAwardMinor!==(raw*BigInt(full?2:1)).toString()||frame.multiplierApplied!==(full?2:1)||frame.terminal!==terminal||
      JSON.stringify(frame.grid)!==JSON.stringify(coinGrid(d,next))||(terminal&&index!==o.bonusFrames.length-1))error('INVALID_ROUND','The respin counter or coin award is inconsistent.');
    coins=next;
  }
  checkedCoins(d,o.finalCoinValues);
  if(!sameCoins(coins,o.finalCoinValues)||o.featureResetLimit!==resetLimit)error('INVALID_ROUND','The final coin board is inconsistent.');
  const full=coins.length===capacity(d),bonus=o.bonusTriggered?coinSum(coins,round.betMinor)*BigInt(full?2:1):0n;
  if(o.bonusTriggered&&(!full&&remaining!==0)||!o.bonusTriggered&&o.bonusFrames.length!==0||
    o.featureFinishedReason!==(o.bonusTriggered?(full?'full-board':'respins-exhausted'):null)||o.bonusAwardMinor!==bonus.toString())error('INVALID_ROUND','The coin feature did not finish consistently.');
  const total=BigInt(base.winMinor)+bonus;
  if(round.winMinor!==total.toString()||total>BigInt(maximumCoinsAtlantisPayout(d,round.betMinor))||round.status!==(total===0n?'lost':'collected'))error('INVALID_ROUND','The total coin award is inconsistent.');
}
