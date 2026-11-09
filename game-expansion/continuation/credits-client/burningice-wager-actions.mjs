// The two reviewed legacy titles use the captured vertical bet carousel.
// This adapter emits a configured stake to the existing session.start path.
// It does not generate outcomes, change balances, or open a release gate.
export const BURNING_ICE_PAIR_IDS=Object.freeze(['burningice10_native','burningice40_native']);
export const supportsBurningIcePair=id=>BURNING_ICE_PAIR_IDS.includes(id);
const amount=value=>typeof value==='string'&&/^(0|[1-9]\d{0,9})\.\d{2}$/.test(value)?BigInt(value.replace('.','')):null;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

export function burningIcePairWagerView(game,state,selected,{canStart=false}={}){
 if(!supportsBurningIcePair(game?.id)||state?.game?.id!==game.id||state.game.version!==game.version||
    typeof game.version!=='string'||!game.version||typeof state.sessionId!=='string'||!state.sessionId)return null;
 const values=game.stakeValues;
 if(!Array.isArray(values)||values.length<2||values.length>256||values.some((v,i)=>amount(v)===null||amount(v)<=0n||i>0&&amount(v)<=amount(values[i-1])))return null;
 const index=values.indexOf(selected);if(index<0)return null;
 const round=state.round??null;
 if(round&&(round.game_id!==game.id||round.model_version!==game.version||typeof round.round_id!=='string'||!round.round_id||
    !Number.isSafeInteger(round.version)||round.version<0||!['active','settled'].includes(round.status)))return null;
 const ready=canStart===true&&state.connected===true&&state.authenticated===true&&state.accepting===true&&game.launchable===true&&
  !state.busy&&!state.pending&&!state.confirming&&!state.recoveryBlocked&&!state.error&&!state.otherActiveGame&&round?.status!=='active';
 const next=values[index+1]??null,previous=values[index-1]??null;
 return freeze({gameId:game.id,selected,next,previous,ready,
  pin:{gameId:game.id,modelVersion:game.version,sessionId:state.sessionId,selected,values:[...values],
   round:round?{id:round.round_id,version:round.version,status:round.status}:null},
  controls:{startNext:{enabled:ready&&next!==null,stake:next},startPrevious:{enabled:ready&&previous!==null,stake:previous}},
 });
}

export function createBurningIcePairIntent(view,action){
 if(!view?.controls?.[action]?.enabled||!['startNext','startPrevious'].includes(action))return null;
 return freeze({kind:'burningice-pair-neighbor',action,pin:structuredClone(view.pin)});
}

export function resolveBurningIcePairIntent(intent,game,state,selected,options){
 if(intent?.kind!=='burningice-pair-neighbor'||!['startNext','startPrevious'].includes(intent.action))return null;
 const view=burningIcePairWagerView(game,state,selected,options),control=view?.controls[intent.action];
 if(!control?.enabled||JSON.stringify(intent.pin)!==JSON.stringify(view.pin))return null;
 // Resolve from the current configured ladder, never a DOM-provided amount.
 return {stake:control.stake,gameId:game.id,modelVersion:game.version,sessionId:state.sessionId};
}
