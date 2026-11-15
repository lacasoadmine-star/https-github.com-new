// ONLY for automated QA and localhost interaction previews. Never deploy this
// module as a wallet, RNG, game rules or monetary settlement component.
import {findGame} from './catalog.mjs';
const rowSymbols=['🍉','🍋','🍒','🔔','⭐','💎','7','🍇','🟢','🌞','🔷'];
const sets={
 samurai:['⚔️','🥷','🏯','🌸','🗡️','🎴','🀄'],
 dice_jungle:['🦁','🐘','🦒','🦩','🐯','🎲','🌿'],
 jingle_bell_bonanza:['🔔','🎄','❄️','🎁','🦌','⭐','🧦'],
 cai_balao_cappadocia:['🎈','🟡','🔵','🟣','🌤️','🔴']
};
export function fixtureFor(id,sequence=1,mode){
 const game=findGame(id);if(!game)throw Error('Unknown fixture game');
 const family=game.family==='hybrid'?(mode||'slot'):game.family;
 const index=Math.max(1,Math.trunc(sequence));
 const result={source:'qa-fixture',gameId:id,id:id+'-qa-'+index+(mode?'-'+mode:'')};
 if(family==='crash'){
  const crashAtMs=2600+(index%4)*850;
  result.series=Array.from({length:Math.floor(crashAtMs/200)+1},(_,i)=>[i*200,Math.round((1+i*.06+(index%3)*.01)*100)/100]);
  result.crashAtMs=crashAtMs;
 }else if(family==='slot'){
  const symbolSet=sets[id]||rowSymbols;
  const cols=game.family==='hybrid'?3:game.grid?.[0]||5;
  const rows=game.family==='hybrid'?1:game.grid?.[1]||3;
  result.reels=Array.from({length:cols},(_,x)=>Array.from({length:rows},(_,y)=>symbolSet[(index+x*2+y*3)%symbolSet.length]));
  result.durationMs=1450+(index%4)*180;
  result.multiplier=(index%5===0)?3:(index%3===0?1.5:0);
 }else if(family==='mines'){
  result.hazards=Array.from({length:25},(_,i)=>(i+index*3)%7===0);
  result.multipliers=Array.from({length:26},(_,i)=>+(1+i*.2).toFixed(2));
 }else if(family==='path'){
  result.steps=Array.from({length:8},(_,i)=>({options:Array.from({length:id==='chicken_ways'?3:2},(_,j)=>(i+j+index)%4!==0),multiplier:+(1+(i+1)*.35).toFixed(2)}));
 }else if(family==='plinko'){
  result.path=Array.from({length:12},(_,i)=>(i*7+index+i%3)%2);
  result.multiplier=+(1+index%5*.55).toFixed(2);
  result.stepMs=175;
 }else if(family==='wheel'||family==='roulette'){
  result.segments=family==='roulette'?['RED','BLACK','GOLD','RED','BLACK','GOLD','RED','BLACK']:['1×','2×','3×','5×','10×','1×','2×','8×','20×','3×'];
  result.index=index%result.segments.length;
  result.durationMs=1550+(index%5)*220;
 }else if(family==='cascade'){
  result.frames=Array.from({length:5},(_,i)=>({grid:Array.from({length:5},(_,r)=>Array.from({length:6},(_,c)=>{
    if(i===0&&r<2&&c<4)return '🟠';return rowSymbols[(r*6+c+i*3+index)%rowSymbols.length];
  })),multiplier:+(1+i*.5).toFixed(2)}));
  result.stepMs=530;
 }else if(family==='tower'){
  result.levels=Array.from({length:8},(_,i)=>({multiplier:+(1+(i+1)*.45).toFixed(2),safe:i!==5}));
  result.stepMs=620;
 }
 return result;
}