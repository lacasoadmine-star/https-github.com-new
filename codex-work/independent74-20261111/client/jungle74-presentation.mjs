// Jungle free spins are a completed server transcript. Presentation validates
// its public geometry and labels; it never selects a multiplier or an outcome.
export const isJungleFeature=definition=>definition?.slotMechanic==='jungle-free-spins'&&!!definition.jungleFeature;
const minor=value=>typeof value==='string'&&/^(0|[1-9][0-9]*)$/.test(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const pointKey=point=>point.row+':'+point.col;

export function junglePublicFrames(definition,round){
  if(!round)return [];
  const feature=definition?.jungleFeature,outcome=round.outcome;
  if(!isJungleFeature(definition)||outcome?.featureType!=='jungle-free-spins'||!Array.isArray(outcome.bonusFrames)||!integer(feature.maximumFrames)||feature.maximumFrames<1||outcome.bonusFrames.length>feature.maximumFrames)throw new TypeError('A complete public Jungle transcript is required.');
  const rows=definition.rows,columns=definition.cols;
  const symbols=new Set([...definition.symbols,definition.wildSymbol,definition.scatterSymbol].filter(Boolean).map(symbol=>symbol.id));
  const point=value=>value&&integer(value.row)&&value.row<rows&&integer(value.col)&&value.col<columns;
  const positions=values=>Array.isArray(values)&&values.every(point)&&new Set(values.map(pointKey)).size===values.length;
  const grid=values=>Array.isArray(values)&&values.length===rows&&values.every(row=>Array.isArray(row)&&row.length===columns&&row.every(id=>symbols.has(id)));
  const lines=values=>Array.isArray(values)&&values.every(line=>symbols.has(line.symbolId)&&positions(line.positions)&&minor(line.winMinor));
  if(!grid(outcome.initialGrid)||!grid(outcome.grid)||!lines(outcome.baseLineWins)||!minor(outcome.baseAwardMinor)||!minor(outcome.totalAwardMinor)||outcome.freeSpinsPlayed!==outcome.bonusFrames.length)throw new TypeError('The public Jungle base board is incomplete.');
  const selected=outcome.selectedBonusMultipliers;
  if(!Array.isArray(selected)||selected.some(value=>!integer(value)||value<1||Array.isArray(feature.multiplierValues)&&!feature.multiplierValues.includes(value)))throw new TypeError('The public Jungle multiplier selection is incomplete.');
  if(outcome.bonusFrames.length&&Number.isInteger(feature.selectedMultiplierCount)&&(selected.length!==feature.selectedMultiplierCount||new Set(selected).size!==selected.length))throw new TypeError('The public Jungle multiplier selection must have the published unique values.');
  if(round.status==='active'&&(!minor(round.pendingWinMinor)||BigInt(round.pendingWinMinor)===0n))throw new TypeError('An active Jungle receipt must contain a confirmed held win.');
  for(const [index,frame]of outcome.bonusFrames.entries()){
    if(frame.index!==index+1||!grid(frame.grid)||!lines(frame.lineWins)||!integer(frame.scatterCount)||frame.scatterCount>rows*columns||!integer(frame.freeSpinsRemaining)||frame.freeSpinsRemaining>feature.maximumFrames||!selected.includes(frame.spinMultiplier))throw new TypeError('A matching public Jungle free-spin frame is required.');
    if(['regularAwardMinor','scatterAwardMinor','rawAwardMinor','awardMinor','totalAwardMinor'].some(name=>!minor(frame[name]))||BigInt(frame.awardMinor)>BigInt(frame.rawAwardMinor))throw new TypeError('The public Jungle award labels are inconsistent.');
    if(frame.originalGrid!==undefined&&!grid(frame.originalGrid))throw new TypeError('The public Jungle original grid is invalid.');
    if(frame.expandedColumns!==undefined&&(!Array.isArray(frame.expandedColumns)||new Set(frame.expandedColumns).size!==frame.expandedColumns.length||frame.expandedColumns.some(col=>!integer(col)||col>=columns)))throw new TypeError('The public Jungle expanded columns are invalid.');
  }
  const last=outcome.bonusFrames.at(-1),final=last?.grid??outcome.initialGrid;
  if(JSON.stringify(outcome.grid)!==JSON.stringify(final))throw new TypeError('The public Jungle final board changed.');
  if(outcome.freeSpinsCancelledAtMaximum!==undefined&&!integer(outcome.freeSpinsCancelledAtMaximum))throw new TypeError('The public Jungle cancelled-spin count is invalid.');
  return outcome.bonusFrames;
}
