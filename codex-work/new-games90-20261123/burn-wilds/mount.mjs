import {BURN_WILDS_GAME_ID} from './expansion.mjs';
import {BurnWildsAudio} from './audio.mjs';
import {toggleBurnWildsFullscreen} from './fullscreen.mjs';
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
  view.innerHTML='<canvas class="burn-wilds-scene" aria-label="Five reels and multiplier wheel"></canvas><canvas class="burn-wilds-fire" aria-hidden="true"></canvas><div class="burn-wilds-controls"></div><div class="burn-wilds-test-label" hidden>TEST ETB · No real money</div><div class="burn-wilds-dialog" hidden></div><p class="burn-wilds-status" role="status"></p>';
  root.appendChild(view);const canvas=view.querySelector('.burn-wilds-scene'),flameCanvas=view.querySelector('.burn-wilds-fire'),layer=view.querySelector('.burn-wilds-controls'),dialog=view.querySelector('.burn-wilds-dialog'),status=view.querySelector('.burn-wilds-status');
  const buttons={};for(const[key,[label,aria]]of Object.entries(controls)){const button=doc.createElement('button');button.type='button';button.dataset.action=key;button.textContent=label;button.setAttribute('aria-label',aria);button.className='burn-wilds-button burn-wilds-'+key;layer.appendChild(button);buttons[key]=button;}
  const retrySession=doc.createElement('button');
   retrySession.type='button';retrySession.className='burn-wilds-retry-session';
   retrySession.dataset.action='retry-session';retrySession.textContent='RECONNECT';
   retrySession.setAttribute('aria-label','Retry the authenticated Player session');
   retrySession.hidden=true;status.appendChild(retrySession);
   const balance=doc.createElement('output'),stake=doc.createElement('output');balance.className=stake.className='burn-wilds-meter';layer.append(balance,stake);
  const testLabel=view.querySelector('.burn-wilds-test-label');testLabel.hidden=transport.mode!=='SIMULATION';
  const options={effects:false,music:false};let mode=null,betOffset=0,count=100,tapSerial=0,disposed=false,controller,returnFocus=null;
  const sound=audio??new BurnWildsAudio(),listeners=new AbortController(),scene=new BurnWildsScene({canvas,flameCanvas,artwork,win,onEvent:event=>{
    if(event.type==='settled')controller?.presentationFinished(event.roundId);
    if(options.effects)sound?.event?.(event.type,event);
  }});
  function resize(){if(disposed)return;const b=view.getBoundingClientRect(),layout=scene.resize(Math.max(1,b.width),Math.max(1,b.height),win.devicePixelRatio||1);
    for(const[key,element]of Object.entries({...buttons,balance,stake})){const r=layout.controls[key];if(!r)continue;Object.assign(element.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});}
  }
  function render(s){
    const unit=s.mode==='SIMULATION'||transport.mode==='SIMULATION'?'TEST ETB':'ETB';
    testLabel.hidden=unit!=='TEST ETB';
    balance.innerHTML='BALANCE<strong>'+money(s.balanceMinor)+' '+unit+'</strong>';stake.innerHTML='BET<strong>'+money(s.betMinor)+' '+unit+'</strong>';
    const spinning=s.status==='ANIMATING'||s.status==='SENDING'&&s.pending?.action==='SPIN';
    buttons.spin.textContent=s.status==='RECOVER'?'RECOVER':spinning?'STOP':'SPIN';
    buttons.spin.disabled=mode==='startup'||['DISCONNECTED','CONNECTING','BLOCKED','PREPARING'].includes(s.status)||s.status==='SENDING'&&!spinning||s.status==='READY'&&!s.canPlay;
    buttons.spin.setAttribute('aria-label',s.status==='RECOVER'?'Recover the same pending request':spinning?'Stop presentation':'Spin');
    buttons.bet.disabled=s.status!=='READY';buttons.auto.disabled=s.status!=='READY'&&!s.auto?.active;buttons.take.disabled=s.status!=='READY'||s.pendingWinMinor<=0;buttons.double.disabled=!s.canDouble;
    buttons.quick.setAttribute('aria-pressed',String(s.quick));buttons.sound.setAttribute('aria-pressed',String(options.effects||options.music));
    buttons.sound.textContent=options.effects||options.music?'♫':'♪×';
    buttons.auto.textContent=s.auto?.active?String(s.auto.remaining):'↻';
     // A failed account handshake must be recoverable after the player logs
     // back into the EXISTING portal; never create a new account or balance.
     const retryAllowed=['BLOCKED','DISCONNECTED'].includes(s.status);
     retrySession.hidden=!retryAllowed;retrySession.disabled=!retryAllowed;
     const statusText=s.error?(s.status==='RECOVER'?'Connection interrupted. RECOVER continues the same request.':s.error):s.status==='CONNECTING'?'Loading account…':'';
     status.replaceChildren(doc.createTextNode(statusText),retrySession);
     status.hidden=!statusText&&!retryAllowed;
    if(mode==='gamble')renderGamble(s);
  }
  controller=new BurnWildsController({transport,scene,storage,onChange:render});
  const close=()=>{mode=null;dialog.hidden=true;dialog.replaceChildren();render(controller.snapshot());const focus=returnFocus?.isConnected&&!returnFocus.disabled?returnFocus:view;focus.focus({preventScroll:true});returnFocus=null;};
  const heading=title=>'<header><h2>'+title+'</h2><button type="button" data-do="close" aria-label="Close">×</button></header>';
  function renderGamble(s){
    const panel=dialog.querySelector('[data-gamble-panel]');if(!panel)return;
    const focused=doc.activeElement?.dataset?.do;
    const busy=['PREPARING','SENDING'].includes(s.status),result=busy?null:s.lastGamble;
    const suits={HEARTS:'♥',DIAMONDS:'♦',CLUBS:'♣',SPADES:'♠'};
    const card=result?.card,hasCard=card&&/^(A|[2-9]|10|J|Q|K)$/.test(card.rank)&&suits[card.suit];
    const red=card?.suit==='HEARTS'||card?.suit==='DIAMONDS';
    const amount=busy&&s.pending?.expectedStakeMinor!==undefined?s.pending.expectedStakeMinor:s.pendingWinMinor;
    const disabled=s.status!=='READY'||!s.canDouble,unit=s.unit||'ETB';
    panel.innerHTML='<div class="burn-wilds-gamble-amounts"><div>GAMBLE AMOUNT<strong>'+money(amount)+' '+unit+'</strong></div><div>GAMBLE TO WIN<strong>'+money(amount*2)+' '+unit+'</strong></div></div>'+
      '<div class="burn-wilds-card '+(hasCard?(red?'is-red':'is-black'):'is-flashing')+'" role="img" aria-label="'+(hasCard?escape(card.rank+' of '+card.suit.toLowerCase()):'Choose red or black')+'">'+
      (hasCard?'<span>'+escape(card.rank)+'</span><b>'+suits[card.suit]+'</b><span>'+escape(card.rank)+'</span>':'<b>?</b>')+'</div>'+
      '<p class="burn-wilds-gamble-result" role="status">'+(busy?'Revealing card…':s.status==='RECOVER'?'Connection interrupted. Recover the same choice.':result?(result.won?'WIN '+money(result.payoutMinor)+' '+unit:'No win. Your account balance was not charged again.'):'Guess the card color to double the pending win.')+'</p>'+
      '<div class="burn-wilds-choices"><button data-do="red" '+(disabled?'disabled':'')+'>♥ RED</button><button data-do="black" '+(disabled?'disabled':'')+'>♠ BLACK</button></div>'+
      (s.status==='RECOVER'?'<button data-do="recover-gamble">RECOVER</button>':'')+
      '<button class="burn-wilds-gamble-take" data-do="take" '+(s.status!=='READY'||s.pendingWinMinor<=0?'disabled':'')+'>TAKE WIN</button>';
    if(['red','black','take','recover-gamble'].includes(focused))panel.querySelector('[data-do="'+focused+'"]')?.focus({preventScroll:true});
  }
  function show(kind){
    // Stop future AUTO wagers before the menu covers its stop control.
    // The already accepted round keeps its result and presentation.
    if(kind==='menu')controller.stopAuto();
    const s=controller.snapshot(),unit=s.unit||'ETB';if(!mode)returnFocus=doc.activeElement;mode=kind;dialog.dataset.mode=kind;dialog.hidden=false;
    let html=heading(kind==='bet'?'Choose bet':kind==='auto'?'Autoplay':kind==='gamble'?'X2':kind==='startup'?'Enable sound?':'Game menu');
    if(kind==='startup')html+='<div class="burn-wilds-choices"><button data-do="sound-yes">YES</button><button data-do="sound-no">NO</button></div>';
    if(kind==='bet'){
      betOffset=Math.max(0,Math.min(betOffset,Math.max(0,s.betLevelsMinor.length-5)));
      html+='<button data-do="bet-up" aria-label="Previous bets" '+(betOffset===0?'disabled':'')+'>▲</button><div class="burn-wilds-bets">'+s.betLevelsMinor.slice(betOffset,betOffset+5).map(value=>'<button data-do="choose-bet" data-value="'+value+'" aria-pressed="'+(value===s.betMinor)+'">'+money(value)+' '+unit+'</button>').join('')+'</div><button data-do="bet-down" aria-label="Next bets" '+(betOffset+5>=s.betLevelsMinor.length?'disabled':'')+'>▼</button>';
    }
    if(kind==='auto'){count=100;html+='<div class="burn-wilds-counts">'+BURN_WILDS_AUTO_COUNTS.map(value=>'<button data-do="count" data-value="'+value+'" aria-pressed="'+(count===value)+'">'+value+'</button>').join('')+'</div><h3>STOP AUTOPLAY</h3>'+[
      ['win','If a win reaches or exceeds'],['decrease','If balance decreases'],['increase','If balance increases']
    ].map(([key,label])=>'<label><input type="checkbox" data-condition="'+key+'">'+label+'<input inputmode="decimal" data-amount="'+key+'" aria-label="'+label+' in '+unit+'" disabled><span>'+unit+'</span></label>').join('')+'<button data-do="start-auto">START PLAY</button>';}
    if(kind==='gamble')html+='<div data-gamble-panel></div>';
    if(kind==='menu'||kind==='rules'||kind==='settings'){
      html+='<nav><button data-do="rules">Rules</button><button data-do="settings">Settings</button></nav>';
      if(kind==='settings')html+='<label>Sound effects<input type="checkbox" data-setting="effects" '+(options.effects?'checked':'')+'></label><label>Background music<input type="checkbox" data-setting="music" '+(options.music?'checked':'')+'></label>'+'<button type="button" data-do="fullscreen">Fullscreen</button>';
      else{
        const quoted=s.betMinor===null?null:describeBurnWildsPaytable(s.betMinor);html+='<p>Wins are in '+unit+' at the selected total bet.</p>';
        if(quoted)html+='<table><thead><tr><th>Symbol</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody>'+Object.entries(quoted).map(([symbol,pay])=>'<tr><th>'+escape(symbol)+'</th>'+[2,3,4,5].map(n=>'<td>'+(pay[n]===undefined?'—':money(pay[n]))+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
        html+='<p>Five fixed paylines run from the leftmost reel. WILD appears on reels 2–4 and replaces ordinary symbols. A WILD in a winning line can expand to fill its reel. The accepted multiplier is 1×, 2×, 3×, 4× or 5×.</p><div class="burn-wilds-paylines">'+BURN_WILDS_PAYLINES.map((rows,index)=>'<svg viewBox="0 0 100 62" role="img" aria-label="Payline '+(index+1)+'"><text x="2" y="12">'+(index+1)+'</text><polyline points="'+rows.map((row,column)=>(12+column*20)+','+(16+row*20)).join(' ')+'"/></svg>').join('')+'</div><p>A pending win is collected through TAKE or the next accepted spin. X2 is available only when the existing server enables it. AUTO stops after a disconnection. Reconnect using the same pending request.</p>';
      }
    }
    dialog.innerHTML='<div role="dialog" aria-modal="true" aria-label="'+escape(kind==='gamble'?'X2 gamble':kind==='startup'?'Enable sound':kind)+'">'+html+'<p class="burn-wilds-dialog-error" role="status"></p></div>';render(s);dialog.querySelector('button:not([disabled])')?.focus({preventScroll:true});
  }
  const run=async operation=>{try{await operation();}catch(error){const message=error.code||error.message;if(mode){const target=dialog.querySelector('.burn-wilds-dialog-error');if(target)target.textContent=message;}else{render(controller.snapshot());const label=doc.createTextNode(message);status.insertBefore(label,retrySession);}}};
  view.addEventListener('click',event=>{
    if(event.target===dialog){if(mode==='startup')sound?.setPreferences?.({...options});close();return;}
    const button=event.target.closest('button');if(!button||button.disabled)return;
    // A visible dialog owns all input until it closes; touches behind it cannot wager.
    if(mode&&!dialog.contains(button))return;
    // Each genuine tap receives one short UI cue; disabled and obscured controls stay silent.
    if(options.effects)sound?.cue?.('button','tap-'+(++tapSerial));
    const action=button.dataset.action,operation=button.dataset.do;
    if(action==='retry-session'){
       retrySession.disabled=true;
       return run(async()=>{await controller.connect();if(!disposed)render(controller.snapshot());});
     }
     if(action==='spin')return run(()=>controller.snapshot().status==='RECOVER'?controller.recover():controller.spin());
    if(action==='take')return run(()=>controller.take());if(action==='quick')return controller.setQuick(!controller.quick);
    if(action==='sound'){options.effects=options.music=!(options.effects||options.music);if(options.effects)void Promise.resolve(sound?.unlock?.()).catch(()=>{});sound?.setPreferences?.({...options});render(controller.snapshot());return;}
    if(action==='auto'){if(controller.snapshot().auto?.active)return controller.stopAuto();return show('auto');}
    if(action==='bet')return show('bet');if(action==='double')return show('gamble');if(action==='menu')return show('menu');
    if(operation==='close'){if(mode==='startup')sound?.setPreferences?.({...options});return close();}
    if(operation==='bet-up'||operation==='bet-down'){betOffset+=operation==='bet-up'?-5:5;return show('bet');}
    if(operation==='choose-bet'){if(controller.setBet(Number(button.dataset.value)))close();return;}
    if(operation==='count'){count=Number(button.dataset.value);for(const child of dialog.querySelectorAll('[data-do="count"]'))child.setAttribute('aria-pressed',String(Number(child.dataset.value)===count));return;}
    if(operation==='start-auto')return run(async()=>{const settings={count};for(const[key,name]of [['win','winAtLeastMinor'],['decrease','balanceDecreaseMinor'],['increase','balanceIncreaseMinor']])settings[name]=dialog.querySelector('[data-condition="'+key+'"]').checked?minor(dialog.querySelector('[data-amount="'+key+'"]').value):null;close();await controller.startAuto(settings);});
    if(operation==='sound-yes'||operation==='sound-no'){options.effects=options.music=operation==='sound-yes';if(options.effects)void Promise.resolve(sound?.unlock?.()).catch(()=>{});sound?.setPreferences?.({...options});return close();}
    if(operation==='red'||operation==='black')return run(()=>controller.double(operation.toUpperCase()));
    if(operation==='recover-gamble')return run(()=>controller.recover());
    if(operation==='take')return run(async()=>{await controller.take();close();});
    if(operation==='fullscreen')return run(async()=>{const result=await toggleBurnWildsFullscreen(view,doc);if(result.reason){dialog.querySelector('.burn-wilds-dialog-error').textContent=result.reason;return;}close();resize();});
    if(operation==='rules'||operation==='settings')return show(operation);
  },{signal:listeners.signal});
  view.addEventListener('change',event=>{const condition=event.target.dataset.condition;if(condition){const amount=dialog.querySelector('[data-amount="'+condition+'"]');if(amount){amount.disabled=!event.target.checked;if(event.target.checked)amount.focus();}return;}
    const key=event.target.dataset.setting;if(key in options){options[key]=event.target.checked;
    if(key==='effects'){options.music=options.effects;const music=dialog.querySelector('[data-setting="music"]');if(music)music.checked=options.music;}
    if(options[key])void Promise.resolve(sound?.unlock?.()).catch(()=>{});
    sound?.setPreferences?.({...options});render(controller.snapshot());}},{signal:listeners.signal});
  view.addEventListener('keydown',event=>{if(event.key==='Escape'&&mode){event.preventDefault();close();return;}
    if(event.key==='Tab'&&mode){const items=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')],first=items[0],last=items[items.length-1];
      if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}return;}
    if(mode||event.repeat||/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(event.target.tagName))return;if(event.key===' '||event.key==='Enter'){event.preventDefault();buttons.spin.click();}},{signal:listeners.signal});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){controller.pause();sound?.pause?.();}else{controller.resume();sound?.resume?.();}},{signal:listeners.signal});
  win.addEventListener?.('blur',()=>{controller.stopAuto();sound?.pause?.();},{signal:listeners.signal});
  win.addEventListener?.('focus',()=>{if(!doc.hidden)sound?.resume?.();},{signal:listeners.signal});
  win.addEventListener?.('resize',resize,{signal:listeners.signal});
  doc.addEventListener?.('fullscreenchange',resize,{signal:listeners.signal});
  win.visualViewport?.addEventListener?.('resize',resize,{signal:listeners.signal});const observer=win.ResizeObserver?new win.ResizeObserver(resize):null;observer?.observe(view);
  function dispose(){if(disposed)return;disposed=true;listeners.abort();observer?.disconnect();controller.dispose();sound?.dispose?.();view.remove();mounts.delete(root);}
  const mounted=Object.freeze({controller,scene,resize,dispose});mounts.set(root,mounted);resize();render(controller.snapshot());
  try{await controller.connect();if(!disposed)show('startup');}
   catch(error){if(!disposed)render(controller.snapshot());}
  return mounted;
}

