import {entries} from './official74-data.mjs';
import {existingWalletRoute} from './existing-wallet-routes.mjs';
// Additive catalogue only: the existing React account header, navigation,
// authentication and game engines remain owned by the existing application.
const available=entries.filter(game=>existingWalletRoute(game.gameId));
const url=game=>existingWalletRoute(game.gameId);
const element=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;};
const source=value=>{const link=new URL(value);if(link.protocol!=='https:'||!['cdn.prod.website-files.com','www.smartsoftgaming.com','smartsoftgaming.com','eu-server.ssgportal.com'].includes(link.hostname))throw Error('Invalid catalogue source');return link.href;};
const section=element('section','i74-lobby');section.id='i74-lobby';section.setAttribute('aria-label','Existing account games and74-game progress');
const tools=element('div','i74-tools'),heading=element('h2','', 'Existing account games'),search=element('input');search.type='search';search.placeholder='Search games';search.setAttribute('aria-label','Search existing account games');const progress=element('a','i74-progress','74-game progress →');progress.href='/independent74/progress.html';tools.append(heading,search,progress);
const checkpoint=element('a','i74-progress i74-checkpoint','74-game progress · Next phase pending');checkpoint.href='/independent74/progress.html';
const grid=element('div','i74-grid');section.append(tools,grid);
const dialog=element('dialog','i74-sheet');dialog.id='i74-lobby-dialog';dialog.setAttribute('aria-labelledby','i74-sheet-title');
const close=element('button','i74-close','×');close.type='button';close.setAttribute('aria-label','Close game options');
const poster=element('img','i74-poster');poster.alt='';const title=element('h2','i74-sheet-title');title.id='i74-sheet-title';
const details=element('a','i74-details','ⓘ  Game details');details.target='_blank';details.rel='noopener noreferrer';
const play=element('a','i74-play','Play Now · ETB');
const note=element('p','i74-note','Uses the existing game and Player account. New74-game versions remain under review.');
dialog.append(close,poster,title,details,play,note);
let opener;
function open(game,button){
 opener=button;poster.src=source(game.coverUrl);title.textContent=game.name;details.href=source(game.officialUrl);play.href=url(game);
 if(!dialog.open)dialog.showModal();
}
for(const game of available){
 const card=element('button','i74-card');card.type='button';card.dataset.gameId=game.gameId;card.setAttribute('aria-label','Open '+game.name);card.setAttribute('aria-haspopup','dialog');
 const image=element('img');image.src=source(game.coverUrl);image.alt=game.name;image.loading='lazy';image.decoding='async';image.width=493;image.height=617;
 card.append(image);card.addEventListener('click',()=>open(game,card));grid.append(card);
}
search.addEventListener('input',()=>{const query=search.value.trim().toLocaleLowerCase();available.forEach((game,index)=>{const card=grid.children[index];card.hidden=card.dataset.duplicate==='true'||!game.name.toLocaleLowerCase().includes(query);});});
close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>opener?.focus());
dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button,a[href],input')].filter(node=>!node.hidden&&node.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}});
let frame=0;
function sync(){
 frame=0;
 const main=document.querySelector('main.player-main'),gallery=main?.querySelector('#portal-r9-gallery');
 const active=(document.querySelector('.bottom-nav button.active')?.textContent||'Home').trim().toUpperCase();
 const show=location.pathname==='/'&&!!gallery&&['HOME','GAMES'].includes(active)&&['home','games','casino'].includes(gallery.dataset.surface||'home');
 if(show){
  if(!section.isConnected||section.parentNode!==main)gallery.after(section);
  if(!checkpoint.isConnected||checkpoint.parentNode!==main)main.insertBefore(checkpoint,gallery);
  const originals=[...main.querySelectorAll('a[href],[data-game],[data-game-id]')].filter(node=>!section.contains(node)&&node.getClientRects().length);
  available.forEach((game,index)=>{const route=url(game),key=route.split('/').at(-1),duplicate=originals.some(node=>node.getAttribute('href')===route||node.dataset.game===key||node.dataset.gameId===game.gameId);const card=grid.children[index];card.dataset.duplicate=String(duplicate);card.hidden=duplicate||!game.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase());});
  if(!dialog.isConnected)document.body.append(dialog);
 }
 section.hidden=!show;checkpoint.hidden=!show;
 if(!show&&dialog.open)dialog.close();
}
const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',schedule);window.addEventListener('popstate',()=>{if(dialog.open)dialog.close();schedule();});window.addEventListener('hashchange',schedule);sync();
