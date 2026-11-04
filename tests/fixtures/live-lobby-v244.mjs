import './presence.mjs';

const ROOT='/player-live-v244/';
const $=id=>document.getElementById(id);
const presence=()=>window[Symbol.for('zplay.player.presence')];
const CATALOG={
  multi_hot_5_video:{id:'multi_hot_5_video',title:'Multi Hot 5',slug:'multi-hot-5',art:'multi5',cols:3,rows:3,lines:5,wheel:'1×–5×'},
  hot_foxy_20:{id:'hot_foxy_20',title:'Foxy Hot 20',slug:'hot-foxy-20',art:'foxy',cols:5,rows:3,lines:20,wheel:'1×–5×'},
  safari_simba:{id:'safari_simba',title:'Safari Simba',slug:'safari-simba',art:'safari',cols:3,rows:3,lines:5,wheel:'3×–5×'}
};
const FILTERS=new Set(['all','slots','popular','saved']);
const FAVOURITES_KEY='zplay239.favourites';
const state={games:[],catalogueReady:false,cataloguePending:false,catalogueError:false,session:'checking',identity:null,balance:null,enabled:false,blocked:false,page:'home',filter:'all',provider:'all',query:'',alphabetical:false,selected:null};
let generation=0,sessionController=null,catalogueController=null,pollTimer=0,loadingTimer=0;
function readFavourites(){try{const values=JSON.parse(localStorage.getItem(FAVOURITES_KEY)||'[]');return new Set(Array.isArray(values)?values.filter(id=>Object.hasOwn(CATALOG,id)):[]);}catch{return new Set();}}
let favourites=readFavourites();
function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');const use=document.createElementNS(svg.namespaceURI,'use');use.setAttribute('href','#i-'+name);svg.setAttribute('aria-hidden','true');svg.append(use);return svg;}
function money(value){if(typeof value!=='string'||!/^\d{1,16}\.\d{2}$/.test(value))return null;const [whole,fraction]=value.split('.');return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+fraction+' ETB';}
function setCatalogueStatus(message,retry=false){$('catalogue-status').hidden=!message;$('catalogue-message').textContent=message;$('retry-catalogue').hidden=!retry;}
function readLocation(){const url=new URL(location.href);state.page=url.pathname==='/games'||url.pathname==='/games/'?'games':'home';const requested=url.searchParams.get('filter');state.filter=FILTERS.has(requested)?requested:'all';state.provider=url.searchParams.get('provider')==='zplaybet'?'zplaybet':'all';state.query=(url.searchParams.get('q')||'').slice(0,80);state.alphabetical=url.searchParams.get('sort')==='az';$('search').value=state.query;}
function updateUrl(replace=false){const url=new URL(state.page==='home'?'/':'/games',location.origin);if(state.filter!=='all')url.searchParams.set('filter',state.filter);if(state.provider!=='all')url.searchParams.set('provider',state.provider);if(state.query)url.searchParams.set('q',state.query);if(state.alphabetical)url.searchParams.set('sort','az');const next=url.pathname+url.search;if(next!==location.pathname+location.search)history[replace?'replaceState':'pushState']({zplayLobby:true},'',next);}
function closeDialog(id){if($(id).open)$(id).close();}
function navigate(url){closeDialog('drawer');closeDialog('detail');history.pushState({zplayLobby:true},'',url.pathname+url.search);readLocation();render();window.scrollTo({top:0,behavior:'instant'});}
function toggleFavourite(id){if(favourites.has(id))favourites.delete(id);else favourites.add(id);try{localStorage.setItem(FAVOURITES_KEY,JSON.stringify([...favourites]));}catch{}render();refreshDetail();}
function artwork(game){
  const picture=document.createElement('span');picture.className='game-image';
  if(game.art==='safari'){
    picture.classList.add('safari-cover');picture.setAttribute('role','img');picture.setAttribute('aria-label',game.title);
    const lion=document.createElement('span');lion.className='safari-lion';lion.setAttribute('aria-hidden','true');
    const title=document.createElement('span');title.className='safari-title';title.setAttribute('aria-hidden','true');title.append('SAFARI');const bold=document.createElement('strong');bold.textContent='SIMBA';title.append(bold);picture.append(lion,title);
  }else{const img=document.createElement('img');img.src=ROOT+'art/covers/'+game.art+'.webp';img.width=854;img.height=576;img.alt=game.title;img.decoding='async';img.loading='eager';picture.append(img);}
  return picture;
}
function tile(game){
  const item=document.createElement('article');item.className='game-tile';item.dataset.game=game.id;
  const open=document.createElement('button');open.type='button';open.className='game-preview';open.setAttribute('aria-label','Open '+game.title);
  const title=document.createElement('span');title.className='game-name';title.textContent=game.title;open.append(artwork(game),title);open.addEventListener('click',()=>openGame(game));
  const saved=document.createElement('button');saved.type='button';saved.className='tile-favourite';saved.setAttribute('aria-label',(favourites.has(game.id)?'Remove ':'Add ')+game.title+(favourites.has(game.id)?' from favourites':' to favourites'));saved.setAttribute('aria-pressed',String(favourites.has(game.id)));saved.append(icon('star'));saved.addEventListener('click',()=>toggleFavourite(game.id));
  item.append(open,saved);if(!game.enabled){const status=document.createElement('span');status.className='game-state unavailable';status.textContent='Currently unavailable';item.append(status);}return item;
}
function render(){
  const q=state.query.trim().toLocaleLowerCase();let games=state.games.filter(g=>(!q||g.title.toLocaleLowerCase().includes(q)||g.id.replaceAll('_',' ').includes(q))&&(state.filter!=='saved'||favourites.has(g.id))&&(state.provider==='all'||g.provider===state.provider));
  // Availability comes from the existing service. No invented player or like counts.
  if(state.alphabetical)games=[...games].sort((a,b)=>a.title.localeCompare(b.title));
  $('game-grid').replaceChildren(...games.map(tile));$('game-grid').setAttribute('aria-busy',String(state.cataloguePending));
  $('game-count').textContent=state.catalogueReady?String(games.length):'';$('provider-count').hidden=!state.catalogueReady;$('provider-count').textContent=String(state.games.length);
  const saved=state.filter==='saved',popular=state.filter==='popular';$('page-title').textContent=saved?'My games':popular?'Popular':state.page==='home'?'Casino':'All games';$('section-title').textContent=saved?'Your favourites':popular?'Popular games':state.filter==='slots'?'Slots':'All games';document.title='ZPLAYBET · '+$('page-title').textContent;
  $('all-tab').classList.toggle('active',!saved);$('saved-tab').classList.toggle('active',saved);if(saved){$('saved-tab').setAttribute('aria-current','page');$('all-tab').removeAttribute('aria-current');}else{$('all-tab').setAttribute('aria-current','page');$('saved-tab').removeAttribute('aria-current');}
  $('view-all').hidden=state.page!=='home'||saved||popular;$('account-section').hidden=state.page!=='home'||saved||popular||!!q;
  for(const b of document.querySelectorAll('[data-filter]')){const on=b.dataset.filter===state.filter;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}
  for(const b of document.querySelectorAll('[data-provider]'))b.setAttribute('aria-pressed',String(b.dataset.provider===state.provider));
  $('sort').setAttribute('aria-pressed',String(state.alphabetical));$('sort').setAttribute('aria-label',state.alphabetical?'Use original game order':'Sort games alphabetically');
  for(const a of document.querySelectorAll('[data-nav]')){const on=a.dataset.nav===(popular?'popular':state.page==='home'&&!saved?'home':'games');if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  const empty=state.catalogueReady&&state.games.length>0&&!games.length&&!state.catalogueError;$('empty').hidden=!empty;$('empty-title').textContent=saved&&!q?'No favourites yet':'No games found';$('empty-text').textContent=saved&&!q?'Tap the star on a game to save it here.':'Try another game name or category.';
}
function openGame(game){closeDialog('drawer');state.selected=game;$('detail-title').textContent=game.title;$('detail-art').replaceChildren(artwork(game));const facts=[game.cols+' × '+game.rows+' reels',game.lines+' lines',game.wheel+' multiplier'];$('game-facts').replaceChildren(...facts.map(text=>{const s=document.createElement('span');s.textContent=text;return s;}));refreshDetail();if(!$('detail').open)$('detail').showModal();if(state.session==='error')void refreshSession();}
function refreshDetail(){
  const game=state.selected;if(!game)return;const saved=favourites.has(game.id);$('favourite').setAttribute('aria-pressed',String(saved));$('favourite-label').textContent=saved?'Saved to favourites':'Add to favourites';const play=$('play'),status=$('detail-status');play.removeAttribute('aria-disabled');status.hidden=true;status.textContent='';
  if(!game.enabled){$('play-label').textContent='Currently unavailable';play.removeAttribute('href');play.setAttribute('aria-disabled','true');status.textContent='Please check again later.';status.hidden=false;return;}
  if(state.session==='checking'){$('play-label').textContent='Checking account…';play.removeAttribute('href');play.setAttribute('aria-disabled','true');return;}
  if(state.session==='error'){$('play-label').textContent='Retry connection';play.href='#';status.textContent='Your account could not be checked. Please retry.';status.hidden=false;return;}
  if(state.session!=='signedin'){$('play-label').textContent='Sign in to play';play.href='/account?view=login';return;}
  if(!state.enabled){$('play-label').textContent='Currently unavailable';play.removeAttribute('href');play.setAttribute('aria-disabled','true');status.textContent='Please check again later.';status.hidden=false;return;}
  if(/^0+\.00$/.test(state.balance)){$('play-label').textContent='Open wallet';play.href='/account?view=deposit';status.textContent='Your wallet has no available ETB balance.';status.hidden=false;return;}
  $('play-label').textContent='Play now';play.href='/play/'+game.slug;
}
function updateAccount(){const signed=state.session==='signedin';$('guest-actions').hidden=signed;$('member-actions').hidden=!signed;$('drawer-auth').hidden=signed;$('account-balance').textContent=signed?money(state.balance)||'Balance unavailable':'';$('wallet').setAttribute('aria-label',signed?'Wallet: '+(money(state.balance)||'balance unavailable'):'View wallet');$('account-status').textContent=state.session==='error'?'Account connection unavailable.':signed?'Signed in.':'';refreshDetail();}
async function refreshSession(){
  if(sessionController||document.hidden||state.blocked)return;const epoch=generation,controller=new AbortController();sessionController=controller;const timeout=setTimeout(()=>controller.abort(),9000);
  try{
    await presence()?.ready;
    if(epoch!==generation||document.hidden||state.blocked)return;if(presence()?.expired){expireSession();return;}
    const response=await fetch('/api/slots/originals/session',{credentials:'same-origin',cache:'no-store',signal:controller.signal});if(epoch!==generation||document.hidden)return;
    if(response.status===401){state.session='signedout';state.identity=null;state.balance=null;state.enabled=false;updateAccount();return;}if(!response.ok)throw Error('SESSION_UNAVAILABLE');const data=await response.json();if(epoch!==generation||document.hidden||state.blocked)return;
    if(data.authenticated!==true){state.session='signedout';state.identity=null;state.balance=null;state.enabled=false;}else{if(data.currency!=='ETB'||!money(data.balance)||typeof data.identity!=='string')throw Error('INVALID_SESSION');state.session='signedin';state.identity=data.identity;state.balance=data.balance;state.enabled=data.enabled===true;}updateAccount();
  }catch{if(epoch!==generation||document.hidden||state.blocked)return;state.session='error';state.identity=null;state.balance=null;state.enabled=false;updateAccount();}
  finally{clearTimeout(timeout);if(sessionController===controller)sessionController=null;}
}
async function loadCatalogue(){
  if(state.cataloguePending||document.hidden)return;const controller=new AbortController();catalogueController=controller;state.cataloguePending=true;state.catalogueError=false;$('game-grid').setAttribute('aria-busy','true');clearTimeout(loadingTimer);loadingTimer=setTimeout(()=>setCatalogueStatus('Loading games…'),300);const timeout=setTimeout(()=>controller.abort(),9000);
  try{
    const response=await fetch('/api/slots/games',{credentials:'same-origin',cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('CATALOGUE_UNAVAILABLE');const data=await response.json();if(!Array.isArray(data.games))throw Error('INVALID_CATALOGUE');
    const received=new Map(data.games.filter(g=>g&&Object.hasOwn(CATALOG,g.id)).map(g=>[g.id,g]));state.games=Object.values(CATALOG).filter(g=>received.has(g.id)).map(g=>{const model=received.get(g.id);return {...g,provider:'zplaybet',enabled:model.enabled===true};});state.catalogueReady=true;state.catalogueError=false;setCatalogueStatus(state.games.length?'':'No games are available right now.',!state.games.length);
    if(state.selected){state.selected=state.games.find(g=>g.id===state.selected.id)||{...state.selected,enabled:false};refreshDetail();}
  }catch{if(document.hidden||controller.signal.reason==='PAGE_HIDDEN')return;state.catalogueError=true;setCatalogueStatus('Games could not be loaded. Please retry.',true);}
  finally{clearTimeout(timeout);clearTimeout(loadingTimer);state.cataloguePending=false;if(catalogueController===controller)catalogueController=null;render();if(!document.hidden&&!state.catalogueReady&&controller.signal.reason==='PAGE_HIDDEN')queueMicrotask(()=>void loadCatalogue());}
}
function stopPolling(){clearInterval(pollTimer);pollTimer=0;generation++;sessionController?.abort();sessionController=null;}
function startPolling(){if(document.hidden||pollTimer||state.blocked)return;pollTimer=setInterval(()=>{void refreshSession();},15000);}
function pauseAccount(){stopPolling();if(state.blocked)return;state.session='checking';state.identity=null;state.balance=null;state.enabled=false;updateAccount();}
function expireSession(){stopPolling();state.blocked=true;state.session='signedout';state.identity=null;state.balance=null;state.enabled=false;updateAccount();}

document.addEventListener('click',event=>{const link=event.target.closest('a[data-lobby-link]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const url=new URL(link.href);if(url.origin!==location.origin)return;event.preventDefault();navigate(url);});
for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{state.filter=button.dataset.filter;state.page='games';updateUrl();render();});
for(const button of document.querySelectorAll('[data-provider]'))button.addEventListener('click',()=>{state.provider=button.dataset.provider;updateUrl();render();});
$('search').addEventListener('input',()=>{state.query=$('search').value;updateUrl(true);render();});$('sort').addEventListener('click',()=>{state.alphabetical=!state.alphabetical;updateUrl();render();});$('clear-filters').addEventListener('click',()=>{state.filter='all';state.provider='all';state.query='';$('search').value='';updateUrl();render();});
$('menu').addEventListener('click',()=>{closeDialog('detail');$('drawer').showModal();$('menu').setAttribute('aria-expanded','true');});$('drawer').addEventListener('close',()=>$('menu').setAttribute('aria-expanded','false'));$('close-drawer').addEventListener('click',()=>closeDialog('drawer'));$('close-detail').addEventListener('click',()=>closeDialog('detail'));$('favourite').addEventListener('click',()=>{if(state.selected)toggleFavourite(state.selected.id);});
for(const name of ['drawer','detail'])$(name).addEventListener('click',event=>{if(event.target!==$(name))return;const rect=$(name).getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog(name);});
$('play').addEventListener('click',event=>{if($('play').getAttribute('aria-disabled')==='true'){event.preventDefault();return;}if(state.session==='error'){event.preventDefault();state.session='checking';refreshDetail();void refreshSession();}});$('retry-catalogue').addEventListener('click',()=>void loadCatalogue());
window.addEventListener('popstate',()=>{closeDialog('detail');closeDialog('drawer');readLocation();render();});window.addEventListener('storage',event=>{if(event.key===FAVOURITES_KEY){favourites=readFavourites();render();refreshDetail();}});
window.addEventListener('zplay:session-expired',expireSession);window.addEventListener('zplay:logout',expireSession);window.addEventListener('zplay:session-ready',()=>{state.blocked=false;stopPolling();state.session='checking';void refreshSession();startPolling();});
window.addEventListener('zplay:visibility',pauseAccount);window.addEventListener('zplay:session-changing',()=>{state.blocked=false;pauseAccount();void refreshSession();startPolling();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseAccount();catalogueController?.abort('PAGE_HIDDEN');}else{if(!state.catalogueReady)void loadCatalogue();void refreshSession();startPolling();}});
window.addEventListener('pagehide',()=>{pauseAccount();catalogueController?.abort('PAGE_HIDDEN');clearTimeout(loadingTimer);});window.addEventListener('pageshow',()=>{if(!state.catalogueReady&&!state.cataloguePending)void loadCatalogue();void refreshSession();startPolling();});
readLocation();render();void loadCatalogue();void refreshSession();startPolling();
