import {createOfficialHelpPresentation} from './official-help-presentation.mjs';
import {createOfficialGamblePresentation} from './official-gamble-presentation.mjs';
import {installOfficialAutoBetPresentation} from './official-auto-bet-presentation.mjs';
import {starsIdleSpin} from './stars-presentation.mjs';
import {hundredIdleSpin} from './hundred-presentation.mjs';
import {hasAmbientAnimation,ambientParticleCount} from './ambient.mjs';
import {applyMultiControlArt,updateMultiSpinFace} from './multi-presentation.mjs';
import {gameConfig,gameConfigForModel,gameConfigForReceipt,legacyGameConfig,defaultStake,modelIdentity,LEGACY_MATH_VERSION} from './registry.mjs';
import {validateModel,validateRound,validateGamble,validateGameState,validateHistory,savedGambleParent,presentedBalance,gambleStakeAllowed,spinSelectionChanged,normalizeAutoOptions,autoStopReason,units,money,SpinState} from './contract.mjs';
import {WalletAdapter,definitelyRejected} from './wallet.mjs';
import {SoundEngine} from './audio.mjs';
import {MachineRenderer} from './renderer.mjs';

const $=id=>document.getElementById(id),gameId=document.body.dataset.game,state=new SpinState(),events=new AbortController();
let g=gameConfig(gameId),currentModel=g,lastRoundModel=null,latestKnown=null,hasSelectedModel=false;
const versionedGame=['multi_hot_5_video','hot_foxy_20'].includes(gameId);
const audio=new SoundEngine(g.visual.note,g.id),api=new WalletAdapter(),renderer=new MachineRenderer($('machine-canvas'),g,audio);
const gambleView=createOfficialGamblePresentation({gameId,document,audio,onCollect:()=>collectWin()}),nativeControls=installOfficialAutoBetPresentation(document,gameId);
const helpView=createOfficialHelpPresentation({document,gameId});
let nativeControlsReady=!nativeControls,nativeControlsError=null;if(nativeControls?.ready)void nativeControls.ready.then(()=>{nativeControlsReady=true;}).catch(error=>{nativeControlsError=String(error?.message||error);});
let lastWin='0.00',soundChoice=false,displayPendingWin=false;
let epoch=0,betIndex=g.betLevels.indexOf(defaultStake(g)),signedIn=false,balance=null,lastRound=null,free=0,auto=0,autoEpoch=0,actionBusy=false,canGamble=false,gambleValue='0.00',gambleAttempt=0,legacy=false,disposed=false,refreshTimer,turbo=false,holdTimer,holdStarted=false,suppressSpinClick=false;
applyMultiControlArt(document);if(g.id==='wild_multi_stars')$('spin').style.setProperty('--reference-spin','url("'+starsIdleSpin+'")');if(g.id==='multi_hot_100')$('spin').style.setProperty('--reference-spin','url("'+hundredIdleSpin+'")');
function loadControlFonts(prefix,fonts){
 if(!fonts?.regular||typeof FontFace==='undefined')return;
 for(const [name,source]of Object.entries(fonts)){
  const bytes=Uint8Array.from(atob(source.slice(source.indexOf(',')+1)),value=>value.charCodeAt(0)),font=new FontFace(prefix+' Intro '+name,bytes);
  void font.load().then(loaded=>{if(!disposed)document.fonts.add(loaded);}).catch(()=>{});
 }
}
if(g.id==='hot_foxy_20')void import('./official-foxy-art.mjs').then(({sprites,spriteMeta,fonts})=>{
 if(disposed)return;
 const frames={spin:'Buttons/Spin','spin-hover':'Buttons/SpinHover','spin-stop':'Buttons/SpinStop','spin-quick':'Buttons/SpinTurbo','spin-quick-hover':'Buttons/SpinTurboHover','spin-quick-stop':'Buttons/SpinTurboStop','spin-quick-stop-hover':'Buttons/SpinTurboStopHover',lightning:'Buttons/QuickPlay','lightning-active':'Buttons/QuickPlayTurbo','lightning-hover':'Buttons/QuickPlayHover',auto:'Buttons/AutoPlay','auto-hover':'Buttons/AutoPlayHover','auto-stop':'Buttons/AutoPlayStop',bet:'Buttons/Bet','bet-hover':'Buttons/BetHover',menu:'Buttons/Menu','sound-on':'Buttons/SoundOn','sound-off':'Buttons/SoundOff','footer-balance':'Vertical/Start/FooterBalance','footer-bet':'Vertical/Start/FooterBet'};
 if(Object.values(frames).some(key=>!sprites[key]||!spriteMeta[key]))return;
 for(const [name,key]of Object.entries(frames)){
  document.body.style.setProperty('--foxy-'+name,'url("'+sprites[key]+'")');
  if(name.startsWith('lightning')){
   const {sourceSize:source,spriteSourceSize:trim}=spriteMeta[key];
   document.body.style.setProperty('--foxy-'+name+'-size',100*trim.w/source.w+'% '+100*trim.h/source.h+'%');
   document.body.style.setProperty('--foxy-'+name+'-position',(source.w===trim.w?50:100*trim.x/(source.w-trim.w))+'% '+(source.h===trim.h?50:100*trim.y/(source.h-trim.h))+'%');
  }
 }
 loadControlFonts('Foxy',fonts);
 document.body.dataset.nativeFoxyControls='true';
}).catch(()=>{});
if(g.id==='multi_hot_5_video')void import('./official-mh5-art.mjs').then(({sprites,fonts})=>{
 if(disposed)return;
 const frames={spin:'Buttons/SpinVertical','spin-hover':'Buttons/SpinVerticalHover','spin-stop':'Buttons/SpinVerticalStop',auto:'Buttons/AutoPlayVertical','auto-hover':'Buttons/AutoPlayVerticalHover','auto-disabled':'Buttons/AutoPlayVerticalDisabled',double:'Buttons/DoubleVertical','double-hover':'Buttons/DoubleVerticalHover','double-disabled':'Buttons/DoubleVerticalDisabled',minus:'Buttons/MinusVertical','minus-disabled':'Buttons/MinusVerticalDisabled',plus:'Buttons/PlusVertical','plus-disabled':'Buttons/PlusVerticalDisabled',bar:'Buttons/BackgroundVertical',menu:'Buttons/Menu'};
 if(Object.values(frames).some(key=>!sprites[key]))return;
 for(const [name,key]of Object.entries(frames))document.body.style.setProperty('--mh5-'+name,'url("'+sprites[key]+'")');
 for(const id of ['auto','gamble'])$(id).style.removeProperty('background-image');
 loadControlFonts('MH5',fonts);
 document.body.dataset.nativeMh5Controls='true';
}).catch(()=>{});
document.title=g.name+' · ZPLAY';$('settings-title').textContent=g.name;
if(g.id==='multi_hot_5_video'){$('bet-open').querySelector('.meter-name').textContent='LAST WIN';$('bet-open').setAttribute('aria-label','Last win');$('bet-open').setAttribute('tabindex','-1');}
try{const choice=localStorage.getItem('zplay:sound-choice');if(choice==='no')audio.toggle();soundChoice=choice==='yes';audio.setBackgroundEnabled(soundChoice);}catch{}
function soundIndicator(){$('sound').setAttribute('aria-pressed',String(audio.muted));$('sound').setAttribute('aria-label',audio.muted?'Enable sound':'Mute sound');}
function askSound(){try{if(localStorage.getItem('zplay:sound-choice'))return;}catch{}if(!document.querySelector('dialog[open]'))$('sound-consent').showModal();}
async function chooseSound(enabled){if(audio.muted===enabled)audio.toggle();soundChoice=enabled;audio.setBackgroundEnabled(soundChoice);try{localStorage.setItem('zplay:sound-choice',enabled?'yes':'no');}catch{}$('sound-consent').close();soundIndicator();if(enabled){await audio.unlock();audio.event('tap');}}
const bet=()=>g.betLevels[betIndex],listen=(node,event,fn)=>node.addEventListener(event,fn,{signal:events.signal});
const setState=next=>{state.move(next);document.body.dataset.state=state.value;update();};
function notice(text='',retry=false,login=false){$('notice-text').textContent=text;$('retry').hidden=!retry;$('sign-in').hidden=!login;}
function pending(){return api.pending();}
function setBalance(value){units(value,2);balance=value;$('balance').textContent=presentedBalance(balance,gambleValue,displayPendingWin);}
function selectNextModel(model,lockedBet=null){
 const previous=bet(),changed=g.mathVersion!==model.mathVersion||g.mathSha256!==model.mathSha256;g=model;
 const next=lockedBet||(hasSelectedModel?previous:defaultStake(g));hasSelectedModel=true;betIndex=g.betLevels.indexOf(next);
 if(betIndex<0){if(lockedBet)throw Error('LOCKED_BET_MODEL_MISMATCH');betIndex=g.betLevels.indexOf(defaultStake(g));}
 if(changed)renderBetOptions();
}
async function advertisedModel(){const remote=await api.model(gameId),model=gameConfigForModel(remote);if(model.id!==gameId)throw Error('MODEL_IDENTITY_MISMATCH');validateModel(remote,model);return {remote,model};}
async function nextSpinModel({refresh=false}={}){
 if(refresh){const advertised=await advertisedModel();if(!advertised.remote.enabled)throw Error('GAME_UNAVAILABLE');currentModel=advertised.model;}
 let remote=null;
 if(versionedGame){try{remote=await api.state(gameId);}catch(error){if(error.status!==404||currentModel.mathVersion!==LEGACY_MATH_VERSION)throw error;}}
 const next=validateGameState(remote,currentModel,latestKnown?.result||null);free=next.freeSpinsRemaining;selectNextModel(next.model,next.bet);return next;
}
function renderBetOptions(){
 $('bet-options').replaceChildren();for(const value of g.betLevels){const button=document.createElement('button');button.textContent=value;button.dataset.bet=value;listen(button,'click',()=>chooseBet(value));$('bet-options').append(button);}nativeControls?.updateBetOptions();
}

function update(){
 if(balance!==null)$('balance').textContent=presentedBalance(balance,gambleValue,displayPendingWin);
 let saved=null,action=null;try{saved=api.key?pending():null;action=api.key?api.pending(api.actionKey):null;}catch(e){legacy=true;notice('Saved round information needs review. Open History before continuing.');}const animating=state.value==='animating',waiting=state.value==='requesting',locked=state.locked||actionBusy||!!saved||!!action||legacy;
 $('spin').disabled=disposed||legacy||!signedIn||actionBusy||!!action||(!animating&&state.value!=='pending'&&!['ready','presenting'].includes(state.value))||(!saved&&!animating&&!free&&balance!==null&&units(balance)===0n)||(!animating&&auto>0);
 $('spin-label').textContent=animating?'STOP':waiting?'WAIT':saved?'CONFIRM':free?'FREE SPIN':'SPIN';$('spin-bet').textContent=bet()+' ETB';
 $('spin').setAttribute('aria-label',animating?'Speed up the current spin animation':saved?'Confirm the saved round':'Spin '+bet()+' ETB.'+(gameId==='multi_hot_5_video'?'':' Hold to repeat spins.'));
 $('bet-value').textContent=bet();$('last-win').textContent=signedIn?lastWin:'—';const previousBet=betIndex>0?g.betLevels[betIndex-1]:null;$('previous-stake').hidden=g.id!=='multi_hot_5_video'||!previousBet;$('previous-stake-amount').textContent=previousBet||'';const nextBet=g.betLevels[Math.min(betIndex+1,g.betLevels.length-1)];$('stake-amount').textContent=g.id==='multi_hot_5_video'?nextBet:bet();$('stake-open').setAttribute('aria-label',g.id==='multi_hot_5_video'?'Choose bet; next level '+nextBet+' ETB':'Choose bet');$('stake-open').disabled=locked||auto>0||free>0;$('bet-quick').disabled=locked||auto>0||free>0;$('bet-open').disabled=locked||auto>0||free>0;$('bet-less').disabled=locked||auto>0||free>0||betIndex===0;$('bet-more').disabled=locked||auto>0||free>0||betIndex===g.betLevels.length-1;
 $('auto').disabled=!signedIn||legacy||actionBusy||!!action||(!auto&&(!!saved||state.locked));$('auto-label').textContent=auto?'STOP '+(auto===Infinity?'∞':auto):'AUTO';if(g.id==='hot_foxy_20')$('auto').setAttribute('aria-pressed',String(auto>0));
 $('gamble').disabled=$('gamble-menu').disabled=!(signedIn&&!actionBusy&&!legacy&&((!!action&&!state.locked)||(canGamble&&!locked&&!auto&&!free))); $('collect').disabled=!lastRound||locked||auto>0||Number(gambleValue)<=0;
 document.body.dataset.win=String(Number(gambleValue)>0&&!locked&&!auto);if(g.id!=='multi_hot_5_video'){$('gamble').hidden=!(canGamble&&!locked&&!auto&&!free);$('collect').hidden=!(Number(gambleValue)>0&&!locked&&!auto);}$('free-spins').textContent=free?'FREE SPINS: '+free:'';
 for(const el of $('bet-options').children){el.disabled=locked||auto>0||free>0;el.setAttribute('aria-pressed',String(el.dataset.bet===bet()));}
 renderer.auto=auto>0;updateMultiSpinFace($('spin'),{state:state.value,bet:bet(),pending:!!saved,free});
 $('bet-note').textContent=free?'The bet is locked while your free spins remain.':saved?'Confirm the saved round before changing the bet.':'Select a stake before the next spin.';
}
function stopAuto(){auto=0;autoEpoch++;update();}
function signOut(message='Sign in to your existing Player account.'){epoch++;signedIn=false;balance=null;canGamble=false;displayPendingWin=false;renderer.cancelPresentation();stopAuto();audio.stop();$('balance').textContent='—';$('win').textContent='—';if(state.value!=='signedout')setState('signedout');notice(message,false,true);}
async function boot(){
 const run=++epoch;clearTimeout(refreshTimer);signedIn=false;canGamble=false;lastRound=null;lastRoundModel=null;latestKnown=null;lastWin='0.00';free=0;gambleValue='0.00';displayPendingWin=false;gambleAttempt=0;if(state.value!=='loading')setState('loading');notice('Checking your account…');
 try{
  const [advertised,session]=await Promise.all([advertisedModel(),api.session()]);if(disposed||run!==epoch)return;currentModel=advertised.model;selectNextModel(currentModel);
  if(!advertised.remote.enabled){setState('unavailable');notice('This game is temporarily unavailable.',true);return;}
  if(!session.authenticated){renderer.setGameModel(currentModel);signOut();renderer.enableNativePresentation?.();return;}if(session.currency!=='ETB')throw Error('WALLET_CURRENCY_MISMATCH');
  api.bind(session.sessionId,gameId);signedIn=true;audio.setBackgroundEnabled(soundChoice);setBalance(session.balance);$('win').textContent='0.00';legacy=api.legacyPending();
  const saved=pending(),action=api.pending(api.actionKey),history=await api.history();if(disposed||run!==epoch)return;
  const entries=validateHistory(history.items,gameId);latestKnown=entries[0]||null;
  const previousWin=entries.find(entry=>Number(entry.result.finalWin)>0);if(previousWin)lastWin=previousWin.result.finalWin;
  if(latestKnown){renderer.setGameModel(latestKnown.model);renderer.restore(latestKnown.result);$('win').textContent=latestKnown.result.finalWin;}
  await nextSpinModel();if(disposed||run!==epoch)return;
  if(saved){const savedModel=saved.mathVersion?gameConfig(gameId,saved):legacyGameConfig(gameId);if(!savedModel.betLevels.includes(saved.bet))throw Error('SAVED_BET_INVALID');selectNextModel(savedModel,saved.bet);}
  if(action){if(!entries.some(entry=>entry.result.roundId===action.roundId)){const result=await api.round(action.roundId);if(disposed||run!==epoch)return;entries.push(...validateHistory([{result_json:result}],gameId));}const parent=savedGambleParent(action,entries);lastRound=parent.result;lastRoundModel=parent.model;gambleValue=action.expectedStake||'0.00';gambleAttempt=(action.expectedAttempt||1)-1;$('gamble-message').textContent='Confirm your saved '+action.choice+' choice.';showGamble(true);}
  setState(saved?'pending':'ready');renderer.enableNativePresentation?.();notice(legacy?'A round saved by the earlier game version needs review. Open History before continuing.':saved?'A saved round needs confirmation. Press CONFIRM; the same request is reused.':balance==='0.00'&&!free?'Your ETB balance is empty. Deposit funds from your account.':'');update();scheduleRefresh();askSound();
 }catch(e){if(disposed||run!==epoch)return;if(e.status===401){signOut();return;}if(state.value==='loading')setState('error');notice(e.message,true);audio.event('error');}
}
async function sameSession(){const current=await api.session();if(!current.authenticated||current.sessionId!==api.sessionId){signOut('Your session changed. Sign in again before continuing.');return false;}return true;}
function scheduleRefresh(){clearTimeout(refreshTimer);if(!disposed)refreshTimer=setTimeout(refreshBalance,15000);}
async function refreshBalance(){const run=epoch;try{if(!document.hidden&&signedIn&&!state.locked&&!actionBusy){if(!await sameSession())return;const value=await api.balance();if(run===epoch&&!state.locked&&!actionBusy&&signedIn){if(value.currency!=='ETB')throw Error('WALLET_CURRENCY_MISMATCH');setBalance(value.balance);update();}}}catch(e){if(e.status===401)signOut();}finally{scheduleRefresh();}}
async function oneRound(){
 if(disposed||!signedIn||legacy||actionBusy||api.pending(api.actionKey)||!['ready','presenting','pending'].includes(state.value))return false;
 const run=epoch,saved=pending(),shown={...modelIdentity(g),bet:bet(),freeSpinsRemaining:free};setState('requesting');notice('Confirming round…');
 try{
  await audio.unlock();if(!await sameSession())return false;
  if(!saved&&versionedGame){await nextSpinModel({refresh:true});if(disposed||run!==epoch)return false;if(spinSelectionChanged(shown,{...modelIdentity(g),bet:bet(),freeSpinsRemaining:free})){setState('ready');notice('Your game rules or free spins changed. Review the displayed bet, then press SPIN again.');return false;}}if(disposed||run!==epoch)return false;
  const stake=saved?.bet||bet(),pin=saved?.mathVersion?modelIdentity(saved):saved?null:modelIdentity(g);
  displayPendingWin=false;canGamble=false;const raw=await api.spin(stake,saved?g:pin);if(disposed||run!==epoch)return false;
  const receiptModel=gameConfigForReceipt(raw);if(receiptModel.id!==gameId)throw Error('ROUND_IDENTITY_MISMATCH');
  if(pin&&Object.keys(pin).some(key=>raw[key]!==pin[key]))throw Error('ROUND_REQUEST_MODEL_MISMATCH');
  const result=validateRound(raw,receiptModel,stake);renderer.setGameModel(receiptModel);
  setState('animating');$('win').textContent='0.00';notice('');if(matchMedia('(prefers-reduced-motion: reduce)').matches){const done=renderer.start(result);renderer.speedUp();await done;}else await renderer.start(result);
  if(disposed||run!==epoch)return false;if(saved){if(!await sameSession())return false;const snapshot=await api.balance();if(disposed||run!==epoch)return false;if(snapshot.currency!=='ETB')throw Error('WALLET_CURRENCY_MISMATCH');setBalance(snapshot.balance);}else setBalance(result.balanceAfter);lastRound=result;lastRoundModel=receiptModel;latestKnown={result,model:receiptModel};free=result.freeSpinsRemaining;gambleValue=result.finalWin;if(Number(result.finalWin)>0)lastWin=result.finalWin;gambleAttempt=0;canGamble=gambleStakeAllowed(receiptModel,gambleValue)&&receiptModel.features.gambleRounds>0&&!free;displayPendingWin=versionedGame&&!saved&&!auto&&Number(gambleValue)>0&&!free;
  selectNextModel(free?receiptModel:currentModel,free?result.bet:null);if(saved){await nextSpinModel({refresh:versionedGame});if(disposed||run!==epoch)return false;canGamble=canGamble&&!free;}if(receiptModel.rules.gamble.maxStake!==undefined&&!gambleStakeAllowed(receiptModel,gambleValue)){gambleValue='0.00';displayPendingWin=false;}
  $('win').textContent=result.finalWin;api.complete();setState('presenting');setState('ready');if(balance==='0.00'&&!free)notice('Your ETB balance is empty. Deposit funds from your account.');return true;
 }catch(e){if(disposed||run!==epoch)return false;auto=0;autoEpoch++;audio.event('error');
  if(e.status===401||e.status===403){signOut('Your session expired. Sign in to recover any saved round.');return false;}
  if(definitelyRejected(e)){api.complete();setState('ready');if(e.code==='GAME_RULES_UPDATED_RELOAD'){notice('The game rules were updated. Refreshing before your next spin.');await boot();}else notice(e.code==='INSUFFICIENT_FUNDS'?'Your ETB balance is too low for this bet.':e.message,true);}
  else {const saved=pending();if(state.value!=='signedout')setState(saved?'pending':'ready');renderer.enableNativePresentation?.();notice(saved?e.message+' No new round will be created. Press CONFIRM to check this request.':e.message,true);}update();return false;
 }
}
async function spin(){if(state.value==='animating'){renderer.speedUp();stopAuto();return;}if(auto){stopAuto();return;}await oneRound();}
async function startAuto(value){
 if(state.locked||pending()||actionBusy||!signedIn||legacy)return;
 let options;try{options=normalizeAutoOptions(value,gameId);}catch(error){notice('Enter a positive AUTO limit with no more than two decimal places.');return;}
 const startBalance=balance,run=++autoEpoch;auto=options.count;displayPendingWin=false;$('auto-dialog').close();update();
 while(auto>0&&run===autoEpoch&&!disposed&&!document.hidden){
  if(!await oneRound())break;if(run!==autoEpoch)break;
  const reason=autoStopReason(options,startBalance,balance,lastRound);auto=reason?0:Math.max(0,auto-1);update();
  if(reason){notice('Automatic play stopped: '+({win:'win limit reached',increase:'net win limit reached',decrease:'net loss limit reached',bigWin:'BIG WIN'}[reason])+'.');break;}
  if(auto)await new Promise(resolve=>setTimeout(resolve,Number(lastRound?.finalWin)>0?Math.max(1000,audio.remainingWinMs?.()||0):450));
 }
 if(run===autoEpoch){auto=0;update();}
}
function chooseBet(value){if(state.locked||auto||free||actionBusy||pending()||api.pending(api.actionKey)||legacy)return;const i=g.betLevels.indexOf(value);if(i<0)return;betIndex=i;audio.event('bet');update();renderRules();}
function openPanel(id){endHold();stopAuto();$('settings').showModal();for(const p of document.querySelectorAll('.panel'))p.hidden=p.id!==id;if(id==='history')void renderHistory();if(id==='rules')renderRules();update();}
function renderRules(){
 const per=Number(bet())/g.paylines;$('rules-text').textContent=g.reels+' reels × '+g.rows+' rows. '+g.paylines+' fixed paylines, evaluated left to right. The total bet is divided equally between the lines. '+(g.rules.wildSymbols.some(s=>g.symbols.includes(s))?'WILD substitutes for paying symbols'+(g.rules.scatter?', excluding SCATTER':'')+'. ':'')+(g.features.freeSpins.spins>0?'Three or more SCATTERs award '+g.features.freeSpins.spins+' free spins, with retriggers. '+(g.features.freeSpins.winMultiplier>1?'Free-spin line wins use '+g.features.freeSpins.winMultiplier+'×. ':''):'')+'The multiplier applies to the winning lines. STOP speeds up the animation only. '+(gameId==='multi_hot_5_video'?'':'Hold SPIN to repeat wagers at the selected bet; release to stop. ')+'The lightning control speeds up presentation without changing the result.';
 const root=$('paytable');root.replaceChildren();for(const [symbol,pays]of Object.entries(g.paytable)){const row=document.createElement('div');row.className='pay-row';const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;canvas.getContext('2d').drawImage(renderer.atlas.get(symbol),0,0,128,128);canvas.setAttribute('aria-label',symbol.replaceAll('_',' '));const text=document.createElement('p');text.textContent=symbol.replaceAll('_',' ').toUpperCase();const amounts=document.createElement('small');amounts.textContent=Object.entries(pays).map(([n,m])=>n+' = '+(per*m).toFixed(2)+' ETB').join(' · ')+' (1×)';text.append(document.createElement('br'),amounts);row.append(canvas,text);root.append(row);}
 $('math-note').textContent='Paytable amounts use your selected bet at 1×. Payouts round down to 0.01 ETB. Maximum win: '+g.maxWinMultiplier+'× total bet.';helpView?.update({model:g,stake:bet()});
}
async function renderHistory(){const target=$('history-items');target.textContent='Loading…';try{const data=await api.history(),entries=validateHistory(data.items,gameId);target.replaceChildren();for(const {row,result:r}of entries.slice(0,30)){const item=document.createElement('article');item.textContent='BET '+money(String(r.chargedStake))+' ETB · WIN '+money(String(r.finalWin))+' ETB';const details=document.createElement('small');details.textContent=(row.created_at?new Date(row.created_at).toLocaleString()+' · ':'')+r.roundId;item.append(details);target.append(item);}if(!target.children.length)target.textContent='No settled rounds yet.';}catch(e){target.textContent=e.status===401?'Sign in to see your history.':'History is unavailable. Retry when your connection is ready.';}}
function updateGamble(){
 const saved=api.pending(api.actionKey),allowed=signedIn&&!actionBusy&&(canGamble||!!saved);
 $('red').disabled=!allowed||(saved&&saved.choice!=='RED');$('black').disabled=!allowed||(saved&&saved.choice!=='BLACK');
 gambleView?.update({stake:saved?saved.expectedStake:gambleValue,attempt:gambleAttempt,maxAttempts:(lastRoundModel||g).features.gambleRounds,busy:actionBusy,canGamble,savedChoice:saved?.choice||null,recover:!!saved});
 $('gamble-terms').textContent=(saved&&!saved.expectedStake?'Confirm the saved choice.':'Risk '+gambleValue+' ETB of the credited win.')+' A correct colour pays 2×. Win chance: 47.5%. '+Math.max(0,(lastRoundModel||g).features.gambleRounds-gambleAttempt)+' attempts remain.';
}
function showGamble(recover=false){endHold();const saved=api.pending(api.actionKey);recover=recover||!!saved;if(!signedIn||actionBusy)return;if(!recover&&(!canGamble||state.locked||free||auto||pending()))return;stopAuto();if(!recover)$('gamble-message').textContent='Choose RED or BLACK.';updateGamble();$('gamble-dialog').showModal();gambleView?.open({stake:saved?saved.expectedStake:gambleValue,attempt:gambleAttempt,maxAttempts:(lastRoundModel||g).features.gambleRounds,recover,roundId:lastRound?.roundId,savedChoice:api.pending(api.actionKey)?.choice||null});}
async function gamble(choice){if(actionBusy||!signedIn||pending())return;const saved=api.pending(api.actionKey);if(!saved&&(!canGamble||!lastRound||free))return;if(saved&&saved.choice!==choice){$('gamble-message').textContent='Confirm your saved '+saved.choice+' choice.';return;}
 const run=epoch;actionBusy=true;update();$('red').disabled=$('black').disabled=true;
 try{if(!await sameSession())return;await audio.unlock();if(!gambleView?.pending(choice))audio.event('tap');const expected=saved||{roundId:lastRound.roundId,choice,expectedStake:gambleValue,expectedAttempt:gambleAttempt+1};const raw=await api.gamble(lastRound,choice,{expectedStake:expected.expectedStake,expectedAttempt:expected.expectedAttempt});if(disposed||run!==epoch)return;const result=validateGamble(raw,lastRoundModel||gameConfigForReceipt(lastRound),{...expected,parentWin:lastRound.finalWin});if(saved){if(!await sameSession())return;const snapshot=await api.balance();if(disposed||run!==epoch)return;if(snapshot.currency!=='ETB')throw Error('WALLET_CURRENCY_MISMATCH');setBalance(snapshot.balance);}else setBalance(result.balanceAfter);api.completeAction();renderer.presentedAt=0;renderer.dirty=true;renderer.particles.clear();gambleValue=result.payout;gambleAttempt=result.attempt;canGamble=result.won&&result.attempt<result.maxAttempts&&gambleStakeAllowed(lastRoundModel||g,result.payout);$('win').textContent=money(gambleValue);$('gamble-message').textContent=(result.won?'WIN':'LOSE')+' · '+money(result.payout)+' ETB · '+result.attempt+'/'+result.maxAttempts;displayPendingWin=versionedGame&&!saved&&gambleStakeAllowed(lastRoundModel||g,result.payout);if(!gambleView?.outcome(result,{canGamble})){if(result.won)audio.win(Number(result.payout),Number(result.stake));else audio.event('error');}}
 catch(e){gambleView?.error();if(e.status===401||e.status===403)signOut('Your session expired. Sign in to recover your saved choice.');if(definitelyRejected(e)){api.completeAction();canGamble=false;if(e.code==='GAMBLE_STATE_CHANGED'){displayPendingWin=false;gambleValue='0.00';try{const snapshot=await api.balance();if(snapshot.currency==='ETB'&&run===epoch)setBalance(snapshot.balance);}catch{}}}$('gamble-message').textContent=e.message+(api.pending(api.actionKey)?' Confirm the same colour to recover the unconfirmed request.':'');}finally{actionBusy=false;updateGamble();update();}
}
renderBetOptions();
listen($('spin'),'click',()=>{if(suppressSpinClick){suppressSpinClick=false;return;}void spin();});listen($('spin'),'keydown',e=>{if(e.repeat&&(e.key===' '||e.key==='Enter'))e.preventDefault();});
const endHold=()=>{clearTimeout(holdTimer);if(holdStarted){holdStarted=false;stopAuto();}};
listen($('spin'),'pointerdown',e=>{if(gameId==='multi_hot_5_video'||e.button!==0||state.value!=='ready'||$('spin').disabled)return;clearTimeout(holdTimer);suppressSpinClick=false;holdTimer=setTimeout(()=>{if(document.hidden||disposed||state.value!=='ready'||document.querySelector('dialog[open]'))return;holdStarted=true;suppressSpinClick=true;void startAuto(1000);},600);});
listen(window,'pointerup',endHold);listen(window,'pointercancel',endHold);listen($('spin'),'pointerleave',endHold);listen(window,'blur',endHold);
function setTurbo(enabled){turbo=enabled;renderer.setTurbo(turbo);$('turbo').setAttribute('aria-pressed',String(turbo));$('turbo').setAttribute('aria-label',turbo?'Use normal spin animation':'Enable faster spin animation');}
listen($('turbo'),'click',()=>{if(g.id==='hot_foxy_20'&&!turbo){endHold();stopAuto();if(!document.querySelector('dialog[open]'))$('quick-play-dialog').showModal();}else setTurbo(!turbo);});
listen($('quick-play-enable'),'click',()=>{setTurbo(true);$('quick-play-dialog').close();});
listen($('bet-less'),'click',()=>chooseBet(g.betLevels[betIndex-1]));listen($('bet-more'),'click',()=>chooseBet(g.betLevels[betIndex+1]));listen($('bet-open'),'click',()=>{if(gameId!=='multi_hot_5_video')openPanel('bets');});
for(const id of ['menu','menu-top'])listen($(id),'click',()=>openPanel('rules'));
listen($('auto'),'click',()=>{endHold();if(auto)stopAuto();else $('auto-dialog').showModal();});for(const b of document.querySelectorAll('[data-auto]'))listen(b,'click',()=>void startAuto(Number(b.dataset.auto)));if($('official-auto-start'))listen($('official-auto-start'),'click',()=>{const options=nativeControls?.readAutoOptions();if(options)void startAuto(options);});
listen($('gamble-menu'),'click',()=>{$('settings').close();showGamble();});listen($('bet-quick'),'click',()=>openPanel('bets'));listen($('stake-open'),'click',()=>{if(gameId==='multi_hot_5_video')chooseBet(g.betLevels[Math.min(betIndex+1,g.betLevels.length-1)]);else openPanel('bets');});listen($('gamble'),'click',()=>showGamble());for(const b of document.querySelectorAll('[data-choice]'))listen(b,'click',()=>void gamble(b.dataset.choice));
function collectWin(){if(actionBusy||api.pending(api.actionKey))return;canGamble=false;displayPendingWin=false;renderer.presentedAt=0;renderer.dirty=true;audio.stop('win');gambleValue='0.00';notice('Your win is already included in your ETB balance.');update();}
listen($('collect'),'click',collectWin);
for(const b of document.querySelectorAll('[data-panel]'))listen(b,'click',()=>openPanel(b.dataset.panel));for(const b of document.querySelectorAll('[data-close]'))listen(b,'click',()=>$(b.dataset.close).close());
listen($('retry'),'click',()=>{if(renderer.contextLost)location.reload();else if(state.value==='pending')void oneRound();else void boot();});listen($('history-refresh'),'click',()=>void renderHistory());
listen($('sound'),'click',async()=>{await audio.unlock();audio.toggle();soundChoice=!audio.muted;audio.setBackgroundEnabled(soundChoice);try{localStorage.setItem('zplay:sound-choice',audio.muted?'no':'yes');}catch{}soundIndicator();});
listen($('sound-yes'),'click',()=>void chooseSound(true));listen($('sound-no'),'click',()=>void chooseSound(false));listen($('sound-consent'),'cancel',()=>void chooseSound(false));soundIndicator();
listen($('fullscreen'),'click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();$('settings').close();}catch{notice('Fullscreen is unavailable in this browser.');}});
listen($('volume'),'input',e=>{audio.setVolume(Number(e.target.value)/100);$('volume-value').textContent=e.target.value+'%';});listen($('sound-test'),'click',async()=>{await audio.unlock();audio.event('wheel-stop');});
listen(document,'pointerdown',()=>void audio.unlock());listen(document,'click',e=>{if(e.target.closest('button')&&!e.target.closest('#spin,#sound')&&!(gambleView&&e.target.closest('#gamble-dialog')))audio.event('tap');});listen(document,'visibilitychange',()=>{if(document.hidden){endHold();stopAuto();renderer.pause();}else{renderer.resume();if(signedIn)void refreshBalance();}});
listen(window,'blur',()=>{if(auto)stopAuto();});const resize=new ResizeObserver(()=>renderer.resize());resize.observe($('machine'));let clockTimer=setInterval(()=>{$('clock').textContent=new Date().toLocaleTimeString('en-GB');},1000);
function dispose(){if(disposed)return;disposed=true;epoch++;autoEpoch++;clearTimeout(refreshTimer);clearTimeout(holdTimer);clearInterval(clockTimer);resize.disconnect();events.abort();gambleView?.dispose();nativeControls?.destroy();helpView?.destroy();api.close();renderer.dispose();void audio.dispose();}
listen(window,'pagehide',e=>{if(!e.persisted)dispose();else{renderer.pause();stopAuto();}});listen(window,'pageshow',e=>{if(e.persisted){renderer.resume();if(['animating','requesting'].includes(state.value)){void sameSession().catch(()=>notice('Checking your saved round. Reconnect before continuing.'));}else void boot();}});
renderer.onCelebration=active=>{document.body.dataset.celebration=String(active);};
renderer.onContextState=lost=>notice(lost?'Graphics paused. Retry to reload and confirm your saved round.':'',lost);
update();void boot();
export const diagnostics=()=>({gameId:g.id,mathVersion:g.mathVersion,mathSha256:g.mathSha256,authoritativeBalance:balance,pendingDisplayWin:displayPendingWin?gambleValue:'0.00',displayPendingWin,gambleValue,canGamble,currentMathVersion:currentModel.mathVersion,renderMathVersion:renderer.game.mathVersion,freeSpinsRemaining:free,gambleMaxAttempts:(lastRoundModel||g).features.gambleRounds,state:state.value,canvasCount:document.querySelectorAll('canvas#machine-canvas').length,geometry:{columns:g.reels,rows:g.rows},renderStats:{...renderer.stats},soundEvents:audio.events.slice(),audioNodes:audio.nodes.size,decodedSoundSamples:audio.samples?.size||0,soundSampleNodes:[...audio.nodes].filter(n=>n.sample).length,audioState:audio.context?.state||'not-started',backgroundAudio:audio.backgroundDiagnostics(),nativeAnimation:renderer.nativePresentation?.diagnostics()||null,nativeControlsReady,nativeControlsError,nativeArtworkLoaded:!!renderer.officialArt,nativeSymbolCount:renderer.atlas.officialSymbolCount||0,nativeForegroundLoaded:!!renderer.officialForeground,cabinetArtworkLoaded:!!renderer.cabinetArt,artworkLoaded:!!renderer.atlas.artworkLoaded,audioSuspended:!!audio.playbackSuspended,reducedMotion:renderer.reducedMotion,particles:renderer.particles.items.length,turbo,autoRemaining:auto,ambientEffects:hasAmbientAnimation(g,renderer.reducedMotion),ambientParticles:ambientParticleCount(g),restoredRoundId:renderer.result?.roundId||null,multiplier:renderer.wheel,grid:renderer.grid,multiArtworkLoaded:!!renderer.multiArt,loopActive:!!audio.reelWanted,loopPhase:audio.currentReelPhase?.()||0,retiringAudioNodes:audio.retiring?.size||0,contextLost:!!renderer.contextLost});
