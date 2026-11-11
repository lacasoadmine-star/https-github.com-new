import {entries} from './official74-data.mjs';
import {existingWalletRoute} from './existing-wallet-routes.mjs';
// Additive catalogue only: the existing React account header, navigation,
// authentication and game engines remain owned by the existing application.
const url=game=>existingWalletRoute(game.gameId);
const element=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;};
const source=value=>{const link=new URL(value);if(link.protocol!=='https:'||!['cdn.prod.website-files.com','www.smartsoftgaming.com','smartsoftgaming.com','eu-server.ssgportal.com'].includes(link.hostname))throw Error('Invalid catalogue source');return link.href;};
const dialog=element('dialog','i74-sheet');dialog.id='i74-lobby-dialog';dialog.setAttribute('aria-labelledby','i74-sheet-title');
const close=element('button','i74-close','×');close.type='button';close.setAttribute('aria-label','Close game options');
const poster=element('img','i74-poster');poster.alt='';const title=element('h2','i74-sheet-title');title.id='i74-sheet-title';
const details=element('a','i74-details','ⓘ  Game details');details.target='_blank';details.rel='noopener noreferrer';
const play=element('a','i74-play','Play Now · ETB');
const note=element('p','i74-note','Uses the existing game and Player account. New74-game versions remain under review.');
dialog.append(close,poster,title,details,play,note);
let opener;
function open(game,button){
 opener=button;poster.src=source(game.coverUrl);title.textContent=game.name;details.href=source(game.officialUrl);const route=url(game);play.textContent=route?'Play Now · ETB':'Under review';play.setAttribute('aria-disabled',String(!route));if(route)play.href=route;else play.removeAttribute('href');note.textContent=route?'Uses the existing game and Player account.':'This game is under review. Account play is unavailable.';
 if(!dialog.open)dialog.showModal();
}
const cards=new Map();
for(const game of entries){
 const article=element('article','collection-card i74-card');article.dataset.i74GameId=game.gameId;
 const card=element('button','collection-card-open i74-open');card.type='button';card.setAttribute('aria-label','Open '+game.name);card.setAttribute('aria-haspopup','dialog');
 const image=element('img','i74-cover');image.src=source(game.coverUrl);image.alt=game.name;image.loading='lazy';image.decoding='async';image.width=493;image.height=617;card.append(image);
 if(!url(game))card.append(element('span','i74-review','Under review'));
 card.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();open(game,card);},true);article.append(card);cards.set(game.gameId,article);
}
close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>opener?.focus());
dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button,a[href],input')].filter(node=>!node.hidden&&node.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}});
let frame=0;
function sync(){
 frame=0;
 const gallery=document.querySelector('main.player-main #portal-r9-gallery'),grid=gallery?.querySelector('.collection-grid');
 const active=(document.querySelector('.bottom-nav button.active')?.textContent||'Home').trim().toUpperCase();
 const show=location.pathname==='/'&&!!grid&&['HOME','GAMES'].includes(active)&&['home','games','casino'].includes(gallery.dataset.surface||'home');
 if(!show){if(dialog.open)dialog.close();return;}
 const originals=[...grid.querySelectorAll('.collection-card')].filter(node=>!node.classList.contains('i74-card'));
 const query=(document.querySelector('#portal-r9-search')?.value||'').trim().toLocaleLowerCase();
 for(const game of entries){
  const route=url(game),key=route?.split('/').at(-1);
  const existing=route?originals.find(article=>[...article.querySelectorAll('[data-game],a[href]')].some(node=>node.dataset.game===key||node.getAttribute('href')===route)):null;
  const card=cards.get(game.gameId);
  if(existing){existing.dataset.i74GameId=game.gameId;if(card.isConnected)card.remove();}
  else{if(card.parentNode!==grid)grid.append(card);card.hidden=!!query&&!game.name.toLocaleLowerCase().includes(query);}
 }
 if(!dialog.isConnected)document.body.append(dialog);
}
const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',schedule);document.addEventListener('input',schedule);window.addEventListener('popstate',()=>{if(dialog.open)dialog.close();schedule();});window.addEventListener('hashchange',schedule);sync();
