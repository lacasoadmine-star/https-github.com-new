import {AUTO_COUNTS, parseMinor} from './multihot100-machine.mjs';

const active = new WeakMap();
const CSS = `:host{display:block;color:#fff;font:600 16px system-ui}*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer;color:inherit}button:disabled{opacity:.45;cursor:default}.machine{position:relative;min-height:580px;background:radial-gradient(ellipse at 50% 30%,#09513a,#002c25 70%,#001e20);padding:20px;border-radius:14px;overflow:hidden}.title{margin:0;font-size:clamp(22px,4vw,42px);letter-spacing:2px;color:#ffd85a;text-shadow:1px 2px #602c00}.title span{color:#ff529d}.stage{display:grid;grid-template-columns:1fr minmax(70px,14%);gap:18px;align-items:center;max-width:900px;margin:0 auto}.board{min-width:0}.wheel{height:84px;display:grid;place-items:center}.wheel output{min-width:100px;text-align:center;padding:6px 18px;font-size:42px;color:#ffe665;border:3px solid #d5ae55;border-radius:55% 55% 20% 20%;background:#004c31;box-shadow:inset 0 0 10px #92a449}.reels{aspect-ratio:5/4;position:relative;border:4px ridge #e3c16c;border-radius:8px;background:#00342c;overflow:hidden}.reels canvas{display:block;width:100%;height:100%}.win-paths{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.win-paths path{fill:none;stroke:#ffdc55;stroke-width:1;filter:drop-shadow(0 0 1px #fff)}.side{display:grid;justify-items:center;gap:18px;padding-top:84px}.round{width:64px;height:64px;border-radius:50%;background:radial-gradient(#08533c,#00372f);border:3px ridge #e5c86a;font-size:26px}.primary{width:100%;max-width:140px;aspect-ratio:1;border-radius:50%;border:6px ridge #dabc65;background:#004936;font-size:18px;font-weight:900;box-shadow:inset 0 0 0 5px #f4f5dc}.amounts{display:flex;justify-content:space-between;gap:12px;margin-top:14px}.amount{color:#fff;border:3px ridge #d2b956;border-radius:12px;background:#003e2d;padding:8px 16px;min-width:120px;text-align:center}.amount small{display:block;color:#f2eb75}.amount output{font-variant-numeric:tabular-nums}.footer{display:flex;align-items:center;justify-content:space-between;margin-top:22px}.plain{border:0;background:transparent;font-size:26px}.status{font-size:14px;color:#ffe5a3;min-height:1.4em;text-align:center}.win{color:#ffe879;text-align:center;margin:10px 0;min-height:24px}dialog{color:#fff;width:min(90vw,740px);max-height:90%;border:3px ridge #d8b85f;border-radius:18px;background:#002e29;padding:22px}dialog::backdrop{background:#00101bba}dialog h2{margin:0 44px 20px 0;font-size:20px}.close{position:absolute;right:15px;top:12px;border:0;background:transparent;font-size:27px}.choices{display:flex;flex-wrap:wrap;gap:10px}.choices button,.start{background:#175039;border:2px ridge #d9ba58;border-radius:7px;padding:12px 20px}.setting{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:17px 0;border-bottom:1px solid #45615b}.setting input[type=checkbox]{accent-color:#16f374;width:22px;height:22px}.setting input[type=text]{width:130px;color:#fff;background:#102e24;border:1px solid #c7ab60;border-radius:6px;padding:9px}.setting select{padding:9px}.start{display:block;margin:25px auto 0;min-width:180px}.message{color:#f5d9a0;line-height:1.5}table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;padding:10px;border-bottom:1px solid #375b4d}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:600px){.machine{padding:12px;min-height:600px}.stage{grid-template-columns:1fr;gap:10px}.side{padding:0;display:flex;justify-content:center;gap:26px}.primary{width:88px;font-size:16px}.round{width:56px;height:56px}.wheel{height:76px}.wheel output{font-size:34px}.amount{min-width:110px;padding:6px 10px}.title{font-size:24px}.footer{margin-top:10px}dialog{padding:18px}.setting{font-size:14px}}`;

// Fresh control markup. The caller supplies verified sprites and existing-server data.
export function mountMultiHot100View({host, machine, loadHistory, aboutText = '', requestFullscreen}) {
  if (!host?.ownerDocument || !machine) throw new TypeError('A game mount point and machine are required');
  active.get(host)?.dispose();
  const doc = host.ownerDocument, section = doc.createElement('section');
  const root = section.attachShadow({mode:'open'}), Abort = doc.defaultView.AbortController, events = new Abort();
  root.innerHTML = `<style>${CSS}</style><div class="machine"><h1 class="title">MULTI HOT <span>100</span></h1><div class="stage"><div class="board"><div class="wheel"><output aria-label="Wheel multiplier">—</output></div><div class="reels"><canvas aria-label="Five reels with four symbols each"></canvas><svg class="win-paths" viewBox="0 0 100 100" aria-hidden="true"></svg></div><div class="amounts"><div class="amount"><small>BALANCE</small><output class="balance"></output></div><button class="amount bet" type="button"><small>BET</small><output></output></button></div></div><div class="side"><button class="round auto" aria-label="Autoplay" type="button">↻</button><button class="primary" type="button">SPIN</button><button class="round stake" aria-label="Choose bet" type="button">$</button></div></div><div class="win" aria-live="polite"></div><p class="status" role="status"></p><div class="footer"><button class="plain menu" type="button" aria-label="Settings">☰</button><button class="history" type="button">History</button><button class="about" type="button">About</button><button class="plain sound" type="button" aria-label="Toggle sound">♪</button></div><dialog><button class="close" aria-label="Close" type="button">×</button><h2></h2><div class="panel"></div><p class="message" role="alert"></p></dialog></div>`;
  host.append(section);
  const q = selector => root.querySelector(selector), dialog = q('dialog'), panel = q('.panel');
  let disposed = false, renderedPanel = null, panelSerial = 0, panelEvents = new Abort();
  const format = n => (n / 100).toFixed(2) + ' ' + machine.currency;
  const on = (target, type, fn, scope = events) => target.addEventListener(type, event => {try {Promise.resolve(fn(event)).catch(showError);} catch(error) {showError(error);}}, {signal:scope.signal});
  const showError = error => {if (!disposed) (dialog.open ? q('.message') : q('.status')).textContent = error.message;};
  const el = (tag, text, cls) => {const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
  const button = (text, action) => {const b=el('button',text);b.type='button';on(b,'click',action,panelEvents);return b;};
  const setting = (label, input) => {const row=el('label',undefined,'setting');row.append(el('span',label),input);panel.append(row);};
  on(q('.primary'),'click',()=>{
    const state=machine.snapshot().state;
    if(state==='idle')return machine.snapshot().autoRemaining ? machine.stop() : machine.spin();
    if(state==='uncertain')return machine.recover();
    if(state==='presentation-error')return machine.replayPresentation();
    if(state==='release-error'||state==='journal-error')return machine.retryStorage();
    return machine.stop();
  });
  for(const [selector,name] of [['.bet','bet'],['.stake','bet'],['.auto','autoplay'],['.menu','settings'],['.history','history'],['.about','about']])on(q(selector),'click',()=>machine.openPanel(name));
  on(q('.close'),'click',()=>machine.closePanel());on(dialog,'cancel',()=>machine.closePanel());
  on(q('.sound'),'click',()=>machine.setAudio('effects',!machine.settings.effects));

  async function buildPanel(name, serial) {
    panelEvents.abort();panelEvents=new Abort();
    panel.replaceChildren();q('.message').textContent='';q('h2').textContent={bet:'Choose bet',autoplay:'Autoplay',settings:'Settings',history:'History',about:'About game'}[name];
    if(name==='bet') {
      const choices=el('div',undefined,'choices');for(const amount of machine.allowedBets)choices.append(button(format(amount),()=>machine.setBet(amount)));panel.append(choices);
    } else if(name==='settings') {
      for(const [key,label] of [['effects','Sound Effects'],['music','Background Music']]){
        const input=el('input');input.type='checkbox';input.checked=machine.settings[key];on(input,'change',()=>machine.setAudio(key,input.checked),panelEvents);setting(label,input);
      }
      panel.append(button('Full Screen',()=>requestFullscreen ? requestFullscreen(section) : section.requestFullscreen()));
    } else if(name==='autoplay') {
      const count=el('select');for(const value of AUTO_COUNTS){const option=el('option',String(value));option.value=String(value);count.append(option);}count.value='100';setting('Number of spins',count);
      const fields={};
      for(const [key,label] of [['winLimitMinor','Stop if a win reaches'],['lossLimitMinor','Stop if balance decreases by'],['gainLimitMinor','Stop if balance increases by']]){
        const input=el('input');input.type='text';input.inputMode='decimal';input.placeholder=machine.currency+' (optional)';fields[key]=input;setting(label,input);
      }
      const start=button('START PLAY',()=>machine.startAutoplay({count:Number(count.value),...Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value.trim()?parseMinor(v.value):null]))}));start.className='start';panel.append(start);
    } else if(name==='history') {
      panel.append(el('p','Loading history…','message'));
      if(typeof loadHistory!=='function')throw new Error('History is not connected yet');
      const rows=await loadHistory();if(disposed||serial!==panelSerial||machine.panel!=='history')return;
      if(!Array.isArray(rows))throw new Error('Invalid history response');
      panel.replaceChildren();const table=el('table'),head=el('tr');for(const label of ['Round','Bet','Win'])head.append(el('th',label));table.append(head);
      for(const row of rows){if(typeof row.roundId!=='string'||![row.betMinor,row.winMinor].every(n=>Number.isSafeInteger(n)&&n>=0))throw new Error('Invalid history entry');const tr=el('tr');for(const text of [row.roundId,format(row.betMinor),format(row.winMinor)])tr.append(el('td',text));table.append(tr);}panel.append(rows.length?table:el('p','No recorded rounds.'));
    } else panel.append(el('p',aboutText||'Verified game information has not been connected yet.','message'));
  }
  function render(state) {
    if(disposed)return;
    q('.balance').textContent=format(state.balanceMinor);q('.bet output').textContent=format(state.betMinor);
    q('.wheel output').textContent=state.multiplier===null?'—':state.multiplier+'×';
    q('.win').textContent=state.winMinor>0?'WIN '+format(state.winMinor):'';
    q('.sound').setAttribute('aria-pressed',String(state.settings.effects));
    for(const selector of ['.bet','.stake','.auto','.menu','.history','.about'])q(selector).disabled=!state.canConfigure;
    const labels={idle:state.autoRemaining?'STOP AUTO':'SPIN',uncertain:'RECOVER', 'presentation-error':'REPLAY', 'release-error':'RETRY', 'journal-error':'RETRY'};
    q('.primary').textContent=labels[state.state]||'STOP';q('.primary').disabled=['uninitialized','loading','releasing','other-game','disposed'].includes(state.state)||Boolean(state.panel);
    q('.status').textContent=state.error || (state.autoRemaining?'Autoplay: '+state.autoRemaining+' remaining':state.state==='uncertain'?'Recovering this round will not place another bet.':state.state==='other-game'?'Resolve the pending round in its original game.':'');
    if(state.panel!==renderedPanel){renderedPanel=state.panel;panelSerial++;if(state.panel){if(!dialog.open)dialog.showModal();const serial=panelSerial;buildPanel(state.panel,serial).catch(error=>{if(serial===panelSerial)showError(error);});}else{panelEvents.abort();if(dialog.open)dialog.close();}}
  }
  const unsubscribe=machine.subscribe(render);
  const api={canvas:q('canvas'),
    showWinPaths(paths){const svg=q('.win-paths');svg.replaceChildren();for(const rows of paths){if(!Array.isArray(rows)||rows.length!==5||rows.some(r=>!Number.isInteger(r)||r<0||r>3))throw new TypeError('Invalid win path');const p=doc.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',rows.map((row,column)=>(column?'L':'M')+(column*20+10)+' '+(row*25+12.5)).join(' '));svg.append(p);}},
    dispose(){if(disposed)return;disposed=true;panelSerial++;unsubscribe();events.abort();panelEvents.abort();section.remove();if(active.get(host)===api)active.delete(host);}};
  active.set(host,api);return api;
}
