// Test-only fresh contexts. Production must load the latest accepted bucket
// under the retained transaction guard; it must never default an existing
// player's bucket to this helper's empty state.
import {chargingCarryBucket,emptyChargingCarry} from '../../math/charging-wilds.mjs';
export function freshChargingContext(d,totalBetMinor,options={}){
  return d.chargingFeature?{bucket:chargingCarryBucket(d,totalBetMinor,options),priorCarry:emptyChargingCarry()}:undefined;
}
export function chargingGridRng(d,grid,priorWilds=[],extra=[]){
  const locked=new Set(priorWilds.map(wild=>wild.row+':'+wild.col));
  const draws=[];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)if(!locked.has(row+':'+col)){
    const id=grid[row][col];draws.push(id===d.wildSymbol.id?d.symbols.length*32:d.symbols.findIndex(symbol=>symbol.id===id));
  }
  draws.push(...extra);let i=0;
  const rng=bound=>{
    if(i>=draws.length)throw new Error('Charging fixture exhausted.');
    const value=draws[i++];if(!Number.isInteger(value)||value<0||value>=bound)throw new Error('Invalid Charging fixture draw.');return value;
  };
  rng.remaining=()=>draws.length-i;return rng;
}
export function chargingLoseThenWinFixtures(d){
  const s=d.symbols.map(symbol=>symbol.id),w=d.wildSymbol.id;
  return{firstGrid:[[w,s[0],s[1]],[s[2],s[3],s[4]],[s[5],s[6],s[0]]],
    secondGrid:[[w,s[0],s[0]],[s[1],s[2],s[3]],[s[4],s[5],s[6]]]};
}
