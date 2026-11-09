// Captured ordinary94 config/runtime: visual effects only, never outcomes.
export const COIN_COMPLETION_REFERENCE=Object.freeze({
 configSha256:'bf6da7d6d24be9cb081bc287234fb0870fca942de7ed66b1468932d82f308999',
 runtimeSha256:'cf80c61777289229fe02429fe400d7f3360c8609074022d482b1e652ff4750e5',
 resetMinMs:100,resetMaxMs:400,badgeDurationMs:2000,badgeKeys:Object.freeze([0,.2,.6,1]),
});
const durations=new WeakMap();
const money=value=>typeof value==='string'&&/^(0|[1-9]\d*)$/.test(value);
const identity=(round,manifest)=>round&&(round.game_id??round.gameId)===manifest.id&&(round.model_version??round.modelVersion)===manifest.modelVersion&&typeof round.round_id==='string'&&!!round.round_id&&Number.isSafeInteger(round.version)&&round.version>=0;
const validPicks=picks=>Array.isArray(picks)&&picks.length<=24&&picks.every((pick,index)=>pick&&Number.isInteger(pick.index)&&pick.index>=0&&pick.index<25&&typeof pick.safe==='boolean'&&picks.findIndex(other=>other?.index===pick.index)===index);
const samePick=(a,b)=>a?.index===b?.index&&a?.safe===b?.safe&&(a?.treasureBoost===true)===(b?.treasureBoost===true);
const samePicks=(a,b)=>a.length===b.length&&a.every((pick,index)=>samePick(pick,b[index]));
function sourceLayout(manifest){
 const tiles=manifest?.layout?.tiles,reset=tiles?.start_anim,badge=tiles?.multiplier_item;
 return manifest?.id==='coinminer_native'&&manifest.controls?.referenceVariant==='coin_miner_94'&&
  manifest.sourceRefs?.some(source=>source.id==='coinminer_config'&&source.sha256===COIN_COMPLETION_REFERENCE.configSha256)&&
  manifest.sourceRefs?.some(source=>source.id==='coinminer_runtime'&&source.sha256===COIN_COMPLETION_REFERENCE.runtimeSha256)&&
  tiles?.tile_width===60&&tiles.tile_height===60&&reset?.duration===.1&&reset.duration_2===.4&&reset.infinite===false&&
  badge?.anim?.duration===2&&badge.anim.infinite===false&&JSON.stringify(badge.anim.key_frames)===JSON.stringify([{pos:0,alpha:-1},{pos:.2},{pos:.6},{pos:1,alpha:-1}]);
}
function multiplierLabel(value){
 const string=String(value);
 if(!/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(string))return null;
 const [whole,fraction='']=string.split('.');return '×'+whole+'.'+fraction.padEnd(2,'0');
}
function resetTimes(manifest,random){
 if(durations.has(manifest))return durations.get(manifest);
 const values=Array.from({length:25},()=>{const sample=random();if(!Number.isFinite(sample)||sample<0||sample>=1)throw Error('INVALID_VISUAL_RANDOM');return 100+sample*300;});
 durations.set(manifest,Object.freeze(values));return values;
}
function preparePending(scene,manifest,snapshot){
 const pick=snapshot?.pendingCoinPick,round=snapshot?.round;
 if(snapshot?.confirmed!==true||snapshot.authenticated!==true||snapshot.pending!==true||!pick||!identity(round,manifest)||round.status!=='active'||!validPicks(round.picks)||
  typeof snapshot.sessionId!=='string'||!snapshot.sessionId||pick.sessionId!==snapshot.sessionId||pick.roundId!==round.round_id||pick.modelVersion!==manifest.modelVersion||pick.version!==round.version||
  !Number.isInteger(pick.index)||pick.index<0||pick.index>=25||round.picks.some(accepted=>accepted.index===pick.index)||!Number.isFinite(pick.startedAt)||pick.startedAt<0)return scene;
 return {...scene,coinPendingTile:Object.freeze({sessionId:pick.sessionId,roundId:pick.roundId,modelVersion:pick.modelVersion,version:pick.version,index:pick.index,startedAt:pick.startedAt,sourceSha256:COIN_COMPLETION_REFERENCE.configSha256})};
}
export function prepareCoinCompletionTransition(scene,manifest,previous,next,prior=null,{visualRandom=Math.random}={}){
 if(!sourceLayout(manifest)||scene?.gameId!==manifest.id)return scene;
 scene=preparePending(scene,manifest,next);
 const before=previous?.round,after=next?.round;
 if(previous?.confirmed!==true||previous.authenticated!==true||next?.confirmed!==true||next.authenticated!==true||typeof previous.sessionId!=='string'||!previous.sessionId||previous.sessionId!==next.sessionId||
  !identity(before,manifest)||!identity(after,manifest)||scene.confirmedReceiptId!==after.round_id||!validPicks(before.picks)||!validPicks(after.picks))return scene;
 if(prior?.kind==='coin-native-board-reset'&&prior.sessionId===next.sessionId&&prior.roundId===after.round_id&&prior.modelVersion===manifest.modelVersion&&prior.receiptVersion===after.version&&before.round_id===after.round_id&&before.version===after.version&&samePicks(before.picks,after.picks))return {...scene,arcadeTransition:prior};
 if(before.round_id!==after.round_id){
  if(before.status!=='settled'||after.status!=='active'||after.version!==0||after.picks.length||!before.picks.length)return scene;
  const values=resetTimes(manifest,visualRandom);
  return {...scene,arcadeTransition:Object.freeze({kind:'coin-native-board-reset',sessionId:next.sessionId,roundId:after.round_id,receiptVersion:after.version,modelVersion:manifest.modelVersion,
   tiles:Object.freeze(before.picks.map(pick=>Object.freeze({index:pick.index,durationMs:values[pick.index]}))),sourceSha256:COIN_COMPLETION_REFERENCE.configSha256})};
 }
 if(prior?.kind==='coin-native-multiplier-label'&&prior.sessionId===next.sessionId&&prior.roundId===after.round_id&&prior.modelVersion===manifest.modelVersion&&prior.receiptVersion===after.version&&before.version===after.version&&samePicks(before.picks,after.picks))return {...scene,arcadeTransition:prior};
 if(scene.arcadeTransition===prior&&prior?.multiplierLabel)return scene;
 if(before.status!=='active'||after.version!==before.version+1||after.picks.length!==before.picks.length+1||!before.picks.every((pick,index)=>samePick(pick,after.picks[index])))return scene;
 const last=after.picks.at(-1),label=multiplierLabel(after.multiplier);
 if(!label||!last||!money(after.currentCashoutMinor))return scene;
 // The source emits tile_opened only for a nonterminal response. Final safe
 // and mine responses emit game_won / game_lost instead, without this label.
 if(!last.safe||after.status!=='active')return scene;
 const previousEffect=scene.arcadeTransition;
 return {...scene,arcadeTransition:Object.freeze({...previousEffect,kind:previousEffect?.kind??'coin-native-multiplier-label',sessionId:next.sessionId,roundId:after.round_id,receiptVersion:after.version,modelVersion:manifest.modelVersion,pickIndex:last.index,multiplierLabel:label,sourceSha256:COIN_COMPLETION_REFERENCE.configSha256})};
}
const alphaColor=(color,alpha,fallback)=>{const match=typeof color==='string'&&color.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\s*\)$/);return match?`rgba(${match[1]},${match[2]},${match[3]},${alpha})`:`rgba(${fallback},${alpha})`;};
function animatePending(scene,manifest,time){
 const pending=scene.coinPendingTile,tiles=scene.coinTiles??manifest.layout?.tiles;
 if(!pending||pending.roundId!==scene.confirmedReceiptId||pending.modelVersion!==manifest.modelVersion||pending.sourceSha256!==COIN_COMPLETION_REFERENCE.configSha256||!Number.isFinite(time)||time<pending.startedAt||
  tiles?.shake_anim?.duration!==1.5||tiles.shake_anim.infinite!==true)return scene;
 const p=((time-pending.startedAt)%1500)/1500,progress=p<=.5?p/.5:(1-p)/.5;
 let changed=false;const commands=scene.commands.map(command=>{
  if(command.role!=='coin-closed-half'||command.tileIndex!==pending.index)return command;changed=true;
  return {...command,box:{...command.box,x:command.box.x-2.5*progress,y:command.box.y-2.5*progress,width:command.box.width*(1+.1*progress),height:command.box.height*(1+.1*progress)},role:'coin-pending-half'};
 });
 return changed?{...scene,commands}:scene;
}
export function animateCoinCompletionScene(scene,manifest,elapsedMs,{time=globalThis.performance?.now()??0}={}){
 if(!sourceLayout(manifest))return scene;
 scene=animatePending(scene,manifest,time);
 const effect=scene.arcadeTransition;
 if(!effect||effect.roundId!==scene.confirmedReceiptId||effect.modelVersion!==manifest.modelVersion||effect.sourceSha256!==COIN_COMPLETION_REFERENCE.configSha256||!Number.isFinite(elapsedMs)||elapsedMs<0)return scene;
 const tiles=scene.coinTiles??manifest.layout.tiles;
 if(effect.kind==='coin-native-board-reset'){
  if(!Array.isArray(effect.tiles))return scene;let changed=false;
  const commands=scene.commands.map(command=>{
   if(command.role!=='coin-closed-half')return command;
   const tile=effect.tiles.find(tile=>tile.index===command.tileIndex);
   if(!tile||!Number.isFinite(tile.durationMs)||tile.durationMs<100||tile.durationMs>=400||elapsedMs>=tile.durationMs)return command;
   const p=elapsedMs/tile.durationMs,scale=.5+.5*p,delta=tiles.start_anim.key_frames[0];changed=true;
   return {...command,box:{...command.box,x:command.box.x+delta.translate_x*(1-p),y:command.box.y+delta.translate_y*(1-p),width:command.box.width*scale,height:command.box.height*scale},opacity:.5+.5*p,role:'coin-reset-half'};
  });
  return changed?{...scene,commands}:scene;
 }
 if(!effect.multiplierLabel||elapsedMs>=2000)return scene;
 const tile=scene.commands.find(command=>['coin-confirmed-prize','coin-confirmed-mine'].includes(command.role)&&command.tileIndex===effect.pickIndex),style=tiles.multiplier_item;
 if(!tile||!style)return scene;
 const p=elapsedMs/2000,alpha=p<.2?p/.2:p<=.6?1:(1-p)/.4;
 if(alpha<=0)return scene;
 const target={x:tile.box.x+style.x,y:tile.box.y+style.y,width:style.width,height:style.height};
 const background={type:'rect',box:target,color:alphaColor(manifest.colors?.[style.bg_color],alpha,'2,130,53'),role:'coin-multiplier-badge',tileIndex:effect.pickIndex};
 const label={type:'text',text:effect.multiplierLabel,x:target.x+target.width/2,y:target.y+target.height/2,size:style.font_size,fontWeight:style.font_weight,fontFamily:'sans-serif',align:'center',color:alphaColor(manifest.colors?.[style.text_color],alpha,'255,255,255'),role:'coin-multiplier-label',tileIndex:effect.pickIndex};
 return {...scene,commands:[...scene.commands,background,label]};
}
