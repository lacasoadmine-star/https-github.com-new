import {coverArt} from './cover-art.mjs';

// Presentation adapter for the existing Player application. React continues to
// own identity, login, registration, payments, history and account controls.
const KEY=Symbol.for('zplay.portal.reference.r9');
if(window[KEY])window[KEY].stop();
const release='player-portal-20261106-r9';
const known=[
 {id:'multi_hot_5_video',nativeId:'hot-777',title:'Multi Hot 5',category:'Slots',reels:3,rows:3,lines:5,art:'/assets/hot-777.webp'},
 {id:'hot_foxy_20',nativeId:'foxy-20',title:'Hot Foxy 20',category:'Slots',reels:5,rows:3,lines:20,art:'/assets/foxy-card.webp'},
 {id:'wild_multi_stars',nativeId:'stars',title:'Wild Multi Stars',category:'Slots',reels:5,rows:3,lines:20,art:'/assets/stars.webp'},
 {id:'multi_hot_100',nativeId:'multi_hot_100',title:'Multi Hot 100',category:'Slots',reels:5,rows:4,lines:100,art:''}
].map(game=>({...game,available:true,launch:'/games/'+game.id,source:'deployed-machines'}));
const aliases=new Map(known.flatMap(game=>[[game.id,game.id],[game.nativeId,game.id]]));
const canonical=id=>aliases.get(id)||id;
const icon={
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
 eye:'<path d="M2 12q10-14 20 0-10 14-20 0Z"/><circle cx="12" cy="12" r="3"/>',
 filter:'<path d="M3 5h18M6 12h12M9 19h6"/>',
 up:'<path d="m6 14 6-6 6 6"/>'
};
const svg=name=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icon[name]+'</svg>';
const create=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const safeArt=value=>typeof value==='string'&&/^\/(?:assets|zplaybet-[\w-]+)\/[\w./%-]+\.(?:webp|png|jpe?g|svg)(?:\?[^#]*)?$/.test(value)?value:'';
let stopped=false,frame=0,config=null,games=known.map(g=>({...g})),surface='',currentMain=null,selected=null,opener=null;
let savedOnly=false,query='',category='All',provider='All',loaded=false,loadError='',identity='',favourites=new Set(),favouritePending=false;
for(const key of ['superwin.favourites.v2300','zplay.saved.originals','zplaybet.saved.v217']){
 try{for(const id of JSON.parse(localStorage.getItem(key)||'[]'))if(typeof id==='string')favourites.add(canonical(id));}catch{}
}
const gallery=create('section','portal-r9-gallery');gallery.id='portal-r9-gallery';gallery.setAttribute('aria-label','Game catalogue');
gallery.innerHTML='<div class="portal-r9-tabs" aria-label="Game collection"><button type="button" data-view="all" aria-pressed="true">ALL GAMES</button><button type="button" data-view="saved" aria-pressed="false">MY GAMES</button></div><div class="portal-r9-banners" aria-label="Featured promotions"></div><section class="portal-r9-winners" hidden></section><nav class="portal-r9-categories" aria-label="Game categories"></nav><div class="portal-r9-search-row"><label for="portal-r9-search">'+svg('search')+'<input id="portal-r9-search" type="search" placeholder="Search games" autocomplete="off"></label><button type="button" class="portal-r9-filter" aria-label="Show game categories" aria-expanded="false">'+svg('filter')+'</button></div><nav class="portal-r9-providers" aria-label="Game providers"></nav><p class="portal-r9-count" role="status" aria-live="polite"></p><div class="portal-r9-empty" hidden></div><div class="portal-r9-grid"></div><p class="portal-r9-connection" role="status"></p>';
const grid=gallery.querySelector('.portal-r9-grid'),search=gallery.querySelector('input'),count=gallery.querySelector('.portal-r9-count'),empty=gallery.querySelector('.portal-r9-empty');
const sheet=create('dialog','portal-r9-game-sheet');sheet.id='portal-r9-game-sheet';sheet.setAttribute('aria-labelledby','portal-r9-sheet-title');
sheet.innerHTML='<header><span class="portal-r9-grabber" aria-hidden="true"></span><h2 id="portal-r9-sheet-title" class="portal-r9-sr"></h2><button type="button" class="portal-r9-sheet-close" aria-label="Close game details">×</button></header><div class="portal-r9-sheet-body"><div class="portal-r9-sheet-art"></div><div class="portal-r9-sheet-actions"><button type="button" class="portal-r9-sheet-details" aria-expanded="false">'+svg('info')+'<span>Game details</span></button><button type="button" class="portal-r9-sheet-favourite" aria-pressed="false">'+svg('star')+'<span>Favourite</span></button></div><div class="portal-r9-game-details" hidden></div><a class="portal-r9-sheet-play">Play Now</a><p class="portal-r9-sheet-status" role="status"></p></div>';
const scrollTop=create('button','portal-r9-scroll-top');scrollTop.type='button';scrollTop.setAttribute('aria-label','Back to top');scrollTop.innerHTML=svg('up');scrollTop.hidden=true;
scrollTop.onclick=()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
const onScroll=()=>{scrollTop.hidden=scrollY<600;};

function normalize(data){
 const list=[],blocked=new Set();
 for(const raw of Array.isArray(data?.games)?data.games:[]){
  if(!raw||typeof raw.id!=='string'||typeof raw.name!=='string')continue;
  if(raw.demo===true||raw.available===false||raw.enabled===false){blocked.add(canonical(raw.id));continue;}
  const match=known.find(game=>game.nativeId===raw.id||game.id===raw.id),id=match?.id||raw.id;
  if(!/^[a-z0-9_-]+$/.test(id))continue;
  const type=String(raw.type||'').toLowerCase(),category=raw.category?String(raw.category):type.includes('plinko')?'Plinko':/flight|crash|skytrail/.test(type)?'Flight':/double|candy|arcade/.test(type)?'Arcade':'Slots';
  list.push({...match,id,nativeId:raw.id,title:match?.title||raw.name,category,provider:typeof raw.studio==='string'?raw.studio:typeof raw.provider==='string'?raw.provider:'ZPLAY',available:true,launch:'/games/'+id,art:safeArt(raw.thumbnail)||(typeof raw.art==='string'&&/^[\w-]+$/.test(raw.art)?'/assets/'+raw.art+'.webp':match?.art||''),symbolAssets:(Array.isArray(raw.symbol_assets)?raw.symbol_assets:[]).map(safeArt).filter(Boolean).slice(0,3),hue:Number(raw.hue)||135,reels:match?.reels||raw.reels||raw.columns||raw.cols,rows:match?.rows||raw.rows,lines:match?.lines||raw.lines||raw.paylines?.length,source:'existing-config'});
 }
 for(const game of known)if(!blocked.has(game.id)&&!list.some(item=>item.id===game.id))list.push({...game,provider:'ZPLAY'});
 const order=['multi_hot_5_video','plinko','safari-simba','hot_foxy_20','hot-samba','wild_multi_stars','fruity-wilds','multi_hot_100'];
 return list.map((game,index)=>({game,index})).sort((a,b)=>{const rank=id=>{const n=order.indexOf(id);return n<0?100:n;};return rank(a.game.id)-rank(b.game.id)||a.index-b.index;}).map(item=>item.game);
}

function artwork(game,className='portal-r9-cover'){
 const wrap=create('div',className),source=coverArt[game.id]||coverArt[game.nativeId]||game.art;
 wrap.dataset.game=game.id;
 if(source){const image=create('img');image.src=source;image.alt='';image.loading=className==='portal-r9-cover'?'lazy':'eager';image.decoding='async';image.draggable=false;image.onerror=()=>{image.remove();fallback();};wrap.append(image);}
 else fallback();
 function fallback(){if(wrap.querySelector('.portal-r9-generated-cover'))return;const card=create('div','portal-r9-generated-cover');card.style.setProperty('--game-hue',String(game.hue||145));card.append(create('small','',game.id==='multi_hot_100'?'100 FIXED LINES':'ZPLAY'));card.append(create('strong','',game.title));const symbols=create('div','portal-r9-cover-symbols');for(const src of game.symbolAssets||[]){const image=create('img');image.src=src;image.alt='';symbols.append(image);}if(!symbols.childElementCount)symbols.textContent=game.id==='multi_hot_100'?'7 × 7':'✦';card.append(symbols);wrap.append(card);}
 return wrap;
}

function filtered(){return games.filter(game=>(!savedOnly||favourites.has(game.id))&&(category==='All'||game.category.toLowerCase()===category.toLowerCase())&&(provider==='All'||game.provider===provider)&&game.title.toLowerCase().includes(query.toLowerCase()));}
function renderCards(){
 if(stopped)return;const found=filtered(),shown=surface==='home'?found.slice(0,6):found;grid.replaceChildren();
 for(const game of shown){
  const article=create('article','portal-r9-card'),button=create('button','portal-r9-card-open');button.type='button';button.dataset.game=game.id;button.setAttribute('aria-label','View '+game.title);button.setAttribute('aria-haspopup','dialog');button.append(artwork(game));button.onclick=()=>openGame(game,button);article.append(button);grid.append(article);
 }
 count.textContent=(loaded?found.length+' games':'Loading games…');empty.hidden=!!found.length;
 if(!found.length){empty.replaceChildren();const illustration=create('span','portal-r9-empty-illustration');illustration.innerHTML=svg('star');empty.append(illustration,create('h2','',savedOnly?'Your games will appear here':'No games found'),create('p','',savedOnly?'Save your favourite games to find them here.':'Try a different search or category.'));if(savedOnly){const heading=create('h3','','Explore games');empty.append(heading);for(const game of games.slice(0,4)){const article=create('article','portal-r9-card'),button=create('button','portal-r9-card-open');button.type='button';button.dataset.game=game.id;button.setAttribute('aria-label','View '+game.title);button.append(artwork(game));button.onclick=()=>openGame(game,button);article.append(button);grid.append(article);}}}
 gallery.querySelector('.portal-r9-connection').textContent=loadError;
 for(const button of gallery.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed',String((button.dataset.view==='saved')===savedOnly));
 for(const button of gallery.querySelectorAll('[data-category]'))button.setAttribute('aria-pressed',String(button.dataset.category===category));
 for(const button of gallery.querySelectorAll('[data-provider]'))button.setAttribute('aria-pressed',String(button.dataset.provider===provider));
 gallery.dataset.saved=String(savedOnly);gallery.dataset.query=String(!!query);updateFavourite();
}

function renderCategories(){
 const nav=gallery.querySelector('.portal-r9-categories');nav.replaceChildren();
 for(const name of ['All','Slots','Flight','Plinko','Arcade']){
  if(name!=='All'&&!games.some(game=>game.category.toLowerCase()===name.toLowerCase()))continue;
  const button=create('button');button.type='button';button.dataset.category=name;button.setAttribute('aria-pressed',String(name===category));const art=create('span');
  const first=games.find(game=>name==='All'||game.category.toLowerCase()===name.toLowerCase());if(first){const component=artwork(first);const image=component.querySelector('img');if(image)art.append(image);else art.innerHTML=svg('star');}
  button.append(art,create('b','',name==='All'?'ALL GAMES':name.toUpperCase()));button.onclick=()=>{category=name;renderCards();};nav.append(button);
 }
 const providers=gallery.querySelector('.portal-r9-providers');providers.replaceChildren();const all=create('button','','All providers');all.type='button';all.dataset.provider='All';all.onclick=()=>{provider='All';renderCards();};providers.append(all);
 for(const name of [...new Set(games.map(game=>game.provider||'ZPLAY'))]){const button=create('button','',name);button.type='button';button.dataset.provider=name;button.onclick=()=>{provider=name;renderCards();};providers.append(button);}
 // Unconnected providers may be named in the existing config. Their disabled
 // buttons preserve the backend's unavailable state and never create a launch.
 for(const raw of config?.provider_games||[]){const name=raw.studio||raw.provider;if(!name||[...providers.children].some(node=>node.textContent===name))continue;const button=create('button','',String(name));button.type='button';button.disabled=true;button.title='Currently unavailable';providers.append(button);}
}

function renderPromotions(){
 const banners=gallery.querySelector('.portal-r9-banners');banners.replaceChildren();
 const promotion=create('button','portal-r9-promotion');promotion.type='button';promotion.setAttribute('aria-label','View player promotion');const image=create('img');image.src='/zplaybet-v232/reference-promo.webp?pv=236';image.alt='ZPLAY · One tap, instant access';promotion.append(image);
 promotion.onclick=()=>{const native=document.querySelector('.player-main>.sw-player-hero');if(native){native.click();return;}const link=[...document.querySelectorAll('#root a[href]')].find(node=>/^https:\/\/t\.me\//.test(node.href));if(link)link.click();else document.querySelector('.register-button,.player-header [aria-label="Account"]')?.click();};banners.append(promotion);
 const race=document.querySelector('.player-main>.rebrand-race .race-banner');if(race&&safeArt(race.getAttribute('src'))){const banner=create('div','portal-r9-promotion');const image=create('img');image.src=race.getAttribute('src');image.alt=race.alt||'Player promotion';banner.append(image);banners.append(banner);}
}

function openGame(game,button){
 selected=game;opener=button;sheet.querySelector('h2').textContent=game.title;const art=sheet.querySelector('.portal-r9-sheet-art');art.replaceChildren(artwork(game,'portal-r9-sheet-cover'));
 const details=sheet.querySelector('.portal-r9-game-details');details.replaceChildren();for(const [label,value]of [['Game',game.title],['Reels',game.reels],['Rows',game.rows],['Lines',game.lines]])if(value){const row=create('p');row.append(create('b','',label+': '),document.createTextNode(String(value)));details.append(row);}
 details.hidden=true;sheet.querySelector('.portal-r9-sheet-details').setAttribute('aria-expanded','false');const play=sheet.querySelector('.portal-r9-sheet-play');play.textContent=game.available?'Play Now':'Currently unavailable';if(game.available)play.href=game.launch;else play.removeAttribute('href');play.setAttribute('aria-disabled',String(!game.available));sheet.querySelector('.portal-r9-sheet-status').textContent='';updateFavourite();if(!sheet.isConnected)document.body.append(sheet);sheet.showModal();
}
function updateFavourite(){if(!selected)return;const on=favourites.has(selected.id),button=sheet.querySelector('.portal-r9-sheet-favourite');button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',(on?'Remove favourite ':'Favourite ')+selected.title);button.disabled=favouritePending;button.querySelector('span').textContent=on?'Saved':'Favourite';}
function storeFavourites(){try{localStorage.setItem('zplaybet.saved.v217',JSON.stringify([...favourites]));}catch{}}
async function readFavourites(){
 if(!document.querySelector('.signed-in-header'))return;
 try{const response=await fetch('/api/favourites',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});if(!response.ok)return;const data=await response.json();if(Array.isArray(data)){favourites=new Set(data.filter(id=>typeof id==='string').map(canonical));storeFavourites();renderCards();}}catch{}
}
async function toggleFavourite(){
 if(!selected||favouritePending)return;
 if(!document.querySelector('.signed-in-header')){sheet.close();document.querySelector('.login-button')?.click();return;}
 const game=selected,on=favourites.has(game.id);favouritePending=true;updateFavourite();
 try{
  const response=await fetch('/api/favourites',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:game.nativeId,enabled:!on})});
  const data=await response.json();if(!response.ok)throw Error(data?.error||'Your favourite could not be saved. Please try again.');
  if(Array.isArray(data))favourites=new Set(data.filter(id=>typeof id==='string').map(canonical));else on?favourites.delete(game.id):favourites.add(game.id);
  storeFavourites();renderCards();sheet.querySelector('.portal-r9-sheet-status').textContent=on?'Removed from My Games.':'Saved to My Games.';
 }catch(error){sheet.querySelector('.portal-r9-sheet-status').textContent=error.message;}
 finally{favouritePending=false;updateFavourite();}
}

function decorateAuth(){
 for(const form of document.querySelectorAll('.player-dialog .auth-form:not(.agent-auth-form)')){
  const username=form.querySelector('input[name="username"]');if(username){username.inputMode='tel';username.autocapitalize='none';username.spellcheck=false;}
  for(const input of form.querySelectorAll('input[name="password"],input[name="confirm_password"]')){
   if(input.dataset.portalEye==='ready')continue;input.dataset.portalEye='ready';const field=input.closest('.field');if(!field)continue;field.classList.add('portal-r9-password-field');const button=create('button','portal-r9-password-eye');button.type='button';button.setAttribute('aria-label','Show password');button.setAttribute('aria-pressed','false');button.innerHTML=svg('eye');button.onclick=()=>{const show=input.type==='password';input.type=show?'text':'password';button.setAttribute('aria-label',show?'Hide password':'Show password');button.setAttribute('aria-pressed',String(show));};field.append(button);
  }
 }
 for(const banner of document.querySelectorAll('.dialog-login .auth-welcome'))if(!banner.dataset.portalBanner){banner.dataset.portalBanner='ready';banner.classList.add('portal-r9-auth-banner');banner.setAttribute('aria-label','ZPLAY player promotion');const image=create('img');image.src='/zplaybet-v232/reference-promo.webp?pv=236';image.alt='ZPLAY · One tap, instant access';banner.replaceChildren(image);}
}

function currentSurface(main){
 if(main.querySelector('.account-page,.profile-page'))return 'account';
 if(main.querySelector('.machine-stage,.slot-machine,.sw-original-slot,.sw-original,.game-machine'))return '';
 const active=document.querySelector('.bottom-nav button.active')?.textContent.trim().toLowerCase();return ['home','games','popular'].includes(active)?active:'';
}
function mount(){
 frame=0;if(stopped)return;const app=document.querySelector('#root .app.player'),main=app?.querySelector('.player-main');if(!main)return;
 document.body.dataset.portalR9=release;decorateAuth();const view=currentSurface(main);
 if(document.body.dataset.portalView!==view)document.body.dataset.portalView=view;
 const nextIdentity=app.querySelector('.signed-in-header .balance-chip')?'signed-in':'guest';
 if(identity!==nextIdentity){const previousIdentity=identity;identity=nextIdentity;if(identity==='signed-in')void readFavourites();else if(previousIdentity){favourites=new Set();storeFavourites();renderCards();}}
 if(!view||view==='account'){if(gallery.isConnected)gallery.remove();surface=view;currentMain=main;return;}
 const changed=surface!==view||currentMain!==main||!gallery.isConnected;
 if(!gallery.isConnected)main.append(gallery);if(!scrollTop.isConnected)document.body.append(scrollTop);
 if(!changed)return;surface=view;currentMain=main;savedOnly=false;query='';category='All';provider='All';search.value='';gallery.dataset.surface=view;renderPromotions();renderCategories();renderCards();
}
function schedule(){if(!frame&&!stopped)frame=requestAnimationFrame(mount);}
const observer=new MutationObserver(schedule);observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
for(const button of gallery.querySelectorAll('[data-view]'))button.onclick=()=>{savedOnly=button.dataset.view==='saved';renderCards();};
search.addEventListener('input',()=>{query=search.value.trim();renderCards();});
gallery.querySelector('.portal-r9-filter').onclick=event=>{const on=gallery.dataset.expanded!=='true';gallery.dataset.expanded=String(on);event.currentTarget.setAttribute('aria-expanded',String(on));if(on)gallery.querySelector('.portal-r9-categories').scrollIntoView({block:'nearest'});};
sheet.querySelector('.portal-r9-sheet-close').onclick=()=>sheet.close();sheet.querySelector('.portal-r9-sheet-favourite').onclick=()=>void toggleFavourite();
sheet.querySelector('.portal-r9-sheet-details').onclick=event=>{const details=sheet.querySelector('.portal-r9-game-details');details.hidden=!details.hidden;event.currentTarget.setAttribute('aria-expanded',String(!details.hidden));};
sheet.addEventListener('close',()=>opener?.isConnected&&opener.focus({preventScroll:true}));
sheet.addEventListener('click',event=>{if(event.target!==sheet)return;const rect=sheet.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)sheet.close();});
window.addEventListener('scroll',onScroll,{passive:true});
const stop=()=>{stopped=true;observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('scroll',onScroll);};
window[KEY]={stop,diagnostics:()=>({release,surface,gameCount:games.length,loaded,error:loadError,favourites:favourites.size,savedOnly,query,category,provider,identity})};
window.addEventListener('pagehide',stop,{once:true});
window.addEventListener('pageshow',()=>{if(!stopped)return;stopped=false;observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});window.addEventListener('scroll',onScroll,{passive:true});schedule();});
schedule();
fetch('/api/config',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}}).then(async response=>{if(!response.ok)throw Error();const data=await response.json();if(!Array.isArray(data?.games))throw Error();config=data;games=normalize(data);loaded=true;document.body.dataset.portalCatalogFallback='false';renderCategories();renderCards();}).catch(()=>{loaded=true;loadError='The game list could not update. Reload to try again.';document.body.dataset.portalCatalogFallback='true';renderCards();});
