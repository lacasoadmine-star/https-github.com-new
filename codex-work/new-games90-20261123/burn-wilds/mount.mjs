import {BURN_WILDS_GAME_ID} from './expansion.mjs';
import {BurnWildsScene} from './scene.mjs';
import {BurnWildsController,BURN_WILDS_AUTO_COUNTS} from './controller.mjs';
import {describeBurnWildsPaytable,BURN_WILDS_PAYLINES} from './rules.mjs';

const mounts=new WeakMap();
const money=value=>value===null?'—':(value/100).toFixed(2);
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const minor=text=>{if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw new Error('Enter a positive ETB amount');const [whole,fraction='']=text.split('.');const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));if(!Number.isSafeInteger(amount)||amount<=0)throw new Error('Enter a positive ETB amount');return amount;};
const controls={spin:['SPIN','Spin or stop the current presentation'],auto:['↻','Autoplay'],bet:['$','Choose bet'],quick:['ϟ','Quick spin'],take:['TAKE','Take win'],double:['X2','Double win'],menu:['☰','Game menu'],sound:['♫','Toggle sound']};

/** Mounts inside the existing Player game host. A real authenticated transport
 * and this game's own verified symbol assets must be supplied by that host.
 * There is deliberately no demo wallet, synthetic transport or cash fallback.
 */
export async function mountBurnWilds({root,transport,artwork,audio=null,storage=globalThis.sessionStorage,win=globalThis}={}){
  if(!root?.ownerDocument||artwork?.gameId!==BURN_WILDS_GAME_ID)throw new TypeError('BURN_WILDS_HOST_ROOT_AND_ARTWORK_REQUIRED');
  mounts.get(root)?.dispose();const doc=root.ownerDocument,view=doc.createElement('section');view.className='burn-wilds';view.tabIndex=0;view.setAttribute('aria-label','Multi Hot 5 Burn Wilds');
  view.innerHTML='<canvas class="burn-wilds-scene" aria-label="Five reels and multiplier wheel"></canvas><canvas class="burn-wilds-fire" aria-hidden="true"></canvas><div class="burn-wilds-controls"></div><div class="burn-wilds-dialog" hidden></div><p class="burn-wilds-status" role="status"></p>';
  root.appendChild(view);const canvas=view.querySelector('.burn-wilds-scene'),flameCanvas=view.querySelector('.burn-wilds-fire'),layer=view.querySelector('.burn-wilds-controls'),dialog=view.querySelector('.burn-wilds-dialog'),status=view.querySelector('.burn-wilds-status');
  const buttons={};for(const[key,[label,aria]]of Object.entries(controls)){const button=doc.createElement('button');button.type='button';button.dataset.action=key;button.textContent=label;button.setAttribute('aria-label',aria);button.className='burn-wilds-button burn-wilds-'+key;layer.appendChild(button);buttons[key]=button;}
  const balance=doc.createElement('output'),stake=doc.createElement('output');balance.className=stake.className='burn-wilds-meter';layer.append(balance,stake);
  const options={effects:false,music:false};let mode=null,betOffset=0,count=100,disposed=false,controller;
  const listeners=new AbortController(),scene=new BurnWildsScene({canvas,flameCanvas,artwork,win,onEvent:event=>{
    if(event.type==='settled')controller?.presentationFinished(event.roundId);
    if(options.effects)audio?.event?.(event.type,event);
  }});
  function resize(){if(disposed)return;const b=view.getBoundingClientRect(),layout=scene.resize(Math.max(1,b.width),Math.max(1,b.height),win.devicePixelRatio||1);
    for(const[key,element]of Object.entries({...buttons,balance,stake})){const r=layout.controls[key];if(!r)continue;Object.assign(element.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});}
  }
  function render(s){
    balance.innerHTML='BALANCE<strong>'+money(s.balanceMinor)+' ETB</strong>';stake.innerHTML='BET<strong>'+money(s.betMinor)+' ETB</strong>';
    const spinning=['SENDING','ANIMATING'].includes(s.status)&&s.pending?.action!=='TAKE';
    buttons.spin.textContent=s.status==='RECOVER'?'RECOVER':spinning?'STOP':'SPIN';
    buttons.spin.disabled=mode==='startup'||['DISCONNECTED','CONNECTING','BLOCKED','PREPARING'].includes(s.status)||s.status==='READY'&&!s.canPlay;
    buttons.spin.setAttribute('aria-label',s.status==='RECOVER'?'Recover the same pending request':spinning?'Stop presentation':'Spin');
    buttons.bet.disabled=s.status!=='READY';buttons.auto.disabled=s.status!=='READY'&&!s.auto?.active;buttons.take.disabled=s.status!=='READY'||s.pendingWinMinor<=0;buttons.double.disabled=!s.canDouble;
    buttons.quick.setAttribute('aria-pressed',String(s.quick));buttons.sound.setAttribute('aria-pressed',String(options.effects||options.music));
    buttons.auto.textContent=s.auto?.active?String(s.auto.remaining):'↻';status.textContent=s.error?(s.status==='RECOVER'?'Connection interrupted. RECOVER continues the same request.':s.error):s.status==='CONNECTING'?'Loading account…':'';
  }
  controller=new BurnWildsController({transport,scene,storage,onChange:render});
  const close=()=>{mode=null;dialog.hidden=true;dialog.replaceChildren();render(controller.snapshot());view.focus({preventScroll:true});};
  const heading=title=>'<header><h2>'+title+'</h2><button type="button" data-do="close" aria-label="Close">×</button></header>';
  function show(kind){
    const s=controller.snapshot();mode=kind;dialog.hidden=false;
    let html=heading(kind==='bet'?'Choose bet':kind==='auto'?'Autoplay':kind==='gamble'?'X2':kind==='startup'?'Enable sound?':'Game menu');
    if(kind==='startup')html+='<div class="burn-wilds-choices"><button data-do="sound-yes">YES</button><button data-do="sound-no">NO</button></div>';
    if(kind==='bet'){
      betOffset=Math.max(0,Math.min(betOffset,Math.max(0,s.betLevelsMinor.length-5)));
      html+='<button data-do="bet-up" aria-label="Previous bets">▲</button><div class="burn-wilds-bets">'+s.betLevelsMinor.slice(betOffset,betOffset+5).map(value=>'<button data-do="choose-bet" data-value="'+value+'" aria-pressed="'+(value===s.betMinor)+'">'+money(value)+' ETB</button>').join('')+'</div><button data-do="bet-down" aria-label="Next bets">▼</button>';
    }
    if(kind==='auto')html+='<div class="burn-wilds-counts">'+BURN_WILDS_AUTO_COUNTS.map(value=>'<button data-do="count" data-value="'+value+'" aria-pressed="'+(count===value)+'">'+value+'</button>').join('')+'</div><h3>STOP AUTOPLAY</h3>'+[
      ['win','If a win reaches or exceeds'],['decrease','If balance decreases'],['increase','If balance increases']
    ].map(([key,label])=>'<label><input type="checkbox" data-condition="'+key+'">'+label+'<input inputmode="decimal" data-amount="'+key+'" aria-label="'+label+' in ETB"><span>ETB</span></label>').join('')+'<button data-do="start-auto">START PLAY</button>';
    if(kind==='gamble')html+='<div class="burn-wilds-choices"><button data-do="red">RED</button><button data-do="black">BLACK</button></div><button data-do="take">TAKE WIN</button>';
    if(kind==='menu'||kind==='rules'||kind==='settings'){
      html+='<nav><button data-do="rules">Rules</button><button data-do="settings">Settings</button></nav>';
      if(kind==='settings')html+='<label>Sound effects<input type="checkbox" data-setting="effects" '+(options.effects?'checked':'')+'></label><label>Background music<input type="checkbox" data-setting="music" '+(options.music?'checked':'')+'></label>';
      else{
        const quoted=s.betMinor===null?null:describeBurnWildsPaytable(s.betMinor);html+='<p>Wins are in ETB at the selected total bet.</p>';
        if(quoted)html+='<table><thead><tr><th>Symbol</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody>'+Object.entries(quoted).map(([symbol,pay])=>'<tr><th>'+escape(symbol)+'</th>'+[2,3,4,5].map(n=>'<td>'+(pay[n]===undefined?'—':money(pay[n]))+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
        html+='<p>Five fixed paylines run from the leftmost reel. WILD appears on reels 2–4 and replaces ordinary symbols. A WILD in a winning line can expand to fill its reel. The accepted multiplier is 1×, 2×, 3×, 4× or 5×.</p><div class="burn-wilds-paylines">'+BURN_WILDS_PAYLINES.map((rows,index)=>'<svg viewBox="0 0 100 62" role="img" aria-label="Payline '+(index+1)+'"><text x="2" y="12">'+(index+1)+'</text><polyline points="'+rows.map((row,column)=>(12+column*20)+','+(16+row*20)).join(' ')+'"/></svg>').join('')+'</div><p>A pending win is collected through TAKE or the next accepted spin. X2 is available only when the existing server enables it. AUTO stops after a disconnection. Reconnect using the same pending request.</p>';
      }
    }
    dialog.innerHTML='<div role="dialog" aria-modal="true">'+html+'<p class="burn-wilds-dialog-error" role="status"></p></div>';render(s);dialog.querySelector('button')?.focus({preventScroll:true});
  }
  const run=async operation=>{try{await operation();}catch(error){const message=error.code||error.message;if(mode)dialog.querySelector('.burn-wilds-dialog-error').textContent=message;else status.textContent=message;}};
  view.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    const action=button.dataset.action,operation=button.dataset.do;
    if(action==='spin')return run(()=>controller.snapshot().status==='RECOVER'?controller.recover():controller.spin());
    if(action==='take')return run(()=>controller.take());if(action==='quick')return controller.setQuick(!controller.quick);
    if(action==='sound'){options.effects=options.music=!(options.effects||options.music);audio?.setPreferences?.({...options});render(controller.snapshot());return;}
    if(action==='auto'){if(controller.snapshot().auto?.active)return controller.stop();return show('auto');}
    if(action==='bet')return show('bet');if(action==='double')return show('gamble');if(action==='menu')return show('menu');
    if(operation==='close'){if(mode==='startup')audio?.setPreferences?.({...options});return close();}
    if(operation==='bet-up'||operation==='bet-down'){betOffset+=operation==='bet-up'?-5:5;return show('bet');}
    if(operation==='choose-bet'){if(controller.setBet(Number(button.dataset.value)))close();return;}
    if(operation==='count'){count=Number(button.dataset.value);for(const child of dialog.querySelectorAll('[data-do="count"]'))child.setAttribute('aria-pressed',String(Number(child.dataset.value)===count));return;}
    if(operation==='start-auto')return run(async()=>{const settings={count};for(const[key,name]of [['win','winAtLeastMinor'],['decrease','balanceDecreaseMinor'],['increase','balanceIncreaseMinor']])settings[name]=dialog.querySelector('[data-condition="'+key+'"]').checked?minor(dialog.querySelector('[data-amount="'+key+'"]').value):null;close();await controller.startAuto(settings);});
    if(operation==='sound-yes'||operation==='sound-no'){options.effects=options.music=operation==='sound-yes';audio?.unlock?.();audio?.setPreferences?.({...options});return close();}
    if(operation==='red'||operation==='black'){close();return run(()=>controller.double(operation.toUpperCase()));}
    if(operation==='take'){close();return run(()=>controller.take());}
    if(operation==='rules'||operation==='settings')return show(operation);
  },{signal:listeners.signal});
  view.addEventListener('change',event=>{const key=event.target.dataset.setting;if(key in options){options[key]=event.target.checked;audio?.setPreferences?.({...options});render(controller.snapshot());}},{signal:listeners.signal});
  view.addEventListener('keydown',event=>{if(event.key==='Escape'&&mode){event.preventDefault();close();return;}if(mode||event.repeat||/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(event.target.tagName))return;if(event.key===' '||event.key==='Enter'){event.preventDefault();buttons.spin.click();}},{signal:listeners.signal});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){controller.pause();audio?.pause?.();}else{controller.resume();audio?.resume?.();}},{signal:listeners.signal});
  win.addEventListener?.('blur',()=>{controller.stopAuto();audio?.pause?.();},{signal:listeners.signal});
  win.addEventListener?.('resize',resize,{signal:listeners.signal});const observer=win.ResizeObserver?new win.ResizeObserver(resize):null;observer?.observe(view);
  function dispose(){if(disposed)return;disposed=true;listeners.abort();observer?.disconnect();controller.dispose();audio?.dispose?.();view.remove();mounts.delete(root);}
  const mounted=Object.freeze({controller,scene,resize,dispose});mounts.set(root,mounted);resize();render(controller.snapshot());
  try{await controller.connect();if(!disposed)show('startup');}catch(error){status.textContent=error.code||error.message;}
  return mounted;
}
