// Validate only the public, already-resolved collector transcript. The server
// owns collector values, resets, winning lines and the final credit.
export const isMariachi=definition=>!!definition?.mariachiFeature&&Array.isArray(definition.collectorSymbols);
const amount=value=>typeof value==='string'&&/^(0|[1-9][0-9]*)$/.test(value);
const key=item=>item.row+':'+item.col;
export function mariachiPublicView(definition,round){
 if(!round)return null;
 const feature=definition.mariachiFeature,outcome=round.outcome,rows=definition.rows,cols=definition.cols;
 if(!isMariachi(definition)||outcome?.featureType!=='collector-respin'||outcome.settlement!=='single-final-credit'||!Array.isArray(outcome.bonusFrames)||outcome.bonusFrames.length>feature.maximumFrames)throw new TypeError('A complete public Mariachi transcript is required.');
 const position=item=>item&&Number.isInteger(item.row)&&item.row>=0&&item.row<rows&&Number.isInteger(item.col)&&item.col>=0&&item.col<cols;
 const read=(coins,collectors)=>{
  const coinMap=new Map(),collectorMap=new Map();
  if(!Array.isArray(coins)||!Array.isArray(collectors))throw new TypeError('Public Mariachi coins and collectors are required.');
  for(const coin of coins){const values=coin?.kind==='regular'?feature.regularValues:[feature.jackpotValues[coin?.kind]];if(!position(coin)||!Number.isSafeInteger(coin.multiplier)||coin.multiplier<=0||!values.includes(coin.multiplier)||coinMap.has(key(coin)))throw new TypeError('A matching Mariachi coin is required.');coinMap.set(key(coin),coin);}
  for(const collector of collectors){if(!position(collector)||!definition.collectorSymbols.some(symbol=>symbol.kind===collector.kind)||!amount(collector.collectedMinor)||coinMap.has(key(collector))||collectorMap.has(key(collector)))throw new TypeError('A matching Mariachi collector is required.');collectorMap.set(key(collector),collector);}
  return{coins:coinMap,collectors:collectorMap,locked:coinMap.size+collectorMap.size};
 };
 const unchanged=(before,after)=>[...before.coins].every(([pos,coin])=>after.coins.get(pos)?.kind===coin.kind&&after.coins.get(pos)?.multiplier===coin.multiplier)&&[...before.collectors].every(([pos,collector])=>after.collectors.get(pos)?.kind===collector.kind&&after.collectors.get(pos)?.collectedMinor===collector.collectedMinor);
 const initial=read(outcome.coinValues,outcome.collectors),frames=[];let previous=initial,remaining=feature.initialRespins;
 for(const [index,frame]of outcome.bonusFrames.entries()){
  const state=read(frame.coinValues,frame.collectors),newCoins=state.coins.size-previous.coins.size,newCollectors=state.collectors.size-previous.collectors.size;
  remaining=newCoins+newCollectors?feature.initialRespins:remaining-1;
  if(!unchanged(previous,state)||frame.index!==index+1||frame.newCoins!==newCoins||frame.newCollectors!==newCollectors||frame.lockedCells!==state.locked||frame.resetLimit!==feature.initialRespins||frame.respinsRemaining!==remaining||remaining<0||frame.multiplierApplied!==(state.locked===rows*cols?feature.fullBoardMultiplier:1)||frame.terminal!==(remaining===0||state.locked===rows*cols||frame.capReached===true)||frame.terminal&&index!==outcome.bonusFrames.length-1)throw new TypeError('The public Mariachi counter or locked values changed.');
  if(!Array.isArray(frame.grid)||frame.grid.length!==rows||frame.grid.some((row,r)=>!Array.isArray(row)||row.length!==cols||row.some((id,c)=>{const pos=r+':'+c,collector=state.collectors.get(pos);return id!==(state.coins.has(pos)?definition.coinSymbol.id:collector?definition.collectorSymbols.find(symbol=>symbol.kind===collector.kind).id:null);})))throw new TypeError('The public Mariachi locked grid changed.');
  if(!amount(frame.rawAwardMinor)||!amount(frame.displayedAwardMinor)||BigInt(frame.displayedAwardMinor)>BigInt(frame.rawAwardMinor)||frame.capReached===true&&(!outcome.capReached||outcome.featureFinishedReason!=='maximum-award'))throw new TypeError('The public Mariachi award labels are inconsistent.');
  frames.push({frame,...state});previous=state;
 }
 const final=read(outcome.finalCoinValues,outcome.finalCollectors);
 if(final.locked!==previous.locked||!unchanged(previous,final)||['baseRegularAwardMinor','baseCollectorAwardMinor','baseAwardMinor','bonusAwardMinor','maximumAwardMinor','totalAwardMinor'].some(name=>!amount(outcome[name])))throw new TypeError('The public Mariachi final result changed.');
 return{initial,frames,final};
}
