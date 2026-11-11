import {MachineAccountClient} from './machine74-api.mjs';
import {renderMachine,animateRound} from './machine74-renderer.mjs';
import {MachineAudio} from './machine74-audio.mjs';
import {existingWalletRoute} from './existing-wallet-routes.mjs';

const $=id=>document.getElementById(id);
const demo=new URLSearchParams(location.search).get('mode')==='demo';
const currency=demo?'DEMO':'ETB';
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
let definitions=[],game=null,snapshot=null,visual=null,animation=null,working=false,refreshing=false,autoplay=false,disposed=false,historyLoaded=false;
const listeners=new AbortController();
const on=(id,event,handler)=>$(id)?.addEventListener(event,handler,{signal:listeners.signal});
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
const decimal=minor=>{const n=BigInt(minor??'0');return String(n/100n)+'.'+String(n%100n).padStart(2,'0');};
function parsedStake(){const value=$('bet').value.trim();if(!/^\d{1,11}(?:\.\d{1,2})?$/.test(value))throw Error('Geli sharad sax ah.');const [whole,fraction='']=value.split('.');return String(BigInt(whole))+'.'+fraction.padEnd(2,'0');}
function options(){const out={};for(const el of $('options').querySelectorAll('[data-option]'))out[el.dataset.option]=el.type==='checkbox'?el.checked:el.dataset.option==='mode'?el.value:Number(el.value);return out;}
function collectAllowed(){const r=snapshot?.round;if(r?.status!=='active')return false;if(game?.family==='slots')return r.allowedActions?.includes('collect')===true;if(['ladder','mines'].includes(game?.family))return Number(r.step??r.history?.filter(x=>x.survived)?.length??0)>0;return game?.family==='crash';}
function updateControls(){
  const active=snapshot?.round?.status==='active',busy=working||refreshing,waiting=!!api.pending;
  const playable=!!snapshot&&snapshot.accepting===true&&snapshot.game?.launchable!==false&&!snapshot.other_active_game;
  $('play').disabled=busy||waiting||active||!playable;$('play').textContent=working&&!animation?'SUGAYA…':game?.id==='ind74_official_chickenhighway'?'START':game?.family==='slots'||game?.id==='ind74_official_rollx'?'SPIN':'BILOW';
  $('play').hidden=!!animation||(game?.id==='ind74_official_chickenhighway'&&active);$('stop').hidden=!animation;
  $('next').textContent=game?.id==='ind74_official_chickenhighway'?'GO':'TALLAABADA XIGTA';$('collect').textContent=game?.id==='ind74_official_chickenhighway'?'CASHOUT'+(collectAllowed()?' · '+decimal(snapshot?.round?.collectibleMinor):''):'QAADO';
  $('next').classList.toggle('primary',game?.id==='ind74_official_chickenhighway');$('collect').classList.toggle('highway-cashout',game?.id==='ind74_official_chickenhighway');
  $('next').hidden=game?.family!=='ladder'||(game?.id==='ind74_official_chickenhighway'&&(!active||!!animation));$('next').disabled=busy||waiting||!active;
  $('collect').hidden=!['crash','ladder','mines'].includes(game?.family)&&!game?.gamble?.enabled;$('collect').disabled=busy||waiting||!collectAllowed();
  const gamble=active&&snapshot?.round?.allowedActions?.includes('gamble');
  for(const id of ['gamble-red','gamble-black']){$(id).hidden=!gamble;$(id).disabled=busy||waiting||!gamble;}
  $('auto').hidden=['crash','ladder','mines'].includes(game?.family);$('auto').disabled=!autoplay&&(busy||waiting||!playable||active);$('auto').textContent=autoplay?'JOOJI AUTO':'AUTO · 5';
  $('game-select').disabled=busy||active||!definitions.length;
  for(const el of [$('bet'),$('bet-less'),$('bet-more'),...$('options').querySelectorAll('input,select')])el.disabled=busy||active||waiting||!playable;
  $('rules').disabled=!game;$('refresh').disabled=working||refreshing;
  $('retry').hidden=!waiting;$('retry').disabled=busy||api.pending?.body.game_id!==game?.id;
  $('balance').textContent=snapshot?.balance??'—';
  const r=snapshot?.round;$('win').textContent=r?.status==='settled'?decimal(r.payoutMinor??r.winMinor):r?.pendingWinMinor?decimal(r.pendingWinMinor):'—';
  $('win-label').textContent=(r?.status==='active'&&r?.pendingWinMinor?'GUUL SUGAYSA':'GUUL')+' · '+currency;
  $('round-status').textContent=animation?'Mashiinku wuu socda':r?.status==='active'?'Wareeg furan':r?.status==='settled'?'Server-ku wuu xaqiijiyey':'Sugaya wareeg';
}
function draw(){
  visual?.dispose?.();visual=null;
  if(game)visual=renderMachine($('stage'),game,snapshot?.round??null,{disabled:working||refreshing||!!api.pending||snapshot?.round?.status!=='active',reduced:reduced(),selectedOptions:options(),onAction:event=>{if(event?.type==='reveal')void act('reveal',event.options||{});}});
  updateControls();
}
function createOptions(){
  $('options').replaceChildren();
  if(game?.modes?.length){const label=document.createElement('label');label.textContent='HEERKA';const select=document.createElement('select');select.dataset.option='mode';select.setAttribute('aria-label','Heerka ciyaarta');for(const mode of game.modes){const o=document.createElement('option');o.value=mode;o.textContent=mode;select.append(o);}label.append(select);$('options').append(label);}
  if(game?.family==='dice'){const label=document.createElement('label');label.textContent='BARTILMAAMEED';const input=document.createElement('input');input.type='number';input.dataset.option='target';input.min=game.minTarget;input.max=game.maxTarget;input.step='1';input.value=game.defaultTarget;input.setAttribute('aria-label','Bartilmaameedka laadhuuga');label.append(input);$('options').append(label);}
  if(game?.gamble?.enabled){const label=document.createElement('label');label.className='hold-win';const input=document.createElement('input');input.type='checkbox';input.dataset.option='holdWin';input.setAttribute('aria-label','X2 ka dib guusha');label.append(input,document.createTextNode('X2 ka dib guusha'));$('options').append(label);}
}
function failure(error){
  autoplay=false;audio.stopSpin();audio.cue('error');
  if(error?.status===401){snapshot=null;$('login').hidden=demo;message(demo?'Fadhiga DEMO lama xaqiijin. Dib u hubi.':'Gal akoonka Player-ka si aad u hesho hadhaaga ETB.',true);}
  else message(error?.message||'Codsiga lama xaqiijin. Dib u hubi.',true);
}
async function refresh({silent=false}={}){
  if(!game||working||refreshing||disposed)return;
  refreshing=true;updateControls();
  try{
    const next=await api.state(game.id);snapshot=next;$('login').hidden=true;
    game={...game,...next.game,id:game.id};
    if(api.pending&&!silent)message(api.pending.body.game_id===game.id?'Codsigii hore lama xaqiijin. Isticmaal “Xaqiiji codsigii hore”.':'Codsi hore ayaa sugaya ciyaar kale. Dib ugu noqo ciyaartaas.',true);
    else if(next.other_active_game&&!silent)message('Wareeg kale ayaa furan: '+next.other_active_game+'. Marka hore dhammaystir.',true);
    else if(!next.accepting||next.game?.launchable===false){if(!silent)message('Ciyaartan weli lama heli karo. Fadlan dooro ciyaar kale.');}
    else if(!silent)message(next.round?.status==='active'?'Wareeggaagii furan ayaa dib loo helay.':demo?'DEMO waa diyaar. Isticmaal credits-ka bilaashka ah.':'Akoonka ETB waa la xaqiijiyey.');
  }catch(error){if(error?.code!=='STALE_RESPONSE'){snapshot=null;failure(error);}}
  finally{refreshing=false;if(!animation)draw();}
}
async function select(id){
  if(working||refreshing||snapshot?.round?.status==='active')return;
  autoplay=false;game=definitions.find(g=>g.id===id)||definitions[0];if(!game)return;
  snapshot=null;historyLoaded=false;$('history').replaceChildren();$('history-status').textContent='';
  $('game-title').textContent=game.catalogName||game.title;$('family').textContent=game.family.toUpperCase();$('game-select').value=game.id;
  $('play-now-link').href=existingWalletRoute(game.id)||'/independent74/machines74.html#'+encodeURIComponent(game.id);
  $('play-demo-link').href='/independent74/machines74.html?mode=demo#'+encodeURIComponent(game.id);
  history.replaceState(null,'','#'+game.id);createOptions();draw();await refresh();
}
async function present(next,previous){
  snapshot=next;historyLoaded=false;updateControls();
  visual?.dispose?.();visual=null;
  animation=animateRound($('stage'),game,previous,next.round,{turbo:$('turbo').checked,reduced:reduced(),audio,disabled:true});
  updateControls();await animation.promise;animation?.dispose?.();animation=null;
  const r=next.round;
  message(r?.status==='active'?(r.pendingWinMinor?'Guushaadu way sugaysaa. Qaado ama dooro CASAAN / MADOW (X2).':'Wareeggu wuu furan yahay. Dooro tallaabada xigta.'):'Wareegga iyo hadhaaga waxaa xaqiijiyey server-ka.');
}
async function run(kind,input){
  if(working||refreshing||!snapshot||disposed)return false;
  working=true;const previous=snapshot.round;updateControls();
  try{
    await audio.unlock();audio.startSpin();
    const next=kind==='start'?await api.start(parsedStake(),options()):kind==='retry'?await api.retryPending():await api.act(kind,input||{});
    audio.stopSpin();await present(next,previous);return true;
  }catch(error){failure(error);return false;}
  finally{animation?.dispose?.();animation=null;working=false;draw();}
}
const play=()=>run('start');
const act=(kind,input)=>run(kind,input);
async function auto(){
  if(autoplay){autoplay=false;updateControls();return;}
  if(['crash','ladder','mines'].includes(game?.family)||working||refreshing)return;
  autoplay=true;updateControls();
  for(let n=0;n<5&&autoplay&&!disposed;n++){
    if(document.hidden||!await play())break;
    if(n<4&&autoplay)await new Promise(resolve=>setTimeout(resolve,$('turbo').checked?120:650));
  }
  autoplay=false;updateControls();
}
function showRules(){
  if(!game)return;$('rules-title').textContent=(game.catalogName||game.title)+' · Xeerarka';$('rules-body').replaceChildren();
  const paragraph=text=>{const p=document.createElement('p');p.textContent=displayText(text);$('rules-body').append(p);};
  for(const rule of game.rules||[])paragraph(rule);
  if(game.limits?.maxBetMinor)paragraph('Sharadka: '+decimal(game.limits.minBetMinor)+'–'+decimal(game.limits.maxBetMinor)+' '+currency+'.');
  if(game.symbols?.length){const table=document.createElement('table'),head=document.createElement('tr');for(const text of ['Calaamad','3','4','5']){const th=document.createElement('th');th.textContent=text;head.append(th);}table.append(head);for(const s of game.symbols){const tr=document.createElement('tr');for(const text of [s.label||s.id,...[3,4,5].map(n=>s.pays?.[n]??'—')]){const td=document.createElement('td');td.textContent=text;tr.append(td);}table.append(tr);}$('rules-body').append(table);}
  else if(game.paytable?.length){const pre=document.createElement('pre');pre.textContent=JSON.stringify(game.paytable,null,2);$('rules-body').append(pre);}
  paragraph('Xisaabta waa nooca ZPLAY ee server-ka. Isku ekaanshaha xisaabta gaarka ah iyo dhammaan astaamaha demo-ga weli lama xaqiijin.');
  $('rules-dialog').showModal();
}
async function loadHistory(){
  if(!game||!snapshot||historyLoaded)return;
  const id=game.id;$('history-status').textContent='Soo dejinaya…';
  try{const records=await api.history(id);if(game.id!==id)return;$('history').replaceChildren();for(const item of records){const li=document.createElement('li');const r=item.round||item;li.textContent=(r.round_id||r.id||'Wareeg')+' · Sharad '+decimal(r.stakeMinor??r.total_stake??r.betMinor??'0')+' '+currency+' · Guul '+decimal(r.payoutMinor??r.winMinor??'0')+' '+currency;$('history').append(li);}$('history-status').textContent=records.length?'':'Wareeg hore lama helin.';historyLoaded=true;}catch(error){$('history-status').textContent=error.message;}
}
function stepBet(direction){try{const current=BigInt(parsedStake().replace('.',''));const steps=(game?.stakeValues||PRESETS).filter(x=>{const n=BigInt(x.replace('.',''));return n>=100n&&n<=2000n&&n%100n===0n;});const next=direction>0?steps.find(x=>BigInt(x.replace('.',''))>current):[...steps].reverse().find(x=>BigInt(x.replace('.',''))<current);if(next)$('bet').value=next;}catch{$('bet').value='1.00';}}
on('play','click',play);on('next','click',()=>act('reveal',{}));on('collect','click',()=>act('collect',{}));
on('gamble-red','click',()=>act('gamble',{color:'red'}));on('gamble-black','click',()=>act('gamble',{color:'black'}));
on('options','change',()=>{if(!working&&!refreshing&&snapshot?.round?.status!=='active')draw();});
on('stop','click',()=>{autoplay=false;animation?.stop?.();updateControls();});on('auto','click',auto);on('refresh','click',()=>refresh());on('retry','click',()=>run('retry'));
on('game-select','change',()=>select($('game-select').value));on('bet-less','click',()=>stepBet(-1));on('bet-more','click',()=>stepBet(1));
on('rules','click',showRules);on('close-rules','click',()=>$('rules-dialog').close());
on('sound','click',async()=>{const enabled=$('sound').getAttribute('aria-pressed')!=='true';await audio.unlock();audio.setMuted(!enabled);$('sound').setAttribute('aria-pressed',String(enabled));$('sound').textContent=enabled?'CODKA · SHIDAN':'CODKA · DAMMAN';if(enabled)audio.cue('button');});
on('volume','input',()=>audio.setVolume(Number($('volume').value)/100));
document.querySelector('.history').addEventListener('toggle',event=>{if(event.target.open)void loadHistory();},{signal:listeners.signal});
document.addEventListener('visibilitychange',()=>{if(document.hidden){autoplay=false;animation?.stop?.();audio.stopSpin();updateControls();}else void refresh({silent:true});},{signal:listeners.signal});
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(definitions.some(g=>g.id===id)&&id!==game?.id)void select(id);},{signal:listeners.signal});
window.addEventListener('pagehide',()=>{disposed=true;autoplay=false;animation?.dispose?.();visual?.dispose?.();audio.dispose();listeners.abort();clearInterval(poll);},{once:true});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
const poll=setInterval(()=>{if(!document.hidden&&!working&&!refreshing&&snapshot?.round?.status==='active'&&game?.family==='crash')void refresh({silent:true});},800);
if(new URLSearchParams(location.search).get('compare')==='1')document.body.classList.add('comparison-embed');
audio.setMuted(true);audio.setVolume(.65);
try{
  definitions=await api.catalog();$('game-select').replaceChildren();
  for(const d of definitions){const option=document.createElement('option');option.value=d.id;option.textContent=d.catalogName||d.title;$('game-select').append(option);}
  await select(location.hash.slice(1));
}catch(error){failure(error);updateControls();}
