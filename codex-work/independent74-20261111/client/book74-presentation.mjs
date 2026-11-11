// A Book bonus is already resolved by the server. These checks cover only the
// public transcript's geometry and labels, never its probabilities or awards.
export const isBookFeature=definition=>definition?.slotMechanic==='book-free-spins'&&!!definition.bookFeature;
const minor=value=>typeof value==='string'&&/^(0|[1-9][0-9]*)$/.test(value);
const key=position=>position.row+':'+position.col;
export function bookPublicFrames(definition,round){
  if(!round)return [];
  const outcome=round.outcome,feature=definition?.bookFeature,rows=definition.rows,columns=definition.cols;
  if(!isBookFeature(definition)||round.status==='active'||outcome?.featureType!=='book-free-spins'||outcome.settlement!=='single-final-credit'||!Array.isArray(outcome.bonusFrames)||outcome.bonusFrames.length>feature.maximumBonusSpins)throw new TypeError('A completed public Book transcript is required.');
  const regular=new Set(definition.symbols.map(symbol=>symbol.id)),symbols=new Set([...regular,definition.bookSymbol.id]);
  const point=p=>p&&Number.isInteger(p.row)&&p.row>=0&&p.row<rows&&Number.isInteger(p.col)&&p.col>=0&&p.col<columns;
  const positions=list=>Array.isArray(list)&&list.every(point)&&new Set(list.map(key)).size===list.length;
  const board=grid=>Array.isArray(grid)&&grid.length===rows&&grid.every(row=>Array.isArray(row)&&row.length===columns&&row.every(id=>symbols.has(id)));
  const lines=list=>Array.isArray(list)&&list.every(line=>regular.has(line.symbolId)&&positions(line.positions)&&minor(line.winMinor));
  if(!board(outcome.initialGrid)||!board(outcome.grid)||!lines(outcome.baseLineWins)||!minor(outcome.baseAwardMinor)||outcome.freeSpinsPlayed!==outcome.bonusFrames.length)throw new TypeError('The public Book base board is incomplete.');
  for(const [index,frame]of outcome.bonusFrames.entries()){
    if(frame.index!==index+1||!board(frame.grid)||!board(frame.expandedGrid)||!regular.has(frame.selectedSymbolId)||frame.selectedSymbolId!==outcome.selectedSymbolId||!lines(frame.lineWins)||!lines(frame.expandedLineWins)||!positions(frame.expandedPositions)||!Array.isArray(frame.expandedColumns)||new Set(frame.expandedColumns).size!==frame.expandedColumns.length||frame.expandedColumns.some(col=>!Number.isInteger(col)||col<0||col>=columns))throw new TypeError('A matching public Book free-spin frame is required.');
    if(frame.expandedPositions.some(p=>!frame.expandedColumns.includes(p.col)||frame.expandedGrid[p.row][p.col]!==frame.selectedSymbolId)||['regularAwardMinor','scatterAwardMinor','expandingAwardMinor','awardMinor','totalAwardMinor'].some(name=>!minor(frame[name]))||!Number.isInteger(frame.freeSpinsRemaining)||frame.freeSpinsRemaining<0)throw new TypeError('The public Book expansion labels are inconsistent.');
  }
  const final=outcome.bonusFrames.at(-1)?.expandedGrid??outcome.initialGrid;
  if(JSON.stringify(final)!==JSON.stringify(outcome.grid))throw new TypeError('The public Book final board changed.');
  return outcome.bonusFrames;
}
