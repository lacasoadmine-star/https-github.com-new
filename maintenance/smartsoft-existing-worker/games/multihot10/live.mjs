import {FreshAccountClient,FreshAccountError,minor,money} from '/independent74/fresh74-account.mjs?v=r18';

const $=id=>document.getElementById(id),ASSETS='/independent74/mh10/assets/';
const SYMBOLS=['seven','bell','grape','watermelon','lemon','plum','orange','cherry'];
const DEFAULT_GRID=[['watermelon','grape','plum','cherry','cherry'],['grape','cherry','orange','bell','bell'],['watermelon','cherry','lemon','grape','cherry']];
const LINES=[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0]];
const PAYS={seven:[50,200,1000],bell:[20,100,200],grape:[10,50,100],watermelon:[10,50,100],lemon:[5,10,50],plum:[5,10,50],orange:[5,10,50],cherry:[5,10,50]};
const WHEEL=[2,4,2,5,1,3,5,2,3,4,1,3,5],LEVELS=[10,20,50,100,200,500,1000,2000,5000,10000,20000];
const account=new FreshAccountClient();
let snapshot=null,phase='loading',bet=10,betChoice=10,grid=DEFAULT_GRID.map(row=>[...row]),modelLevels=[...LEVELS],fast=false,fastStop=false;
let autoRemaining=0,autoStartBalance=0,autoLossLimit=1000,autoStopWin=true,animationEpoch=0,wheelAngle=0,acknowledged=new Set(),releaseVisualWait=null,lastStopAt=-1000;
let settings={effects:false,music:false,effectsVolume:70,musicVolume:35,consent:false};
try{settings={...settings,...JSON.parse(localStorage.getItem('zplay.mh10.audio.v1')||'{}')};acknowledged=new Set(JSON.parse(sessionStorage.getItem('zplay.mh10.taken.v1')||'[]').slice(-50));}catch{}
const soundFiles={click:'sound-buttonsdefault.mp3',spin:'sound-buttonsspin.mp3',moving:'sound-objectmove.mp3',win:'sound-win.mp3',multiplier:'sound-winmultiplier.mp3',gambleWin:'sound-doublewin.mp3',gambleLose:'sound-doublelose.mp3',take:'sound-doubletake.mp3'};
const soundCache=new Map(),music=new Audio(ASSETS+'sound-background.mp3');music.loop=true;music.preload='none';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const busy=()=>['requesting','spinning','gambling','recovering'].includes(phase);
const authenticated=()=>snapshot?.authenticated===true;
const accepting=()=>authenticated()&&snapshot.game.enabled&&snapshot.game.freshReleaseReady&&snapshot.game.wagerAvailability!=='house_capacity'&&!snapshot.blockedByActiveGame;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const rounded=value=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value));
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function saveSettings(){try{localStorage.setItem('zplay.mh10.audio.v1',JSON.stringify(settings));}catch{}applyAudio();}
function sound(name){
 if(!settings.effects)return;
 const file=soundFiles[name];if(!file)return;
 let audio=soundCache.get(name);if(!audio){audio=new Audio(ASSETS+file);audio.preload='none';soundCache.set(name,audio);}
 audio.volume=Math.max(0,Math.min(1,Number(settings.effectsVolume)/100));audio.currentTime=0;audio.play().catch(()=>{});
}
function applyAudio(){
 music.volume=Math.max(0,Math.min(1,Number(settings.musicVolume)/100));
 if(settings.music&&!document.hidden)music.play().catch(()=>{});else music.pause();
 $('sound').setAttribute('aria-pressed',String(settings.effects||settings.music));
 $('effects-enabled').checked=!!settings.effects;$('music-enabled').checked=!!settings.music;
 $('effects-volume').value=settings.effectsVolume;$('music-volume').value=settings.musicVolume;
}
function dialog(id){autoRemaining=0;update();const element=$(id);if(!element.open)element.showModal();}
for(const close of document.querySelectorAll('[data-close]'))close.addEventListener('click',()=>close.closest('dialog').close());
for(const element of document.querySelectorAll('dialog'))element.addEventListener('click',event=>{if(event.target!==element)return;const box=element.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)element.close();});

const columns=Array.from({length:5},(_,col)=>{
 const reel=document.createElement('div');reel.className='reel';
 for(let row=0;row<3;row++){
  const cell=document.createElement('div');cell.className='cell';cell.dataset.row=row;cell.dataset.col=col;
  const image=document.createElement('img');image.className='symbol';image.alt=grid[row][col];image.draggable=false;image.src=ASSETS+'symbol-'+grid[row][col]+'.webp';cell.append(image);reel.append(cell);
 }
 $('reels').append(reel);return reel;
});
function renderGrid(value){
 grid=value.map(row=>[...row]);
 for(let col=0;col<5;col++)for(let row=0;row<3;row++){
  const symbol=grid[row][col],image=columns[col].children[row].querySelector('.symbol');
  image.src=ASSETS+'symbol-'+symbol+'.webp';image.alt=symbol;
 }
}
function clearWins(){
 animationEpoch++;$('win-lines').replaceChildren();$('win-display').hidden=true;
 for(const cell of document.querySelectorAll('.cell')){cell.classList.remove('winning');cell.querySelector('.win-effect')?.remove();}
}
function update(){
 $('balance').textContent=snapshot?rounded(snapshot.balance):'—';$('bet-amount').textContent=money(bet);
 $('spin-label').textContent=busy()?'STOP':'SPIN';$('spin').setAttribute('aria-label',busy()?'STOP · dhammee muuqaalka wareeggan':'SPIN');
 $('spin-image').src=ASSETS+(busy()?'spin-stop.webp':'spin.webp');
 $('spin').disabled=phase==='loading'||phase==='gambling'||phase==='recovering'||!!account.pending&&!account.busy;
 $('bet').disabled=busy()||autoRemaining>0||!modelLevels.length;$('bet-display').disabled=$('bet').disabled;
 $('auto').disabled=busy()&&autoRemaining===0;
 $('auto-count').hidden=autoRemaining===0;$('auto-count').textContent=String(autoRemaining);
 $('retry').hidden=!account.pending;$('retry').disabled=account.busy;
 const gamble=snapshot?.round?.gamble,roundId=snapshot?.round?.result?.roundId;
 $('gamble-win').hidden=!gamble?.available||acknowledged.has(roundId);
 $('gamble-win').disabled=busy();$('take-win').disabled=busy();
 $('turbo').setAttribute('aria-pressed',String(fast));
}
function applySnapshot(state,{render=true}={}){
 snapshot=state;
 modelLevels=state.game.betLevels.map(minor);if(modelLevels.length&&!modelLevels.includes(bet))bet=modelLevels[0];
 if(render&&state.round?.result?.grid)renderGrid(state.round.result.grid);
 update();
}
function reason(error){
 const code=error?.code||error?.message||'CONNECTION_UNAVAILABLE';
 if(/LOGIN|SIGN_IN|UNAUTH|SESSION/.test(code))return 'Gal akoonkaaga ZPLAY, kadib dib u fur ciyaarta.';
 if(code==='INSUFFICIENT_FUNDS')return 'Hadhaaga wallet-ka kuma filna sharadkan.';
 if(code==='HOUSE_RESERVE_INSUFFICIENT')return 'Sharadkan hadda lama qaabili karo. Hadhaagaaga waxba lagama jarin; dooro sharad ka hooseeya.';
 if(code==='FRESH_RELEASE_NOT_ENABLED')return 'Xiriirka ciyaarta ayaa la diyaarinayaa. Dib u hubi.';
 if(code.includes('ACTIVE'))return 'Marka hore dhammee wareegga kale ee akoonkaaga.';
 if(code==='ACCOUNT_BALANCE_LIMIT')return 'Sharadkani wuxuu dhaafayaa xadka akoonka.';
 if(code==='RATE_LIMIT')return 'Sug wax yar ka hor wareegga xiga.';
 if(error?.ambiguous)return 'Natiijada weli lama xaqiijin. Dib u xaqiiji codsigii hore.';
 return 'Xiriirka ciyaarta lama xaqiijin. Dib u hubi.';
}
async function sync({quiet=false}={}){
 if(account.busy)return;
 try{
  const state=await account.refresh();applySnapshot(state);phase='idle';
  if(!quiet)message(accepting()?'':state.blockedByActiveGame?'Dhammee wareegga kale ee akoonkaaga.':state.game.wagerAvailability==='house_capacity'?'Sharad lama qaabili karo hadda. Hadhaagaaga waxba lagama jarin.':'Ciyaarta ayaa la diyaarinayaa.');
 }catch(error){
  phase='idle';if(error.status===401||error.status===403)snapshot=null;
  if(!quiet)message(error.status===401?'Gal akoonkaaga si aad u ciyaarto.':reason(error),error.status!==401);
 }finally{update();}
}
function tickReels(epoch){
 let last=0,step=0;
 const tick=time=>{
  if(epoch!==animationEpoch||!busy()||fastStop)return;
  if(time-last>75){
   for(let col=0;col<5;col++)for(let row=0;row<3;row++){
    const image=columns[col].children[row].querySelector('.symbol');image.src=ASSETS+'symbol-'+SYMBOLS[(step+col*3+row)%SYMBOLS.length]+'.webp';image.alt='Reel-ka oo wareegaya';
   }
   last=time;step++;
  }
  requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}
function startReels(){
 clearWins();phase='requesting';fastStop=false;
 for(const reel of columns){reel.classList.remove('stopping','paused');reel.classList.add('spinning');}
 tickReels(animationEpoch);sound('spin');sound('moving');message('');update();
}
function stopReels(result){
 animationEpoch++;soundCache.get('moving')?.pause();
 renderGrid(result.grid);
 for(const reel of columns){reel.classList.remove('spinning','paused');reel.classList.add('stopping');}
 setTimeout(()=>{for(const reel of columns)reel.classList.remove('stopping');},250);
 const target=-WHEEL.indexOf(result.wheelMultiplier)*(360/WHEEL.length);
 wheelAngle=Math.ceil(wheelAngle/360)*360+720+target;
 if(!reduced())$('wheel').animate([{transform:$('wheel').style.transform||'rotate(0deg)'},{transform:`rotate(${wheelAngle}deg)`}],{duration:fast||fastStop?250:900,easing:'cubic-bezier(.12,.73,.16,1)',fill:'forwards'});
 $('wheel').style.transform=`rotate(${wheelAngle}deg)`;$('multiplier').textContent=result.wheelMultiplier+'x';
 if(result.wheelMultiplier>1)sound('multiplier');
 showResult(result);
}
function showResult(result){
 $('win-amount').textContent=rounded(result.finalWin);$('win-display').hidden=minor(result.finalWin)===0;
 if(minor(result.finalWin)===0){message('');return;}
 sound('win');message('');
 const winning=new Set();
 for(const line of result.winLines){
  const polyline=document.createElementNS('http://www.w3.org/2000/svg','polyline');
  polyline.setAttribute('points',line.positions.map(p=>`${p.col*100+50},${p.row*100+50}`).join(' '));$('win-lines').append(polyline);
  for(const position of line.positions){const cell=columns[position.col].children[position.row];cell.classList.add('winning');winning.add(cell);}
 }
 if(!reduced()){
  const epoch=animationEpoch,effects=[...winning].map(cell=>{const image=document.createElement('img');image.className='win-effect';image.alt='';cell.append(image);return image;});
  const started=performance.now();
  const animate=time=>{if(epoch!==animationEpoch||time-started>5400){for(const image of effects)image.remove();return;}const frame=Math.floor((time-started)/50)%36+1;for(const image of effects)image.src=ASSETS+`win-${String(frame).padStart(2,'0')}.webp`;requestAnimationFrame(animate);};requestAnimationFrame(animate);
 }
}
async function play(){
 if(busy()){fastStop=true;lastStopAt=performance.now();autoRemaining=0;for(const reel of columns)reel.classList.add('paused');soundCache.get('moving')?.pause();releaseVisualWait?.();message('Hubinaya natiijada wareegga…');update();return null;}
 if(performance.now()-lastStopAt<180)return null;
 if(!authenticated()){dialog('login-dialog');return null;}
 if(!accepting()){message(snapshot.blockedByActiveGame?'Dhammee wareegga kale ee akoonkaaga.':snapshot.game.wagerAvailability==='house_capacity'?'Sharad lama qaabili karo hadda. Hadhaagaaga waxba lagama jarin.':'Ciyaarta ayaan weli diyaar u ahayn sharad.',true);return null;}
 if(account.pending){$('retry').hidden=false;message('Dib u xaqiiji wareegga hore marka hore.',true);return null;}
 if(bet>minor(snapshot.balance)){autoRemaining=0;message('Hadhaaga wallet-ka kuma filna sharadkan.',true);update();return null;}
 startReels();const started=performance.now();
 try{
  const response=await account.start(bet),elapsed=performance.now()-started;
  const minimum=reduced()?0:(fast||fastStop?220:950);if(elapsed<minimum){await Promise.race([delay(minimum-elapsed),new Promise(resolve=>{releaseVisualWait=resolve;})]);releaseVisualWait=null;}
  if(response.needsRefresh){phase='recovering';await sync({quiet:true});}
  else if(response.state)applySnapshot(response.state,{render:false});
  phase='idle';stopReels(response.result);update();
  return response.result;
 }catch(error){
  autoRemaining=0;animationEpoch++;for(const reel of columns)reel.classList.remove('spinning','paused');soundCache.get('moving')?.pause();releaseVisualWait=null;renderGrid(grid);
  phase='idle';if(!error.ambiguous&&account.needsRefresh)await sync({quiet:true});message(reason(error),true);update();return null;
 }
}
$('spin').addEventListener('click',()=>play());
$('turbo').addEventListener('click',()=>{fast=!fast;sound('click');update();});
function selectBet(value){betChoice=value;$('bet-choice').textContent=money(value);for(const button of $('bet-levels').children)button.setAttribute('aria-pressed',String(Number(button.dataset.amount)===value));}
function openBet(){
 if(busy())return;sound('click');$('bet-levels').replaceChildren();
 for(const value of modelLevels){const button=document.createElement('button');button.textContent=money(value);button.dataset.amount=value;button.setAttribute('aria-pressed','false');button.onclick=()=>{sound('click');selectBet(value);};$('bet-levels').append(button);}
 selectBet(bet);dialog('bet-dialog');
}
$('bet').onclick=openBet;$('bet-display').onclick=openBet;
$('bet-less').onclick=()=>{sound('click');selectBet(modelLevels[Math.max(0,modelLevels.indexOf(betChoice)-1)]);};
$('bet-more').onclick=()=>{sound('click');selectBet(modelLevels[Math.min(modelLevels.length-1,modelLevels.indexOf(betChoice)+1)]);};
$('bet-confirm').onclick=()=>{bet=betChoice;sound('click');$('bet-dialog').close();update();};
$('auto').onclick=()=>{if(autoRemaining){autoRemaining=0;update();}else if(!authenticated())dialog('login-dialog');else if(!busy())dialog('auto-dialog');};
$('auto-start').onclick=async()=>{
 if(!accepting()){$('auto-error').textContent='Hubi akoonka iyo hadhaaga marka hore.';return;}
 let loss;try{loss=minor($('auto-loss').value.trim());if(loss<=0)throw Error();}catch{$('auto-error').textContent='Qor xad khasaaro sax ah, tusaale 10.00.';return;}
 const count=Number($('auto-spins').value);if(![5,10,20,50,100].includes(count))return;
 autoRemaining=count;autoLossLimit=loss;autoStopWin=$('auto-stop-win').checked;autoStartBalance=minor(snapshot.balance);$('auto-dialog').close();
 while(autoRemaining>0&&!document.hidden){
  autoRemaining--;update();const result=await play();
  if(!result||account.pending||!accepting()||autoStopWin&&minor(result.finalWin)>0||autoStartBalance-minor(snapshot.balance)>=autoLossLimit)break;
  if(autoRemaining>0)await delay(fast?250:850);
 }
 autoRemaining=0;update();
};
function takeWin(){
 const id=snapshot?.round?.result?.roundId;if(!id)return;
 acknowledged.add(id);try{sessionStorage.setItem('zplay.mh10.taken.v1',JSON.stringify([...acknowledged].slice(-50)));}catch{}
 $('win-display').hidden=true;$('gamble-dialog').close();sound('take');clearWins();message('Guusha waxaa lagu qoray wallet-ka ETB.');update();
}
$('take-win').onclick=takeWin;$('gamble-take').onclick=takeWin;
$('gamble-win').onclick=()=>{
 const round=snapshot?.round;if(!round?.gamble.available||acknowledged.has(round.result.roundId))return;
 $('gamble-stake').textContent=rounded(round.gamble.stake)+' ETB';$('revealed-card').hidden=true;$('gamble-message').textContent='';dialog('gamble-dialog');
};
async function gamble(choice){
 if(busy()||!snapshot?.round?.gamble.available)return;
 phase='gambling';$('gamble-red').disabled=true;$('gamble-black').disabled=true;update();
 try{
  const response=await account.gamble(choice);if(response.state)applySnapshot(response.state,{render:false});
  const result=response.result,card=$('revealed-card');card.hidden=false;card.textContent=result.revealed;card.classList.toggle('black',result.revealed==='BLACK');
  $('gamble-stake').textContent=rounded(result.payout)+' ETB';$('gamble-message').textContent=result.won?'Guul · ×2':'Wareeggan ma guulaysan.';
  sound(result.won?'gambleWin':'gambleLose');$('win-amount').textContent=rounded(result.payout);$('win-display').hidden=minor(result.payout)===0;
 }catch(error){$('gamble-message').textContent=reason(error);}
 finally{phase='idle';$('gamble-red').disabled=!snapshot?.round?.gamble.available||!!account.pending;$('gamble-black').disabled=$('gamble-red').disabled;update();}
}
$('gamble-red').onclick=()=>gamble('RED');$('gamble-black').onclick=()=>gamble('BLACK');
function tab(name){for(const value of ['rules','settings','history'])$(value+'-panel').hidden=name!==value;for(const button of document.querySelectorAll('[data-tab]'))button.setAttribute('aria-selected',String(button.dataset.tab===name));if(name==='history')history();}
$('menu').onclick=()=>{sound('click');tab('rules');dialog('menu-dialog');};
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>{sound('click');tab(button.dataset.tab);};
async function history(){
 $('history').replaceChildren();if(!authenticated()){$('history-status').textContent='Gal akoonkaaga si aad u aragto taariikhda.';return;}
 $('history-status').textContent='Soo dejinaya…';
 try{
  const response=await account.request('rounds');if(!Array.isArray(response.items))throw Error();
  const records=response.items.filter(r=>r.game_code==='fresh_multihot10').slice(0,30);
  $('history-status').textContent=records.length?'':'Weli wareeg laguma diiwaangelin ciyaartan.';
  for(const record of records){const result=record.result_json;if(!result||result.gameId!=='fresh_multihot10')continue;const li=document.createElement('li'),time=document.createElement('span'),values=document.createElement('span');time.textContent=new Date(record.created_at).toLocaleString();values.textContent=`BET ${result.bet} · WIN ${result.finalWin} ETB`;if(minor(result.finalWin)>0)values.className='won';li.append(time,values);$('history').append(li);}
 }catch{$('history-status').textContent='Taariikhda backend-ka hadda lama heli karo.';}
}
$('history-refresh').onclick=history;
for(const symbol of SYMBOLS){
 const article=document.createElement('article'),image=document.createElement('img'),table=document.createElement('table');image.src=ASSETS+'symbol-'+symbol+'.webp';image.alt=symbol;
 for(const[count,coefficient]of PAYS[symbol].entries()){const row=table.insertRow();row.insertCell().textContent=String(count+3);row.insertCell().textContent='×'+coefficient;}
 article.append(image,table);$('paytable').append(article);
}
for(const[index,line]of LINES.entries()){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 60');svg.setAttribute('aria-label','Line '+(index+1));const path=document.createElementNS(svg.namespaceURI,'polyline');path.setAttribute('points',line.map((row,col)=>`${col*20+10},${row*20+10}`).join(' '));svg.append(path);$('paylines').append(svg);}
$('sound').onclick=()=>{settings.effects=!(settings.effects||settings.music);settings.music=settings.effects;settings.consent=true;saveSettings();sound('click');};
for(const[id,key]of [['effects-enabled','effects'],['music-enabled','music']])$(id).onchange=()=>{settings[key]=$(id).checked;settings.consent=true;saveSettings();};
for(const[id,key]of [['effects-volume','effectsVolume'],['music-volume','musicVolume']])$(id).oninput=()=>{settings[key]=Number($(id).value);saveSettings();};
for(const[id,enabled]of [['sound-yes',true],['sound-no',false]])$(id).onclick=()=>{settings.effects=enabled;settings.music=enabled;settings.consent=true;saveSettings();$('sound-dialog').close();sound('click');};
$('fullscreen').disabled=!document.fullscreenEnabled;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game').requestFullscreen();}catch{message('Fullscreen lama furi karo qalabkan.');}};
$('retry').onclick=async()=>{
 if(account.busy||!account.pending)return;phase='recovering';update();
 try{const response=await account.retry();if(response.state)applySnapshot(response.state,{render:false});if(response.kind==='spin')stopReels(response.result);message('Wareeggii hore waa la xaqiijiyey.');}
 catch(error){message(reason(error),true);}finally{phase='idle';update();}
};
document.addEventListener('visibilitychange',()=>{autoRemaining=0;if(!document.hidden&&!busy())sync({quiet:true});applyAudio();update();});
window.addEventListener('blur',()=>{autoRemaining=0;update();});
document.addEventListener('keydown',event=>{if(event.code==='Space'&&!event.repeat&&!document.querySelector('dialog[open]')&&!/INPUT|SELECT|BUTTON|A/.test(event.target.tagName)){event.preventDefault();play();}});
function clock(){$('clock').textContent=new Date().toLocaleTimeString('en-GB',{timeZone:'Africa/Addis_Ababa'});}clock();setInterval(clock,1000);
// Texture warming loads game art only; outcomes are never generated on this client.
for(const symbol of SYMBOLS){const image=new Image();image.src=ASSETS+'symbol-'+symbol+'.webp';}
applyAudio();await sync();if(!settings.consent)$('sound-dialog').showModal();
