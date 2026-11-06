import {starsIdleSpin} from './stars-presentation.mjs';
import {hundredIdleSpin} from './hundred-presentation.mjs';
import {hasAmbientAnimation,ambientParticleCount} from './ambient.mjs';
import {applyMultiControlArt,updateMultiSpinFace} from './multi-presentation.mjs';
import {gameConfig} from './registry.mjs';
import {validateModel,validateRound,validateGamble,units,money,SpinState} from './contract.mjs';
import {WalletAdapter,definitelyRejected} from './wallet.mjs';
import {SoundEngine} from './audio.mjs';
import {MachineRenderer} from './renderer.mjs';

const $=id=>document.getElementById(id),g=gameConfig(document.body.dataset.game),state=new SpinState(),events=new AbortController();
const audio=new SoundEngine(g.visual.note,g.id),api=new WalletAdapter(),renderer=new MachineRenderer($('machine-canvas'),g,audio);
let lastWin='0.00',soundChoice=false;
let epoch=0,betIndex=g.betLevels.indexOf('2.00'),signedIn=false,balance=null,lastRound=null,free=0,auto=0,autoEpoch=0,actionBusy=false,canGamble=false,gambleValue='0.00',gambleAttempt=0,legacy=false,disposed=false,refreshTimer,turbo=false,holdTimer,holdStarted=false,suppressSpinClick=false;
applyMultiControlArt(document);if(g.id==='wild_multi_stars')$('spin').style.setProperty('--reference-spin','url("'+starsIdleSpin+'")');if(g.id==='multi_hot_100')$('spin').style.setProperty('--reference-spin','url("'+hundredIdleSpin+'")');
document.title=g.name+' · ZPLAY';$('settings-title').textContent=g.name;
if(g.id==='multi_hot_5_video'){$('bet-open').querySelector('.meter-name').textContent='LAST WIN';$('bet-open').setAttribute('aria-label','Last win; open bet settings');}
try{const choice=localStorage.getItem('zplay:sound-choice');if(choice==='no')audio.toggle();soundChoice=choice==='yes';audio.setBackgroundEnabled(soundChoice);}catch{}
function soundIndicator(){$('sound').setAttribute('aria-pressed',String(audio.muted));$('sound').setAttribute('aria-label',audio.muted?'Enable sound':'Mute sound');}
function askSound(){try{if(localStorage.getItem('zplay:sound-choice'))return;}catch{}if(!document.querySelector('dialog[open]'))$('sound-consent').showModal();}
async function chooseSound(enabled){if(audio.muted===enabled)audio.toggle();soundChoice=enabled;audio.setBackgroundEnabled(soundChoice);try{localStorage.setItem('zplay:sound-choice',enabled?'yes':'no');}catch{}$('sound-consent').close();soundIndicator();if(enabled){await audio.unlock();audio.event('tap');}}
const bet=()=>g.betLevels[betIndex],listen=(node,event,fn)=>node.addEventListener(event,fn,{signal:events.signal});
const setState=next=>{state.move(next);document.body.dataset.state=state.value;update();};
function notice(text='',retry=false,login=false){$('notice-text').textContent=text;$('retry').hidden=!retry;$('sign-in').hidden=!login;}
function pending(){return api.pending();}
function setBalance(value){units(value,2);balance=value;$('balance').textContent=value;}
function update(){
 let saved=null,action=null;try{saved=api.key?pending():null;action=api.key?api.pending(api.actionKey):null;}catch(e){legacy=true;notice('Saved round information needs review. Open History before continuing.');}const animating=state.value==='animating',waiting=state.value==='requesting',locked=state.locked||actionBusy||!!saved||!!action||legacy;
 $('spin').disabled=disposed||legacy||!signedIn||actionBusy||!!action||(!animating&&state.value!=='pending'&&!['ready','presenting'].includes(state.value))||(!saved&&!animating&&!free&&balance!==null&&units(balance)===0n)||(!animating&&auto>0);
 $('spin-label').textContent=animating?'STOP':waiting?'WAIT':saved?'CONFIRM':free?'FREE SPIN':'SPIN';$('spin-bet').textContent=bet()+' ETB';
 $('spin').setAttribute('aria-label',animating?'Speed up the current spin animation':saved?'Confirm the saved round':'Spin '+bet()+' ETB. Hold to repeat spins.');
 $('bet-value').textContent=bet();$('last-win').textContent=signedIn?lastWin:'—';const previousBet=betIndex>0?g.betLevels[betIndex-1]:null;$('previous-stake').hidden=g.id!=='multi_hot_5_video'||!previousBet;$('previous-stake-amount').textContent=previousBet||'';const nextBet=g.betLevels[Math.min(betIndex+1,g.betLevels.length-1)];$('stake-amount').textContent=g.id==='multi_hot_5_video'?nextBet:bet();$('stake-open').setAttribute('aria-label',g.id==='multi_hot_5_video'?'Choose bet; next level '+nextBet+' ETB':'Choose bet');$('stake-open').disabled=locked||auto>0||free>0;$('bet-quick').disabled=locked||auto>0||free>0;$('bet-open').disabled=locked||auto>0||free>0;$('bet-less').disabled=locked||auto>0||free>0||betIndex===0;$('bet-more').disabled=locked||auto>0||free>0||betIndex===g.betLevels.length-1;
 $('auto').disabled=!signedIn||legacy||actionBusy||!!action||(!auto&&(!!saved||state.locked));$('auto-label').textContent=auto?'STOP '+auto:'AUTO';
 $('gamble').disabled=$('gamble-menu').disabled=!(signedIn&&!actionBusy&&!legacy&&((!!action&&!state.locked)||(canGamble&&!locked&&!auto&&!free))); $('collect').disabled=!lastRound||locked||auto>0||Number(gambleValue)<=0;
 document.body.dataset.win=String(Number(gambleValue)>0&&!locked&&!auto);if(g.id!=='multi_hot_5_video'){$('gamble').hidden=!(canGamble&&!locked&&!auto&&!free);$('collect').hidden=!(Number(gambleValue)>0&&!locked&&!auto);}$('free-spins').textContent=free?'FREE SPINS: '+free:'';
 for(const el of $('bet-options').children){el.disabled=locked||auto>0||free>0;el.setAttribute('aria-pressed',String(el.dataset.bet===bet()));}
 renderer.auto=auto>0;updateMultiSpinFace($('spin'),{state:state.value,bet:bet(),pending:!!saved,free});
 $('bet-note').textContent=free?'The bet is locked while your free spins remain.':saved?'Confirm the saved round before changing the bet.':'Select a stake before the next spin.';
}
function stopAuto(){auto=0;autoEpoch++;update();}
function signOut(message='Sign in to your existing Player account.'){epoch++;signedIn=false;balance=null;canGamble=false;renderer.cancelPresentation();stopAuto();audio.stop();$('balance').textContent='—';$('win').textContent='—';if(state.value!=='signedout')setState('signedout');notice(message,false,true);}
async function boot(){
 const run=++epoch;clearTimeout(refreshTimer);signedIn=false;canGamble=false;lastRound=null;lastWin='0.00';free=0;gambleValue='0.00';gambleAttempt=0;if(state.value!=='loading')setState('loading');notice('Checking your account…');
 try{
  const [remote,session]=await Promise.all([api.model(g.id),api.session()]);if(disposed||run!==epoch)return;validateModel(remote,g);
  if(!remote.enabled){setState('unavailable');notice('This game is temporarily unavailable.',true);return;}
  if(!session.authenticated){signOut();return;}if(session.currency!=='ETB')throw Error('WALLET_CURRENCY_MISMATCH');
  api.bind(session.sessionId,g.id);signedIn=true;audio.setBackgroundEnabled(soundChoice);setBalance(session.balance);legacy=api.legacyPending();
  const saved=pending(),action=api.pending(api.actionKey);if(saved){if(!g.betLevels.includes(saved.bet))throw Error('SAVED_BET_INVALID');betIndex=g.betLevels.indexOf(saved.bet);}
  const history=await api.history();if(disposed||run!==epoch)return;
  if(!Array.isArray(history.items))throw Error('HISTORY_UNAVAILABLE');
  const latest=history.items.find(item=>item.result_json?.gameId===g.id)?.result_json;
  const previousWin=history.items.find(item=>item.result_json?.gameId===g.id&&Number(item.result_json.finalWin)>0)?.result_json;if(previousWin){validateRound(previousWin,g,previousWin.bet);lastWin=previousWin.finalWin;}
  if(latest){validateRound(latest,g,latest.bet);renderer.restore(latest);$('win').textContent=latest.finalWin;free=latest.freeSpinsRemaining;if(free){betIndex=g.betLevels.indexOf(latest.bet);}}
  if(action){lastRound={roundId:action.roundId,bet:action.bet};gambleValue=action.expectedStake||'0.00';gambleAttempt=(action.expectedAttempt||1)-1;$('gamble-message').textContent='Confirm your saved '+action.choice+' choice.';showGamble(true);}
  setState(saved?'pending':'ready');notice(legacy?'A round saved by the earlier game version needs review. Open History before placing another bet.':saved?'A saved round needs confirmation. Press CONFIRM; the same request is reused.':balance==='0.00'&&!free?'Your ETB balance is empty. Deposit funds from your account.':'');update();scheduleRefresh();askSound();
 }catch(e){if(disposed||run!==epoch)return;if(e.status===401){signOut();return;}if(state.value==='loading')setState('error');notice(e.message,true);audio.event('error');}
}
async function sameSession(){const current=await api.session();if(!current.authenticated||current.sessionId!==api.sessionId){signOut('Your session changed. Sign in again before continuing.');return false;}return true;}
function scheduleRefresh(){clearTimeout(refreshTimer);if(!disposed)refreshTimer=setTimeout(refreshBalance,15000);}
async function refreshBalance(){const run=epoch;try{if(!document.hidden&&signedIn&&!state.locked&&!actionBusy){if(!await sameSession())return;const value=await api.balance();if(run===epoch&&!state.locked&&!actionBusy&&signedIn){if(value.currency!=='ETB')throw Error('WALLET_CURRENCY_MISMATCH');setBalance(value.balance);update();}}}catch(e){if(e.status===401)signOut();}finally{scheduleRefresh();}}
async function oneRound(){
 if(disposed||!signedIn||legacy||actionBusy||api.pending(api.actionKey)||!['ready','presenting','pending'].includes(state.value))return false;
 const run=epoch;setState('requesting');notice('Confirming round…');
 try{
  await audio.unlock();if(!await sameSession())return false;
  const raw=await api.spin(bet());if(disposed||run!==epoch)return false;const result=validateRound(raw,g,bet());
  setState('animating');$('win').textContent='0.00';notice('');if(matchMedia('(prefers-reduced-motion: reduce)').matches){const done=renderer.start(result);renderer.speedUp();await done;}else await renderer.start(result);
  if(disposed||run!==epoch)return false;setBalance(result.balanceAfter);lastRound=result;free=result.freeSpinsRemaining;gambleValue=result.finalWin;if(Number(result.finalWin)>0)lastWin=result.finalWin;gambleAttempt=0;canGamble=Number(gambleValue)>0&&g.features.gambleRounds>0&&!free;
  $('win').textContent=result.finalWin;api.complete();setState('presenting');setState('ready');if(balance==='0.00'&&!free)notice('Your ETB balance is empty. Deposit funds from your account.');return true;
 }catch(e){if(disposed||run!==epoch)return false;auto=0;autoEpoch++;audio.event('error');
  if(e.status===401||e.status===403){signOut('Your session expired. Sign in to recover any saved round.');return false;}
  if(definitelyRejected(e)){api.complete();setState('ready');notice(e.code==='INSUFFICIENT_FUNDS'?'Your ETB balance is too low for this bet.':e.message,true);}
  else {const saved=pending();if(state.value!=='signedout')setState(saved?'pending':'ready');notice(saved?e.message+' No new round will be created. Press CONFIRM to check this request.':e.message,true);}update();return false;
 }
}
async function spin(){if(state.value==='animating'){renderer.speedUp();stopAuto();return;}if(auto){stopAuto();return;}await oneRound();}
async function startAuto(count){if(state.locked||pending()||actionBusy||!signedIn||legacy)return;const run=++autoEpoch;auto=count;$('auto-dialog').close();update();while(auto>0&&run===autoEpoch&&!disposed&&!document.hidden){if(!await oneRound())break;if(run!==autoEpoch)break;auto=Math.max(0,auto-1);update();if(auto)await new Promise(resolve=>setTimeout(resolve,Number(lastRound?.finalWin)>0?Math.max(1000,audio.remainingWinMs?.()||0):450));}if(run===autoEpoch){auto=0;update();}}
function chooseBet(value){if(state.locked||auto||free||actionBusy||pending()||api.pending(api.actionKey)||legacy)return;const i=g.betLevels.indexOf(value);if(i<0)return;betIndex=i;audio.event('bet');update();renderRules();}
function openPanel(id){endHold();stopAuto();$('settings').showModal();for(const p of document.querySelectorAll('.panel'))p.hidden=p.id!==id;if(id==='history')void renderHistory();if(id==='rules')renderRules();update();}
function renderRules(){
 const per=Number(bet())/g.paylines;$('rules-text').textContent=g.reels+' reels × '+g.rows+' rows. '+g.paylines+' fixed paylines, evaluated left to right. The total bet is divided equally between the lines. '+(g.rules.wildSymbols.some(s=>g.symbols.includes(s))?'WILD substitutes for paying symbols, excluding SCATTER. ':'')+(g.features.freeSpins.spins>0?'Three or more SCATTERs award '+g.features.freeSpins.spins+' free spins, with retriggers. '+(g.features.freeSpins.winMultiplier>1?'Free-spin line wins use '+g.features.freeSpins.winMultiplier+'×. ':''):'')+'The multiplier applies to the winning lines. STOP speeds up the animation only. Hold SPIN to repeat wagers at the selected bet; release to stop. The lightning control speeds up presentation without changing the result.';
 const root=$('paytable');root.replaceChildren();for(const [symbol,pays]of Object.entries(g.paytable)){const row=document.createElement('div');row.className='pay-row';const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;canvas.getContext('2d').drawImage(renderer.atlas.get(symbol),0,0,128,128);canvas.setAttribute('aria-label',symbol.replaceAll('_',' '));const text=document.createElement('p');text.textContent=symbol.replaceAll('_',' ').toUpperCase();const amounts=document.createElement('small');amounts.textContent=Object.entries(pays).map(([n,m])=>n+' = '+(per*m).toFixed(2)+' ETB').join(' · ')+' (1×)';text.append(document.createElement('br'),amounts);row.append(canvas,text);root.append(row);}
 $('math-note').textContent='Amounts use the existing ZPLAY server paytable at your selected bet. Wallet payouts round down to 0.01 ETB. Maximum win: '+g.maxWinMultiplier+'× total bet. These are the existing ZPLAY rules; this page does not claim provider certification.';
}
async function renderHistory(){const target=$('history-items');target.textContent='Loading…';try{const data=await api.history();if(!Array.isArray(data.items))throw Error('History unavailable');target.replaceChildren();for(const row of data.items.filter(x=>x.result_json?.gameId===g.id).slice(0,30)){const r=row.result_json,item=document.createElement('article');item.textContent='BET '+money(String(r.chargedStake))+' ETB · WIN '+money(String(r.finalWin))+' ETB';const details=document.createElement('small');details.textContent=(row.created_at?new Date(row.created_at).toLocaleString()+' · ':'')+r.roundId;item.append(details);target.append(item);}if(!target.children.length)target.textContent='No settled rounds yet.';}catch(e){target.textContent=e.status===401?'Sign in to see your history.':'History is unavailable. Retry when your connection is ready.';}}
function updateGamble(){
 const saved=api.pending(api.actionKey),allowed=signedIn&&!actionBusy&&(canGamble||!!saved);
 $('red').disabled=!allowed||(saved&&saved.choice!=='RED');$('black').disabled=!allowed||(saved&&saved.choice!=='BLACK');
 $('gamble-terms').textContent=(saved&&!saved.expectedStake?'Confirm the saved choice.':'Risk '+gambleValue+' ETB of the credited win.')+' A correct colour pays 2×. Win chance: 47.5%. '+Math.max(0,g.features.gambleRounds-gambleAttempt)+' attempts remain.';
}
function showGamble(recover=false){endHold();recover=recover||!!api.pending(api.actionKey);if(!signedIn||actionBusy)return;if(!recover&&(!canGamble||state.locked||free||auto||pending()))return;stopAuto();if(!recover)$('gamble-message').textContent='Choose RED or BLACK.';updateGamble();$('gamble-dialog').showModal();}
async function gamble(choice){if(actionBusy||!signedIn||pending())return;const saved=api.pending(api.actionKey);if(!saved&&(!canGamble||!lastRound||free))return;if(saved&&saved.choice!==choice){$('gamble-message').textContent='Confirm your saved '+saved.choice+' choice.';return;}
 const run=epoch;actionBusy=true;update();$('red').disabled=$('black').disabled=true;
 try{if(!await sameSession())return;await audio.unlock();audio.event('tap');const expected=saved||{roundId:lastRound.roundId,choice,expectedStake:gambleValue,expectedAttempt:gambleAttempt+1};const raw=await api.gamble(lastRound,choice,{expectedStake:expected.expectedStake,expectedAttempt:expected.expectedAttempt});if(disposed||run!==epoch)return;const result=validateGamble(raw,g,expected);setBalance(result.balanceAfter);api.completeAction();renderer.presentedAt=0;renderer.dirty=true;renderer.particles.clear();gambleValue=result.payout;gambleAttempt=result.attempt;canGamble=result.won&&result.attempt<result.maxAttempts;$('win').textContent=money(gambleValue);$('gamble-message').textContent=(result.won?'WIN':'LOSE')+' · '+money(result.payout)+' ETB · '+result.attempt+'/'+result.maxAttempts;if(result.won)audio.win(Number(result.payout),Number(result.stake));else audio.event('error');}
 catch(e){if(e.status===401||e.status===403)signOut('Your session expired. Sign in to recover your saved choice.');if(definitelyRejected(e)){api.completeAction();canGamble=false;}$('gamble-message').textContent=e.message+(api.pending(api.actionKey)?' Confirm the same colour to recover the unconfirmed request.':'');}finally{actionBusy=false;updateGamble();update();}
}
for(const value of g.betLevels){const b=document.createElement('button');b.textContent=value;b.dataset.bet=value;listen(b,'click',()=>chooseBet(value));$('bet-options').append(b);}
listen($('spin'),'click',()=>{if(suppressSpinClick){suppressSpinClick=false;return;}void spin();});listen($('spin'),'keydown',e=>{if(e.repeat&&(e.key===' '||e.key==='Enter'))e.preventDefault();});
const endHold=()=>{clearTimeout(holdTimer);if(holdStarted){holdStarted=false;stopAuto();}};
listen($('spin'),'pointerdown',e=>{if(e.button!==0||state.value!=='ready'||$('spin').disabled)return;clearTimeout(holdTimer);suppressSpinClick=false;holdTimer=setTimeout(()=>{if(document.hidden||disposed||state.value!=='ready'||document.querySelector('dialog[open]'))return;holdStarted=true;suppressSpinClick=true;void startAuto(1000);},600);});
listen(window,'pointerup',endHold);listen(window,'pointercancel',endHold);listen($('spin'),'pointerleave',endHold);listen(window,'blur',endHold);
listen($('turbo'),'click',()=>{turbo=!turbo;renderer.setTurbo(turbo);$('turbo').setAttribute('aria-pressed',String(turbo));$('turbo').setAttribute('aria-label',turbo?'Use normal spin animation':'Enable faster spin animation');});
listen($('bet-less'),'click',()=>chooseBet(g.betLevels[betIndex-1]));listen($('bet-more'),'click',()=>chooseBet(g.betLevels[betIndex+1]));listen($('bet-open'),'click',()=>openPanel('bets'));
for(const id of ['menu','menu-top'])listen($(id),'click',()=>openPanel('rules'));
listen($('auto'),'click',()=>{endHold();if(auto)stopAuto();else $('auto-dialog').showModal();});for(const b of document.querySelectorAll('[data-auto]'))listen(b,'click',()=>void startAuto(Number(b.dataset.auto)));
listen($('gamble-menu'),'click',()=>{$('settings').close();showGamble();});listen($('bet-quick'),'click',()=>openPanel('bets'));listen($('stake-open'),'click',()=>openPanel('bets'));listen($('gamble'),'click',()=>showGamble());for(const b of document.querySelectorAll('[data-choice]'))listen(b,'click',()=>void gamble(b.dataset.choice));
listen($('collect'),'click',()=>{canGamble=false;renderer.presentedAt=0;renderer.dirty=true;audio.stop('win');gambleValue='0.00';notice('Your win is already included in your ETB balance.');update();});
for(const b of document.querySelectorAll('[data-panel]'))listen(b,'click',()=>openPanel(b.dataset.panel));for(const b of document.querySelectorAll('[data-close]'))listen(b,'click',()=>$(b.dataset.close).close());
listen($('retry'),'click',()=>{if(renderer.contextLost)location.reload();else if(state.value==='pending')void oneRound();else void boot();});listen($('history-refresh'),'click',()=>void renderHistory());
listen($('sound'),'click',async()=>{await audio.unlock();audio.toggle();soundChoice=!audio.muted;audio.setBackgroundEnabled(soundChoice);try{localStorage.setItem('zplay:sound-choice',audio.muted?'no':'yes');}catch{}soundIndicator();});
listen($('sound-yes'),'click',()=>void chooseSound(true));listen($('sound-no'),'click',()=>void chooseSound(false));listen($('sound-consent'),'cancel',()=>void chooseSound(false));soundIndicator();
listen($('fullscreen'),'click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();$('settings').close();}catch{notice('Fullscreen is unavailable in this browser.');}});
listen($('volume'),'input',e=>{audio.setVolume(Number(e.target.value)/100);$('volume-value').textContent=e.target.value+'%';});listen($('sound-test'),'click',async()=>{await audio.unlock();audio.event('wheel-stop');});
listen(document,'pointerdown',()=>void audio.unlock());listen(document,'click',e=>{if(e.target.closest('button')&&!e.target.closest('#spin,#sound'))audio.event('tap');});listen(document,'visibilitychange',()=>{if(document.hidden){endHold();stopAuto();renderer.pause();}else{renderer.resume();if(signedIn)void refreshBalance();}});
listen(window,'blur',()=>{if(auto)stopAuto();});const resize=new ResizeObserver(()=>renderer.resize());resize.observe($('machine'));let clockTimer=setInterval(()=>{$('clock').textContent=new Date().toLocaleTimeString('en-GB');},1000);
function dispose(){if(disposed)return;disposed=true;epoch++;autoEpoch++;clearTimeout(refreshTimer);clearTimeout(holdTimer);clearInterval(clockTimer);resize.disconnect();events.abort();api.close();renderer.dispose();void audio.dispose();}
listen(window,'pagehide',e=>{if(!e.persisted)dispose();else{renderer.pause();stopAuto();}});listen(window,'pageshow',e=>{if(e.persisted){renderer.resume();if(['animating','requesting'].includes(state.value)){void sameSession().catch(()=>notice('Checking your saved round. Reconnect before continuing.'));}else void boot();}});
renderer.onCelebration=active=>{document.body.dataset.celebration=String(active);};
renderer.onContextState=lost=>notice(lost?'Graphics paused. Retry to reload and confirm your saved round.':'',lost);
update();void boot();
export const diagnostics=()=>({gameId:g.id,state:state.value,canvasCount:document.querySelectorAll('canvas#machine-canvas').length,geometry:{columns:g.reels,rows:g.rows},renderStats:{...renderer.stats},soundEvents:audio.events.slice(),audioNodes:audio.nodes.size,decodedSoundSamples:audio.samples?.size||0,soundSampleNodes:[...audio.nodes].filter(n=>n.sample).length,audioState:audio.context?.state||'not-started',backgroundAudio:audio.backgroundDiagnostics(),cabinetArtworkLoaded:!!renderer.cabinetArt,artworkLoaded:!!renderer.atlas.artworkLoaded,audioSuspended:!!audio.playbackSuspended,reducedMotion:renderer.reducedMotion,particles:renderer.particles.items.length,turbo,autoRemaining:auto,ambientEffects:hasAmbientAnimation(g,renderer.reducedMotion),ambientParticles:ambientParticleCount(g),restoredRoundId:renderer.result?.roundId||null,multiplier:renderer.wheel,grid:renderer.grid,multiArtworkLoaded:!!renderer.multiArt,loopActive:!!audio.reelWanted,loopPhase:audio.currentReelPhase?.()||0,retiringAudioNodes:audio.retiring?.size||0,contextLost:!!renderer.contextLost});
