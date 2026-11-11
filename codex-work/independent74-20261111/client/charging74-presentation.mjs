// These helpers display the server's saved Wilds and the visible total cost.
// They never create carry, score a line, choose a symbol or update a wallet.
export const isChargingWilds=definition=>definition?.slotMechanic==='charging-wilds'&&!!definition.chargingFeature;
const minor=value=>typeof value==='string'&&/^(0|[1-9][0-9]*)$/.test(value);
const key=position=>position.row+':'+position.col;
const decimal=value=>String(value/100n)+'.'+String(value%100n).padStart(2,'0');

export function chargingStakePreview(definition,totalStake,ante=definition?.chargingFeature?.defaultAnte){
  const feature=definition?.chargingFeature;
  if(!isChargingWilds(definition)||!feature.anteValues.includes(ante))throw new TypeError('ANTE-gan lama heli karo.');
  if(typeof totalStake!=='string'||!/^\d{1,11}(?:\.\d{1,2})?$/.test(totalStake))throw new TypeError('Geli wadarta sharadka saxda ah.');
  const [whole,fraction='']=totalStake.split('.'),total=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
  const step=feature.totalStakeStepMinor?.[ante];
  if(!minor(step)||BigInt(step)<=0n)throw new TypeError('The public ANTE stake grid is invalid.');
  if(total<=0n||total%BigInt(step)!==0n)throw new RangeError('ANTE '+ante+'×: wadarta sharadku waxay ku kordhaysaa '+decimal(BigInt(step))+'.');
  const base=total/BigInt(ante);
  if(base<100n||base%100n!==0n||base*BigInt(ante)!==total)throw new RangeError('Sharadka aasaasiga ahi waa inuu ahaadaa tiro dhan.');
  return {ante,totalBetMinor:total.toString(),baseBetMinor:base.toString(),totalStake:decimal(total),baseStake:decimal(base)};
}

export function chargingAnteTotal(definition,currentTotal,previousAnte,nextAnte){
  if(!definition?.chargingFeature?.anteValues.includes(nextAnte))throw new TypeError('ANTE-gan lama heli karo.');
  let base;try{base=BigInt(chargingStakePreview(definition,currentTotal,previousAnte).baseBetMinor);}catch{base=100n;}
  return decimal(base*BigInt(nextAnte));
}

export function chargingRoundMatchesSelection(definition,round,totalStake,ante){
  if(!round)return false;
  try{const selected=chargingStakePreview(definition,totalStake,ante);return round.outcome?.ante===selected.ante&&round.outcome?.totalBetMinor===selected.totalBetMinor;}catch{return false;}
}

export function chargingPublicView(definition,round){
  if(!round)return null;
  const outcome=round.outcome,feature=definition?.chargingFeature;
  if(!isChargingWilds(definition)||outcome?.featureType!=='charging-wilds'||outcome.settlement!=='one-paid-spin')throw new TypeError('A public Charging Wilds result is required.');
  const point=wild=>wild&&Number.isInteger(wild.row)&&wild.row>=0&&wild.row<definition.rows&&Number.isInteger(wild.col)&&wild.col>=0&&wild.col<definition.cols&&Number.isSafeInteger(wild.multiplier)&&wild.multiplier>=1&&wild.multiplier<=feature.counterCapacity;
  const list=(value,name)=>{
    if(!Array.isArray(value)||value.length>definition.rows*definition.cols||value.some(wild=>!point(wild))||new Set(value.map(key)).size!==value.length)throw new TypeError('The public Charging '+name+' positions or labels are invalid.');
    return new Map(value.map(wild=>[key(wild),wild]));
  };
  const current=list(outcome.wildsThisSpin,'current'),before=list(outcome.carryBefore?.wilds,'saved'),after=list(outcome.carryAfter?.wilds,'next'),winning=list(outcome.winningWilds,'winning'),retained=list(outcome.retainedWilds,'retained');
  const grid=outcome.grid;
  if(!Array.isArray(grid)||grid.length!==definition.rows||grid.some(row=>!Array.isArray(row)||row.length!==definition.cols)||grid.flat().filter(id=>id===definition.wildSymbol?.id).length!==current.size||[...current.values()].some(wild=>grid[wild.row][wild.col]!==definition.wildSymbol.id))throw new TypeError('The public Charging Wild labels do not match the grid.');
  for(const collection of [before,winning])if([...collection].some(([position,wild])=>current.get(position)?.multiplier!==wild.multiplier))throw new TypeError('A public Charging Wild changed its current-spin label.');
  if(after.size!==retained.size||[...after].some(([position,wild])=>retained.get(position)?.multiplier!==wild.multiplier||!current.has(position)||winning.has(position)))throw new TypeError('The public next-spin Charging carry is inconsistent.');
  if(!minor(outcome.carryAfter?.paidSpins)||!minor(outcome.baseBetMinor)||!minor(outcome.totalBetMinor)||!feature.anteValues.includes(outcome.ante))throw new TypeError('The public Charging receipt is incomplete.');
  return {current,before,after,winning,ante:outcome.ante,baseBetMinor:outcome.baseBetMinor,totalBetMinor:outcome.totalBetMinor,paidSpins:outcome.carryAfter.paidSpins};
}
