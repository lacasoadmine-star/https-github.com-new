// Deterministic local branch fixtures only. Never official-demo round evidence.
export function coinsBaseTickets(d,grid){
  const values=[],regular=d.symbols.length*32;
  for(let row=0;row<d.rows;row++)for(let col=0;col<d.cols;col++){
    const cell=grid[row][col],eligible=d.wildRule.columns.includes(col);
    if(typeof cell==='string'){
      const index=d.symbols.findIndex(symbol=>symbol.id===cell);
      if(index>=0)values.push(index);
      else if(cell===d.wildSymbol.id&&eligible)values.push(regular);
      else throw Error('Unknown base fixture symbol.');
    }else{
      const offset=regular+(eligible?1:0);
      if(cell.kind==='major')values.push(offset+18);
      else if(cell.kind==='mini')values.push(offset+16);
      else if(cell.kind==='regular')values.push(offset,d.coinFeature.regularValues.indexOf(cell.multiplier));
      else throw Error('Unknown base fixture coin.');
    }
  }
  return values;
}
export function coinsNoWinGrid(d){return Array.from({length:d.rows},(_,r)=>Array.from({length:d.cols},(_,c)=>d.symbols[(r*2+c)%d.symbols.length].id));}
export function fiveMajorGrid(d){const grid=coinsNoWinGrid(d);for(let col=0;col<5;col++)grid[0][col]={kind:'major'};return grid;}
export function coinsMaximumBase(d){
  const best=d.symbols.reduce((a,b)=>a.pays[5]>b.pays[5]?a:b);
  const grid=Array.from({length:d.rows},()=>Array(d.cols).fill(best.id));
  for(const col of [1,2,3])grid[0][col]=d.wildSymbol.id;
  let coins=0;
  for(let row=1;row<d.rows;row++)for(const col of [1,2,3])if(coins++<5)grid[row][col]={kind:'major'};
  return grid;
}
export function coinFixtureRng(values){
  let index=0;
  const rng=bound=>{if(index>=values.length)throw Error('Unexpected fixture RNG request.');const value=values[index++];if(value<0||value>=bound)throw Error('Fixture RNG draw outside bound.');return value;};
  rng.consumed=()=>index;
  return rng;
}
