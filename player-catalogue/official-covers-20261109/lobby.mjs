import {games} from './catalog.mjs';
const KEY=Symbol.for('zplay.remaining20.credits-lobby.review1');
window[KEY]?.stop();
document.getElementById('remaining20-credits-lobby')?.remove();
const CARD='data-r20-game';
let stopped=false,frame=0,selected=null,returnFocus=null,owner=null,lastKey='';
const cards=new Map();
const dialog=document.createElement('dialog');dialog.className='r20-game-sheet';
dialog.setAttribute('aria-labelledby','r20-game-title');
const playIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4v16l14-8z"/></svg>';
dialog.innerHTML='<button type="button" class="r20-sheet-close" aria-label="Close game details">×</button><div class="r20-sheet-cover"><img alt=""></div><h2 id="r20-game-title"></h2><p class="r20-mode-note">This game currently uses demo credits. Your ETB wallet is not charged.</p><a class="r20-sheet-play">'+playIcon+' Play demo</a>';
document.body.append(dialog);
const close=()=>dialog.close();
dialog.querySelector('button').addEventListener('click',close);
dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)close();}});
dialog.addEventListener('close',()=>{returnFocus?.isConnected&&returnFocus.focus();selected=null;});
function open(game,button){
 selected=game;returnFocus=button;
 const image=dialog.querySelector('img');image.src=game.cover;image.alt=game.name;
 dialog.querySelector('h2').textContent=game.name;
 dialog.querySelector('a').href=game.launch;
 dialog.showModal();
}
function card(game){
 if(cards.has(game.id))return cards.get(game.id);
 const article=document.createElement('article');article.className='r20-native-card';article.setAttribute(CARD,game.id);
 const button=document.createElement('button');button.type='button';button.className='r20-native-open';button.setAttribute('aria-label','View '+game.name+' — Demo');button.setAttribute('aria-haspopup','dialog');
 const image=document.createElement('img');image.src=game.cover;image.alt=game.name;image.loading='lazy';image.decoding='async';image.draggable=false;
 image.addEventListener('error',()=>{article.classList.add('r20-art-unavailable');},{once:true});
 const badge=document.createElement('span');badge.className='r20-native-badge';badge.textContent='New';
 const play=document.createElement('span');play.className='r20-native-play';play.innerHTML=playIcon;play.setAttribute('aria-hidden','true');
 const mode=document.createElement('span');mode.className='r20-native-mode';mode.textContent='Demo';
 button.append(image,badge,play,mode);button.addEventListener('click',()=>open(game,button));article.append(button);cards.set(game.id,article);return article;
}
function render(){
 frame=0;if(stopped)return;
 const gallery=document.getElementById('portal-r9-gallery'),grid=gallery?.querySelector('.portal-r9-grid');
 if(!grid){for(const n of cards.values())n.remove();owner=null;lastKey='';if(dialog.open)dialog.close();return;}
 const category=gallery.querySelector('[data-category][aria-pressed="true"]')?.dataset.category||'All';
 const provider=gallery.querySelector('[data-provider][aria-pressed="true"]')?.dataset.provider||'All';
 const query=(gallery.querySelector('#portal-r9-search')?.value||'').trim().toLowerCase();
 const visible=gallery.dataset.saved!=='true'&&['All','ZPLAY'].includes(provider)?games.filter(g=>(category==='All'||g.category===category)&&g.name.toLowerCase().includes(query)):[];
 const ids=new Set(visible.map(g=>g.id)),key=[category,provider,query,...ids].join('|');
 for(const[id,node]of cards)if(!ids.has(id))node.remove();
 if(owner!==grid||key!==lastKey||visible.some(g=>cards.get(g.id)?.parentElement!==grid)){
  for(const game of visible)grid.append(card(game));owner=grid;lastKey=key;
 }
 const empty=gallery.querySelector('.portal-r9-empty');if(visible.length&&empty&&!empty.hidden){empty.hidden=true;empty.style.setProperty('display','none','important');}
}
function schedule(){if(!stopped&&!frame)frame=requestAnimationFrame(render);}
const own=node=>node?.nodeType===1&&(node.hasAttribute?.(CARD)||node.closest?.('['+CARD+'],.r20-game-sheet'));
const observer=new MutationObserver(records=>{if(records.some(r=>!own(r.target)&&!(r.type==='childList'&&[...r.addedNodes,...r.removedNodes].length&&[...r.addedNodes,...r.removedNodes].every(own))))schedule();});
function observe(){observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed','data-saved']});schedule();}
function input(e){if(e.target?.id==='portal-r9-search')schedule();}
function pause(){stopped=true;observer.disconnect();cancelAnimationFrame(frame);frame=0;}
function resume(){if(stopped){stopped=false;observe();}}
function stop(){pause();for(const n of cards.values())n.remove();dialog.remove();document.removeEventListener('input',input);window.removeEventListener('pagehide',pause);window.removeEventListener('pageshow',resume);}
document.addEventListener('input',input);window.addEventListener('pagehide',pause);window.addEventListener('pageshow',resume);
window[KEY]={stop,diagnostics:()=>({integrated:true,count:[...cards.values()].filter(n=>n.isConnected).length,ids:[...cards].filter(([,n])=>n.isConnected).map(([id])=>id)})};observe();
