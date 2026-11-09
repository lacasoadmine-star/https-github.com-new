import {moneyMinor} from './session.mjs';
export function paidMode(game,value='base'){
 const modes=game?.controls?.paidModes||[{id:'base',label:'Base game',multiplier:1}];
 return modes.find(mode=>(mode.id==='feature'?'feature:'+mode.feature:mode.id)===value)||modes.find(mode=>mode.id==='base');
}
export function roundRequest(game,baseStake,{mode='base',lines,mines,risk=false,automatic=false}={}){
 const base=moneyMinor(baseStake);if(base===null||base<=0n)throw Error('Choose a valid stake.');
 const selected=paidMode(game,mode);if(!selected||(selected.id==='feature'?'feature:'+selected.feature:selected.id)!==mode||!Number.isSafeInteger(selected.multiplier)||selected.multiplier<1)throw Error('This game mode is unavailable.');
 if(selected.baseMinMinor&&base<BigInt(selected.baseMinMinor)||selected.baseMaxMinor&&base>BigInt(selected.baseMaxMinor))throw Error('Choose a base stake within the limits for this mode.');
 const total=base*BigInt(selected.multiplier),minimum=moneyMinor(game.minStake),maximum=moneyMinor(game.maxStake);
 if(minimum===null||maximum===null||total<minimum||total>maximum)throw Error('Total cost is outside this game’s stake limits.');
 const options={};
 if(selected.id!=='base')options.mode=selected.id;
 if(selected.feature)options.feature=selected.feature;
 if(game.controls?.lines){const value=Number(lines??game.controls.lines.default);if(!game.controls.lines.values.includes(value))throw Error('Choose an available number of paylines.');options.lines=value;}
 if(game.controls?.mines){const value=Number(mines);if(!Number.isInteger(value))throw Error('Choose the mine count.');options.mines=value;}
 if(game.controls?.risk?.supported)options.risk=automatic?false:risk===true;
 if(game.controls?.automaticCollectionOption==='autoCollect')options.autoCollect=automatic===true;
 // Request amounts use the server's decimal grammar. Display formatting may
 // insert thousands separators and must never serialize a wager.
 const stake=(total/100n).toString()+'.'+(total%100n).toString().padStart(2,'0');
 return {stake,options,baseStake,totalMinor:String(total),label:selected.label};
}
