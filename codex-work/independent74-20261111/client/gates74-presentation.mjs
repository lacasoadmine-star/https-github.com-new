// Gates UI reads completed public frames. No probability, draw, award or wallet
// evaluator lives here; money arithmetic below describes the already-visible
// total stake and feature cost before a request is submitted.
export const isGatesTumble=definition=>definition?.slotMechanic==='tumble'&&!!definition.tumbleFeature;
export {featureStakePreview as gatesStakePreview,featureModeTotal as gatesModeTotal} from './paid74-feature.mjs';
const MINOR=/^\d{1,24}$/;
const key=position=>position.row+':'+position.col;

export function gatesPublicFrames(definition,round){
  if(!round)return [];
  const feature=definition?.tumbleFeature,outcome=round.outcome,rows=definition.rows,columns=definition.cols;
  const limit=feature?.processingSafety?.maximumBoards??definition.layout?.maximumBoards;
  if(!isGatesTumble(definition)||!Number.isSafeInteger(limit)||limit<1||limit>2048||round.status==='active'||outcome?.featureType!=='tumble-free-spins'||outcome.settlement!=='single-final-credit'||!Array.isArray(outcome.spins)||!outcome.spins.length||outcome.spins.length>limit)throw new TypeError('A completed public Gates transcript is required.');
  const regular=new Set(definition.symbols.map(symbol=>symbol.id));
  const symbols=new Set([...regular,definition.scatterSymbol?.id,definition.magicSymbol?.id,definition.multiplierSymbol?.id]);
  const point=p=>p&&Number.isInteger(p.row)&&p.row>=0&&p.row<rows&&Number.isInteger(p.col)&&p.col>=0&&p.col<columns;
  const grid=board=>Array.isArray(board)&&board.length===rows&&board.every(row=>Array.isArray(row)&&row.length===columns&&row.every(id=>symbols.has(id)));
  const positions=list=>Array.isArray(list)&&list.every(point)&&new Set(list.map(key)).size===list.length;
  const validateMultipliers=(board,list)=>{
    if(!positions(list)||list.some(item=>board[item.row][item.col]!==definition.multiplierSymbol.id||!feature.multiplierValues.includes(item.value))||list.length!==board.flat().filter(id=>id===definition.multiplierSymbol.id).length)throw new TypeError('The public Gates multiplier labels do not match their cells.');
  };
  const result=[];
  for(const [spinIndex,spin]of outcome.spins.entries()){
    if(spin.index!==spinIndex||spin.phase!==(spinIndex?'free':'base')||!Array.isArray(spin.frames)||!spin.frames.length||!grid(spin.grid)||!MINOR.test(spin.awardMinor)||!MINOR.test(spin.totalAwardMinor))throw new TypeError('A complete public Gates spin is required.');
    if(spin.carpet&&(!Number.isSafeInteger(spin.carpet.cloudCount)||spin.carpet.cloudCount!==spin.carpet.positions?.length||!positions(spin.carpet.positions)||spin.carpet.positions.some(p=>!symbols.has(p.symbolId)||p.symbolId===definition.multiplierSymbol?.id&&!feature.multiplierValues.includes(p.value))))throw new TypeError('Matching public carpet transformation cells are required.');
    for(const [frameIndex,frame]of spin.frames.entries()){
      if(result.length>=limit||frame.index!==frameIndex||!grid(frame.grid)||!['tumble','magic','end','maximum-award','processing-maximum-award'].includes(frame.action)||!Array.isArray(frame.winningGroups)||!positions(frame.removedPositions)||!Array.isArray(frame.refills)||!MINOR.test(frame.rawAwardMinor)||!MINOR.test(frame.sequenceRawAwardMinor))throw new TypeError('A complete public Gates frame is required.');
      validateMultipliers(frame.grid,frame.multiplierSymbols);
      if(frame.winningGroups.some(group=>!regular.has(group.symbolId)||!positions(group.positions)||group.count!==group.positions.length||group.positions.some(p=>frame.grid[p.row][p.col]!==group.symbolId)||!MINOR.test(group.awardMinor)))throw new TypeError('The public Gates winning positions do not match their symbols.');
      if(!positions(frame.refills)||frame.refills.some(item=>!symbols.has(item.symbolId)||item.symbolId===definition.multiplierSymbol.id&&!feature.multiplierValues.includes(item.value)))throw new TypeError('Matching public Gates refills are required.');
      if(frame.action==='magic'&&(!point(frame.magic?.orb)||!point(frame.magic?.target)||frame.grid[frame.magic.orb.row][frame.magic.orb.col]!==definition.magicSymbol.id||!regular.has(frame.grid[frame.magic.target.row][frame.magic.target.col])))throw new TypeError('Matching public MAGIC targets are required.');
      result.push({spin,frame,spinIndex,frameIndex,index:result.length});
    }
    if(JSON.stringify(spin.grid)!==JSON.stringify(spin.frames.at(-1).grid))throw new TypeError('The public Gates final spin grid changed.');
  }
  if(!grid(outcome.initialGrid)||JSON.stringify(outcome.initialGrid)!==JSON.stringify(outcome.spins[0].frames[0].grid)||!grid(outcome.grid)||JSON.stringify(outcome.grid)!==JSON.stringify(outcome.spins.at(-1).grid))throw new TypeError('The public Gates initial or final grid changed.');
  return result;
}
