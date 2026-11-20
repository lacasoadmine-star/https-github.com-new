// Multi Hot 20: full independent frontend for EXISTING authenticated ZPLAY Player.
// Never implement slot RNG, payout maths, a new wallet or a "Play Demo" button.
// The same account & ledger that power the dashboard authorise every round.
import {GAME_ID,GameController} from './controller.mjs';
import {MultiHot20Scene} from './scene.mjs';
import {Session} from './session.mjs';
import {loadVerifiedAssets,createSoundEngine} from './assets.mjs';
const $=id=>document.getElementById(id);
const ui=Object.fromEntries(['reels','loading','balance','bet-value','win-value','multiplier-value','status','signin','retry','spin','bet','auto','turbo','sound','menu','rules','bet-dialog','bet-options','auto-dialog','auto-count','auto-start','auto-stop','menu-dialog','rules-dialog','paytable-text','history-dialog','history-text','sound-dialog','sound-on','sound-off','music-opt','menu-rules','menu-history','menu-sound'].map(id=>[id,$(id)]));
const returnPath='/new74/multi-hot-20/';
ui.signin.href='/?login=1&return='+encodeURIComponent(returnPath);
let resources=null,scene=null,sound=null,controller=null,assetsReady=false;
const session=new Session();
const live=()=>!document.hidden&&document.hasFocus();
const soundBridge={play:name=>sound?.play(name),pauseAll:()=>sound?.pauseAll(),resumeOptedInMusic:()=>sound?.resumeOptedInMusic()};
const savedSettings={effects:false,music:false};
function open(dialog){if(dialog&&!dialog.open)dialog.showModal()}
function showStatus(message){ui.status.textContent=String(message||'')}
function resultText(receipt){
 const rows=[];
 if(receipt){rows.push('Round: '+receipt.roundId,'BET: '+receipt.bet+' ETB','WIN: '+receipt.finalWin+' ETB','Multiplier: '+receipt.wheelMultiplier+'×');
  rows.push('Wallet after: '+receipt.walletReceipt.balanceAfter+' ETB')}
 return rows.length?rows.join('\n'):'No server-settled round in this Player session.';
}
function sync(){
 const state=controller?.status()??{phase:'loading',pending:false,lastReceipt:null},r=state.lastReceipt,account=controller?.account;
 ui.balance.textContent=account?.balance??session.account?.balance??'—';
 ui['bet-value'].textContent=account?state.bet:'—';
 ui['win-value'].textContent=r?.finalWin??'0.00';
 ui['multiplier-value'].textContent=r?.wheelMultiplier??'—';
 const spinning=state.phase==='spinning';
 const canStart=assetsReady&&state.phase==='ready'&&!state.pending&&live();
 ui.spin.textContent=spinning?'STOP':'SPIN';
 ui.spin.setAttribute('aria-label',spinning?'Stop reel animation':'Spin with authenticated ZPLAY account');
 ui.spin.disabled=!spinning&&!canStart;
 ui.bet.disabled=!canStart;ui.auto.disabled=!canStart;
 ui.turbo.setAttribute('aria-pressed',String(!!controller?.turbo));
 ui.signin.hidden=!!account?.authenticated;
 ui.retry.hidden=state.phase!=='confirm'||state.pending;
 const statuses={loading:'Connecting to existing Player session…',disconnected:'Sign in to ZPLAY to play now.',unavailable:'Player game is not enabled by the operator.',ready:'Ready — SPIN uses your existing ETB account.',spinning:'SPIN → STOP · waiting for server result',confirm:'Round reconciliation required: retry the SAME saved token.'};
 showStatus(state.error?((statuses[state.phase]||state.phase)+' · '+state.error):(statuses[state.phase]||'Loading…'));
}
async function loadGame(){
 try{
  showStatus('Verifying original symbol and audio files…');
  resources=await loadVerifiedAssets();
  if(resources.manifest.gameId!==GAME_ID)throw Error('CROSS_GAME_ASSET_PACKAGE_REJECTED');
  scene=new MultiHot20Scene({canvas:ui.reels,symbols:resources.manifest.symbols,assets:resources.images,audio:soundBridge,strictAssets:true});
  scene.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const audioClips=await resources.primeAudio();
  sound=createSoundEngine({clipUrls:audioClips});
  controller=new GameController({session,scene,onChange:sync,visible:live});
  assetsReady=true;ui.loading.hidden=true;
  sync();
  try{
   const account=await session.connect();
   if(!controller.connect(account))showStatus('This ZPLAY game is not yet enabled for this Player.');
   sync();
  }catch(error){
   if(error?.code==='LOGIN_REQUIRED'||error?.code==='SESSION_UNAVAILABLE'){
    controller.change('disconnected');
   }else{
    controller.change('unavailable',error?.code||error?.message||'SERVER_STATE_UNAVAILABLE');
   }
  }
 }catch(error){
  assetsReady=false;ui.loading.hidden=false;
  ui.loading.textContent='Game artwork verification failed. Retry the page; no wager was sent.';
  showStatus(error?.message||'ASSET_VERIFICATION_REQUIRED');
  sync();
 }
}
function showBet(){
 const values=controller?.account?.game?.betLevels??[];
 ui['bet-options'].replaceChildren();
 for(const amount of values){
  const button=document.createElement('button');
  button.type='button';button.textContent=amount+' ETB';
  button.setAttribute('aria-pressed',String(controller?.bet===amount));
  button.addEventListener('click',()=>{if(controller?.setBet(amount)){sound?.play('button');ui['bet-dialog'].close();sync()}});
  ui['bet-options'].append(button);
 }
 open(ui['bet-dialog']);
}
function showRules(){
 // Read-only operator paytable: never use this screen to compute payouts.
 const table=controller?.previewPaytable();
 const rules=controller?.account?.game?.features;
 ui['paytable-text'].textContent=table?JSON.stringify({paytable:table,features:rules},null,2):'Paytable will appear when the existing ZPLAY server authorizes this game.';
 open(ui['rules-dialog']);
}
function showHistory(){ui['history-text'].textContent=resultText(controller?.lastReceipt);open(ui['history-dialog'])}
function showSound(){ui['music-opt'].checked=savedSettings.music;open(ui['sound-dialog'])}
function syncSound(){sound?.set(savedSettings.effects,savedSettings.music);controller&&(controller.musicOptedIn=savedSettings.music);sync()}
ui.spin.addEventListener('click',()=>{if(!controller)return;if(controller.phase==='spinning')controller.stop();else void controller.spin().then(sync)});
ui.bet.addEventListener('click',()=>{if(controller?.phase==='ready')showBet()});
ui.auto.addEventListener('click',()=>{if(controller?.phase==='ready')open(ui['auto-dialog'])});
ui.turbo.addEventListener('click',()=>{controller?.setTurbo(!controller.turbo);sound?.play('button');sync()});
ui.menu.addEventListener('click',()=>open(ui['menu-dialog']));
ui.rules.addEventListener('click',showRules);
ui.sound.addEventListener('click',showSound);
ui.retry.addEventListener('click',()=>{if(controller?.phase==='confirm')void controller.reconcile().then(sync)});
ui['auto-start'].addEventListener('click',()=>{
 const count=Number(ui['auto-count'].value);
 if(controller?.armAuto(count)){ui['auto-dialog'].close();void controller.startPlay().then(sync)}
});
ui['auto-stop'].addEventListener('click',()=>{controller?.stopAuto();ui['auto-dialog'].close();sync()});
ui['menu-rules'].addEventListener('click',()=>{ui['menu-dialog'].close();showRules()});
ui['menu-history'].addEventListener('click',()=>{ui['menu-dialog'].close();showHistory()});
ui['menu-sound'].addEventListener('click',()=>{ui['menu-dialog'].close();showSound()});
ui['sound-on'].addEventListener('click',()=>{savedSettings.effects=true;savedSettings.music=!!ui['music-opt'].checked;syncSound();ui['sound-dialog'].close()});
ui['sound-off'].addEventListener('click',()=>{savedSettings.effects=false;savedSettings.music=false;syncSound();ui['sound-dialog'].close()});
ui['music-opt'].addEventListener('change',()=>{savedSettings.music=!!ui['music-opt'].checked;if(savedSettings.effects)syncSound()});
window.addEventListener('resize',()=>scene?.resize());
window.addEventListener('blur',()=>{controller?.onHidden();sync()});
window.addEventListener('focus',()=>{controller?.onVisible();sync()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)controller?.onHidden();else controller?.onVisible();sync()});
window.addEventListener('pagehide',()=>{scene?.pauseAudio();sound?.pauseAll();controller?.stopAuto()});
window.addEventListener('beforeunload',()=>{scene?.dispose();sound?.destroy();resources?.dispose()});
void loadGame();
