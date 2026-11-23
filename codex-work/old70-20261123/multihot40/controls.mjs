import {SMARTSOFT_LOGO} from './brand.mjs';
import {createLocalSession} from './local-session.mjs';
import {MH40_MODEL} from './model.mjs';
import {MH40_LINES} from './line-paths.mjs';
import {createReelMotion} from './reel-motion.mjs';
import {createSpriteRenderer} from './sprite-renderer.mjs';
import {createAudio} from './audio.mjs';
export const money=value=>{const n=BigInt(value??0);return (n/100n).toLocaleString('en-US')+'.'+String(n%100n).padStart(2,'0');};
export function mountGame({root,artwork,storage=globalThis.sessionStorage,win=globalThis}={}) {
 if(!root?.ownerDocument||!artwork)throw Error('MH40_GAME_DEPENDENCIES');
 const doc=root.ownerDocument;
 root.innerHTML=`<header><div class="brand"><a href="/" aria-label="Back to ZPLAY">←</a>${SMARTSOFT_LOGO}</div><strong>Multi Hot 40</strong><small>PRACTICE</small></header>
 <main class="shell"><div class="stage"><canvas aria-label="Multi Hot 40 · 5 reels and 4 rows"></canvas><div class="loading"><strong>Multi Hot 40</strong><p>40 paylines · 1×–5×</p><button data-start>PLAY PRACTICE</button></div></div>
 <section class="controls" aria-label="Game controls"><button class="bet" data-bet>BET</button><button class="spin" data-spin disabled>SPIN</button><button class="auto" data-auto disabled>AUTO</button><button class="turbo" data-turbo aria-pressed="false">TURBO</button><button data-take hidden>TAKE WIN</button><button data-double hidden>X2</button></section>
 <div class="meters"><div class="meter"><small data-label-balance>BALANCE</small><output data-balance>—</output></div><div class="meter"><small>BET</small><output data-stake>0.40</output></div><div class="meter"><small>WIN</small><output data-win>0.00</output></div></div>
 <div class="bottom"><button data-menu>MENU</button><button data-sound aria-pressed="false">SOUND OFF</button><button data-help>RULES</button></div>
 <p class="status" role="status" aria-live="polite">Press PLAY PRACTICE to start.</p><p class="notice">Practice credits only · no deposits or withdrawals.</p></main>
 <dialog aria-labelledby="dialog-title"><div class="dialog-head"><h2 id="dialog-title"></h2><button data-close aria-label="Close menu">✕</button></div><div data-dialog-body></div></dialog>`;
 const q=s=>root.querySelector(s),dialog=q('dialog'),body=q('[data-dialog-body]'),status=q('[role=status]');
 const preferences={effects:false,music:false,turbo:false,language:'en'};
 try{const saved=JSON.parse(storage.getItem('zplay:old70:multihot40:preferences')||'{}');for(const key of ['effects','music','turbo'])if(typeof saved[key]==='boolean')preferences[key]=saved[key];if(['en','so'].includes(saved.language))preferences.language=saved.language;}catch{}
 const automaticRounds=new Set();
 let session,renderer,disposed=false,auto=null,autoTimer=0,bet='40',started=false,paused=false;
 const listeners=[],modalListeners=[],audio=createAudio({clips:artwork.audio});
 const bind=(el,event,fn,modal=false)=>{el.addEventListener(event,fn);(modal?modalListeners:listeners).push(()=>el.removeEventListener(event,fn));};
 const clearModal=()=>{for(const remove of modalListeners.splice(0))remove();};
 const button=(label,fn)=>{const b=doc.createElement('button');b.type='button';b.textContent=label;bind(b,'click',()=>{audio.cue('Button.mp3');fn();},true);return b;};
 const paragraph=text=>{const p=doc.createElement('p');p.textContent=text;body.append(p);};
 const report=error=>{status.textContent=error?.message||String(error);status.classList.add('error');};
 function savePreferences(){try{storage.setItem('zplay:old70:multihot40:preferences',JSON.stringify(preferences));}catch{}audio.preferences(preferences.effects,preferences.music);render();}
 function stopAuto(){if(auto)auto.active=false;clearTimeout(autoTimer);autoTimer=0;render();}
 function open(title,build){stopAuto();clearModal();q('#dialog-title').textContent=title;body.replaceChildren();build();if(!dialog.open)dialog.showModal();}
 function changeBet(value){if(session.snapshot().phase!=='ready'||auto?.active)return;bet=value;dialog.close();render();}
 function render(){
  if(disposed||!session)return;const s=session.snapshot(),busy=s.phase==='presenting',available=started&&s.started&&!paused;
  q('[data-balance]').textContent=s.balanceMinor===null?'—':money(s.balanceMinor);
  q('[data-stake]').textContent=money(bet);q('[data-win]').textContent=money(s.pendingWinMinor||'0');
  q('[data-spin]').textContent=busy?'STOP':preferences.language==='so'?'WAREEJI':'SPIN';
  q('[data-spin]').disabled=!available;q('[data-bet]').disabled=busy||!!auto?.active;
  q('[data-auto]').disabled=!available||busy&&!auto?.active;
  q('[data-auto]').textContent=auto?.active?'STOP AUTO · '+auto.remaining:'AUTO';
  q('[data-turbo]').setAttribute('aria-pressed',String(preferences.turbo));
  q('[data-sound]').setAttribute('aria-pressed',String(preferences.effects));
  q('[data-sound]').textContent=preferences.effects?'SOUND ON':'SOUND OFF';
  q('[data-take]').hidden=!(available&&!busy&&BigInt(s.pendingWinMinor||0)>0n);
  q('[data-double]').hidden=q('[data-take]').hidden||(s.doubleCount||0)>=MH40_MODEL.gamblePracticeMaxRounds;
 }
 function continueAuto(){
  if(disposed||paused||!auto?.active)return;
  const s=session.snapshot(),gain=BigInt(s.balanceMinor)+BigInt(s.pendingWinMinor||0)-auto.baseline;
  if(auto.remaining<=0||auto.winLimit!==null&&BigInt(auto.lastWin||0)>=auto.winLimit||
    auto.lossLimit!==null&&-gain>=auto.lossLimit||auto.gainLimit!==null&&gain>=auto.gainLimit){stopAuto();return;}
  autoTimer=setTimeout(()=>{autoTimer=0;if(!auto?.active||disposed||paused||dialog.open)return;spin(true);},180);
 }
 const motion=createReelMotion({onEvent:e=>{if(e.type==='spin'){audio.cue('Spin.mp3');audio.cue('ObjectMoveFast.mp3');}
  else if(e.type==='reel-stop')audio.cue(e.column%2?'ReelStop2.mp3':'ReelStop1.mp3');}});
 renderer=createSpriteRenderer({canvas:q('canvas'),artwork,motion,onComplete:id=>{
  try{session.finishPresentation(id);let s=session.snapshot();
   if(automaticRounds.delete(id)){const acceptedWin=s.pendingWinMinor;auto&&(auto.lastWin=acceptedWin);if(BigInt(acceptedWin)>0n){session.take({requestId:crypto.randomUUID()});s=session.snapshot();}}
   status.classList.remove('error');
   status.textContent=BigInt(s.pendingWinMinor||0)>0?'WIN '+money(s.pendingWinMinor):auto?.active?'AUTO · '+auto.remaining+' remaining':'Ready';
   if(auto?.active)continueAuto();render();renderer.invalidate();
  }catch(error){stopAuto();report(error);}
 }});
 session=createLocalSession({linePaths:MH40_LINES,storage,onState:render,onPresentation:e=>{
  if(e.type==='spin')renderer.start(e.round,{turbo:preferences.turbo});else if(e.type==='stop')renderer.stop();
 },onObserverError:report});
 function spin(automatic=false){
  if(!automatic)stopAuto();if(disposed||paused||dialog.open||!started)return;
  if(session.snapshot().phase==='presenting'){session.stop();return;}
  try{status.classList.remove('error');status.textContent=automatic?'AUTO · '+auto.remaining:'Spinning…';
   const requestId=crypto.randomUUID();if(automatic){auto.remaining--;automaticRounds.add(requestId);}
   try{session.spin({requestId,betMinor:bet});}catch(error){automaticRounds.delete(requestId);throw error;}render();
  }catch(error){stopAuto();report(error);}
 }
 bind(q('[data-start]'),'click',async()=>{
  try{session.start();started=true;q('.loading').hidden=true;
   audio.preferences(preferences.effects,preferences.music);
   const s=session.snapshot();if(s.phase==='presenting')renderer.start(session.recover(s.pendingRequestId),{turbo:true});
   else{if(s.round)renderer.restore(s.round);status.textContent='Ready';}render();renderer.invalidate();
   if(preferences.effects||preferences.music)void audio.unlock().then(()=>{if(!disposed)audio.preferences(preferences.effects,preferences.music);}).catch(()=>{if(!disposed)status.textContent='Audio unavailable';});
  }catch(error){report(error);}
 });
 bind(q('[data-spin]'),'click',()=>spin());
 bind(q('[data-bet]'),'click',()=>open('BET',()=>{
  const choices=doc.createElement('div');choices.className='choices';body.append(choices);
  MH40_MODEL.betLevelsMinor.forEach(value=>{const b=button(money(value),()=>changeBet(value));b.setAttribute('aria-pressed',String(value===bet));choices.append(b);});
 }));
 bind(q('[data-turbo]'),'click',()=>{preferences.turbo=!preferences.turbo;savePreferences();});
 bind(q('[data-auto]'),'click',()=>{
  if(auto?.active){stopAuto();return;}
  open('AUTO',()=>{
   let count=100;const choices=doc.createElement('div');choices.className='choices';body.append(choices);
   for(const n of [25,50,100,500,1000]){const b=button(String(n),()=>{count=n;for(const other of choices.children)other.setAttribute('aria-pressed',String(other===b));});b.setAttribute('aria-pressed',String(n===count));choices.append(b);}
   const limits={};
   for(const [key,label] of [['winLimit','Stop on win'],['lossLimit','Balance decrease'],['gainLimit','Balance increase']]){
    const row=doc.createElement('label');row.className='setting';row.textContent=label;
    const input=doc.createElement('input');input.type='number';input.min='0.01';input.step='0.01';input.placeholder='—';input.setAttribute('aria-label',label);row.append(input);body.append(row);limits[key]=input;
   }
   body.append(button('START PLAY',()=>{
    try{
     const parse=input=>{if(!input.value)return null;if(!/^\d+(\.\d{1,2})?$/.test(input.value)||Number(input.value)<=0||Number(input.value)>100000000)throw Error('Enter a positive stop amount');
      const parts=input.value.split('.');return BigInt(parts[0])*100n+BigInt((parts[1]||'').padEnd(2,'0'));};
     const s=session.snapshot();auto={active:true,remaining:count,baseline:BigInt(s.balanceMinor)+BigInt(s.pendingWinMinor||0),
      winLimit:parse(limits.winLimit),lossLimit:parse(limits.lossLimit),gainLimit:parse(limits.gainLimit)};
     dialog.close();spin(true);
    }catch(error){report(error);}
   }));
  });
 });
 function rules(){open('RULES',()=>{
  paragraph('5 reels · 4 rows · 40 fixed paylines. Matching symbols pay from left to right. A 1×–5× multiplier applies to line wins.');
  paragraph('Practice sampler: independent outcomes. Provider RTP and probabilities are not reproduced.');
  const table=doc.createElement('table');table.innerHTML='<thead><tr><th>Symbol</th><th>3</th><th>4</th><th>5</th></tr></thead>';const tbody=doc.createElement('tbody');
  const names=['Seven','Bell','Grapes','Watermelon','Cherry','Orange','Plum','Lemon'];
  MH40_MODEL.coefficients.forEach((p,i)=>{const tr=doc.createElement('tr');for(const value of [names[i],...p]){const td=doc.createElement('td');td.textContent=String(value);tr.append(td);}tbody.append(tr);});table.append(tbody);body.append(table);
  const lines=doc.createElement('div');lines.className='lines';body.append(lines);
  MH40_LINES.forEach((path,index)=>{const item=doc.createElement('div');item.className='line';const text=doc.createElement('small');text.textContent=String(index+1);
   const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 80');svg.setAttribute('aria-label','Payline '+(index+1));
   const poly=doc.createElementNS(svg.namespaceURI,'polyline');poly.setAttribute('points',path.map((r,c)=>(10+c*20)+','+(10+r*20)).join(' '));poly.setAttribute('fill','none');poly.setAttribute('stroke','#ffe24b');poly.setAttribute('stroke-width','3');svg.append(poly);item.append(text,svg);lines.append(item);});
 });}
 bind(q('[data-help]'),'click',rules);
 function settings(){open('SETTINGS',()=>{
  for(const [key,label] of [['effects','Sound effects'],['music','Background music']]){
   const row=doc.createElement('label');row.className='setting';row.textContent=label;const input=doc.createElement('input');input.type='checkbox';input.checked=preferences[key];row.append(input);body.append(row);
   bind(input,'change',async()=>{preferences[key]=input.checked;if(input.checked)try{await audio.unlock();}catch(error){report(error);}savePreferences();},true);
  }
  const row=doc.createElement('label');row.className='setting';row.textContent='Language';const select=doc.createElement('select');
  for(const [value,label] of [['en','English'],['so','Soomaali']]){const option=doc.createElement('option');option.value=value;option.textContent=label;select.append(option);}
  select.value=preferences.language;row.append(select);body.append(row);bind(select,'change',()=>{preferences.language=select.value;savePreferences();},true);
  body.append(button('FULL SCREEN',async()=>{try{if(doc.fullscreenElement)await doc.exitFullscreen();else await root.requestFullscreen();}catch{status.textContent='Full screen is unavailable';}}));
 });}
 bind(q('[data-menu]'),'click',()=>open('MENU',()=>{
  body.append(button('RULES',rules),button('SETTINGS',settings),button('PRACTICE HISTORY',()=>open('PRACTICE HISTORY',()=>{
   const rounds=session.history();if(!rounds.length)paragraph('No practice rounds yet.');
   for(const r of rounds.slice(-30).reverse())paragraph('#'+r.ordinal+' · Bet '+money(r.betMinor)+' · Win '+money(r.winMinor));
  })));
 }));
 bind(q('[data-sound]'),'click',async()=>{
  preferences.effects=!preferences.effects;
  if(preferences.effects)try{await audio.unlock();}catch(error){report(error);}savePreferences();
 });
 bind(q('[data-take]'),'click',()=>{stopAuto();try{session.take({requestId:crypto.randomUUID()});status.textContent='Win collected';render();renderer.invalidate();}catch(error){report(error);}});
 bind(q('[data-double]'),'click',()=>open('DOUBLE WIN',()=>{
  paragraph('Pending practice win '+money(session.snapshot().pendingWinMinor)+'. This practice draw uses independent fair colors.');
  for(const choice of ['RED','BLACK'])body.append(button(choice,()=>{
   try{const result=session.double({requestId:crypto.randomUUID(),choice});
    let reveal=body.querySelector('[data-gamble-result]');if(!reveal){reveal=doc.createElement('p');reveal.dataset.gambleResult='';reveal.setAttribute('role','status');body.append(reveal);}
    const s=session.snapshot();reveal.textContent=result.revealed+' · '+(result.won?'WIN ':'NO WIN ')+money(s.pendingWinMinor);status.textContent=reveal.textContent;
    for(const b of body.querySelectorAll('button'))if(['RED','BLACK'].includes(b.textContent))b.disabled=BigInt(s.pendingWinMinor)===0n||s.doubleCount>=MH40_MODEL.gamblePracticeMaxRounds;render();
   }catch(error){report(error);}
  }));body.append(button('TAKE WIN',()=>{session.take({requestId:crypto.randomUUID()});dialog.close();render();}));
 }));
 bind(q('[data-close]'),'click',()=>dialog.close());
 bind(dialog,'cancel',()=>stopAuto());bind(dialog,'close',clearModal);
 bind(win,'keydown',event=>{if(event.code==='Space'&&!/INPUT|SELECT|TEXTAREA|BUTTON|A/.test(event.target?.tagName)&&!dialog.open){event.preventDefault();spin();}});
 const lifecycle=()=>{
  const hidden=doc.hidden||doc.hasFocus?.()===false;
  if(hidden){paused=true;stopAuto();renderer.pause();audio.pause();}else{paused=false;renderer.resume();audio.resume();}
  render();
 };
 bind(doc,'visibilitychange',lifecycle);bind(win,'blur',lifecycle);bind(win,'focus',lifecycle);bind(win,'resize',()=>renderer.invalidate());
 render();renderer.invalidate();
 return Object.freeze({session,renderer,snapshot:()=>({...session.snapshot(),betMinor:bet,autoRemaining:auto?.active?auto.remaining:0,turbo:preferences.turbo}),
  dispose(){if(disposed)return;stopAuto();disposed=true;clearModal();listeners.forEach(remove=>remove());dialog.close();renderer.dispose();audio.dispose();session.dispose();artwork.dispose?.();root.replaceChildren();}
 });
}
