import {entries} from './official74-data.mjs';
import {existingWalletRoute} from './existing-wallet-routes.mjs';
import {RESUME_KEY,readResume,saveResume,validSignInMessage,validMachineMessage,resumeFromUrl} from './machine74-resume.mjs';
// Additive catalogue only: the existing React account header, navigation,
// authentication and game engines remain owned by the existing application.
const url=game=>existingWalletRoute(game.gameId);
const machineUrl=game=>url(game)||'/independent74/machines74.html#'+encodeURIComponent(game.gameId);
const element=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;};
const source=value=>{const link=new URL(value);if(link.protocol!=='https:'||!['cdn.prod.website-files.com','www.smartsoftgaming.com','smartsoftgaming.com','eu-server.ssgportal.com'].includes(link.hostname))throw Error('Invalid catalogue source');return link.href;};
const dialog=element('dialog','i74-sheet');dialog.id='i74-lobby-dialog';dialog.setAttribute('aria-labelledby','i74-sheet-title');
const close=element('button','i74-close','×');close.type='button';close.setAttribute('aria-label','Close game options');
const poster=element('img','i74-poster');poster.alt='';const title=element('h2','i74-sheet-title');title.id='i74-sheet-title';
const details=element('a','i74-details','ⓘ  Game details');details.target='_blank';details.rel='noopener noreferrer';
const play=element('a','i74-play','Play Now · ETB');
const note=element('p','i74-note','Uses the existing game and Player account. New74-game versions remain under review.');
const machine=element('iframe','i74-machine');machine.title='ZPLAY game machine';machine.hidden=true;machine.allow='autoplay';
dialog.append(close,poster,title,details,play,note,machine);
let opener;
let selectedGame;
const liveGames=new Set();
let availabilityCheck=null,lastAvailabilityCheck=0;
const ready=game=>!!url(game)||liveGames.has(game.gameId);
function paintAvailability(){
 for(const [id,card] of cards){const badge=card.querySelector('.i74-review');if(!badge)continue;const text=liveGames.has(id)?'PLAY · ETB':'PLAY · ETB sugaya server-ka';if(badge.textContent!==text)badge.textContent=text;}
 if(selectedGame){
  play.textContent=ready(selectedGame)?'Play Now · ETB':'PLAY · Fur mashiinka';
  note.textContent=ready(selectedGame)?'Waxay isticmaashaa isla akoonkaaga Player-ka iyo wallet-ka ETB.':'Mashiinka iyo controls-ku way furmayaan. Sharadka ETB wuxuu sugayaa xaqiijinta server-ka, wallet-ka iyo settlement-ka.';
 }
}
async function refreshAvailability(){
 if(availabilityCheck||Date.now()-lastAvailabilityCheck<30000)return;
 lastAvailabilityCheck=Date.now();
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),6000);
 availabilityCheck=(async()=>{
  try{
   const response=await fetch('/independent74/account-api/catalog',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'},signal:abort.signal});
   if(!response.ok)throw Error('CATALOG_UNAVAILABLE');
   const value=await response.json();
   if(!Array.isArray(value.games)||value.games.length!==72||new Set(value.games.map(game=>game?.id)).size!==72)throw Error('INVALID_CATALOG');
   liveGames.clear();for(const game of value.games)if(independentIds.has(game.id)&&game.currency==='ETB'&&game.accepting===true&&game.launchable===true)liveGames.add(game.id);
  }catch{liveGames.clear();}finally{clearTimeout(timer);availabilityCheck=null;paintAvailability();}
 })();await availabilityCheck;
}
const independentIds=new Set(entries.filter(game=>!url(game)).map(game=>game.gameId));
let storage;try{storage=window.sessionStorage;}catch{}
let resume=readResume(storage,independentIds),resumeCheck=null,loginRequested=false,lastResumeCheck=0,lastWalletWake=0;
const requested=resumeFromUrl(location.href,independentIds);
if(requested){resume=saveResume(storage,requested.gameId,independentIds);history.replaceState(history.state,'',requested.cleanUrl);loginRequested=true;}
function forgetResume(){resume=null;loginRequested=false;try{storage?.removeItem(RESUME_KEY);}catch{}}
function startMachine(game){
 if(!game||url(game))return;
 machine.src='/independent74/machines74.html?embedded=1#'+encodeURIComponent(game.gameId);
 machine.hidden=false;dialog.classList.add('i74-playing');machine.focus();
}
async function resumeAfterSignIn(){
 if(!resume||resumeCheck||!document.querySelector('header.player-header'))return;
 const login=document.querySelector('header.player-header .header-actions button.login-button');
 if(login){if(loginRequested){loginRequested=false;login.click();}return;}
 if(Date.now()-lastResumeCheck<1500)return;
 lastResumeCheck=Date.now();
 const pending=resume;
 resumeCheck=(async()=>{
  try{
   const response=await fetch('/api/machine-session',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
   if(!response.ok)return;
   const value=await response.json();
   if(value?.authenticated!==true||value.currency!=='ETB'||resume!==pending)return;
   const game=entries.find(item=>item.gameId===pending.gameId);
   if(!game||!cards.get(game.gameId)?.isConnected)return;
   forgetResume();open(game,cards.get(game.gameId).querySelector('button'));startMachine(game);
  }catch{}finally{resumeCheck=null;}
 })();
 await resumeCheck;
}
function open(game,button){
 selectedGame=game;
 opener=button;poster.src=source(game.coverUrl);title.textContent=game.name;details.href=source(game.officialUrl);const route=url(game);play.textContent=route?'Play Now · ETB':'PLAY · Fur mashiinka';play.removeAttribute('aria-disabled');play.href=machineUrl(game);note.textContent=route?'Uses the existing game and Player account.':'Mashiinka iyo controls-ku way furmayaan. Sharadka ETB wuxuu sugayaa xaqiijinta server-ka, wallet-ka iyo settlement-ka.';
 if(!dialog.open)dialog.showModal();
 paintAvailability();void refreshAvailability();
}
play.addEventListener('click',event=>{
 if(!selectedGame||url(selectedGame))return;
 event.preventDefault();
 // The authored same-origin machine shares the existing Player session.
 // It stays inside the original dashboard; it is never a provider demo frame.
 startMachine(selectedGame);
});
window.addEventListener('message',event=>{
 if(selectedGame&&validMachineMessage(event,{origin:location.origin,frameWindow:machine.contentWindow,gameId:selectedGame.gameId,type:'independent74:wallet-changed'})){
  // Wake the original application's verified /api/sync -> /api/me refresh.
  // No balance or user identity supplied by an iframe is ever copied into it.
  if(Date.now()-lastWalletWake>=750){lastWalletWake=Date.now();window.dispatchEvent(new Event('focus'));}
  return;
 }
 if(!selectedGame||!validSignInMessage(event,{origin:location.origin,frameWindow:machine.contentWindow,gameId:selectedGame.gameId}))return;
 resume=saveResume(storage,selectedGame.gameId,independentIds);
 if(!resume)return;
 // A newer explicit choice supersedes an older native-game return intent.
 // Reload only in this conflict case, so the original login handler starts
 // without a stale destination. The existing account/session is untouched.
 try{
  const previous=storage?.getItem('zplay.native.launch.return');
  if(previous){storage.removeItem('zplay.native.launch.return');storage.removeItem('zplay.jetx.return');location.assign('/?ind74='+encodeURIComponent(resume.gameId));return;}
 }catch{}
 loginRequested=true;dialog.close();void resumeAfterSignIn();
});
const cards=new Map();
for(const game of entries){
 const article=element('article','portal-r9-card i74-card');article.dataset.i74GameId=game.gameId;
 const card=element('button','portal-r9-card-open i74-open');card.type='button';card.setAttribute('aria-label','Open '+game.name);card.setAttribute('aria-haspopup','dialog');
 const image=element('img','i74-cover');image.src=source(game.coverUrl);image.alt=game.name;image.loading='lazy';image.decoding='async';image.width=493;image.height=617;card.append(image);
 if(!url(game))card.append(element('span','i74-review','PLAY · ETB sugaya server-ka'));
 card.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();open(game,card);},true);article.append(card);cards.set(game.gameId,article);
}
close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>{machine.removeAttribute('src');machine.hidden=true;dialog.classList.remove('i74-playing');selectedGame=null;opener?.focus();});
dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button,a[href],input,iframe')].filter(node=>!node.hidden&&node.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}});
let frame=0;
function sync(){
 frame=0;
 const gallery=document.querySelector('main.player-main #portal-r9-gallery'),grid=gallery?.querySelector('.portal-r9-grid');
 const active=(document.querySelector('.bottom-nav button.active')?.textContent||'Home').trim().toUpperCase();
 const show=location.pathname==='/'&&!!grid&&['HOME','GAMES'].includes(active)&&['home','games','casino'].includes(gallery.dataset.surface||'home');
 if(!show){if(dialog.open)dialog.close();return;}
 const originals=[...grid.querySelectorAll('article')].filter(node=>!node.classList.contains('i74-card'));
 const query=(document.querySelector('#portal-r9-search')?.value||'').trim().toLocaleLowerCase();
 for(const game of entries){
  const route=url(game),key=route?.split('/').at(-1);
  const existing=route?originals.find(article=>article.dataset.r20Game===key||[...article.querySelectorAll('[data-game],a[href]')].some(node=>node.dataset.game===key||node.getAttribute('href')===route)):null;
  const card=cards.get(game.gameId);
  if(existing){existing.dataset.i74GameId=game.gameId;if(card.isConnected)card.remove();}
  else{if(card.parentNode!==grid)grid.append(card);card.hidden=!!query&&!game.name.toLocaleLowerCase().includes(query);}
 }
 if(!dialog.isConnected)document.body.append(dialog);
 void resumeAfterSignIn();
}
const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',schedule);document.addEventListener('input',schedule);window.addEventListener('popstate',()=>{if(dialog.open)dialog.close();schedule();});window.addEventListener('hashchange',schedule);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshAvailability();});sync();void refreshAvailability();

