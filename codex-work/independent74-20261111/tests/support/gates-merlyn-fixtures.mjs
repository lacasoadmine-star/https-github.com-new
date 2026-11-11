// Test-only bounded integer draws. The deployed game never accepts this trace
// or any seed from a player. Values deliberately force documented transitions.
export const regularBoard=()=>Array.from({length:30},(_,i)=>i%9);
export function boardDraws(cells){
  return cells.flatMap(cell=>cell==='S'?[288]:cell==='X'?[297]:
    cell&&typeof cell==='object'?[296,cell.multiplierIndex]:[cell]);
}
export function finiteDraws(values){
  let index=0;
  const rng=bound=>{
    if(index>=values.length)throw new Error('The deterministic fixture ran out of server draws.');
    const value=values[index++];
    if(!Number.isSafeInteger(value)||value<0||value>=bound)throw new Error('Fixture draw '+value+' is outside bound '+bound+' at '+index);
    return value;
  };
  rng.remaining=()=>values.length-index;
  return rng;
}

export function gatesMagicFixture(){
  const board=Array.from({length:30},(_,i)=>i===0?'X':i<=7?0:1+(i-8)%8);
  return{betMinor:'100',options:{mode:'base'},draws:[...boardDraws(board),7,0,1,...Array.from({length:8},(_,i)=>i)]};
}

export function gatesBonusFeatureFixture(){
  const firstFree=Array.from({length:30},(_,i)=>i<3?'S':i===3?{multiplierIndex:0}:i<12?0:1+(i-12)%8);
  const secondFree=Array.from({length:30},(_,i)=>i===0?{multiplierIndex:1}:i<=8?0:1+(i-9)%8);
  const losingMultiplier=regularBoard();losingMultiplier[0]={multiplierIndex:16};
  return{betMinor:'10000',options:{mode:'buy100'},draws:[
    ...boardDraws(regularBoard()),0,0,0,0,
    ...boardDraws(firstFree),...Array.from({length:8},(_,i)=>i),
    ...boardDraws(secondFree),...Array.from({length:8},(_,i)=>i),
    ...gatesMagicFixture().draws,
    ...boardDraws(losingMultiplier),
    ...Array.from({length:16},()=>boardDraws(regularBoard())).flat(),
  ]};
}
