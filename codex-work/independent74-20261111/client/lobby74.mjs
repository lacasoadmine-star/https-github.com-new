import {entries} from './official74-data.mjs';
import {existingWalletRoute} from './existing-wallet-routes.mjs';
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
function open(game,button){
 selectedGame=game;
 opener=button;poster.src=source(game.coverUrl);title.textContent=game.name;details.href=source(game.officialUrl);const route=url(game);play.textContent=route?'Play Now · ETB':'PLAY · Fur mashiinka';play.removeAttribute('aria-disabled');play.href=machineUrl(game);note.textContent=route?'Uses the existing game and Player account.':'Mashiinka iyo controls-ku way furmayaan. Sharadka ETB wuxuu sugayaa xaqiijinta server-ka, wallet-ka iyo settlement-ka.';
 if(!dialog.open)dialog.showModal();
}
play.addEventListener('click',event=>{
 if(!selectedGame||url(selectedGame))return;
 event.preventDefault();
 // The authored same-origin machine shares the existing Player session.
 // It stays inside the original dashboard; it is never a provider demo frame.
 machine.src='/independent74/machines74.html?embedded=1#'+encodeURIComponent(selectedGame.gameId);
 machine.hidden=false;dialog.classList.add('i74-playing');machine.focus();
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
}
const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',schedule);document.addEventListener('input',schedule);window.addEventListener('popstate',()=>{if(dialog.open)dialog.close();schedule();});window.addEventListener('hashchange',schedule);sync();

