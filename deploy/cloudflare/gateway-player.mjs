const $ = id => document.getElementById(id);
const state = {selected:null, cards:[], loading:false, walletReady:false, disposed:false, epoch:0};
let walletAbort, pollTimer, frameTimer;

function status(text,error=false){$('status').textContent=text;$('status').dataset.error=String(error);}
function decimal(value){
 if(typeof value!=='string'||!/^\d{1,16}\.\d{2}$/.test(value))throw Error('Balance aan sax ahayn.');
 const [whole,fraction]=value.split('.');return BigInt(whole).toLocaleString('en-ET')+'.'+fraction;
}
function controls(){
 const game=state.selected;
 $('play-demo').disabled=state.loading||!game||game.kind!=='external';
 $('play-etb').disabled=state.loading||!game||game.kind!=='native'||!state.walletReady||game.enabled!==true;
 state.cards.forEach(({button})=>{button.disabled=state.loading;});
}
function clearFrame(){
 clearTimeout(frameTimer);state.loading=false;
 const frame=$('game-frame');frame.hidden=true;frame.removeAttribute('src');
 $('intro').hidden=false;$('close-game').hidden=true;controls();
}
function permitted(game){
 try{
  const url=new URL(game.launch_url,location.origin);
  if(url.username||url.password)return null;
  if(game.kind==='native')return url.origin===location.origin&&/^\/play\/[a-z0-9-]+$/.test(url.pathname)?url.href:null;
  return url.origin==='https://demo.smartsoftgaming.com'&&/^\/games\/[a-z0-9]+$/.test(url.pathname)?url.href:null;
 }catch{return null;}
}
function select(game){
 clearFrame();state.selected=game;
 $('title').textContent=game.name;$('category').textContent=game.category+' · '+(game.kind==='external'?'Demo URL aan la xaqiijin':'ETB native');
 $('intro-title').textContent=game.name;
 $('intro-text').textContent=game.kind==='external'?game.verification_note:'Ciyaartani waxay isticmaashaa engine-ka iyo wallet-ka ETB ee jira. Stake-ka iyo spin-ka waxaad ka maamuli doontaa gudaha ciyaarta.';
 const url=permitted(game);$('open-tab').hidden=!url;if(url)$('open-tab').href=url;else $('open-tab').removeAttribute('href');
 state.cards.forEach(({button,data})=>button.setAttribute('aria-pressed',String(data===game)));
 status(game.kind==='external'?'DEMO keliya: ETB lama heli karo ciyaartan.':'PLAY (ETB) wuxuu furayaa ciyaarta native-ka ah.');controls();
}
function card(game,host){
 const button=document.createElement('button');button.type='button';button.className='card';button.dataset.game=game.id;
 const title=document.createElement('strong');title.textContent=game.name;
 const label=document.createElement('small');label.textContent=game.category+' · '+(game.kind==='external'?'Demo link · unverified':'ETB');
 button.append(title,label);button.addEventListener('click',()=>select(game));$(host).append(button);state.cards.push({button,data:game});
}
async function loadCatalog(){
 const results=await Promise.allSettled([fetch('/api/gateway/games',{cache:'no-store'}),fetch('/api/games',{cache:'no-store'})]);
 let demoCount=0,nativeCount=0;
 for(const [index,result]of results.entries()){
  if(result.status!=='fulfilled'||!result.value.ok)continue;
  try{
   const data=await result.value.json();if(!Array.isArray(data.games))continue;
   for(const game of data.games){if(typeof game.id!=='string'||typeof game.name!=='string')continue;const entry={...game,kind:index===0?'external':'native'};
    if(!permitted(entry))continue;card(entry,index===0?'demo-list':'native-list');if(index===0)demoCount++;else nativeCount++;
   }
  }catch{status('Qayb catalog-ka ah lama akhrin karo.',true);}
 }
 if(state.disposed)return;
 $('demo-heading').textContent='Demo links ('+demoCount+')';$('native-heading').textContent='Ciyaaraha ETB ('+nativeCount+')';
 if(state.cards.length)select(state.cards[0].data);else status('Catalog-ka lama soo dejin. Dib u fur bogga.',true);
 if(demoCount===0)$('demo-heading').textContent='Demo catalog lama heli karo';
 if(nativeCount===0)$('native-heading').textContent='ETB catalog lama heli karo';
 controls();
}
function invalidate(){
 state.epoch++;state.walletReady=false;walletAbort?.abort();clearTimeout(pollTimer);
 $('balance').textContent='Soo gal';$('login').hidden=false;clearFrame();controls();
}
async function refreshWallet(){
 clearTimeout(pollTimer);walletAbort?.abort();
 if(state.disposed||document.hidden)return;
 const abort=new AbortController();walletAbort=abort;const epoch=state.epoch;
 const timeout=setTimeout(()=>abort.abort(),9000);
 try{
  const response=await fetch('/api/wallet',{credentials:'same-origin',cache:'no-store',signal:abort.signal});
  if(state.disposed||epoch!==state.epoch)return;
  if(response.status===401){state.walletReady=false;$('balance').textContent='Soo gal';$('login').hidden=false;return;}
  if(!response.ok)throw Error('Wallet lama heli karo.');
  const data=await response.json();if(state.disposed||epoch!==state.epoch)return;
  if(data.currency!=='ETB')throw Error('Currency aan sax ahayn.');
  $('balance').textContent=decimal(data.balance)+' ETB';state.walletReady=true;$('login').hidden=true;
 }catch(error){
  if(!state.disposed&&epoch===state.epoch&&walletAbort===abort){state.walletReady=false;$('balance').textContent='Offline';$('login').hidden=false;}
 }finally{
  clearTimeout(timeout);
  if(walletAbort===abort){controls();if(!state.disposed&&!document.hidden&&epoch===state.epoch)pollTimer=setTimeout(refreshWallet,15000);}
 }
}
function launch(kind){
 const game=state.selected;if(!game||game.kind!==kind||state.loading)return;
 if(kind==='native'&&(!state.walletReady||!game.enabled))return;
 const url=permitted(game);if(!url){status('URL-ga lama oggola.',true);return;}
 state.loading=true;controls();$('intro').hidden=true;$('game-frame').hidden=false;$('close-game').hidden=false;
 $('game-frame').src=url;
 status(kind==='external'?'Demo URL waa la codsaday; tani ma xaqiijinayso inuu shaqaynayo. Haddii player-ku madhnaado isticmaal tab cusub.':'Furaya ciyaarta ETB ee jira…');
 frameTimer=setTimeout(()=>{state.loading=false;controls();if(kind==='external')status('URL-ga dibadda lama xaqiijin. Wax lacag ETB ah lagama jarin.');},10000);
}
$('game-frame').addEventListener('load',()=>{if($('game-frame').hasAttribute('src')){clearTimeout(frameTimer);state.loading=false;controls();if(state.selected?.kind==='native'){
 void refreshWallet();
 try{$('game-frame').contentWindow.addEventListener('mh5:round',()=>void refreshWallet());}catch{}
}}});
$('play-demo').addEventListener('click',()=>launch('external'));$('play-etb').addEventListener('click',()=>launch('native'));
$('close-game').addEventListener('click',()=>{clearFrame();void refreshWallet();});$('retry-wallet').addEventListener('click',()=>void refreshWallet());
$('search').addEventListener('input',()=>{const query=$('search').value.trim().toLocaleLowerCase();state.cards.forEach(({button,data})=>{button.hidden=!data.name.toLocaleLowerCase().includes(query);});});
for(const event of ['zplay:session-expired','zplay:logout','zplay:session-changing'])window.addEventListener(event,invalidate);
window.addEventListener('zplay:session-ready',()=>void refreshWallet());
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.epoch++;walletAbort?.abort();clearTimeout(pollTimer);state.walletReady=false;controls();}else void refreshWallet();});
window.addEventListener('pagehide',()=>{state.disposed=true;invalidate();clearTimeout(frameTimer);});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
void loadCatalog();void refreshWallet();
