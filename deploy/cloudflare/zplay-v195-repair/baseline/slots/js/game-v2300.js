import {validatePresentation,linePoints} from './presentation-contract.mjs';
import {applyDesign} from './cabinet-v2300.js?v=2900';
import {playerLoggedIn,game as loadGame,wallet,spin,rounds,gamble,pick,playerLogin,isDefiniteRejection} from './api.js';
import {installRules,updateRulesBet,symbolArt} from './rules-v2900.js';
import {roundSummary} from './payout-view-v2900.mjs';
import {ReelRenderer,loadAtlas} from './reels-v2300.js?zplay=stop-v195';
import {ParticleLayer} from './webgl/particles.js';
import {AudioEngine} from './audio-v2802.js?v=3200';
const $=id=>document.getElementById(id);
const gameId=new URLSearchParams(location.search).get('game');
const supported=new Set(['hot_foxy_20','multi_hot_5_video','multi_hot_40','burning_ice','wild_multi_stars']);
const audio=new AudioEngine();
let model=null,reels=null,fx=null,last=performance.now(),enabled=false,betIndex=4,spinning=false,auto=0,lastOutcome=null,lastGamble=null;
let stopRequested=false;
let actionBusy=false,gambleFinished=false,freeRemaining=0,winAcknowledged=false;
let signedIn=false,animationFrame=0,sizeObserver=null,disposed=false,balanceRequest=0,balanceBusy=false,autoSequence=0;
let spinStarting=false,spinSequence=0,initializing=false,historyBusy=false;
const pendingKey=`superwin.nine.spin.${gameId}`;
applyDesign(gameId);
function pendingSpin(){try{const p=JSON.parse(sessionStorage.getItem(pendingKey)||'null');return p&&typeof p.bet==='string'&&typeof p.token==='string'?p:null;}catch{return null;}}
function pendingAction(){if(!lastOutcome)return false;try{return !!(sessionStorage.getItem(`superwin.gamble.${lastOutcome.roundId}`)||sessionStorage.getItem(`superwin.bonus.${lastOutcome.roundId}`));}catch{return false;}}
function message(s,isError=false){$('message').textContent=s;$('message').classList.toggle('alert',isError);$('message').classList.toggle('quiet',!isError&&!s.startsWith('Connecting'));}
function cash(v){return `${v} ETB`; }
function wait(ms){const start=performance.now();return new Promise(resolve=>{function loop(now){if(now-start>=ms)resolve();else requestAnimationFrame(loop);}requestAnimationFrame(loop);});}
function fps(now){if(disposed)return;const dt=Math.min(.05,(now-last)/1000);last=now;reels?.render(now);if(fx){fx.update(dt);fx.render();}animationFrame=requestAnimationFrame(fps);}
function drawBackground(cols,rows){const target=$('reels-background');target.style.setProperty('--reels',cols);target.style.gridTemplateRows=`repeat(${rows},1fr)`;target.replaceChildren();
  for(let r=0;r<rows;r++){const row=document.createElement('div');row.className='reel-row';for(let c=0;c<cols;c++){
    const item=document.createElement('div');item.className='reel-cell';row.append(item);}target.append(row);}}
function updateWheel(values,position){const bar=$('wheel-values');bar.replaceChildren();for(const n of values){const item=document.createElement('div');item.className='wheel-cell';item.dataset.multiplier=String(n);item.textContent=`${n}×`;bar.append(item);}
  $('wheel').classList.toggle('side',position==='side');}
function wheelSet(value){const cells=[...$('wheel-values').children],hits=cells.filter(c=>Number(c.dataset.multiplier)===Number(value)),chosen=hits.length?hits[Math.floor((hits.length-1)/2)]:null;cells.forEach(c=>c.classList.toggle('active',c===chosen));}
async function wheelRoll(final){const cells=[...$('wheel-values').children];if(!cells.length)return;
  const began=performance.now();let previous=-1;const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:document.body.dataset.turbo==='true'?420:1280;
  if(duration===0){wheelSet(final);return;}
  return new Promise(resolve=>{function frame(now){const t=Math.min(1,(now-began)/duration);
    // Cubic deceleration only selects the VISUAL highlight, not the RNG value.
    const p=1-Math.pow(1-t,3),selected=Math.floor(p*(cells.length*5))%cells.length;
    if(t<1){if(selected!==previous){cells.forEach((c,i)=>c.classList.toggle('active',i===selected));audio.playWheelClick();previous=selected;}
      requestAnimationFrame(frame);
    }else{wheelSet(final);resolve();}}
  requestAnimationFrame(frame);});}
function drawLines(lines){const canvas=$('line-canvas'),rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,rect.width,rect.height);
  const rows=model.rows,cols=model.reels,dx=rect.width/cols,dy=rect.height/rows;
  for(const line of lines){
    if(!line.positions?.length)continue;
    const points=linePoints(line.positions,cols,rows,rect.width,rect.height);
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.shadowBlur=12;ctx.shadowColor='#ffc940';ctx.lineWidth=Math.max(2,dx*.043);ctx.strokeStyle='rgba(255,210,85,.88)';ctx.lineJoin='round';ctx.stroke();
    ctx.shadowBlur=0;ctx.lineWidth=1.5;ctx.strokeStyle='#fff5af';ctx.stroke();
  }
}
function winFX(result){const rect=$('reel-canvas').getBoundingClientRect(),colWidth=rect.width/model.reels,rowHeight=rect.height/model.rows;
  const seen=new Set();for(const line of result.winLines||[]){for(const [r,c] of line.positions){const key=`${r}/${c}`;if(seen.has(key))continue;seen.add(key);
    fx?.burst(rect.left+(c+.5)*colWidth,rect.top+(r+.5)*rowHeight,{count:35,color:'gold',speed:200,life:.65});}}
  if(result.jackpotTier||result.dragonFire){fx?.fire(rect.left+rect.width/2,rect.top+rect.height*.65);audio.playJackpot();}
  else if(Number(result.finalWin)>0){audio.playWinChime(Number(result.finalWin),Number(result.bet));
    if(Number(result.finalWin)>=Number(result.bet)*10)fx?.fountain(rect.left+rect.width/2,rect.top+rect.height*.8);
  }
}
function betLocked(){return !enabled||!model||spinStarting||spinning||actionBusy||freeRemaining>0||auto>0||!!pendingSpin()||pendingAction();}
function installQuickBets(){document.querySelector('.sw-quick-bets')?.remove();const bar=document.createElement('div');bar.className='sw-quick-bets';bar.setAttribute('aria-label','Quick bet ETB');for(const amount of [1,10,20,50,100]){const b=document.createElement('button');b.type='button';b.textContent=amount+' ETB';b.disabled=!model.betLevels.some(x=>Number(x)===amount);b.onclick=()=>{if(betLocked())return;const i=model.betLevels.findIndex(x=>Number(x)===amount);if(i>=0){betIndex=i;updateBet()}};bar.append(b)}document.getElementById('options-content')?.append(bar);}
function updateBet(){const current=model?.betLevels?.[betIndex],locked=betLocked();
  $('bet-dec').disabled=locked||betIndex===0;
  $('bet-inc').disabled=locked||betIndex===(model?.betLevels.length||0)-1;
  $('bet-open').disabled=locked;$('bet-meter').disabled=locked;
  for(const b of document.querySelectorAll('.sw-quick-bets button'))b.disabled=locked||!model?.betLevels.some(x=>Number(x)===Number(b.textContent.replace(' ETB','')));
  if(!current)return;
  updateRulesBet(current);$('bet').textContent=current;$('spin-stake').textContent=current;const meter=$('bet-display');if(meter)meter.textContent=current;
  $('previous-bet').textContent=betIndex>0?model.betLevels[betIndex-1]:'—';
  $('next-bet').textContent=betIndex<model.betLevels.length-1?model.betLevels[betIndex+1]:'—';
}
function syncControls(){
  $('spin').disabled=spinning?stopRequested:spinStarting||actionBusy||pendingAction()||auto>0||!enabled||!!lastOutcome?.pendingBonusPick;
  $('spin-label').textContent=spinning?(stopRequested?'STOPPING…':'STOP'):spinStarting?'PREPARING':!enabled?'LOCKED':pendingSpin()?'RETRY SPIN':freeRemaining>0?'FREE SPIN':'SPIN';
  $('spin').setAttribute('aria-label',spinning?'Stop reel animation':'Spin');
  $('spin').setAttribute('aria-busy',String(spinStarting||spinning));
  // Stop remains reachable while an automatic round is being settled.
  $('autoplay').disabled=auto>0?false:spinStarting||spinning||actionBusy||pendingAction()||!!pendingSpin()||!enabled||!!lastOutcome?.pendingBonusPick;
  $('auto-label').textContent=auto>0?'STOP AUTO':'AUTO ×10';
  $('autoplay').classList.toggle('on',auto>0);
  $('autoplay').setAttribute('aria-label',auto>0?'Stop automatic spins':'Start ten automatic spins');
  $('autoplay').setAttribute('aria-pressed',String(auto>0));
  $('gamble-open').disabled=!enabled||spinStarting||spinning||actionBusy||gambleFinished||auto>0||!!pendingSpin();
  $('ice-gamble').disabled=$('gamble-open').disabled||$('gamble-open').hidden||!lastOutcome;
  $('ice-acknowledge').disabled=!enabled||spinStarting||spinning||actionBusy||auto>0||!!pendingSpin()||pendingAction()||winAcknowledged||!(Number(lastGamble?.payout??lastOutcome?.finalWin)>0);
  $('close-gamble').disabled=actionBusy;
  $('history').disabled=!signedIn||historyBusy;
  const retry=$('retry-game');if(retry)retry.disabled=initializing||spinStarting||spinning||actionBusy||auto>0;
  document.body.dataset.spinning=String(spinning);
  updateBet();
}
function setBalance(value){if(value!==undefined&&value!==null){balanceRequest++;$('balance').textContent=String(value);$('ice-balance').textContent=String(value);}}
async function updateBalance({quiet=false}={}){if(!signedIn||spinning||actionBusy||balanceBusy)return;balanceBusy=true;const request=++balanceRequest;try{const b=await wallet();if(request===balanceRequest&&!spinning)setBalance(b.balance);}catch(e){if(!quiet)message(e.message,true);}finally{balanceBusy=false;}}
function showRoundReceipt(outcome){
 const view=roundSummary(outcome),host=$('round-receipt');host.replaceChildren();host.hidden=false;
 const id=document.createElement('p');id.className='receipt-id';id.textContent='SPIN ID '+view.id;host.append(id);
 const summary=document.createElement('p');summary.textContent=`${view.lines.length} winning lines · ${view.multiplier}× multiplier · WIN ${view.win} ETB`;host.append(summary);
 const receipt=outcome.walletReceipt;if(receipt){const p=document.createElement('p');p.className='receipt-wallet';const before=receipt.balanceBefore,charge=receipt.chargedStake,win=receipt.finalWin,after=receipt.balanceAfter;
 if([before,charge,win,after].every(v=>v!==undefined)){p.textContent=`${before} − ${charge} + ${win} = ${after} ETB`;host.append(p);}}
 if(view.lines.length){const details=document.createElement('details');const title=document.createElement('summary');title.textContent='WINNING LINES';details.append(title);for(const line of view.lines){const row=document.createElement('div');row.className='receipt-line';const text=document.createElement('span');text.textContent=`Line ${line.number} · ${line.count} ${line.symbol.replaceAll('_',' ')} · ${line.baseWin} → ${line.win} ETB`;row.append(symbolArt(line.symbol,gameId),text);details.append(row);}host.append(details);}
}
function display(outcome){showRoundReceipt(outcome);freeRemaining=Number(outcome.freeSpinsRemaining)||0;setBalance(outcome.balanceAfter);$('last-win').textContent=cash(outcome.finalWin);
  $('result-amount').textContent=cash(outcome.finalWin);$('result-label').textContent=outcome.jackpotTier?'JACKPOT':Number(outcome.finalWin)>0?'YOU WON':'ROUND COMPLETE';
  $('result-banner').className='result-banner '+(Number(outcome.finalWin)>0?'won':'lost');
  winAcknowledged=false;$('ice-win').textContent=String(outcome.finalWin);$('ice-multiplier').textContent=Number(outcome.wheelMultiplier)>0?`${outcome.wheelMultiplier}×`:'—';document.body.dataset.roundWon=String(Number(outcome.finalWin)>0);
  $('free-spins').textContent=`FREE SPINS: ${outcome.freeSpinsRemaining||0}`;
  $('gamble-open').hidden=!(model?.features.gambleRounds>0&&Number(outcome.finalWin)>0);
  window.dispatchEvent(new CustomEvent('superwin:round-settled',{detail:{walletReceipt:outcome.walletReceipt,chargedStake:outcome.chargedStake??outcome.bet??'',finalWin:outcome.finalWin,wheelMultiplier:outcome.wheelMultiplier,winLines:Number.isInteger(outcome.totalWinningLines)?outcome.totalWinningLines:(Array.isArray(outcome.stages)?outcome.stages.reduce((n,stage)=>n+(Array.isArray(stage.winLines)?stage.winLines.length:0),0):(Array.isArray(outcome.winLines)?outcome.winLines.length:0)),roundId:outcome.roundId}}));
}
async function playSpin(){
  if(spinning||actionBusy||pendingAction()||!enabled||!model||lastOutcome?.pendingBonusPick)return false;
  const bet=model.betLevels[betIndex];stopRequested=false;spinning=true;
  syncControls();
  let pending=pendingSpin();
  if(pending&&pending.bet!==bet){spinning=false;auto=0;syncControls();message('A round is awaiting confirmation at '+pending.bet+' ETB. Reload to restore that bet and retry the same round.',true);return false;}
  if(!pending){pending={bet,token:crypto.randomUUID()};try{sessionStorage.setItem(pendingKey,JSON.stringify(pending));}catch{spinning=false;auto=0;syncControls();message('The browser could not save this round. Enable storage for this site and retry.',true);return false;}}
  $('round-receipt').hidden=true;document.body.dataset.roundWon='false';$('result-banner').className='result-banner';reels.begin();drawLines([]);audio.playReelSpin();audio.playWheelWhoosh();
  message('Spinning…');
  try{
    const result=await spin(model.id,bet,pending.token);
    setBalance(result.balanceAfter);
    // Exactly the same request token is reused after network failure.
    await Promise.all([reels.finish(result),wheelRoll(result.wheelMultiplier)]);
    audio.stopReelSpin();sessionStorage.removeItem(pendingKey);
    lastOutcome=result;lastGamble=null;gambleFinished=false;display(result);drawLines(result.winLines||[]);winFX(result);window.dispatchEvent(new CustomEvent('superwin:reels-settled',{detail:{roundId:result.roundId}}));
    message(result.isFree?`Free round settled • ${result.bonusSpinsAwarded} additional spins awarded`:`Round ${result.roundId.slice(0,8)} completed`);
    if(result.pendingBonusPick){auto=0;$('bonus-panel').classList.remove('hidden');}
    return true;
  }catch(e){reels.cancel();auto=0;if(isDefiniteRejection(e)){try{sessionStorage.removeItem(pendingKey);}catch{}message(`Spin rejected: ${e.message}. No new round was settled.`,true);if(e.code==='FREE_SPIN_BET_LOCKED')await restoreFreeSpins({allowWhileSpinning:true});}else message(`Spin not confirmed: ${e.message}. Retry confirms this same round with the same token.`,true);return false;
  }finally{audio.stopReelSpin();spinning=false;syncControls();}
}
async function spinClick(){if(spinning){
  if(!stopRequested){stopRequested=true;auto=0;autoSequence++;reels.requestStop();syncControls();}
  return;
}if(spinStarting||actionBusy||auto>0||pendingAction()||!enabled||lastOutcome?.pendingBonusPick)return;
  // Reserve the user's click before audio resumes so delayed clicks cannot queue wagers.
  const sequence=++spinSequence;spinStarting=true;syncControls();
  try{await audio.ensure().catch(()=>{});
    if(sequence!==spinSequence||disposed||document.hidden)return;
    spinStarting=false;await playSpin();
  }finally{if(sequence===spinSequence)spinStarting=false;syncControls();}}
async function toggleAuto(){if(auto){auto=0;autoSequence++;syncControls();return;}if(!enabled||spinStarting||spinning||actionBusy||pendingAction()||pendingSpin()||lastOutcome?.pendingBonusPick)return;
  // STOP must cancel an auto start even while the browser is resuming audio.
  const sequence=++autoSequence;auto=10;syncControls();
  try{await audio.ensure();
    while(auto>0&&enabled&&sequence===autoSequence&&!disposed&&!document.hidden){const success=await playSpin();
      if(sequence!==autoSequence)break;
      if(!success||lastOutcome?.pendingBonusPick||lastOutcome?.jackpotTier){auto=0;break;}
      auto=Math.max(0,auto-1);syncControls();if(auto>0)await wait(550);}
  }catch(e){if(sequence===autoSequence)message(e.message,true);}
  finally{if(sequence===autoSequence)auto=0;syncControls();}}
async function showGamble(){if(!lastOutcome||gambleFinished||actionBusy||!model?.features.gambleRounds||!enabled||spinStarting||spinning||auto||pendingSpin())return;
  $('gamble-card').classList.remove('flipped');$('gamble-result').textContent='';$('pick-red').disabled=false;$('pick-black').disabled=false;$('options-dialog').close();$('gamble-panel').classList.remove('hidden');$('pick-red').focus();}
async function handleGamble(choice){if(!lastOutcome||gambleFinished||actionBusy||spinning||auto||!enabled||!model?.features.gambleRounds||pendingSpin())return;
  actionBusy=true;syncControls();
  const buttons=[$('pick-red'),$('pick-black')];buttons.forEach(b=>b.disabled=true);
  const storage=`superwin.gamble.${lastOutcome.roundId}`;
  let pending;try{pending=JSON.parse(sessionStorage.getItem(storage)||'null');}catch{pending=null;}
  if(pending&&pending.choice!==choice){$('gamble-result').textContent=`Retry existing ${pending.choice} selection.`;actionBusy=false;syncControls();buttons.forEach(b=>b.disabled=false);return;}
  try{if(!pending){pending={choice,token:crypto.randomUUID()};sessionStorage.setItem(storage,JSON.stringify(pending));}
  await audio.ensure().catch(()=>{});audio.playGambleFlip();const result=await gamble(lastOutcome.roundId,choice,pending.token);
    sessionStorage.removeItem(storage);lastGamble=result;
    $('card-color').textContent=result.cardColor;$('card-color').style.color=result.cardColor==='RED'?'#b32642':'#212536';
    $('gamble-card').classList.add('flipped');$('gamble-result').textContent=`${result.won?'WIN':'LOSE'} · payout ${cash(result.payout)} · round ${result.attempt}/${result.maxAttempts}`;
    setBalance(result.balanceAfter);$('result-label').textContent=result.won?'GAMBLE WON':'GAMBLE LOST';$('result-amount').textContent=cash(result.payout);$('result-banner').className='result-banner '+(result.won?'won':'lost');$('round-receipt').hidden=true;if(result.won)audio.playWinChime(Number(result.payout),Number(result.payout)/2);else audio.playGambleLoss();$('ice-win').textContent=String(result.payout);document.body.dataset.roundWon=String(Number(result.payout)>0);
    if(!result.won||result.attempt>=result.maxAttempts){gambleFinished=true;$('gamble-open').hidden=true;}
  }catch(e){if(isDefiniteRejection(e)){sessionStorage.removeItem(storage);gambleFinished=true;$('gamble-open').hidden=true;$('gamble-result').textContent=`Gamble unavailable: ${e.message}.`;}else $('gamble-result').textContent=`No result confirmed: ${e.message}. Retry the same choice.`;}
  finally{actionBusy=false;buttons.forEach(b=>b.disabled=gambleFinished);syncControls();}
}
async function handleBonus(index){if(!lastOutcome?.pendingBonusPick||actionBusy)return;
  const storage=`superwin.bonus.${lastOutcome.roundId}`;let pending;
  try{pending=JSON.parse(sessionStorage.getItem(storage)||'null');}catch{pending=null;}
  if(pending&&pending.index!==index){$('bonus-result').textContent=`Retry your original selection ${pending.index+1}.`;return;}
  const btns=[...document.querySelectorAll('[data-bonus-index]')];actionBusy=true;syncControls();btns.forEach(b=>b.disabled=true);
  try{if(!pending){pending={index,token:crypto.randomUUID()};sessionStorage.setItem(storage,JSON.stringify(pending));}
  await audio.ensure().catch(()=>{});const result=await pick(lastOutcome.roundId,index,pending.token);audio.playBonusPick();
    $('bonus-result').textContent=`Award ${cash(result.payout)} credited to the existing wallet`;
    setBalance(result.balanceAfter);sessionStorage.removeItem(storage);
    lastOutcome.pendingBonusPick=false;syncControls();await wait(1100);$('bonus-panel').classList.add('hidden');
  }catch(e){$('bonus-result').textContent=`Bonus pending: ${e.message}. Retry the same selection.`;}
  finally{actionBusy=false;syncControls();btns.forEach(b=>b.disabled=false);}
}
async function openHistory(){if(!signedIn||historyBusy||disposed)return;historyBusy=true;syncControls();try{const data=await rounds();if(disposed)return;const container=$('history-items');container.replaceChildren();
    for(const r of data.items.filter(r=>r.game_code===gameId).slice(0,20)){const item=document.createElement('p');item.textContent=`SPIN ID ${r.result_json?.roundId||r.round_id||r.id||'—'} · BET ${r.result_json?.bet??r.charged_stake} · WIN ${r.result_json?.finalWin??r.total_win} ETB`;container.append(item);}
    if(!container.children.length)container.textContent='No settled rounds for this game';$('options-dialog').close();$('history-panel').classList.remove('hidden');$('close-history').focus();}
  catch(e){message(e.message,true);}finally{historyBusy=false;syncControls();}}
function configureModel(next){
  const layout=validatePresentation(next,gameId);
  const previous=model;model=next;audio.setTheme(model.id);
  betIndex=Math.min(betIndex,Math.max(0,model.betLevels.length-1));
  const pending=pendingSpin();if(pending){const saved=model.betLevels.indexOf(pending.bet);if(saved>=0)betIndex=saved;}
  document.body.dataset.game=model.id;$('game-title').textContent=model.name;document.title=`${model.name} · SUPERWIN.BET`;
  document.body.className=`theme-${model.theme}`;$('line-count').textContent=String(model.paylines);
  $('game-subtitle').textContent=`${model.reels} REELS · ${model.paylines} FIXED PAYLINES`;
  $('reels-wrapper').style.setProperty('--reel-columns',model.reels);
  $('reels-wrapper').style.setProperty('--reel-rows',model.rows);
  updateWheel(model.wheel.values,layout.position);
  $('reels-wrapper').classList.toggle('reels-three',model.reels===3);
  $('game-frame').classList.toggle('safari-side',layout.position==='side');
  if(layout.position==='side')$('game-frame').prepend($('wheel'));else $('game-frame').before($('wheel'));
  drawBackground(model.reels,model.rows);
  applyDesign(model.id);
  // Purely graphical strips used for animation; outcome depends only on server math.
  const presentation={...model,reelStrips:model.previewReels};
  const symbolSet=value=>JSON.stringify([...new Set(value.previewReels.flat())].sort());
  const changed=!previous||previous.reels!==model.reels||previous.rows!==model.rows||symbolSet(previous)!==symbolSet(model);
  if(changed){reels?.dispose();reels=new ReelRenderer($('reel-canvas'),presentation,col=>{
      audio.playReelStop(col);const r=$('reel-canvas').getBoundingClientRect();fx?.sparks(r.left+(col+.5)*r.width/model.reels,r.top+r.height*.75);
    });
  }
  fx??=new ParticleLayer($('particles'));
  if(!animationFrame)animationFrame=requestAnimationFrame(fps);
  if(!sizeObserver){sizeObserver=new ResizeObserver(resize);sizeObserver.observe($('reels-wrapper'));}
  installQuickBets();installRules(model);updateBet();
  window.dispatchEvent(new CustomEvent('superwin:model-ready',{detail:{model}}));
}
function resize(){reels?.resize();fx?.resize();if(lastOutcome)drawLines(lastOutcome.winLines||[]);}
async function restoreFreeSpins({allowWhileSpinning=false}={}){
  if(!signedIn||!model||pendingSpin()||actionBusy||spinning&&!allowWhileSpinning)return;
  const requestedModel=model,requestedOutcome=lastOutcome;
  try{const data=await rounds();
    if(model!==requestedModel||lastOutcome!==requestedOutcome||pendingSpin()||actionBusy||spinning&&!allowWhileSpinning)return;
    const previous=data.items?.find(r=>r.game_code===model.id)?.result_json;
    if(!previous)return;const remaining=Number(previous.freeSpinsRemaining)||0;
    if(remaining>0){const saved=model.betLevels.indexOf(previous.bet);if(saved<0)return;betIndex=saved;}
    freeRemaining=remaining;$('free-spins').textContent=`FREE SPINS: ${freeRemaining}`;
    syncControls();
  }catch{/* The server still enforces the correct free-spin bet if history is unavailable. */}
}
async function boot(){
  if(initializing||spinStarting||spinning||actionBusy||auto>0||disposed)return;
  if(!supported.has(gameId)){location.replace('./lobby.html');return;}
  initializing=true;enabled=false;document.documentElement.dataset.swReady='false';$('sw-loading').hidden=false;$('sw-loading-error').hidden=true;syncControls();message('Connecting to the game service…');
  const retry=$('retry-game');if(retry)retry.hidden=true;
  $('play-state').textContent='CONNECTING';$('math-status').textContent='CONNECTING';
  try{
  const artRequest=loadAtlas().then(value=>({value}),error=>({error}));
  const sessionRequest=playerLoggedIn().catch(()=>false);
  const liveRequest=loadGame(gameId).then(value=>({value}),error=>({error}));
  const live=await liveRequest;if(disposed)return;
  const liveModelLoaded=!!live.value;
  if(!liveModelLoaded)throw live.error||Error('Game service unavailable. Please retry.');
  const art=await artRequest;if(art.error)throw art.error;
  configureModel(live.value);await reels.ready;if(disposed)return;
  resize();reels.render(performance.now());
  document.documentElement.dataset.swReady='true';$('sw-loading').hidden=true;
  message('Connecting to your wallet…');
  signedIn=await sessionRequest;if(disposed)return;
  if(signedIn){await updateBalance({quiet:true});await restoreFreeSpins();if(disposed)return;}
  enabled=liveModelLoaded&&model?.enabled===true&&signedIn&&!!reels;
  $('math-status').textContent=liveModelLoaded?'SERVER RULES':'GAME OFFLINE';
  $('play-state').textContent=enabled?'LIVE ENGINE':signedIn?'UNAVAILABLE':'SIGN IN';syncControls();
  if(retry)retry.hidden=enabled;
  if(!model){message('This game could not load. Retry the connection or return to the game list.',true);return;}
  if(!enabled)message(!liveModelLoaded?'Game service unavailable. No spin can be placed.':signedIn?'This game is not yet enabled.':'Sign in from Home to use your existing ETB wallet.',true);
  else message(pendingSpin()?'A round is awaiting confirmation. Press Spin to retry the same round.':'Ready to play');
  }catch(e){$('sw-loading-error').textContent=e.message;$('sw-loading-error').hidden=false;enabled=false;$('math-status').textContent='GAME OFFLINE';$('play-state').textContent='UNAVAILABLE';if(retry)retry.hidden=false;message(e.message,true);}
  finally{initializing=false;syncControls();}
}
$('bet-dec').addEventListener('click',()=>{if(!betLocked()&&betIndex>0){betIndex--;updateBet();}});
$('bet-inc').addEventListener('click',()=>{if(!betLocked()&&betIndex<model.betLevels.length-1){betIndex++;updateBet();}});
$('spin').addEventListener('click',spinClick);
$('autoplay').addEventListener('click',toggleAuto);
function syncAudioControls(){
  $('sound').textContent=audio.muted?'♪̸':'♫';$('sound').setAttribute('aria-pressed',String(audio.muted));$('sound').setAttribute('aria-label',audio.muted?'Turn sound on':'Turn sound off');
  $('sound-volume').value=String(Math.round(audio.volume*100));$('sound-level').value=`${Math.round(audio.volume*100)}%`;
}
syncAudioControls();
$('sound').addEventListener('click',async()=>{try{await audio.ensure();audio.mute(!audio.muted);syncAudioControls();if(!audio.muted)audio.playWheelClick();}catch(e){message('Sound is unavailable in this browser. You can continue playing.',true);}});
$('sound-volume').addEventListener('input',event=>{audio.setVolume(Number(event.target.value)/100);syncAudioControls();});
$('sound-test').addEventListener('click',async()=>{try{await audio.ensure();audio.mute(false);syncAudioControls();audio.playReelStop();audio.playWinChime(1);}catch{message('Sound is unavailable in this browser.',true);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.stopReelSpin();void audio.context?.suspend().catch(()=>{});}else if(audio.context){void audio.ensure().then(()=>{if(spinning)audio.playReelSpin();}).catch(()=>{});}});
window.addEventListener('pagehide',()=>audio.stopReelSpin());
$('gamble-open').addEventListener('click',showGamble);
$('ice-gamble').addEventListener('click',showGamble);
function acknowledgeWin(){
  if($('ice-acknowledge').disabled||spinning||actionBusy||pendingAction())return;
  // The engine has already credited this outcome. This only dismisses its display.
  winAcknowledged=true;gambleFinished=true;$('gamble-open').hidden=true;
  $('result-banner').className='result-banner';document.body.dataset.roundWon='false';
  message('Win already included in your balance.');syncControls();
}
$('ice-acknowledge').addEventListener('click',acknowledgeWin);
$('pick-red').addEventListener('click',()=>handleGamble('RED'));
$('pick-black').addEventListener('click',()=>handleGamble('BLACK'));
$('close-gamble').addEventListener('click',()=>{if(!actionBusy){$('gamble-panel').classList.add('hidden');$('options-open').focus();}});
for(const b of document.querySelectorAll('[data-bonus-index]'))b.addEventListener('click',()=>handleBonus(Number(b.dataset.bonusIndex)));
$('history').addEventListener('click',openHistory);
$('close-history').addEventListener('click',()=>{$('history-panel').classList.add('hidden');$('options-open').focus();});
$('sw-loading-retry').addEventListener('click',()=>void boot());
function unlockAudio(){void audio.ensure().then(()=>{document.removeEventListener('pointerdown',unlockAudio);document.removeEventListener('keydown',unlockAudio);}).catch(()=>{});}
document.addEventListener('pointerdown',unlockAudio);document.addEventListener('keydown',unlockAudio);
$('retry-game')?.addEventListener('click',()=>void boot());
boot().catch(e=>message(e.message,true));

window.addEventListener('resize',resize);
window.addEventListener('focus',()=>void updateBalance({quiet:true}));
document.addEventListener('visibilitychange',()=>{if(document.hidden){auto=0;autoSequence++;spinSequence++;spinStarting=false;syncControls();}else void updateBalance({quiet:true});});
window.addEventListener('pagehide',event=>{disposed=true;auto=0;autoSequence++;spinSequence++;spinStarting=false;cancelAnimationFrame(animationFrame);animationFrame=0;sizeObserver?.disconnect();if(!event.persisted)reels?.dispose();});
window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;sizeObserver?.observe($('reels-wrapper'));animationFrame=requestAnimationFrame(fps);syncControls();if(!enabled)void boot();else void updateBalance({quiet:true});}});

if(new URLSearchParams(location.search).get("qa")==="1"){import("./qa-check.js").then(async({runQA})=>{const report=await runQA();parent.postMessage({type:"superwin-qa",report},location.origin);});}

if('serviceWorker' in navigator)navigator.serviceWorker.register('/slots/sw.js',{scope:'/slots/'}).catch(()=>{});

