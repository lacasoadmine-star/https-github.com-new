// One launcher for the nine native cards. Opening it never starts a wager.
export function createGameSheet(document, storage) {
 const dialog=document.createElement('dialog');dialog.className='native-game-sheet';
 dialog.setAttribute('aria-labelledby','native-game-sheet-title');
 const node=(tag,parent,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;parent?.append(el);return el;};
 const style=node('style',document.head);style.textContent=`
 .native-game-sheet{box-sizing:border-box;position:fixed;inset:auto 0 0;margin:0 auto;width:100%;max-width:560px;max-height:92dvh;overflow:auto;border:0;border-radius:28px 28px 0 0;padding:42px 16px max(18px,env(safe-area-inset-bottom));background:#0c192b;color:#fff;font:15px system-ui;box-shadow:0 -12px 40px #0005}
 .native-game-sheet::backdrop{background:#000b}.native-game-sheet:before{content:'';position:absolute;top:10px;left:44%;width:12%;height:3px;border-radius:3px;background:#415463}
 .native-game-sheet .native-sheet-close{position:absolute;right:12px;top:8px;width:44px;height:44px;border:0;background:transparent;color:#abc1d1;font-size:32px}
 .native-sheet-cover{display:block;width:min(62vw,290px);height:min(43dvh,360px);object-fit:contain;margin:0 auto;background:#071421;border-radius:10px}
 .native-game-sheet h2{text-align:center;font-size:18px;margin:14px 0}.native-sheet-actions{display:flex;gap:12px;margin:16px 0}.native-sheet-actions button{flex:1;min-height:48px;border:0;border-radius:5px;background:#1a2b3a;color:inherit;font:inherit}
 .native-sheet-play{display:flex;align-items:center;justify-content:center;min-height:48px;background:#28c34f;color:#fff;text-decoration:none;font-size:17px;font-weight:700;border-radius:5px}
 .native-sheet-details{line-height:1.5;color:#c6d3de;margin:10px 0}.native-sheet-details[hidden]{display:none}
 @media(min-width:700px){.native-game-sheet{inset:0;margin:auto;height:fit-content;border-radius:20px}}
 `;
 const close=node('button',dialog,'×');close.type='button';close.className='native-sheet-close';close.setAttribute('aria-label','Close game options');
 const cover=node('img',dialog);cover.className='native-sheet-cover';cover.alt='';
 const title=node('h2',dialog);title.id='native-game-sheet-title';
 const actions=node('div',dialog);actions.className='native-sheet-actions';
 const detailsButton=node('button',actions,'ⓘ  Game details');detailsButton.type='button';detailsButton.setAttribute('aria-expanded','false');detailsButton.setAttribute('aria-controls','native-sheet-details');
 const favourite=node('button',actions);favourite.type='button';
 const details=node('p',dialog);details.id='native-sheet-details';details.className='native-sheet-details';details.hidden=true;
 const play=node('a',dialog,'Play Now');play.className='native-sheet-play';
 document.body.append(dialog);
 const key='zplay.native.favourites.v1';let selected=null,trigger=null;
 const saved=()=>{try{const ids=JSON.parse(storage?.getItem(key)||'[]');return new Set(Array.isArray(ids)?ids.filter(id=>typeof id==='string'):[]);}catch{return new Set();}};
 const sync=()=>{const on=saved().has(selected);favourite.textContent=on?'★  Favourite':'☆  Favourite';favourite.setAttribute('aria-pressed',String(on));};
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>trigger?.isConnected&&trigger.focus({preventScroll:true}));
 detailsButton.addEventListener('click',()=>{details.hidden=!details.hidden;detailsButton.setAttribute('aria-expanded',String(!details.hidden));});
 favourite.addEventListener('click',()=>{const ids=saved();ids.has(selected)?ids.delete(selected):ids.add(selected);try{storage?.setItem(key,JSON.stringify([...ids]));sync();}catch{favourite.textContent='Could not save';}});
 return {
  open({id,name,image,button,available}){
   if(!/^[a-z0-9_]+$/.test(id))return;
   selected=id;trigger=button;title.textContent=name;cover.src=image;cover.alt=name;
   details.hidden=true;detailsButton.setAttribute('aria-expanded','false');
   details.textContent='SmartSoft Gaming · '+name+'. Uses your existing ETB balance.'+(available?'':' New rounds are currently unavailable.');
   play.href='/games/'+id;sync();if(!dialog.open)dialog.showModal();
  },
  dispose(){dialog.close();dialog.remove();style.remove();},
 };
}

export function patchLobbySheet(source){
 const before="event.preventDefault();event.stopImmediatePropagation();location.assign('/games/'+id);";
 const after="event.preventDefault();event.stopImmediatePropagation();const image=card.querySelector('img');gameSheet.open({id,name:image?.alt||id,image:image?.src||'',button,available:operational.has(id)});";
 if(source.split(before).length!==2||source.split('section.remove();').length!==2)throw Error('LOBBY_SHEET_CONTRACT_CHANGED');
 return "import {createGameSheet} from './lobby-sheet-r21.mjs';\nlet sheetStorage;try{sheetStorage=window.localStorage;}catch{}\nconst gameSheet=createGameSheet(document,sheetStorage);\n"+source.replace(before,after).replace('section.remove();','section.remove();gameSheet.dispose();');
}
