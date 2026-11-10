const IDS=new Set(['multihot100_native','habeshafortune5_native','multihotwildways_native','multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native','coinminer_native']);
const integer=value=>typeof value==='string'&&/^[1-9]\d{0,18}$/.test(value);
const minor=value=>{if(typeof value!=='string'||!/^(0|[1-9]\d*)\.\d{2}$/.test(value))return null;return BigInt(value.replace('.',''));};
// A confirmed active receipt owns locked controls after reload/recovery.
// Next-round choices and disconnected, foreign or malformed receipts stay put.
// Only existing server-supplied options can be selected; none are invented.
export function restoreAcceptedControls(state,game,ui){
 const round=state?.round;
 if(!IDS.has(game?.id)||state.connected!==true||state.authenticated!==true||state.error===true||typeof state.sessionId!=='string'||!state.sessionId||round?.status!=='active'||round.game_id!==game.id||!integer(round.stakeMinor))return false;
 if(round.model_version!==undefined&&round.model_version!==game.version)return false;
 const option=[...(ui.stake?.options||[])].find(o=>minor(o.value)===BigInt(round.stakeMinor));
 if(!option)return false;
 let mineOption=null;
 if(game.id==='coinminer_native'){
  if(!Number.isInteger(round.mines)||round.mines<1||round.mines>24)return false;
  mineOption=[...(ui.mines?.options||[])].find(o=>o.value===String(round.mines));
  if(!mineOption)return false;
 }
 let changed=false;
 if(ui.stake.value!==option.value){ui.stake.value=option.value;changed=true;}
 if(mineOption&&ui.mines.value!==mineOption.value){ui.mines.value=mineOption.value;changed=true;}
 return changed;
}
