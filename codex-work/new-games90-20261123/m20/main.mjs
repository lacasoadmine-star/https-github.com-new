import { MultiHot20Controls, OBSERVED_BETS, AUTO_COUNTS, amount } from './controls.mjs';
import { MultiHot20Renderer } from './render/renderer.mjs';
import { MultiHot20Controller } from './controller.mjs';
import { MultiHot20Audio } from './audio.mjs';
import { presentationLayout } from './layout.mjs';
import { LINE_PAYS, PAYLINES } from './presentation-quote.mjs';
import { activateFromKeyboard } from './input.mjs';
import { AUTO_LIMIT_FIELDS, readAutoOptions } from './auto-options.mjs';

const LABELS = Object.freeze({ menu: 'Menu', sound: 'Sound', quick: 'Quick spin', bet: 'Bet', auto: 'Autoplay',
  double: 'Double', spin: 'HOLD & SPIN', take: 'Take win' });
const FINANCIAL = new Set(['spin','take','double','auto-start','gamble-red','gamble-black','gamble-take']);
const own = (value, name) => Object.prototype.hasOwnProperty.call(value, name);
let mountOrdinal = 0;

/** Runnable same-game entry. Native assets and authenticated host transport are explicit dependencies. */
export function mountMultiHot20({ root, assets, transport = null, samples = {}, initialBet = '0.20',
  audioFactory, keyFactory, rendererFactory = null, controlsFactory = options => new MultiHot20Controls(options),
  controllerFactory = options => new MultiHot20Controller(options), askSound = false, onError = () => {} } = {}) {
  const document = root?.ownerDocument, window = document?.defaultView;
  if (!document || !window || (rendererFactory ? typeof rendererFactory !== 'function' : !assets?.atlas?.draw || !assets?.background)) throw new TypeError('M20_MOUNT_DEPENDENCIES');
  if (root.dataset.m20Mounted === 'true') throw new Error('M20_ALREADY_MOUNTED');
  const enabled = transport?.canPlay === true;
  const host = transport?.serverAuthoritative === true, hostState = host ? transport.snapshot() : null;
  const betLevels = hostState?.betLevels?.length ? hostState.betLevels : OBSERVED_BETS;
  if (host && !betLevels.includes(initialBet)) initialBet = betLevels[0];
  if (enabled && transport.currency !== 'ETB') throw new TypeError('M20_HOST_CURRENCY');
  root.dataset.m20Mounted = 'true'; root.classList.add('m20-root'); root.tabIndex = 0;
  const listeners = [], buttons = new Map(), held = new Set(); let disposed = false, frameId, currentLayout, dialogOrigin = null, clickId = 0, holdPointer=null,suppressPointerClick=false;
  const dialogId = `m20-dialog-title-${++mountOrdinal}`;
  const on = (node, type, handler, options) => { node.addEventListener(type, handler, options); listeners.push(() => node.removeEventListener(type, handler, options)); };
  const stage = document.createElement('div'); stage.className = 'm20-stage';
  const scene = document.createElement('canvas'); scene.className = 'm20-scene'; scene.setAttribute('aria-label', 'Multi Hot 20 reels and multiplier');
  const nativeCanvas = document.createElement('canvas');
  const controlsLayer = document.createElement('div'); controlsLayer.className = 'm20-controls';
  const live = document.createElement('p'); live.className = 'm20-status'; live.setAttribute('role', 'status'); live.textContent = enabled ? '' : host ? 'Game temporarily unavailable.' : 'Visual preview';
  const overlay = document.createElement('div'); overlay.className = 'm20-overlay'; overlay.hidden = true;
  const panel = document.createElement('section'); panel.className = 'm20-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.tabIndex = -1;
  overlay.append(panel); stage.append(scene, controlsLayer, overlay); root.replaceChildren(stage, live);
  const controls = controlsFactory({ bet: initialBet, betLevels, roundIntentsEnabled: enabled, serverAuthoritative:host });
  const audio = new MultiHot20Audio({ samples, ...(audioFactory ? { audioFactory } : {}) });
  const rendererOptions = { canvas: nativeCanvas, atlas: assets.atlas, background: assets.background, art: assets.art,
    onEvent: event => audio.handle(event) };
  const renderer = rendererFactory ? rendererFactory(rendererOptions) : new MultiHot20Renderer(rendererOptions);
  renderer.setDisplay({ currency: enabled || host ? 'ETB' : 'DMO', balance: null, bet: initialBet });
  const controller = transport ? controllerFactory({ controls, renderer, transport, ...(keyFactory ? { keyFactory } : {}),
    now: () => window.performance.now(), onChange: () => sync(), onError: error => {
      holdPointer=null;live.textContent = 'Connection interrupted. Recover the pending round before playing again.'; onError(error); sync();
    } }) : null;
  if (hostState?.balance != null) controls.setBalance(hostState.balance);
  if(hostState?.lastPresentation){controls.restoreRound(hostState.lastPresentation,hostState.lastAction,hostState.gamble);
    renderer.restore?.(hostState.lastPresentation);if(hostState.lastAction)renderer.applyGamble?.(hostState.lastAction);}
  const restored = host ? transport.pendingIntent() : null;
  if (restored) { controls.restorePending(restored); if(restored.action==='SPIN')renderer.begin(restored,window.performance.now()); }

  function resize() {
    if (disposed) return;
    const width = Math.max(240, root.clientWidth), height = Math.max(240, window.innerHeight || 800);
    currentLayout = presentationLayout(width, height);
    stage.style.width = `${currentLayout.width}px`; stage.style.height = `${currentLayout.height}px`;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    scene.width = Math.round(currentLayout.scene.width * ratio); scene.height = Math.round(currentLayout.scene.height * ratio);
    scene.style.width = `${currentLayout.scene.width}px`; scene.style.height = `${currentLayout.scene.height}px`;
    stage.dataset.portrait = String(currentLayout.portrait);
    for (const [name, button] of buttons) { const r = currentLayout.controls[name];
      Object.assign(button.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });
    }
  }
  function button(text, action, value) {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = text;
    node.dataset.action = action; if (value !== undefined) node.dataset.value = String(value); return node;
  }
  for (const [name, label] of Object.entries(LABELS)) {
    const node = button(label, name); node.className = `m20-control m20-${name}`; node.setAttribute('aria-label', label);
    const caption = document.createElement('span'); caption.className = 'm20-control-label'; caption.textContent = label; node.replaceChildren(caption);
    const frame = assets.controlFrames?.[name];
    if (frame) {
      const icon = document.createElement('canvas'); icon.width = 160; icon.height = 160; icon.setAttribute('aria-hidden', 'true');
      assets.atlas.draw(icon.getContext('2d'), frame, 0, 0, 160, 160); node.prepend(icon);
    }
    buttons.set(name, node); controlsLayer.append(node);
  }
  function close() { controls.closeModal(); overlay.hidden = true; controlsLayer.inert = false;
    if (dialogOrigin?.isConnected) dialogOrigin.focus(); else root.focus(); dialogOrigin = null; sync(); }
  function title(text) { const header = document.createElement('header'), label = document.createElement('h2'); label.id = dialogId; label.textContent = text;
    header.append(label, button('Close', 'close')); panel.append(header); panel.setAttribute('aria-labelledby', label.id); }
  function open(name, origin) {
    holdPointer=null;controls.openModal(name); if (overlay.hidden) dialogOrigin = origin || document.activeElement;
    panel.replaceChildren(); title(name === 'rules' ? 'Rules and paytable' : name==='double'?'Double win':name==='sound-choice'?'Sound':name[0].toUpperCase() + name.slice(1));
    if(name==='sound-choice'){
      const caption=document.createElement('p');caption.textContent='Would you like sound?';panel.append(caption,button('Yes','sound-on'),button('No','sound-off'));
    } else if(name==='double'){
      const stake=document.createElement('p');stake.dataset.gambleStake='';const card=document.createElement('p');card.dataset.gambleCard='';card.className='m20-gamble-card';
      const limits=document.createElement('p');limits.dataset.gambleLimits='';const state=document.createElement('p');state.dataset.gambleStatus='';state.setAttribute('role','status');
      const choices=document.createElement('div');choices.className='m20-gamble-choices';choices.append(button('Red ♥','gamble-red'),button('Black ♠','gamble-black'));
      panel.append(stake,card,limits,state,choices,button('Take win','gamble-take'),button('Recover result','gamble-recover'));paintGamble();
    } else if (name === 'bet') {
      const options = document.createElement('div'); options.className = 'm20-bet-grid';
      for (const value of betLevels) { const item = button(value, 'choose-bet', value); item.setAttribute('aria-pressed', String(value === controls.snapshot().bet)); options.append(item); }
      panel.append(options);
    } else if (name === 'rules') {
      const navigation = document.createElement('nav'); navigation.append(button('Settings', 'settings'), button('−', 'rules-down'), button('+', 'rules-up'));
      const quote = document.createElement('p'); quote.dataset.rulesBet = ''; panel.append(navigation, quote);
      const table = document.createElement('table'), head = document.createElement('thead'), tr = document.createElement('tr');
      for (const label of ['Symbol', '3', '4', '5']) { const th = document.createElement('th'); th.textContent = label; tr.append(th); } head.append(tr); table.append(head);
      const body = document.createElement('tbody');
      for (const [symbol, pays] of Object.entries(LINE_PAYS)) { const row = document.createElement('tr'); row.dataset.symbol = symbol;
        const th = document.createElement('th'); th.textContent = symbol; row.append(th); for (const count of [3, 4, 5]) { const td = document.createElement('td'); td.dataset.pay = String(pays[count]); row.append(td); } body.append(row); }
      table.append(body); panel.append(table);
      const charts = document.createElement('div'); charts.className = 'm20-lines';
      for (const [index, rows] of PAYLINES.entries()) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 100 60'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `Payline ${index + 1}`);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); line.setAttribute('points', rows.map((r, i) => `${10 + 20 * i},${10 + 20 * r}`).join(' '));
        line.setAttribute('fill', 'none'); line.setAttribute('stroke', '#ffdf5a'); line.setAttribute('stroke-width', '3'); svg.append(line); charts.append(svg);
      }
      panel.append(charts); paintRules();
    } else if (name === 'settings' || name === 'quick') {
      if (name === 'settings') panel.append(button('Rules', 'menu'));
      const settings = controls.snapshot().settings;
      for (const key of (name === 'quick' ? ['quick'] : ['effects', 'music', 'fullscreen'])) {
        const label = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.checked = settings[key]; input.dataset.setting = key;
        label.append(input, document.createTextNode(key === 'quick' ? 'Quick spin' : key[0].toUpperCase() + key.slice(1))); panel.append(label);
      }
    } else if (name === 'auto') {
      const configured = controls.snapshot().auto;
      const label = document.createElement('label'); label.textContent = 'Number of spins'; const select = document.createElement('select'); select.dataset.autoCount = '';
      for (const count of AUTO_COUNTS) { const option = document.createElement('option'); option.value = String(count); option.textContent = String(count); option.selected = count === (configured?.count ?? 100); select.append(option); }
      label.append(select); panel.append(label);
      for (const { name, label: text } of AUTO_LIMIT_FIELDS) {
        const condition = document.createElement('label'); condition.className = 'm20-auto-condition';
        const caption = document.createElement('span'); caption.textContent = text;
        const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.dataset.autoEnabled = name;
        toggle.checked = configured?.[name] != null; toggle.setAttribute('aria-label', `Enable ${text.toLowerCase()}`);
        const field = document.createElement('input'); field.type = 'text'; field.inputMode = 'decimal'; field.dataset.autoLimit = name;
        field.setAttribute('aria-label', `${text} amount`); field.setAttribute('autocomplete', 'off'); field.placeholder = enabled ? 'ETB' : 'Amount';
        field.value = configured?.[name] == null ? '' : amount(configured[name]); field.disabled = !toggle.checked;
        condition.append(caption, toggle, field); panel.append(condition);
      }
      const start = button('Start', 'auto-start'); start.disabled = !enabled; panel.append(start);
    }
    overlay.hidden = false; controlsLayer.inert = true; panel.focus(); sync();
  }
  function paintRules() {
    const bet = controls.snapshot().rulesBet, minor = Number(bet.replace('.', ''));
    const label = panel.querySelector('[data-rules-bet]'); if (label) label.textContent = `BET ${bet} ${enabled ? 'ETB' : 'DMO'}`;
    for (const node of panel.querySelectorAll('[data-pay]')) {
      const numerator = BigInt(node.dataset.pay) * BigInt(minor), denominator = 20n;
      node.textContent = numerator % denominator === 0n ? amount(Number(numerator / denominator)) : `${numerator}/${denominator} minor units`;
    }
  }
  function paintGamble(){
    const s=controls.snapshot(),g=s.gamble,result=s.lastAction?.roundId===s.round?.roundId?s.lastAction:null;
    const stake=panel.querySelector('[data-gamble-stake]');if(!stake)return;
    stake.textContent=`WIN ${controls.currentWin()} ETB`;
    const card=panel.querySelector('[data-gamble-card]');card.textContent=result?(result.color==='RED'?'♥':'♠'):'?';card.dataset.colour=result?.color??'';
    card.setAttribute('aria-label',result?`${result.color.toLowerCase()} card`:'Card not drawn');
    panel.querySelector('[data-gamble-limits]').textContent=g?`Attempt ${g.attempt} of ${g.maxAttempts} · Maximum ${g.maxStake} ETB`:'';
    panel.querySelector('[data-gamble-status]').textContent=s.phase==='GAMBLE_PENDING'?'Revealing card…':s.phase==='RECOVERY_REQUIRED'?'Recover the original result to continue.':result?(result.won?'Win doubled':'No win'):g?.available?'Choose a colour':'Double is not available for this round.';
    for(const name of ['gamble-red','gamble-black'])panel.querySelector(`[data-action="${name}"]`).disabled=!g?.available||s.phase!=='WIN_PENDING';
    panel.querySelector('[data-action="gamble-take"]').disabled=s.phase!=='WIN_PENDING';
    const recover=panel.querySelector('[data-action="gamble-recover"]');recover.hidden=s.phase!=='RECOVERY_REQUIRED';recover.disabled=!!controller?.inflight;
  }
  function sync() {
    if (disposed) return;
    const s = controls.snapshot(), view = renderer.snapshot(), moving = view.phase !== 'IDLE';
    renderer.setDisplay({ bet: s.bet, balance: s.balance, quick: s.settings.quick }); audio.setting(s.settings);
    const main = buttons.get('spin'), recovering = s.phase === 'RECOVERY_REQUIRED';
    const mainCaption=main.querySelector('.m20-control-label');
    mainCaption.textContent = recovering ? 'RECOVER' : s.auto?.active ? String(s.auto.remaining) : moving ? 'STOP' : 'HOLD\n&\nSPIN';
    Object.assign(mainCaption.style,{whiteSpace:'pre-line',background:'transparent',padding:'0',fontSize:recovering?'11px':'14px',lineHeight:'1.1'});
    main.classList.add('show-native-caption');
    main.setAttribute('aria-label', recovering ? 'Recover current round' : moving ? 'Stop current spin' : 'HOLD & SPIN');
    if (recovering) live.textContent = 'Connection interrupted. Recover the current round before playing again.';
    else if (enabled) live.textContent = s.auto?.active ? `Autoplay: ${s.auto.remaining} remaining` : '';
    for (const [name, node] of buttons) {
      node.disabled = (FINANCIAL.has(name) && !enabled && !(name === 'spin' && recovering && host)) || (name === 'auto' && !enabled) ||
        (name === 'bet' && (!controls.idle() || s.phase === 'WIN_PENDING' || s.auto?.active)) ||
        (name === 'take' && (!enabled || s.phase !== 'WIN_PENDING')) ||
        (name === 'double' && (!host || s.phase!=='WIN_PENDING' || typeof transport.refreshGamble!=='function'));
      if (['menu','quick'].includes(name) && !controls.idle()) node.disabled = true;
      if (name === 'auto' && !controls.idle() && !s.auto?.active) node.disabled = true;
      if(assets.controlArt){const art=assets.controlArt(name,{disabled:node.disabled,spinning:moving,autoplay:!!s.auto?.active,quick:s.settings.quick,sound:s.settings.effects});
        if(node.dataset.texture!==art.texture||node.dataset.autoplayArt!==String(!!s.auto?.active)){node.querySelector('svg.control-art')?.remove();node.prepend(art.create());node.classList.add('has-native-art');node.dataset.texture=art.texture;node.dataset.autoplayArt=String(!!s.auto?.active);}}
      node.setAttribute('aria-pressed', String(name === 'quick' ? s.settings.quick : name === 'sound' ? s.settings.effects : name === 'auto' ? !!s.auto?.active : false));
    }
    if(s.modal==='double')paintGamble();
    if (overlay.hidden) controlsLayer.inert = false;
    root.dataset.phase = s.phase; root.dataset.cashEnabled = String(enabled && host);
  }
  async function action(name, value, origin) {
    if (disposed) return;
    if (!enabled && FINANCIAL.has(name) && !(name === 'spin' && controls.snapshot().phase === 'RECOVERY_REQUIRED' && host)) return;
    if(name==='sound-off'){controls.setSetting('effects',false);audio.setting(controls.snapshot().settings);}
    audio.unlock(); audio.once('button', `local-${++clickId}`);
    try {
      if (name === 'close') close();
      else if(name==='sound-on'||name==='sound-off'){controls.setSetting('effects',name==='sound-on');close();}
      else if(name==='double'){await controller?.loadGamble();open('double',origin);}
      else if(name==='gamble-red'||name==='gamble-black'){
        const ok=await controller?.gamble(name==='gamble-red'?'RED':'BLACK');if(ok&&controls.snapshot().phase==='WIN_PENDING')await controller?.loadGamble();
      }
      else if(name==='gamble-take'){close();await controller?.take();}
      else if(name==='gamble-recover'){const ok=await controller?.recover();if(ok&&controls.snapshot().phase==='WIN_PENDING')await controller?.loadGamble();}
      else if (name === 'menu') open('rules', origin);
      else if (name === 'bet' || name === 'quick' || name === 'settings') open(name, origin);
      else if (name === 'sound') controls.setSetting('effects', !controls.snapshot().settings.effects);
      else if (name === 'auto') { if (controls.snapshot().auto?.active) controller?.stopAuto(); else open('auto', origin); }
      else if (name === 'spin') {
        if (controls.snapshot().phase === 'RECOVERY_REQUIRED') {
          const ok=await controller?.recover();if(ok&&controls.snapshot().lastAction&&controls.snapshot().phase==='WIN_PENDING')await controller?.loadGamble();
        } else await controller?.spin();
      }
      else if (name === 'take') await controller?.take();
      else if (name === 'choose-bet') { controls.selectBet(value); close(); }
      else if (name === 'rules-up' || name === 'rules-down') {
        const current = betLevels.indexOf(controls.snapshot().rulesBet), next = Math.max(0, Math.min(betLevels.length - 1, current + (name === 'rules-up' ? 1 : -1)));
        controls.setRulesBet(betLevels[next]); paintRules();
      } else if (name === 'auto-start') {
        controller?.configureAuto(readAutoOptions(panel)); controller?.startAuto(); close();
      }
      sync();
    } catch (error) { holdPointer=null;onError(error); live.textContent = error.message; }
  }
  on(buttons.get('spin'),'pointerdown',event=>{
    const s=controls.snapshot();if(event.button!==0||!enabled||s.auto?.active||s.modal||!controls.idle()||controller?.inflight)return;
    event.preventDefault();holdPointer=event.pointerId;suppressPointerClick=true;buttons.get('spin').setPointerCapture?.(event.pointerId);void action('spin');
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])on(buttons.get('spin'),name,event=>{if(holdPointer===event.pointerId)holdPointer=null;});
  on(stage, 'click', event => { const node = event.target.closest?.('button[data-action]'); if (!node || node.disabled || !stage.contains(node)) return;
    if(node.dataset.action==='spin'&&event.detail>0&&suppressPointerClick){suppressPointerClick=false;return;}
    void action(node.dataset.action, node.dataset.value, node); });
  on(panel, 'change', async event => {
    const limitName = event.target.dataset.autoEnabled;
    if (AUTO_LIMIT_FIELDS.some(field => field.name === limitName)) {
      const field = panel.querySelector(`[data-auto-limit="${limitName}"]`); field.disabled = !event.target.checked;
      if (!field.disabled) field.focus(); return;
    }
    const node = event.target, name = node.dataset.setting; if (!name || !own(controls.snapshot().settings, name)) return;
    if (name === 'fullscreen') {
      try { if (node.checked) await root.requestFullscreen(); else if (document.fullscreenElement) await document.exitFullscreen(); }
      catch (error) { node.checked = !!document.fullscreenElement; onError(error); }
    }
    controls.setSetting(name, node.checked); for (const item of panel.querySelectorAll('[data-setting]')) item.checked = controls.snapshot().settings[item.dataset.setting]; sync();
  });
  on(root, 'keydown', event => {
    if (event.key === 'Escape' && !overlay.hidden) { event.preventDefault(); close(); return; }
    if (event.key === 'Tab' && !overlay.hidden) {
      const focusable = [...panel.querySelectorAll('button,input,select,[tabindex]')].filter(n => !n.disabled && !n.hidden);
      if (!focusable.length) { event.preventDefault(); panel.focus(); return; }
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    activateFromKeyboard(event, { root, scene, held, action });
  });
  on(root, 'keyup', event => { held.delete(event.key); });
  on(window, 'blur', () => { held.clear();holdPointer=null; controller?.stopAuto(); audio.setHidden(true); });
  on(window, 'focus', () => audio.setHidden(document.hidden));
  on(document, 'visibilitychange', () => { held.clear();holdPointer=null; audio.setHidden(document.hidden); controller?.setHidden(document.hidden); });
  on(window, 'pagehide', () => { held.clear();holdPointer=null; audio.setHidden(true); controller?.setHidden(true); });
  on(window, 'pageshow', () => { audio.setHidden(document.hidden); controller?.setHidden(document.hidden); });
  on(document, 'fullscreenchange', () => { controls.setSetting('fullscreen', !!document.fullscreenElement); resize(); sync(); });
  const observer = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(resize) : null;
  observer?.observe(root); on(window, 'resize', resize);
  function frame(now) {
    if (disposed) return;
    if (!document.hidden) {
      if (controller) controller.frame(now); else renderer.render(now);
      if(holdPointer!==null&&controller&&!controller.inflight&&controls.idle()&&!controls.snapshot().modal&&!controls.snapshot().auto?.active)void controller.spin();
      const { crop } = currentLayout, ctx = scene.getContext('2d'); ctx.clearRect(0, 0, scene.width, scene.height);
      ctx.drawImage(nativeCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, scene.width, scene.height);
    }
    frameId = window.requestAnimationFrame(frame);
  }
  resize(); sync();if(askSound)open('sound-choice');frameId = window.requestAnimationFrame(frame);
  return Object.freeze({ controls, renderer, controller, audio, snapshot: () => controller?.snapshot() || controls.snapshot(),
    dispose() { if (disposed) return; disposed = true; controller?.dispose(); audio.dispose(); renderer.dispose?.(); observer?.disconnect();
      window.cancelAnimationFrame(frameId); for (const remove of listeners) remove(); root.replaceChildren(); delete root.dataset.m20Mounted; root.classList.remove('m20-root'); }
  });
}
