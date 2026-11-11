import {entries} from './official74-data.mjs';
import {existingWalletRoute} from './existing-wallet-routes.mjs';
// Additive catalogue only: the existing React account header, navigation,
// authentication and game engines remain owned by the existing application.
const url=(game,demo=false)=>!demo&&existingWalletRoute(game.gameId)?existingWalletRoute(game.gameId):game.protected?game.demoUrl:'/independent74/machines74.html'+(demo?'?mode=demo':'')+'#'+encodeURIComponent(game.gameId);
const element=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;};
const source=value=>{const link=new URL(value);if(link.protocol!=='https:'||!['cdn.prod.website-files.com','www.smartsoftgaming.com','smartsoftgaming.com','eu-server.ssgportal.com'].includes(link.hostname))throw Error('Invalid catalogue source');return link.href;};
const section=element('section','i74-lobby');section.id='i74-lobby';section.setAttribute('aria-label','74 ZPLAY games');
const tools=element('div','i74-tools'),heading=element('h2','', '74 Games'),search=element('input');search.type='search';search.placeholder='Search games';search.setAttribute('aria-label','Search74games');tools.append(heading,search);
const grid=element('div','i74-grid');section.append(tools,grid);
const dialog=element('dialog','i74-sheet');dialog.id='i74-lobby-dialog';dialog.setAttribute('aria-labelledby','i74-sheet-title');
const close=element('button','i74-close','×');close.type='button';close.setAttribute('aria-label','Close game options');
const poster=element('img','i74-poster');poster.alt='';const title=element('h2','i74-sheet-title');title.id='i74-sheet-title';
const details=element('a','i74-details','ⓘ  Game details');details.target='_blank';details.rel='noopener noreferrer';
const play=element('a','i74-play','Play Now · ETB'),demo=element('a','i74-demo','Play Demo · Free credits');
const qa=new URLSearchParams(location.search).get('qa')==='1';demo.hidden=!qa;
const note=element('p','i74-note','Play Now uses your existing Player account when the server enables the game.');
dialog.append(close,poster,title,details,play,demo,note);
let opener;
function open(game,button){
 opener=button;poster.src=source(game.coverUrl);title.textContent=game.name;details.href=source(game.officialUrl);play.href=url(game);demo.href=url(game,true);demo.textContent=game.protected?'Play Demo · Official demo ↗':'Play Demo · Free credits';
 if(game.protected){demo.target='_blank';demo.rel='noopener noreferrer';}else{demo.removeAttribute('target');demo.removeAttribute('rel');}
 if(!dialog.open)dialog.showModal();
}
for(const game of entries){
 const card=element('button','i74-card');card.type='button';card.dataset.gameId=game.gameId;card.setAttribute('aria-label','Open '+game.name);card.setAttribute('aria-haspopup','dialog');
 const image=element('img');image.src=source(game.coverUrl);image.alt=game.name;image.loading='lazy';image.decoding='async';image.width=493;image.height=617;
 card.append(image);card.addEventListener('click',()=>open(game,card));grid.append(card);
}
search.addEventListener('input',()=>{const query=search.value.trim().toLocaleLowerCase();entries.forEach((game,index)=>{grid.children[index].hidden=!game.name.toLocaleLowerCase().includes(query);});});
close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>opener?.focus());
let frame=0,currentMain;
function sync(){
 frame=0;
 const main=document.querySelector('main.player-main'),gallery=main?.querySelector('#portal-r9-gallery');
 const active=(document.querySelector('.bottom-nav button.active')?.textContent||'Home').trim().toUpperCase();
 const show=location.pathname==='/'&&!!gallery&&['HOME','GAMES'].includes(active)&&['home','games','casino'].includes(gallery.dataset.surface||'home');
 if(currentMain&&currentMain!==main)currentMain.classList.remove('i74-lobby-active');currentMain=main;
 if(show){
  if(!section.isConnected||section.parentNode!==main)main.insertBefore(section,gallery);
  if(!dialog.isConnected)document.body.append(dialog);
 }
 if(main)main.classList.toggle('i74-lobby-active',show);section.hidden=!show;
 if(!show&&dialog.open)dialog.close();
}
const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',schedule);window.addEventListener('popstate',schedule);window.addEventListener('hashchange',schedule);sync();
