// Finite server-draw fixtures only. No client seed or trace is accepted by the game.
export const genieRegularBoard=()=>Array.from({length:30},(_,i)=>i%10);
export const genieBoardDraws=cells=>cells.flatMap(cell=>cell==='S'?[320]:
  cell&&typeof cell==='object'?[328,cell.multiplierIndex]:[cell]);
const winning=multiplierIndex=>Array.from({length:30},(_,i)=>i<8?0:i===8?{multiplierIndex}:1+(i-9)%9);
const refill=()=>Array.from({length:8},(_,i)=>i);

export function genieBonusFeatureFixture(){
  const retrigger=genieRegularBoard();retrigger[0]='S';retrigger[1]='S';retrigger[2]='S';retrigger[3]={multiplierIndex:20};
  return{betMinor:'10000',options:{mode:'buy100'},draws:[
    ...genieBoardDraws(genieRegularBoard()),0,0,0,0,
    63,...genieBoardDraws(winning(0)),...refill(),
    63,...genieBoardDraws(winning(1)),...refill(),
    63,...genieBoardDraws(retrigger),
    ...Array.from({length:12},()=>[63,...genieBoardDraws(genieRegularBoard())]).flat(),
  ]};
}

export function genieCarpetFixture(){
  return{betMinor:'10000',options:{mode:'buy100'},draws:[
    ...genieBoardDraws(genieRegularBoard()),0,0,0,0,
    // Trigger, four clouds, chosen regular0. Each picks the first unused cell
    // and resolves to the selected regular symbol, without another cell draw.
    0,0,0,0,1,0,1,0,1,0,1,
    ...genieBoardDraws(Array.from({length:26},(_,i)=>i<4?0:1+(i-4)%9)),...refill(),
    ...Array.from({length:9},()=>[63,...genieBoardDraws(genieRegularBoard())]).flat(),
  ]};
}
