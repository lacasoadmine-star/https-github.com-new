import {moneyMinor} from './session.mjs';

const ordinaryStakes=['0.10','0.20','0.50','1.00','2.00','5.00','10.00','20.00','50.00','100.00','200.00','500.00'];

export function stakeChoices(game){
 const fixed=Array.isArray(game.stakeValues)?game.stakeValues:Array.isArray(game.stakes)?game.stakes:null;
 const minimum=moneyMinor(game.minStake),maximum=moneyMinor(game.maxStake);
 const candidates=fixed??[...ordinaryStakes,game.minStake,game.maxStake];
 return [...new Set(candidates.filter(value=>{
  const amount=moneyMinor(value);
  return amount!==null&&amount>0n&&(minimum===null||amount>=minimum)&&(maximum===null||amount<=maximum);
 }))].sort((a,b)=>moneyMinor(a)<moneyMinor(b)?-1:moneyMinor(a)>moneyMinor(b)?1:0);
}

export function mineChoices(control){
 if(!control||typeof control!=='object')return [];
 const minimum=Math.max(1,Number.isInteger(control.min)?control.min:1);
 const maximum=Math.min(24,Number.isInteger(control.max)?control.max:24);
 const supplied=Array.isArray(control.values)?control.values:Array.isArray(control.choices)?control.choices:null;
 const candidates=supplied??Array.from({length:Math.max(0,maximum-minimum+1)},(_,i)=>minimum+i);
 return [...new Set(candidates.filter(value=>Number.isInteger(value)&&value>=minimum&&value<=maximum))].sort((a,b)=>a-b).map(String);
}

export function selectedChoice(choices,previous,fallback){
 return choices.includes(previous)?previous:choices.includes(String(fallback))?String(fallback):choices[0]??'';
}
