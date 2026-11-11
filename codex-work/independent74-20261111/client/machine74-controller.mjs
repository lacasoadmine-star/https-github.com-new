import {MachineAccountClient} from './machine74-api.mjs';
import {renderMachine,animateRound} from './machine74-renderer.mjs';
import {MachineAudio} from './machine74-audio.mjs';
import {existingWalletRoute} from './existing-wallet-routes.mjs';
import {isPlinkoX,plinkoxBatch,plinkoxRiskAvailable} from './plinkox-controls.mjs';
import {machineSignInHref,requestPlayerSignIn,notifyPlayerWallet,canStartRound,startRoundOptions,gamblePresentation,slotSpinLabel,slotPaytable,roundNeedsRecovery,publicCurrentRound,activeRoundStake} from './machine74-controls.mjs';
import {isGatesTumble} from './gates74-presentation.mjs';
import {hasPaidFeatureModes,paidFeatureDefinition,featureStakePreview,featureModeTotal} from './paid74-feature.mjs';
import {isChargingWilds,chargingStakePreview,chargingAnteTotal,chargingRoundMatchesSelection} from './charging74-presentation.mjs';
import {CHICKEN_HEARTBEAT_MS,canSyncChickenPresence,pendingChickenSync,renewChickenPresence} from './chicken74-presence.mjs';
import {CHICKEN_AUTO_MAX_ROUNDS,hasChickenAutoplay,chickenAutoplaySteps,chickenAutoplayPlan,runChickenAutoplay} from './chicken74-autoplay.mjs';

const $=id=>document.getElementById(id);
const demo=new URLSearchParams(location.search).get('mode')==='demo';
const currency=demo?'DEMO':'ETB';
const embedded=new URLSearchParams(location.search).get('embedded')==='1';
if(embedded)document.body.classList.add('dashboard-embed');
const api=new MachineAccountClient({mode:demo?'demo':'account'});
document.body.dataset.mode=demo?'demo':'account';
for(const label of document.querySelectorAll('[data-currency]'))label.textContent=currency;
$('bet').setAttribute('aria-label','Sharadka '+currency+'; qiimayaasha bilowga 1 ilaa 20');
$('mode-status').textContent=demo?'DEMO · Lacag bilaash ah oo tijaabo ah. Wallet-ka ETB lama isticmaalo.':'ETB · Wallet-ka Player-ka. Server-ku waa inuu xaqiijiyaa akoonka iyo oggolaanshaha ciyaarta.';
$(demo?'play-demo-link':'play-now-link').setAttribute('aria-current','page');
$('play-demo-link').hidden=!demo&&new URLSearchParams(location.search).get('qa')!=='1';
const displayText=text=>demo?String(text).replace(/\bETB\b/g,'DEMO'):String(text);
const audio=new MachineAudio();
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const PRESETS=Array.from({length:20},(_,i)=>(i+1)+'.00');
let definitions=[],game=null,snapshot=null,visual=null,animation=null,working=false,refreshing=false,loadingCatalogue=false,autoplay=false,disposed=false,historyLoaded=false;
let committedBallAmount=1,pendingBallAmount=null;
let restorePlinkoOptions=false;
let committedTumbleMode='base',restoreTumbleOptions=false;
let committedChargingAnte=1,restoreChargingOptions=false;
let presenceNeedsRefresh=false;
let chickenAutoTask=null,chickenAutoProgress=null;
const isDestiny=()=>game?.id==='ind74_official_wheelofdestiny';
let wheelAllocations=[],wheelUndo=[],restoreWheelBets=false;
const amountPreference='zplay.plinkox.amount-warning.'+currency;
let skipAmountWarning=false;try{skipAmountWarning=sessionStorage.getItem(amountPreference)==='1';}catch{}
const listeners=new AbortController();
const on=(id,event,handler)=>$(id)?.addEventListener(event,handler,{signal:listeners.signal});
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
const walletChanged=()=>notifyPlayerWallet({gameId:game?.id,embedded,demo,hostWindow:window});
const decimal=minor=>{const n=BigInt(minor??'0');return String(n/100n)+'.'+String(n%100n).padStart(2,'0');};
function parsedStake(){const value=$('bet').value.trim();if(!/^\d{1,11}(?:\.\d{1,2})?$/.test(value))throw Error('Geli sharad sax ah.');const [whole,fraction='']=value.split('.');return String(BigInt(whole))+'.'+fraction.padEnd(2,'0');}
function options(){if(isDestiny())return {bets:wheelAllocations.map(item=>({...item}))};const out={};for(const el of $('options').querySelectorAll('[data-option]'))out[el.dataset.option]=el.type==='checkbox'?el.checked:['mode','risk'].includes(el.dataset.option)?el.value:Number(el.value);return out;}
function wheelChipMinor(){const minor=BigInt(parsedStake().replace('.',''));if(minor<100n||minor%100n!==0n)throw Error('Use whole '+currency+' chips of at least1.');return minor;}
function wheelPreview(){if(!isDestiny())return null;wheelChipMinor();if(!wheelAllocations.length)throw Error('Choose at least one field.');const total=wheelAllocations.reduce((sum,item)=>sum+BigInt(item.amountMinor),0n);return {totalBetMinor:total.toString(),totalStake:decimal(total.toString())};}
function paintWheelChoices(){if(!isDestiny())return;for(const button of $('options').querySelectorAll('[data-wheel-symbol]')){const field=game.betFields.find(f=>f.symbolIndex===Number(button.dataset.wheelSymbol)),bet=wheelAllocations.find(b=>b.symbolIndex===field.symbolIndex);button.textContent=field.label+' · '+(field.implemented===false?'Unavailable':bet?decimal(bet.amountMinor):'+');button.classList.toggle('is-staked',!!bet);button.setAttribute('aria-pressed',String(!!bet));}}
function editWheel(type,symbolIndex){if(!isDestiny()||working||refreshing||api.pending||snapshot?.round?.status==='active')return;try{const previous=structuredClone(wheelAllocations),chip=wheelChipMinor();if(type==='undo'){wheelAllocations=wheelUndo.pop()??wheelAllocations;}else{wheelUndo.push(previous);if(wheelUndo.length>30)wheelUndo.shift();if(type==='clear')wheelAllocations=[];else{const indexes=type==='all'?game.betFields.filter(f=>f.implemented!==false).map(f=>f.symbolIndex):[symbolIndex];for(const index of indexes){if(!game.betFields.find(f=>f.symbolIndex===index&&f.implemented!==false))throw Error('That field is unavailable.');const existing=wheelAllocations.find(b=>b.symbolIndex===index);if(existing)existing.amountMinor=(BigInt(existing.amountMinor)+chip).toString();else wheelAllocations.push({symbolIndex:index,amountMinor:chip.toString()});}wheelAllocations.sort((a,b)=>a.symbolIndex-b.symbolIndex);}}paintWheelChoices();updateControls();}catch(error){message(error.message,true);}}
function batchPreview(){if(!isPlinkoX(game))return null;return plinkoxBatch(game,parsedStake(),options());}
function tumblePreview(){if(!hasPaidFeatureModes(game))return null;return featureStakePreview(game,parsedStake(),options().mode);}
function chargingPreview(){if(!isChargingWilds(game))return null;return chargingStakePreview(game,parsedStake(),options().ante??game.chargingFeature.defaultAnte);}
function stopAutoplay(){autoplay=false;if(chickenAutoTask)chickenAutoTask.cancelled=true;}
function chickenAutoSelection(){return chickenAutoplayPlan(game,{stake:parsedStake(),mode:options().mode??game.defaultMode,rounds:Number($('options').querySelector('[data-chicken-auto=rounds]')?.value),targetStep:Number($('options').querySelector('[data-chicken-auto=step]')?.value)});}
function paintChickenAutoSteps(){
  if(!hasChickenAutoplay(game))return;
  const select=$('options').querySelector('[data-chicken-auto=step]');if(!select)return;
  select.replaceChildren();
  for(const row of chickenAutoplaySteps(game,options().mode??game.defaultMode)){const option=document.createElement('option');option.value=String(row.step);option.textContent=row.step+' · '+row.multiplierBps/10000+'×';select.append(option);}
}
function collectAllowed(){const r=snapshot?.round;if(r?.status!=='active'||roundNeedsRecovery(snapshot))return false;if(game?.family==='slots'||game?.id==='ind74_official_chickenhighway')return r.allowedActions?.includes('collect')===true;if(['ladder','mines'].includes(game?.family))return Number(r.step??r.history?.filter(x=>x.survived)?.length??0)>0;return game?.family==='crash';}
function updateControls(){
  const active=snapshot?.round?.status==='active',busy=working||refreshing,waiting=!!api.pending,recovering=roundNeedsRecovery(snapshot);
  const playable=!!snapshot&&snapshot.accepting===true&&snapshot.game?.launchable!==false&&!snapshot.other_active_game;
  let batch=null,batchError='';try{batch=batchPreview();}catch(error){batchError=error.message;}
  const batchOverLimit=batch&&game?.limits?.maxBetMinor&&BigInt(batch.totalBetMinor)>BigInt(game.limits.maxBetMinor);
  const batchUnavailable=!!batchError||!!batchOverLimit||$('plinko-amount-dialog').open;
  let tumble=null,tumbleError='';try{tumble=tumblePreview();}catch(error){tumbleError=error.message;}
  const tumbleOverLimit=tumble&&game?.limits?.maxBetMinor&&BigInt(tumble.totalBetMinor)>BigInt(game.limits.maxBetMinor),tumbleUnavailable=!!tumbleError||!!tumbleOverLimit;
  const tumbleStatus=$('tumble-total-preview');if(tumbleStatus)tumbleStatus.textContent=tumbleError||'BASE '+tumble.baseStake+' × '+tumble.costBps/10000+' = TOTAL '+tumble.totalStake+' '+currency+(tumbleOverLimit?' · Above the current total-bet limit.':'');
  let charging=null,chargingError='';try{charging=chargingPreview();}catch(error){chargingError=error.message;}
  const chargingOverLimit=charging&&game?.limits?.maxBetMinor&&BigInt(charging.totalBetMinor)>BigInt(game.limits.maxBetMinor),chargingUnavailable=!!chargingError||!!chargingOverLimit;
  const chargingStatus=$('charging-total-preview');if(chargingStatus)chargingStatus.textContent=chargingError||'BASE '+charging.baseStake+' × '+charging.ante+' = TOTAL '+charging.totalStake+' '+currency+(chargingOverLimit?' · Above the current total-bet limit.':'');
  let wheel=null,wheelError='';try{wheel=wheelPreview();}catch(error){wheelError=error.message;}const wheelOverLimit=wheel&&game?.limits?.maxBetMinor&&BigInt(wheel.totalBetMinor)>BigInt(game.limits.maxBetMinor);const wheelUnavailable=!!wheelError||!!wheelOverLimit;const wheelTotal=$('wheel-total-preview');if(wheelTotal)wheelTotal.textContent=wheelError||'TOTAL BET '+wheel.totalStake+' '+currency+(wheelOverLimit?' · Above the current total-bet limit.':'');
  const preview=$('batch-preview');if(preview)preview.textContent=batchError||('TOTAL BET '+decimal(batch.perBallBetMinor)+' × '+batch.ballAmount+' = '+decimal(batch.totalBetMinor)+' '+currency+(batchOverLimit?' · Above the current total-bet limit.':''));
  const held=gamblePresentation(game,recovering?null:snapshot?.round);
  const chicken=hasChickenAutoplay(game);let chickenPlan=null,chickenError='';if(chicken)try{chickenPlan=chickenAutoSelection();}catch(error){chickenError=error.message;}
  const chickenPreview=$('chicken-auto-preview');if(chickenPreview)chickenPreview.textContent=chickenError||'AUTO: '+chickenPlan.rounds+' wareeg · CASHOUT tallaabada '+chickenPlan.targetStep+'. STOP wuxuu joojiyaa tallaabooyinka xiga; wareegga furan waxaad ku sii maamuli kartaa GO/CASHOUT.';
  $('play').disabled=busy||waiting||presenceNeedsRefresh||chicken&&autoplay||!canStartRound(snapshot)||batchUnavailable||wheelUnavailable||tumbleUnavailable||chargingUnavailable;$('play').textContent=working&&!animation?'SUGAYA…':isPlinkoX(game)?'HOLD & DROP':isDestiny()?'SPIN':game?.id==='ind74_official_chickenhighway'?'START':hasPaidFeatureModes(game)?(options().mode?.startsWith('buy')?(game.coinFeature?'BUY COIN FEATURE':'BUY FREE SPINS'):'HOLD & SPIN'):game?.family==='slots'?slotSpinLabel(game):game?.id==='ind74_official_rollx'?'SPIN':'BILOW';
  $('play').hidden=!!animation||held.pending||(game?.id==='ind74_official_chickenhighway'&&active);$('stop').hidden=!animation;
  $('next').textContent=game?.id==='ind74_official_chickenhighway'?'GO':'TALLAABADA XIGTA';$('collect').textContent=game?.id==='ind74_official_chickenhighway'?'CASHOUT'+(collectAllowed()?' · '+decimal(snapshot?.round?.collectibleMinor):''):'QAADO';
  $('next').classList.toggle('primary',game?.id==='ind74_official_chickenhighway');$('collect').classList.toggle('highway-cashout',game?.id==='ind74_official_chickenhighway');
  if(held.pending)$('collect').textContent='COLLECT · '+decimal(snapshot.round.pendingWinMinor)+' '+currency;
  $('next').hidden=game?.family!=='ladder'||(game?.id==='ind74_official_chickenhighway'&&(!active||!!animation));$('next').disabled=busy||waiting||presenceNeedsRefresh||chicken&&autoplay||!active||recovering||game?.id==='ind74_official_chickenhighway'&&!snapshot?.round?.allowedActions?.includes('reveal');
  $('collect').hidden=!['crash','ladder','mines'].includes(game?.family)&&!game?.gamble?.enabled;$('collect').disabled=busy||waiting||presenceNeedsRefresh||chicken&&autoplay||!collectAllowed();
  const gamble=held.canGamble;
  for(const id of ['gamble-red','gamble-black']){$(id).hidden=!gamble;$(id).disabled=busy||waiting||presenceNeedsRefresh||!gamble;}
  $('gamble-status').hidden=!held.pending;
  $('gamble-status').textContent=held.pending?(gamble?'Dooro CASAAN / MADOW ama qaado guusha.':'Qaado guushaada.')+(held.remaining===null?'':' X2: '+held.remaining+' isku day ayaa hadhay.') : '';
  $('auto').hidden=!chicken&&['crash','ladder','mines'].includes(game?.family)||hasPaidFeatureModes(game)&&options().mode?.startsWith('buy');$('auto').disabled=!autoplay&&(busy||waiting||presenceNeedsRefresh||!playable||active||batchUnavailable||wheelUnavailable||tumbleUnavailable||chargingUnavailable||!!chickenError);$('auto').textContent=autoplay?'JOOJI AUTO'+(chickenAutoProgress?' · '+chickenAutoProgress.completed+'/'+chickenAutoProgress.requested:''):'AUTO · '+(chickenPlan?.rounds??5);
  $('game-select').disabled=busy||active||autoplay||!definitions.length;
  // Configuration is available while account verification or settlement is pending.
  // Only actions that submit wagers depend on the server's accepting flag.
  for(const el of [$('bet'),$('bet-less'),$('bet-more'),...$('options').querySelectorAll('input,select')])el.disabled=busy||active||waiting||autoplay||!game;
  if(isDestiny())for(const button of $('options').querySelectorAll('button'))button.disabled=busy||active||waiting||!game||button.dataset.wheelSupported==='0';
  $('rules').disabled=!game;$('refresh').disabled=working||refreshing||loadingCatalogue;
  $('retry').hidden=!waiting;$('retry').disabled=busy||api.pending?.body.game_id!==game?.id;
  $('balance').textContent=snapshot?.balance??'—';
  const r=snapshot?.round;$('win').textContent=r?.status==='settled'?decimal(r.payoutMinor??r.winMinor):r?.pendingWinMinor?decimal(r.pendingWinMinor):'—';
  $('win-label').textContent=(r?.status==='active'&&r?.pendingWinMinor?'GUUL SUGAYSA':'GUUL')+' · '+currency;
  $('round-status').textContent=presenceNeedsRefresh?'Xiriirka sugaya xaqiijin':recovering?'Wareeg hore · soo-celin server':animation?'Mashiinku wuu socda':r?.status==='active'?'Wareeg furan':r?.status==='settled'?'Server-ku wuu xaqiijiyey':'Sugaya wareeg';
}
function draw(){
  visual?.dispose?.();visual=null;
  const selected=options(),differentSelection=isPlinkoX(game)&&snapshot?.round?.outcome?.risk!==selected.risk||hasPaidFeatureModes(game)&&snapshot?.round?.outcome?.mode!==selected.mode||isChargingWilds(game)&&!chargingRoundMatchesSelection(game,snapshot?.round,$('bet').value.trim(),selected.ante??game.chargingFeature.defaultAnte);
  const shownRound=differentSelection?null:publicCurrentRound(snapshot);
  if(game)visual=renderMachine($('stage'),game,shownRound,{disabled:working||refreshing||presenceNeedsRefresh||!!api.pending||snapshot?.round?.status!=='active',reduced:reduced(),selectedOptions:selected,onAction:event=>{if(event?.type==='reveal')void act('reveal',event.options||{});}});
  updateControls();
}
function createOptions(){
  $('options').replaceChildren();
  if(game?.modes?.length&&!hasPaidFeatureModes(game)){const label=document.createElement('label');label.textContent='HEERKA';const select=document.createElement('select');select.dataset.option='mode';select.setAttribute('aria-label','Heerka ciyaarta');for(const mode of game.modes){const o=document.createElement('option');o.value=mode;o.textContent=mode;select.append(o);}label.append(select);$('options').append(label);}
  if(hasChickenAutoplay(game)){
    const countLabel=document.createElement('label');countLabel.textContent='AUTO · WAREEGYO';const count=document.createElement('input');count.type='number';count.min='1';count.max=String(CHICKEN_AUTO_MAX_ROUNDS);count.step='1';count.value='5';count.dataset.chickenAuto='rounds';count.setAttribute('aria-label','Tirada wareegyada AUTO, 1 ilaa '+CHICKEN_AUTO_MAX_ROUNDS);countLabel.append(count);
    const stepLabel=document.createElement('label');stepLabel.textContent='AUTO · CASHOUT';const step=document.createElement('select');step.dataset.chickenAuto='step';step.setAttribute('aria-label','Tallaabada cashout-ka AUTO');stepLabel.append(step);
    const preview=document.createElement('p');preview.id='chicken-auto-preview';preview.className='batch-preview';preview.setAttribute('role','status');
    $('options').append(countLabel,stepLabel,preview);paintChickenAutoSteps();
  }
  if(hasPaidFeatureModes(game)){
    const label=document.createElement('label');label.textContent='FEATURE';const select=document.createElement('select');select.dataset.option='mode';select.setAttribute('aria-label',game.coinFeature?'Coin feature mode':'Free-spin feature mode');
    for(const mode of paidFeatureDefinition(game).modes){const option=document.createElement('option');option.value=mode;option.textContent=(mode.startsWith('buy')?(game.coinFeature?'COIN FEATURE':'FREE SPINS'):mode.toUpperCase())+' · '+paidFeatureDefinition(game).costBps[mode]/10000+'×';option.selected=mode===committedTumbleMode;select.append(option);}label.append(select);
    const preview=document.createElement('p');preview.id='tumble-total-preview';preview.className='batch-preview';preview.setAttribute('role','status');const note=document.createElement('small');note.className='hold-win-note';note.textContent='TOTAL BET waa lacagta oo dhan; feature-ku lacag kale kama jaro.';$('options').append(label,preview,note);
  }
  if(isChargingWilds(game)){
    if(game.chargingFeature.anteValues.length>1){const label=document.createElement('label');label.textContent='ANTE';const select=document.createElement('select');select.dataset.option='ante';select.setAttribute('aria-label','Charging Wilds ANTE');for(const ante of game.chargingFeature.anteValues){const option=document.createElement('option');option.value=String(ante);option.textContent=ante===1?'NORMAL · 1×':'ANTE · '+ante+'×';option.selected=ante===committedChargingAnte;select.append(option);}label.append(select);$('options').append(label);}
    const preview=document.createElement('p');preview.id='charging-total-preview';preview.className='batch-preview';preview.setAttribute('role','status');const note=document.createElement('small');note.className='hold-win-note';note.textContent='TOTAL BET waa lacagta oo dhan. Wild-yada waxaa loo kaydiyaa sharadka aasaasiga ah iyo ANTE-ga.';$('options').append(preview,note);
  }
  if(game?.family==='dice'){const label=document.createElement('label');label.textContent='BARTILMAAMEED';const input=document.createElement('input');input.type='number';input.dataset.option='target';input.min=game.minTarget;input.max=game.maxTarget;input.step='1';input.value=game.defaultTarget;input.setAttribute('aria-label','Bartilmaameedka laadhuuga');label.append(input);$('options').append(label);}
  if(isPlinkoX(game)){
    const riskLabel=document.createElement('label');riskLabel.textContent='VERSION';const risk=document.createElement('select');risk.dataset.option='risk';risk.setAttribute('aria-label','Plinko X version');
    for(const level of game.riskLevels){const available=plinkoxRiskAvailable(game,level.id),item=document.createElement('option');item.value=level.id;item.textContent=level.label+(available?'':' · Not available');item.disabled=!available;item.selected=level.id===game.defaultRisk;risk.append(item);}riskLabel.append(risk);
    const amountLabel=document.createElement('label');amountLabel.textContent='AMOUNT';const amount=document.createElement('select');amount.dataset.option='ballAmount';amount.setAttribute('aria-label','Number of balls');for(const count of game.ballAmounts){const item=document.createElement('option');item.value=String(count);item.textContent=String(count);item.selected=count===game.defaultBallAmount;amount.append(item);}amountLabel.append(amount);
    const preview=document.createElement('p');preview.id='batch-preview';preview.className='batch-preview';preview.setAttribute('role','status');$('options').append(riskLabel,amountLabel,preview);
  }
  if(isDestiny()){
    wheelAllocations=[{symbolIndex:game.defaultBetSymbolIndex??0,amountMinor:wheelChipMinor().toString()}];wheelUndo=[];
    const grid=document.createElement('div');grid.className='wheel-bet-grid';grid.setAttribute('aria-label','Wheel multiplier allocations');
    for(const field of game.betFields){const button=document.createElement('button');button.type='button';button.dataset.wheelSymbol=String(field.symbolIndex);button.dataset.wheelSupported=field.implemented===false?'0':'1';button.className='wheel-bet-field wheel-field-'+field.symbolIndex;button.disabled=field.implemented===false;grid.append(button);}
    const tools=document.createElement('div');tools.className='wheel-bet-tools';for(const[type,text]of [['clear','CLEAR'],['all','ALL'],['undo','UNDO']]){const button=document.createElement('button');button.type='button';button.dataset.wheelEdit=type;button.textContent=text;tools.append(button);}
    const preview=document.createElement('p');preview.id='wheel-total-preview';preview.className='batch-preview';preview.setAttribute('role','status');$('options').append(grid,tools,preview);paintWheelChoices();
  }
  if(game?.gamble?.enabled){const label=document.createElement('label');label.className='hold-win';const input=document.createElement('input');input.type='checkbox';input.checked=true;input.dataset.option='holdWin';input.setAttribute('aria-label','X2 ka dib guusha');label.append(input,document.createTextNode('X2 ka dib guusha'));const note=document.createElement('small');note.className='hold-win-note';note.textContent='AUTO wuxuu si toos ah u qaadaa guusha.';$('options').append(label,note);}
}
async function syncPresence({retry=false}={}){
  if(disposed||working||refreshing||!game||document.hidden)return false;
  if(retry?!pendingChickenSync(api.pending)||api.pending.body.game_id!==game.id:!canSyncChickenPresence(game,snapshot,{hidden:document.hidden,working,refreshing,pending:api.pending,disposed,needsRefresh:presenceNeedsRefresh}))return false;
  refreshing=true;updateControls();
  const previous=snapshot;let redraw=false;
  try{
    const next=await renewChickenPresence(api,{retry});
    snapshot=next;presenceNeedsRefresh=false;game={...game,...next.game,id:game.id};
    const settled=previous?.round?.status==='active'&&next.round?.status==='settled';
    if(next.balance!==previous?.balance||settled){historyLoaded=false;walletChanged();}
    redraw=retry||settled||next.round?.step!==previous?.round?.step;
    if(settled){stopAutoplay();message('Server-ku wuxuu xaqiijiyey cashout-ka markii xiriirku hakaday.');}
    else if(retry)message('Xiriirka iyo xaaladda wareegga waxaa xaqiijiyey server-ka.');
    return true;
  }catch(error){
    stopAutoplay();presenceNeedsRefresh=true;
    if(error?.status===401){snapshot=null;$('login').hidden=demo;redraw=true;}
    message(error?.message||'Xiriirka lama xaqiijin. Dib u hubi xaaladda wareegga.',true);
    return false;
  }finally{
    refreshing=false;
    if(redraw&&!animation)draw();else updateControls();
  }
}
function failure(error){
  stopAutoplay();audio.stop();audio.cue('error');
  if(error?.status===401){snapshot=null;$('login').hidden=demo;message(demo?'Fadhiga DEMO lama xaqiijin. Dib u hubi.':'Gal akoonka Player-ka si aad u hesho hadhaaga ETB.',true);}
  else message(error?.message||'Codsiga lama xaqiijin. Dib u hubi.',true);
}
async function refresh({silent=false}={}){
  stopAutoplay();
  if(disposed)return;
  if(!game)return loadCatalogue();
  if(working||refreshing)return;
  refreshing=true;updateControls();
  try{
    const next=await api.state(game.id);const previousBalance=snapshot?.balance;snapshot=next;presenceNeedsRefresh=pendingChickenSync(api.pending);$('login').hidden=true;
    if(next.balance!==undefined&&next.balance!==previousBalance)walletChanged();
    game={...game,...next.game,id:game.id};
    const activeStake=activeRoundStake(next);if(activeStake&&!isPlinkoX(game)&&!isDestiny())$('bet').value=decimal(activeStake);
    if(hasChickenAutoplay(game)&&next.round?.status==='active'&&game.modes.includes(next.round.mode)){const mode=$('options').querySelector('[data-option=mode]');if(mode&&mode.value!==next.round.mode){mode.value=next.round.mode;paintChickenAutoSteps();}}
    if(restorePlinkoOptions&&isPlinkoX(game)){
      const receipt=publicCurrentRound(next)?.outcome;
      if(receipt){const restored=plinkoxBatch(game,decimal(receipt.perBallBetMinor),{risk:receipt.risk,ballAmount:receipt.ballAmount});$('options').querySelector('[data-option=risk]').value=restored.risk;$('options').querySelector('[data-option=ballAmount]').value=String(restored.ballAmount);$('bet').value=decimal(restored.perBallBetMinor);committedBallAmount=restored.ballAmount;}
      restorePlinkoOptions=false;
    }
    if(restoreWheelBets&&isDestiny()){const restored=publicCurrentRound(next);if(restored?.bets?.length)wheelAllocations=restored.bets.map(item=>({...item}));restoreWheelBets=false;paintWheelChoices();}
    if(restoreTumbleOptions&&hasPaidFeatureModes(game)){const receipt=publicCurrentRound(next)?.outcome;if(receipt){featureStakePreview(game,decimal(receipt.totalBetMinor),receipt.mode);$('options').querySelector('[data-option=mode]').value=receipt.mode;$('bet').value=decimal(receipt.totalBetMinor);committedTumbleMode=receipt.mode;}restoreTumbleOptions=false;}
    if(restoreChargingOptions&&isChargingWilds(game)){const receipt=publicCurrentRound(next)?.outcome;if(receipt){chargingStakePreview(game,decimal(receipt.totalBetMinor),receipt.ante);const select=$('options').querySelector('[data-option=ante]');if(select)select.value=String(receipt.ante);$('bet').value=decimal(receipt.totalBetMinor);committedChargingAnte=receipt.ante;}restoreChargingOptions=false;}
    if(roundNeedsRecovery(next))message('Wareeg nooc hore ah ayaa u baahan soo-celinta server-ka. Qiimaha la kaydiyey waa muuqdaa; la xiriir taageerada Player-ka.',true);
    else if(api.pending&&!silent)message(api.pending.body.game_id===game.id?'Codsigii hore lama xaqiijin. Isticmaal “Xaqiiji codsigii hore”.':'Codsi hore ayaa sugaya ciyaar kale. Dib ugu noqo ciyaartaas.',true);
    else if(next.other_active_game&&!silent)message('Wareeg kale ayaa furan: '+next.other_active_game+'. Marka hore dhammaystir.',true);
    else if(!next.accepting||next.game?.launchable===false){if(!silent)message('Mashiinka iyo dejintu way furan yihiin. SPIN-ka ETB wuxuu sugayaa xaqiijinta server-ka, wallet-ka iyo settlement-ka.');}
    else if(!silent)message(next.round?.status==='active'?'Wareeggaagii furan ayaa dib loo helay.':demo?'DEMO waa diyaar. Isticmaal credits-ka bilaashka ah.':'Akoonka ETB waa la xaqiijiyey.');
  }catch(error){if(error?.code!=='STALE_RESPONSE'){snapshot=null;failure(error);}}
  finally{refreshing=false;if(!animation)draw();}
}
async function select(id){
  if(working||refreshing||snapshot?.round?.status==='active')return;
  const previousGameId=game?.id;
  stopAutoplay();game=definitions.find(g=>g.id===id)||definitions[0];if(!game)return;
  if(previousGameId!==game.id)$('bet').value='1.00';
  snapshot=null;presenceNeedsRefresh=false;historyLoaded=false;$('history').replaceChildren();$('history-status').textContent='';
  pendingBallAmount=null;if($('plinko-amount-dialog').open)$('plinko-amount-dialog').close();committedBallAmount=game.defaultBallAmount??1;
  restorePlinkoOptions=isPlinkoX(game);restoreWheelBets=isDestiny();
  restoreTumbleOptions=hasPaidFeatureModes(game);committedTumbleMode=paidFeatureDefinition(game)?.defaultMode??'base';
  restoreChargingOptions=isChargingWilds(game);committedChargingAnte=game.chargingFeature?.defaultAnte??1;
  $('game-title').textContent=game.catalogName||game.title;$('family').textContent=game.family.toUpperCase();$('game-select').value=game.id;
  $('bet-caption').textContent=isPlinkoX(game)?'BET PER BALL':isDestiny()?'CHIP':hasPaidFeatureModes(game)||isChargingWilds(game)?'TOTAL BET':'SHARAD';
  $('bet').setAttribute('aria-label',(hasPaidFeatureModes(game)||isChargingWilds(game)?'Wadarta sharadka ':'Sharadka ')+currency);
  $('play-now-link').href=existingWalletRoute(game.id)||'/independent74/machines74.html#'+encodeURIComponent(game.id);
  $('play-demo-link').href='/independent74/machines74.html?mode=demo#'+encodeURIComponent(game.id);
  $('login').href=machineSignInHref(game.id);
  history.replaceState(null,'','#'+game.id);createOptions();draw();await refresh();
}
async function present(next,previous,action){
  snapshot=next;historyLoaded=false;updateControls();
  visual?.dispose?.();visual=null;
  animation=animateRound($('stage'),game,previous,next.round,{turbo:$('turbo').checked,reduced:reduced(),audio,disabled:true,action});
  updateControls();await animation.promise;animation?.dispose?.();animation=null;
  const r=next.round;
  message(r?.status==='active'?(r.pendingWinMinor?'Guushaadu way sugaysaa. Qaado ama dooro CASAAN / MADOW (X2).':'Wareeggu wuu furan yahay. Dooro tallaabada xigta.'):'Wareegga iyo hadhaaga waxaa xaqiijiyey server-ka.');
}
async function run(kind,input,autoRequest=null){
  if(working||refreshing||!snapshot||disposed)return false;
  if(chickenAutoTask&&autoRequest?.task!==chickenAutoTask){stopAutoplay();updateControls();return false;}
  if(autoRequest&&(!autoplay||autoRequest.task!==chickenAutoTask||autoRequest.task.cancelled||document.hidden))return false;
  if(kind!=='retry'&&(roundNeedsRecovery(snapshot)||presenceNeedsRefresh))return false;
  if(kind==='start'&&!canStartRound(snapshot))return false;
  if(game?.id==='ind74_official_chickenhighway'&&!['start','retry'].includes(kind)&&!snapshot.round?.allowedActions?.includes(kind))return false;
  working=true;const previous=snapshot.round;updateControls();
  try{
    await audio.unlock();if(kind==='start'){audio.stop();audio.startSpin();}else audio.cue('button');
    if(autoRequest&&(!autoplay||autoRequest.task.cancelled||chickenAutoTask!==autoRequest.task||document.hidden))return false;
    let next;
    if(kind==='start')next=await api.start(autoRequest?.plan.stake??(isPlinkoX(game)?batchPreview().totalStake:isDestiny()?wheelPreview().totalStake:isChargingWilds(game)?chargingPreview().totalStake:hasPaidFeatureModes(game)?tumblePreview().totalStake:parsedStake()),autoRequest?{mode:autoRequest.plan.mode}:startRoundOptions(game,options(),{autoplay}));
    else if(kind==='retry'){
      next=await api.retryPending();
      if(game?.id==='ind74_official_chickenhighway'){presenceNeedsRefresh=true;next=await api.state(game.id);presenceNeedsRefresh=false;}
    }else next=await api.act(kind,input||{});
    walletChanged();await present(next,previous,kind);return true;
  }catch(error){if(game?.id==='ind74_official_chickenhighway'&&(error?.ambiguous||error?.status===409||kind==='retry'))presenceNeedsRefresh=true;failure(error);return false;}
  finally{animation?.dispose?.();animation=null;audio.stopSpin();working=false;draw();}
}
const play=()=>run('start');
const act=(kind,input)=>run(kind,input);
async function auto(){
  if(autoplay){stopAutoplay();updateControls();return;}
  if(hasChickenAutoplay(game)){
    if(chickenAutoTask||working||refreshing||document.hidden||presenceNeedsRefresh||!canStartRound(snapshot)||api.pending)return;
    let plan;try{plan=chickenAutoSelection();}catch(error){message(error.message,true);return;}
    const task={cancelled:false};chickenAutoTask=task;chickenAutoProgress={completed:0,requested:plan.rounds};autoplay=true;updateControls();
    try{
      const result=await runChickenAutoplay({definition:game,plan,
        read:()=>({gameId:game?.id,snapshot,pending:api.pending,needsRefresh:presenceNeedsRefresh,busy:working||refreshing,hidden:document.hidden,disposed,running:autoplay&&chickenAutoTask===task&&!task.cancelled}),
        request:(kind,input)=>run(kind,input,{task,plan}),
        wait:kind=>new Promise(resolve=>setTimeout(resolve,kind==='busy'?100:$('turbo').checked?120:650)),
        onProgress:progress=>{chickenAutoProgress=progress;updateControls();}});
      if(result.reason==='completed')message('AUTO: '+result.completed+' wareeg ayaa server-ku xaqiijiyey.');
      else if(result.reason==='insufficient-balance')message('AUTO waa istaagay: hadhaagu kuma filna sharadka xiga.');
      else if(result.reason==='connection-timeout'){presenceNeedsRefresh=true;message('AUTO waa istaagay: server-ku wuxuu xaqiijiyey cashout-ka xiriirka. Dib u hubi ka hor wareeg cusub.');}
    }catch(error){failure(error);}
    finally{if(chickenAutoTask===task){chickenAutoTask=null;chickenAutoProgress=null;autoplay=false;updateControls();}}
    return;
  }
  if(['crash','ladder','mines'].includes(game?.family)||working||refreshing)return;
  if(hasPaidFeatureModes(game)&&options().mode?.startsWith('buy'))return;
  if(!canStartRound(snapshot)||api.pending)return;
  autoplay=true;updateControls();
  for(let n=0;n<5&&autoplay&&!disposed;n++){
    if(document.hidden||!await play())break;
    if(snapshot?.round?.status==='active')break;
    if(n<4&&autoplay)await new Promise(resolve=>setTimeout(resolve,$('turbo').checked?120:650));
  }
  autoplay=false;updateControls();
}
function showRules(){
  if(!game)return;$('rules-title').textContent=(game.catalogName||game.title)+' · Xeerarka';$('rules-body').replaceChildren();
  const paragraph=text=>{const p=document.createElement('p');p.textContent=displayText(text);$('rules-body').append(p);};
  for(const rule of game.rules||[])paragraph(rule);
  if(game.limits?.maxBetMinor)paragraph('Sharadka: '+decimal(game.limits.minBetMinor)+'–'+decimal(game.limits.maxBetMinor)+' '+currency+'.');
  if(isGatesTumble(game)){const table=document.createElement('table'),head=document.createElement('tr'),counts=[...new Set(game.tumbleFeature.countPaytable.flatMap(row=>row.tiers.map(tier=>tier.minimumCount)))].sort((a,b)=>a-b);for(const text of ['Calaamad',...counts.map(count=>count+'+')]){const th=document.createElement('th');th.textContent=text;head.append(th);}table.append(head);for(const row of game.tumbleFeature.countPaytable){const tr=document.createElement('tr');for(const text of [game.symbols.find(s=>s.id===row.symbolId)?.label||row.symbolId,...counts.map(count=>{const tier=row.tiers.find(t=>t.minimumCount===count);return tier?tier.multiplierBps/10000+'×':'—';})]){const td=document.createElement('td');td.textContent=text;tr.append(td);}table.append(tr);}$('rules-body').append(table);paragraph('Jadwalka ZPLAY: qiimayaashani waxay ku dhufanayaan sharadka aasaasiga ah. Abaalmarinta demo-ga rasmiga ah oo dhan weli lama xaqiijin.');}
  else if(game.family==='slots'&&game.symbols?.length){const model=slotPaytable(game),table=document.createElement('table'),head=document.createElement('tr');for(const text of ['Calaamad',...model.counts.map(String)]){const th=document.createElement('th');th.textContent=text;head.append(th);}table.append(head);for(const row of model.rows){const tr=document.createElement('tr');for(const text of [row.label,...row.awards.map(n=>n===null?'—':n+'×')]){const td=document.createElement('td');td.textContent=text;tr.append(td);}table.append(tr);}$('rules-body').append(table);paragraph(game.ways?'Qiimayaasha ways-ka ee nooca ZPLAY; xeerarka kore ayaa sharxaya sharadka iyo isku-darka.':'Qiimuhu wuxuu ku dhufanayaa sharadka khadka; multiplier-ka server-ku wuxuu kordhiyaa wadarta guusha.');}
  else if(game.paytable?.length){const pre=document.createElement('pre');pre.textContent=JSON.stringify(game.paytable,null,2);$('rules-body').append(pre);}
  if(game.multiplierValues?.length)paragraph('Multiplier: '+game.multiplierValues.map(value=>value+'×').join(' · ')+'.');
  if(game.gamble?.enabled)paragraph('X2: guul sugaysa ayaad qaadan kartaa ama ku qiyaasi kartaa CASAAN / MADOW. Qiyaas sax ahi way labanlaabtaa; mid khaldan way lumisaa. Nooca ZPLAY wuxuu leeyahay ilaa '+game.gamble.maxRounds+' isku day. AUTO si toos ah ayuu guusha u qaadaa.');
  if(hasChickenAutoplay(game))paragraph('Chicken AUTO: dooro tirada wareegyada iyo tallaabada CASHOUT-ka. Guul ama khasaaro la xaqiijiyey ka dib ayuu bilaabaa wareegga xiga, ilaa tiradu dhammaato, aad joojiso ama hadhaagu ku filnaan waayo. Xadka ZPLAY waa 1–'+CHICKEN_AUTO_MAX_ROUNDS+' wareeg; liiska tirooyinka demo-ga rasmiga ah weli lama xaqiijin. STOP wuxuu joojiyaa tallaabooyinka xiga, mana samaynayo sharad ama cashout kale. Xiriir aan la xaqiijin ama bog qarsoon ayaa joojiya AUTO; dib ayuu u bilaabmaa oo keliya markaad adigu doorato.');
  paragraph('Xisaabta waa nooca ZPLAY ee server-ka. Isku ekaanshaha xisaabta gaarka ah iyo dhammaan astaamaha demo-ga weli lama xaqiijin.');
  $('rules-dialog').showModal();
}
async function loadHistory(){
  if(!game||historyLoaded)return;
  if(!snapshot){$('history-status').textContent='Gal akoonkaaga oo dib u hubi si aad u hesho history-ga server-ka.';return;}
  if(snapshot.historyAvailable===false){$('history-status').textContent='History-ga ciyaartan weli backend-ka laguma xaqiijin. Wareeg lacag leh lama bilaabin.';return;}
  const id=game.id;$('history-status').textContent='Soo dejinaya…';
  try{const records=await api.history(id);if(game.id!==id)return;$('history').replaceChildren();for(const item of records){const li=document.createElement('li');const r=item.round||item;li.textContent=(r.round_id||r.id||'Wareeg')+' · Sharad '+decimal(r.stakeMinor??r.total_stake??r.betMinor??'0')+' '+currency+' · Guul '+decimal(r.payoutMinor??r.winMinor??'0')+' '+currency;$('history').append(li);}$('history-status').textContent=records.length?'':'Wareeg hore lama helin.';historyLoaded=true;}catch(error){$('history-status').textContent=error.message;}
}
function stepBet(direction){
  const featureStep=()=>hasPaidFeatureModes(game)?paidFeatureDefinition(game).totalStakeStepMinor[options().mode]:isChargingWilds(game)?game.chargingFeature.totalStakeStepMinor[options().ante??game.chargingFeature.defaultAnte]:null;
  try{const current=BigInt(parsedStake().replace('.','')),configured=featureStep();if(configured){const step=BigInt(configured),next=(current/step+BigInt(direction))*step;if(next>=step&&(!game.limits?.maxBetMinor||next<=BigInt(game.limits.maxBetMinor)))$('bet').value=decimal(next);}else{const steps=(game?.stakeValues||PRESETS).filter(x=>{const n=BigInt(x.replace('.',''));return n>=100n&&n<=2000n&&n%100n===0n;});const next=direction>0?steps.find(x=>BigInt(x.replace('.',''))>current):[...steps].reverse().find(x=>BigInt(x.replace('.',''))<current);if(next)$('bet').value=next;}}catch{$('bet').value=featureStep()?decimal(featureStep()):'1.00';}
  if(isChargingWilds(game))draw();else if(isPlinkoX(game)||isDestiny()||hasPaidFeatureModes(game)||hasChickenAutoplay(game))updateControls();
}
on('play','click',play);on('next','click',()=>act('reveal',{}));on('collect','click',()=>act('collect',{}));
on('login','click',event=>requestPlayerSignIn(event,{gameId:game?.id,embedded,hostWindow:window}));
on('gamble-red','click',()=>act('gamble',{color:'red'}));on('gamble-black','click',()=>act('gamble',{color:'black'}));
on('options','click',event=>{const field=event.target.closest('[data-wheel-symbol]'),edit=event.target.closest('[data-wheel-edit]');if(field&&!field.disabled)editWheel('add',Number(field.dataset.wheelSymbol));else if(edit&&!edit.disabled)editWheel(edit.dataset.wheelEdit);});
on('options','change',event=>{
  if(working||refreshing||autoplay||snapshot?.round?.status==='active')return;
  if(hasChickenAutoplay(game)&&event.target.dataset.option==='mode')paintChickenAutoSteps();
  if(hasPaidFeatureModes(game)&&event.target.dataset.option==='mode'){autoplay=false;const nextMode=event.target.value;$('bet').value=featureModeTotal(game,$('bet').value.trim(),committedTumbleMode,nextMode);committedTumbleMode=nextMode;}
  if(isChargingWilds(game)&&event.target.dataset.option==='ante'){autoplay=false;const nextAnte=Number(event.target.value);$('bet').value=chargingAnteTotal(game,$('bet').value.trim(),committedChargingAnte,nextAnte);committedChargingAnte=nextAnte;}
  if(isPlinkoX(game)&&event.target.dataset.option==='ballAmount'){
    autoplay=false;const selected=Number(event.target.value);
    if(selected!==committedBallAmount&&!skipAmountWarning){
      event.target.value=String(committedBallAmount);
      try{const batch=plinkoxBatch(game,parsedStake(),{...options(),ballAmount:selected});pendingBallAmount={amount:selected,gameId:game.id,guard:snapshot?.sessionGuard};$('plinko-amount-cost').textContent='You selected '+selected+' balls at '+decimal(batch.perBallBetMinor)+' '+currency+' per ball. Pressing Drop will submit one batch with a total bet of '+decimal(batch.totalBetMinor)+' '+currency+'.';$('plinko-amount-skip').checked=false;$('plinko-amount-dialog').showModal();updateControls();}catch(error){message(error.message,true);}return;
    }
    committedBallAmount=selected;
  }
  draw();
});
on('options','input',event=>{if(event.target.dataset.chickenAuto&&!working&&!refreshing&&!autoplay)updateControls();});
on('plinko-amount-agree','click',()=>{
  const pending=pendingBallAmount;if(!pending||pending.gameId!==game?.id||pending.guard!==snapshot?.sessionGuard||working||refreshing)return;
  $('options').querySelector('[data-option=ballAmount]').value=String(pending.amount);committedBallAmount=pending.amount;
  if($('plinko-amount-skip').checked){skipAmountWarning=true;try{sessionStorage.setItem(amountPreference,'1');}catch{}}
  pendingBallAmount=null;$('plinko-amount-dialog').close();draw();
});
on('plinko-amount-cancel','click',()=>$('plinko-amount-dialog').close());
on('plinko-amount-dialog','close',()=>{pendingBallAmount=null;updateControls();$('options').querySelector('[data-option=ballAmount]')?.focus();});
on('bet','input',()=>{if(!working&&!refreshing){if(isChargingWilds(game))draw();else if(isPlinkoX(game)||isDestiny()||hasPaidFeatureModes(game)||hasChickenAutoplay(game))updateControls();}});
on('stop','click',()=>{stopAutoplay();animation?.stop?.();updateControls();});on('auto','click',auto);on('refresh','click',()=>refresh());on('retry','click',()=>pendingChickenSync(api.pending)?syncPresence({retry:true}):run('retry'));
on('game-select','change',()=>select($('game-select').value));on('bet-less','click',()=>stepBet(-1));on('bet-more','click',()=>stepBet(1));
on('rules','click',showRules);on('close-rules','click',()=>$('rules-dialog').close());
on('sound','click',async()=>{const enabled=$('sound').getAttribute('aria-pressed')!=='true';await audio.unlock();audio.setMuted(!enabled);$('sound').setAttribute('aria-pressed',String(enabled));$('sound').textContent=enabled?'CODKA · SHIDAN':'CODKA · DAMMAN';if(enabled)audio.cue('button');});
on('volume','input',()=>audio.setVolume(Number($('volume').value)/100));
document.querySelector('.history').addEventListener('toggle',event=>{if(event.target.open)void loadHistory();},{signal:listeners.signal});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAutoplay();animation?.stop?.();audio.stopSpin();updateControls();}else void refresh({silent:true});},{signal:listeners.signal});
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(definitions.some(g=>g.id===id)&&id!==game?.id)void select(id);},{signal:listeners.signal});
window.addEventListener('pagehide',()=>{disposed=true;stopAutoplay();animation?.dispose?.();visual?.dispose?.();audio.dispose();listeners.abort();clearInterval(poll);clearInterval(presencePoll);},{once:true});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
const poll=setInterval(()=>{if(!document.hidden&&!working&&!refreshing&&snapshot?.round?.status==='active'&&game?.family==='crash')void refresh({silent:true});},800);
const presencePoll=setInterval(()=>{void syncPresence();},CHICKEN_HEARTBEAT_MS);
if(new URLSearchParams(location.search).get('compare')==='1')document.body.classList.add('comparison-embed');
audio.setMuted(true);audio.setVolume(.65);
async function loadCatalogue(){
  if(loadingCatalogue||disposed)return;
  loadingCatalogue=true;$('stage').setAttribute('aria-busy','true');
  if($('loading-label'))$('loading-label').textContent='Soo dejinaya ciyaarta…';
  message('Soo dejinaya ciyaarta iyo xeerarkeeda…');updateControls();
  try{
    const loaded=await api.catalog();if(disposed)return;
    definitions=loaded;$('game-select').replaceChildren();
    for(const d of definitions){const option=document.createElement('option');option.value=d.id;option.textContent=d.catalogName||d.title;$('game-select').append(option);}
    await select(location.hash.slice(1));
  }catch(error){
    if($('loading-label'))$('loading-label').textContent='Ciyaarta lama soo dejin. Taabo “Dib u hubi”.';
    failure(error);
  }finally{
    loadingCatalogue=false;$('stage').setAttribute('aria-busy','false');updateControls();
  }
}
await loadCatalogue();

