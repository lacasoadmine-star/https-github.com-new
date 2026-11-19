import {games, CATALOG_RELEASE} from './catalog-data.mjs';

// Catalogue presentation only. Identity, wallet, history and game execution
// remain with the existing Player shell and the retained game pages.
const instanceKey=Symbol.for('zplay.restored-catalogue');
window[instanceKey]?.dispose();
const rootId='zplay-live-catalog',shortcutId='zplay-live-shortcut';
const sheetId='zplay-game-detail-sheet',detailsRelease="zplay-player-20261119-play-now-r1";
const favoriteKey='zplay:favorite-game-ids:v1',knownIds=new Set(games.map(game=>game.id));
const groups=[['all','Liiska ciyaaraha']];
const routes=/^\/(?:games\/[a-z0-9_-]+|new74\/[a-z0-9-]+\/|zplay74\/multi-hot-10\/|zplay-restored\/20261117\/[a-z0-9_]+\/)$/;
const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const eligible=path=>typeof path==='string'&&routes.test(path);
const playable=game=>game.status==='available'&&eligible(game.accountPath);
const searchable=game=>(game.title+' '+game.edition).toLocaleLowerCase();
const counts={total:games.length,available:games.filter(playable).length};
let frame=0,disposed=false,viewOpened=false,query='',filter='all',root=null,shortcut=null;
let sheet=null,openGame=null,sheetOpener=null,previousOverflow=null;
let favorites=readFavorites();
const style=element('link');style.rel='stylesheet';style.href=new URL('./lobby.css',import.meta.url).href;style.dataset.catalogRelease=detailsRelease;
document.head.append(style);

// This is the only persisted state owned by this catalogue: title preferences.
// Account, balance, session and game state remain with the existing Player.
function readFavorites(){
 try{
  const value=JSON.parse(window.localStorage.getItem(favoriteKey)||'[]');
  return new Set(Array.isArray(value)?value.filter(id=>typeof id==='string'&&knownIds.has(id)):[]);
 }catch{return new Set();}
}
function favoriteButton(game){
 const button=element('button','restored-sheet-favorite');button.type='button';button.dataset.sheetFavorite=game.id;
 button.addEventListener('click',()=>{
  if(favorites.has(game.id))favorites.delete(game.id);else favorites.add(game.id);
  try{window.localStorage.setItem(favoriteKey,JSON.stringify([...favorites]));}catch{}
  updateFavorite(button,game);render();
 });
 updateFavorite(button,game);return button;
}
function updateFavorite(button,game){
 const saved=favorites.has(game.id),icon=element('span','restored-sheet-star',saved?'★':'☆');icon.setAttribute('aria-hidden','true');
 button.replaceChildren(icon,element('span','',saved?'La kaydiyey':'Kaydi'));
 button.setAttribute('aria-pressed',String(saved));
 button.setAttribute('aria-label',`${saved?'Ka saar kuwa la kaydiyey':'Ku dar kuwa la kaydiyey'} · ${game.title}`);
}
function finishClose(restoreFocus=true){
 const game=openGame,opener=sheetOpener;openGame=null;sheetOpener=null;
 if(previousOverflow!==null){
  if(document.body.style.overflow==='hidden')document.body.style.overflow=previousOverflow;
  previousOverflow=null;
 }
 if(restoreFocus&&game){
  const card=[...document.querySelectorAll('[data-catalog-game]')].find(node=>node.dataset.catalogGame===game.id);
  const target=opener?.isConnected?opener:card?.querySelector('[data-game-details]')||root?.querySelector('[data-catalog-filter][aria-pressed="true"]');
  target?.focus({preventScroll:true});
 }
}
function closeDetails(restoreFocus=true){
 if(!sheet)return;
 if(sheet.open&&typeof sheet.close==='function')sheet.close();else sheet.removeAttribute('open');
 finishClose(restoreFocus);
}
function ensureSheet(){
 if(sheet?.isConnected)return sheet;
 sheet=element('dialog','restored-game-sheet');sheet.id=sheetId;sheet.dataset.catalogRelease=detailsRelease;
 sheet.setAttribute('aria-labelledby','zplay-game-detail-title');
 sheet.addEventListener('cancel',event=>{event.preventDefault();closeDetails();});
 sheet.addEventListener('close',()=>{if(!sheet.open)finishClose();});
 sheet.addEventListener('click',event=>{if(event.target===sheet)closeDetails();});
 sheet.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeDetails();return;}
  if(event.key!=='Tab')return;
  const controls=[...sheet.querySelectorAll('a[href],button:not([disabled]),[tabindex="0"]')];
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
 document.body.append(sheet);return sheet;
}
function openDetails(game,opener){
 if(disposed)return;
 const dialog=ensureSheet();openGame=game;sheetOpener=opener;
 dialog.dataset.catalogGameId=game.id;dialog.dataset.status=game.status;
 const panel=element('div','restored-sheet-panel');
 const header=element('div','restored-sheet-header');
 const handle=element('span','restored-sheet-handle');handle.setAttribute('aria-hidden','true');
 const heading=element('h2','restored-sheet-title',game.title);heading.id='zplay-game-detail-title';
 const close=element('button','restored-sheet-close','×');close.type='button';close.setAttribute('aria-label','Xidh faahfaahinta ciyaarta');close.dataset.sheetClose='';
 close.addEventListener('click',()=>closeDetails());header.append(handle,heading,close);panel.append(header);
 const content=element('div','restored-sheet-content');
 const art=artwork(game);art.classList.add('restored-sheet-art');
 const cover=art.querySelector('.restored-game-cover');if(cover){cover.loading='eager';cover.alt=game.title;cover.removeAttribute('style');}
 content.append(art);
 const preferences=element('div','restored-sheet-preferences');
 const category=element('span','restored-sheet-category',game.category||'Ciyaar');
 preferences.append(category,favoriteButton(game));content.append(preferences);
 const actions=element('div','restored-sheet-actions');
 const account=playable(game)?linkFor(game,game.accountPath,'Play Now','restored-sheet-play'):null;
 if(account){account.dataset.sheetLaunch='account';account.setAttribute('aria-label',`Play Now · ${game.title} · ETB`);actions.append(account);}
 if(!account){
  const status=element('p','restored-sheet-status','Diyaarin');
  const description=element('p','restored-sheet-note','Ciyaartan weli diyaar ma aha.');
  const unavailable=element('button','restored-sheet-unavailable','Weli lama heli karo');unavailable.type='button';unavailable.disabled=true;
  actions.append(status,description,unavailable);
 }
 content.append(actions);panel.append(content);dialog.replaceChildren(panel);
 if(previousOverflow===null){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
 if(!dialog.open){
  if(typeof dialog.showModal==='function')dialog.showModal();
  else{dialog.setAttribute('open','');dialog.setAttribute('aria-modal','true');}
 }
 close.focus({preventScroll:true});
}
function detailButton(game,className,label){
 const button=element('button',className,label);button.type='button';button.dataset.gameDetails=game.id;
 button.setAttribute('aria-label',`Fur faahfaahinta ${game.title}`);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',sheetId);
 button.addEventListener('click',()=>openDetails(game,button));return button;
}
function syncFavorites(event){
 if(event.key!==favoriteKey&&event.key!==null)return;
 favorites=readFavorites();
 if(openGame){const button=sheet?.querySelector('[data-sheet-favorite]');if(button)updateFavorite(button,openGame);}
 render();
}
function onPageHide(){closeDetails(false);}
window.addEventListener('storage',syncFavorites);
window.addEventListener('pagehide',onPageHide);

function openGames(){
 const button=[...document.querySelectorAll('.bottom-nav button')].find(node=>node.textContent.trim().toUpperCase()==='GAMES');
 if(button){button.click();window.scrollTo({top:0});return true;}
 return false;
}
function linkFor(game,path,label,className){
 if(!eligible(path))return null;
 const link=element('a',className,label);link.href=path;
 link.setAttribute('aria-label',`${label} · ${game.title}${game.edition?' · '+game.edition:''}`);
 return link;
}
function artwork(game){
 const art=element('div','restored-game-art');art.style.setProperty('--game-hue',String(Number(game.hue)||145));
 const fallback=element('div','restored-game-fallback');
 fallback.append(element('span','restored-game-fallback-name',game.title));
 const symbols=element('div','restored-game-symbols');
 for(const source of game.symbols){const image=element('img');image.src=source;image.alt='';image.loading='lazy';image.addEventListener('error',()=>image.remove(),{once:true});symbols.append(image);}
 fallback.append(symbols);art.append(fallback);
 if(game.cover){
  const image=element('img','restored-game-cover');image.src=game.cover;image.alt='';image.loading='lazy';image.decoding='async';
  if(game.coverFit==='contain'){image.style.objectFit='contain';image.style.padding='18px';}
  image.addEventListener('load',()=>{fallback.hidden=true;},{once:true});
  image.addEventListener('error',()=>{image.remove();fallback.hidden=false;},{once:true});art.append(image);
 }
 return art;
}
function cardFor(game){
 const card=element('article','restored-game-card');card.dataset.catalogGame=game.id;card.dataset.status=game.status;
 const coverButton=detailButton(game,'restored-game-cover-link');coverButton.append(artwork(game));card.append(coverButton);
 const details=element('div','restored-game-details');
 details.append(element('h3','',game.title));
 if(game.edition)details.append(element('p','restored-game-edition',game.edition));
 if(favorites.has(game.id)){const saved=element('span','restored-game-saved','★ La kaydiyey');details.append(saved);}
 const actions=element('div','restored-game-actions');
 const available=playable(game);
 if(!available){
  details.append(element('p','restored-game-status','Weli lama heli karo'));
  actions.append(detailButton(game,'restored-game-information','Faahfaahin'));
 }else{const launch=linkFor(game,game.accountPath,'Play Now','restored-game-account');launch.dataset.gameLaunch=game.id;actions.append(launch);}
 details.append(actions);
 card.append(details);return card;
}
function selectedGames(){
 const term=query.trim().toLocaleLowerCase();
 return games.filter(game=>(!term||searchable(game).includes(term))&&(filter==='all'||filter==='available'&&playable(game)||filter==='account'&&playable(game)||filter==='preparing'&&game.status==='preparing'||filter==='favorites'&&favorites.has(game.id)));
}
function render(){
 if(!root)return;
 const selected=selectedGames();
 const status=root.querySelector('[data-catalog-count]');
 status.textContent=query.trim()||filter!=='all'?`${selected.length} / ${counts.total} ciyaarood`:`${counts.total} ciyaarood`;
 for(const[group,label]of groups){
  const section=root.querySelector(`[data-catalog-group="${group}"]`);
  const rows=selected.filter(game=>game.group===group);
  section.hidden=rows.length===0;
  section.querySelector('h2').textContent=`${label} · ${rows.length}`;
  section.querySelector('.restored-catalog-grid').replaceChildren(...rows.map(cardFor));
 }
 const empty=root.querySelector('[data-catalog-empty]');empty.hidden=selected.length!==0;
 empty.textContent=filter==='favorites'&&!query.trim()?'Weli ciyaar ma aadan kaydin.':'Ciyaar magacaas leh lama helin.';
 for(const button of root.querySelectorAll('[data-catalog-filter]'))button.setAttribute('aria-pressed',String(button.dataset.catalogFilter===filter));
}
function createCatalogue(){
 const section=element('section','restored-catalog');section.id=rootId;section.dataset.catalogRelease=detailsRelease;section.dataset.catalogSource=CATALOG_RELEASE;
 section.setAttribute('aria-labelledby','restored-catalog-title');
 const header=element('header');const title=element('h1','','CIYAARAHA');title.id='restored-catalog-title';
 const count=element('p','restored-catalog-count');count.dataset.catalogCount='';count.setAttribute('role','status');count.setAttribute('aria-live','polite');
 header.append(title,count);section.append(header);
 const searchLabel=element('label','restored-catalog-search');searchLabel.append(element('span','','Raadi ciyaar'));
 const search=element('input');search.type='search';search.placeholder='Magaca ciyaarta';search.autocomplete='off';search.value=query;
 search.addEventListener('input',()=>{query=search.value;render();});searchLabel.append(search);section.append(searchLabel);
 const filters=element('div','restored-catalog-filters');filters.setAttribute('aria-label','Nooca ciyaaraha');
 for(const[value,label]of[['all','Dhammaan'],['favorites','La kaydiyey'],['available','La furi karo'],['account','ETB'],['preparing','Diyaarin']]){
  const button=element('button','',label);button.type='button';button.dataset.catalogFilter=value;button.setAttribute('aria-pressed',String(value===filter));
  button.addEventListener('click',()=>{filter=value;render();});filters.append(button);
 }
 section.append(filters);
 for(const[group,label]of groups){const block=element('section','restored-catalog-group');block.dataset.catalogGroup=group;block.append(element('h2','',label),element('div','restored-catalog-grid'));section.append(block);}
 const empty=element('p','restored-catalog-empty','Ciyaar magacaas leh lama helin.');empty.dataset.catalogEmpty='';empty.hidden=true;section.append(empty);
 return section;
}
function reconcile(){
 frame=0;if(disposed)return;
 const gallery=document.querySelector('#portal-r9-gallery');
 if(gallery){
  const current=gallery.querySelector('#'+rootId);
  if(current!==root||!root?.isConnected){
   if(current)current.remove();
   root=createCatalogue();gallery.append(root);render();
  }
 }
 const main=document.querySelector('.player-main');
 if(main){
  const current=main.querySelector('#'+shortcutId);
  if(current!==shortcut||!shortcut?.isConnected){
   if(current)current.remove();
   shortcut=element('button','');shortcut.id=shortcutId;shortcut.type='button';shortcut.dataset.catalogRelease=detailsRelease;
   shortcut.append(element('strong','','Ciyaaraha ZPLAY'),element('span','',`${counts.total} ciyaarood · Fur liiska →`));
   shortcut.addEventListener('click',openGames);main.prepend(shortcut);
  }
 }
 if(new URL(location.href).searchParams.get('view')==='games'&&!viewOpened)viewOpened=openGames();
}
function schedule(){if(!disposed&&!frame)frame=requestAnimationFrame(reconcile);}
const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{childList:true,subtree:true});
window[instanceKey]={dispose(){disposed=true;observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('storage',syncFavorites);window.removeEventListener('pagehide',onPageHide);closeDetails(false);sheet?.remove();style.remove();root?.remove();shortcut?.remove();}};
reconcile();
