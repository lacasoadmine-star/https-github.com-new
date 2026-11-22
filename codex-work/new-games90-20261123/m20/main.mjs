import { MultiHot20Controls, OBSERVED_BETS, AUTO_COUNTS, amount } from './controls.mjs';
import { MultiHot20Renderer } from './render/renderer.mjs';
import { MultiHot20Controller } from './controller.mjs';
import { MultiHot20Audio } from './audio.mjs';
import { presentationLayout } from './layout.mjs';
import { LINE_PAYS, PAYLINES } from './presentation-quote.mjs';
import { activateFromKeyboard } from './input.mjs';

const LABELS = Object.freeze({ menu: 'Menu', sound: 'Sound', quick: 'Quick spin', bet: 'Bet', auto: 'Autoplay',
  double: 'Double', spin: 'HOLD & SPIN', take: 'Take win' });
const FINANCIAL = new Set(['spin','take','double','auto-start']);
const own = (value, name) => Object.prototype.hasOwnProperty.call(value, name);
let mountOrdinal = 0;

/** Runnable same-game entry. Native assets and authenticated host transport are explicit dependencies. */
export function mountMultiHot20({ root, assets, transport = null, samples = {}, initialBet = '0.20',
  audioFactory, keyFactory, onError = () => {} } = {}) {
  const document = root?.ownerDocument, window = document?.defaultView;
  if (!document || !window || !assets?.atlas?.draw || !assets?.background) throw new TypeError('M20_MOUNT_DEPENDENCIES');
  if (root.dataset.m20Mounted === 'true') throw new Error('M20_ALREADY_MOUNTED');
  const enabled = transport?.canPlay === true;
  if (enabled && transport.currency !== 'ETB') throw new TypeError('M20_HOST_CURRENCY');
  root.dataset.m20Mounted = 'true'; root.classList.add('m20-root'); root.tabIndex = 0;
  const listeners = [], buttons = new Map(), held = new Set(); let disposed = false, frameId, currentLayout, dialogOrigin = null, clickId = 0;
  const dialogId = `m20-dialog-title-${++mountOrdinal}`;
  const on = (node, type, handler, options) => { node.addEventListener(type, handler, options); listeners.push(() => node.removeEventListener(type, handler, options)); };
  const stage = document.createElement('div'); stage.className = 'm20-stage';
  const scene = document.createElement('canvas'); scene.className = 'm20-scene'; scene.setAttribute('aria-label', 'Multi Hot 20 reels and multiplier');
  const nativeCanvas = document.createElement('canvas');
  const controlsLayer = document.createElement('div'); controlsLayer.className = 'm20-controls';
  const live = document.createElement('p'); live.className = 'm20-status'; live.setAttribute('role', 'status'); live.textContent = enabled ? '' : 'Visual preview';
  const overlay = document.createElement('div'); overlay.className = 'm20-overlay'; overlay.hidden = true;
  const panel = document.createElement('section'); panel.className = 'm20-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.tabIndex = -1;
  overlay.append(panel); stage.append(scene, controlsLayer, overlay); root.replaceChildren(stage, live);
  const controls = new MultiHot20Controls({ bet: initialBet, roundIntentsEnabled: enabled });
  const audio = new MultiHot20Audio({ samples, ...(audioFactory ? { audioFactory } : {}) });
  const renderer = new MultiHot20Renderer({ canvas: nativeCanvas, atlas: assets.atlas, background: assets.background, art: assets.art,
    onEvent: event => audio.handle(event) });
  renderer.setDisplay({ currency: enabled ? 'ETB' : 'DMO', balance: null, bet: initialBet });
  const controller = transport ? new MultiHot20Controller({ controls, renderer, transport, ...(keyFactory ? { keyFactory } : {}),
    now: () => window.performance.now(), onChange: () => sync(), onError: error => {
      live.textContent = 'Connection interrupted. Recover the pending round before playing again.'; onError(error); sync();
    } }) : null;

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
    controls.openModal(name); if (overlay.hidden) dialogOrigin = origin || document.activeElement;
    panel.replaceChildren(); title(name === 'rules' ? 'Rules and paytable' : name[0].toUpperCase() + name.slice(1));
    if (name === 'bet') {
      const options = document.createElement('div'); options.className = 'm20-bet-grid';
      for (const value of OBSERVED_BETS) { const item = button(value, 'choose-bet', value); item.setAttribute('aria-pressed', String(value === controls.snapshot().bet)); options.append(item); }
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
      const label = document.createElement('label'); label.textContent = 'Number of spins'; const select = document.createElement('select'); select.dataset.autoCount = '';
      for (const count of AUTO_COUNTS) { const option = document.createElement('option'); option.value = String(count); option.textContent = String(count); option.selected = count === 100; select.append(option); }
      label.append(select); panel.append(label);
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
  function sync() {
    if (disposed) return;
    const s = controls.snapshot(), view = renderer.snapshot(), moving = view.phase !== 'IDLE';
    renderer.setDisplay({ bet: s.bet, balance: s.balance, quick: s.settings.quick }); audio.setting(s.settings);
    const main = buttons.get('spin'); main.querySelector('.m20-control-label').textContent = moving ? 'STOP' : 'HOLD & SPIN'; main.setAttribute('aria-label', moving ? 'Stop current spin' : 'HOLD & SPIN');
    for (const [name, node] of buttons) {
      node.disabled = (FINANCIAL.has(name) && !enabled) || (name === 'auto' && !enabled) ||
        (name === 'bet' && (!controls.idle() || s.phase === 'WIN_PENDING' || s.auto?.active)) ||
        (name === 'take' && (!enabled || s.phase !== 'WIN_PENDING')) || name === 'double';
      if (['menu','quick'].includes(name) && !controls.idle()) node.disabled = true;
      if (name === 'auto' && !controls.idle() && !s.auto?.active) node.disabled = true;
      node.setAttribute('aria-pressed', String(name === 'quick' ? s.settings.quick : name === 'sound' ? s.settings.effects : name === 'auto' ? !!s.auto?.active : false));
    }
    if (overlay.hidden) controlsLayer.inert = false;
    root.dataset.phase = s.phase; root.dataset.cashEnabled = 'false';
  }
  async function action(name, value, origin) {
    if (disposed) return;
    if (!enabled && FINANCIAL.has(name)) return;
    audio.unlock(); audio.once('button', `local-${++clickId}`);
    try {
      if (name === 'close') close();
      else if (name === 'menu') open('rules', origin);
      else if (name === 'bet' || name === 'quick' || name === 'settings') open(name, origin);
      else if (name === 'sound') controls.setSetting('effects', !controls.snapshot().settings.effects);
      else if (name === 'auto') { if (controls.snapshot().auto?.active) controller?.stopAuto(); else open('auto', origin); }
      else if (name === 'spin') await controller?.spin();
      else if (name === 'take') await controller?.take();
      else if (name === 'choose-bet') { controls.selectBet(value); close(); }
      else if (name === 'rules-up' || name === 'rules-down') {
        const current = OBSERVED_BETS.indexOf(controls.snapshot().rulesBet), next = Math.max(0, Math.min(OBSERVED_BETS.length - 1, current + (name === 'rules-up' ? 1 : -1)));
        controls.setRulesBet(OBSERVED_BETS[next]); paintRules();
      } else if (name === 'auto-start') {
        const count = Number(panel.querySelector('[data-auto-count]').value); controls.configureAuto({ count }); close(); controller?.startAuto();
      }
      sync();
    } catch (error) { onError(error); live.textContent = error.message; }
  }
  on(stage, 'click', event => { const node = event.target.closest?.('button[data-action]'); if (!node || node.disabled || !stage.contains(node)) return;
    void action(node.dataset.action, node.dataset.value, node); });
  on(panel, 'change', async event => {
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
  on(window, 'blur', () => { held.clear(); controller?.stopAuto(); audio.setHidden(true); });
  on(window, 'focus', () => audio.setHidden(document.hidden));
  on(document, 'visibilitychange', () => { held.clear(); audio.setHidden(document.hidden); controller?.setHidden(document.hidden); });
  on(window, 'pagehide', () => { held.clear(); audio.setHidden(true); controller?.setHidden(true); });
  on(window, 'pageshow', () => { audio.setHidden(document.hidden); controller?.setHidden(document.hidden); });
  on(document, 'fullscreenchange', () => { controls.setSetting('fullscreen', !!document.fullscreenElement); resize(); sync(); });
  const observer = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(resize) : null;
  observer?.observe(root); on(window, 'resize', resize);
  function frame(now) {
    if (disposed) return;
    if (!document.hidden) {
      if (controller) controller.frame(now); else renderer.render(now);
      const { crop } = currentLayout, ctx = scene.getContext('2d'); ctx.clearRect(0, 0, scene.width, scene.height);
      ctx.drawImage(nativeCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, scene.width, scene.height);
    }
    frameId = window.requestAnimationFrame(frame);
  }
  resize(); sync(); frameId = window.requestAnimationFrame(frame);
  return Object.freeze({ controls, renderer, controller, audio, snapshot: () => controller?.snapshot() || controls.snapshot(),
    dispose() { if (disposed) return; disposed = true; controller?.dispose(); audio.dispose(); observer?.disconnect();
      window.cancelAnimationFrame(frameId); for (const remove of listeners) remove(); root.replaceChildren(); delete root.dataset.m20Mounted; root.classList.remove('m20-root'); }
  });
}
