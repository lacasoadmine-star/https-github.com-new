import { MultiHot10Controls } from './controls.mjs';
import { createMultiHot10DeferredController } from './backend/deferred-controller.mjs';
import { SpriteAtlas } from './render/atlas.mjs';
import { MultiHot10Renderer } from './render/renderer.mjs';
import { MultiHot10Dialogs } from './render/dialogs.mjs';
import { MultiHot10Audio } from './render/audio.mjs';
import { NativeMultiHot10Logo } from './render/logo.mjs';
import { CONTROL_RECTS, STAGE } from './render/layout.mjs';

async function loadImage(url) { const image = new Image(); image.src = url.href; await image.decode(); return image; }

// Freshly observed DMO picker values. Only the non-financial visual preview
// uses this ladder; authenticated host policy and supplied controls stay intact.
export const PREVIEW_BET_LEVELS = Object.freeze([
  '0.10', '0.20', '0.30', '0.40', '0.50', '0.60', '0.70', '0.80', '1.00', '1.50',
  '2.00', '2.50', '3.00', '4.00', '5.00', '6.00', '7.00', '8.00', '10.00', '15.00',
  '20.00', '25.00', '30.00', '40.00', '50.00', '60.00', '70.00', '80.00', '100.00', '150.00', '200.00',
]);

/** Independent host entry. Production outcomes enter through the validated
 * backend controller. A QA host can supply isolated presentation callbacks;
 * this module contains no RNG, sample cycling, receipt fixture or wallet math.
 */
export async function mountMultiHot10({ root, host = null, controls: suppliedControls = null,
  isolatedPresentation = null, previewOnly = false, assetsURL = new URL('./assets/runtime/', import.meta.url) } = {}) {
  if (!(root instanceof HTMLElement)) throw new TypeError('A game root is required.');
  if (previewOnly && (host || isolatedPresentation)) throw new TypeError('A visual preview cannot accept a financial or outcome transport.');
  const controls = suppliedControls || new MultiHot10Controls({
    betLevels: previewOnly ? PREVIEW_BET_LEVELS : ['0.10', '0.20', '0.30', '0.40', '0.50'], selectedBet: '0.10',
    currency: host ? 'ETB' : 'DMO',
  });
  if (isolatedPresentation && host) throw new TypeError('An isolated presentation cannot use a financial host.');
  const [atlas, background, logo] = await Promise.all([SpriteAtlas.load(assetsURL),
    loadImage(new URL('background.png', assetsURL)), NativeMultiHot10Logo.load(assetsURL)]);
  const stage = document.createElement('div'); stage.className = 'm10-stage';
  stage.innerHTML = '<canvas class="m10-canvas" aria-label="Live reels and multiplier"></canvas><div class="m10-hitboxes"></div><div class="m10-dialog-layer" hidden></div><p class="m10-status" role="status" hidden></p>';
  root.replaceChildren(stage);
  const canvas = stage.querySelector('canvas'), hitboxes = stage.querySelector('.m10-hitboxes');
  const message = stage.querySelector('.m10-status');
  const audio = new MultiHot10Audio(new URL('./assets/sound/', import.meta.url));
  const renderer = new MultiHot10Renderer(canvas, atlas, { background, logo, onEvent: event => {
    audio.handle(event);
    if (event.type === 'round-presented') queueMicrotask(async () => {
      if (disposed || event.id !== controls.snapshot.round?.roundId || event.id === finishedRoundId) return;
      finishedRoundId = event.id;
      const generation = autoGeneration;
      if (controller) { try { await controller.refresh(); } catch { status('Balance refresh is waiting for the connection.'); stopAuto(); } }
      if (disposed) return;
      sync();
      if (!autoRunning || generation !== autoGeneration || controls.snapshot.hidden) return;
      if (autoRemaining > 0) void action('spin', undefined, true);
      else { stopAuto(); if (controls.snapshot.winVisible) void action('take'); sync(); }
    });
  } });
  let controller = null, busy = false, disposed = false, quick = false, quickDialog = false;
  let autoRunning = false, autoRemaining = 0, autoGeneration = 0, finishedRoundId = null;
  let controllerState = null, statusTimer = null, clickOrdinal = 0;
  const listeners = [], buttons = new Map();
  const on = (target, type, fn, options) => { target.addEventListener(type, fn, options); listeners.push(() => target.removeEventListener(type, fn, options)); };
  const status = text => { if (disposed) return; clearTimeout(statusTimer); message.textContent = text; message.hidden = false; statusTimer = setTimeout(() => { message.hidden = true; }, 5000); };
  function stopAuto() { if (autoRunning) autoGeneration++; autoRunning = false; }
  const cashEnabled = () => !previewOnly && !!controller?.snapshot.cashEnabled;
  function sync(state) {
    if (disposed) return;
    if (state) {
      controllerState = state;
      if (['PENDING', 'AUTH_REQUIRED', 'UNAVAILABLE', 'DISCONNECTED'].includes(state.phase)) stopAuto();
    }
    const s = controls.snapshot;
    if (s.pending?.kind === 'SPIN' && renderer.snapshot.phase === 'IDLE' && s.phase !== 'RECOVERY_REQUIRED') renderer.beginSpin(s.pending.requestKey);
    if (s.round && renderer.snapshot.roundId !== s.round.roundId) renderer.present(s.round, { animate: s.phase !== 'RECOVERY_REQUIRED' });
    if (!s.winVisible && renderer.snapshot.phase === 'IDLE' && !s.pending && renderer.round?.winAmount !== '0.00') renderer.collected();
    const account = controllerState?.account;
    const balance = controllerState && controllerState.balanceFresh === false ? null :
      account?.balance ?? account?.balanceETB ?? isolatedPresentation?.balance ?? null;
    renderer.update({ controls: s, balance, currency: s.currency, quick, autoRemaining: autoRunning ? autoRemaining : null });
    audio.settings(s.settings);
    dialogs.show(s, { quick: quickDialog });
    hitboxes.inert = !!s.modal || quickDialog;
    const presentationBusy = busy || !!s.pending || renderer.snapshot.phase !== 'IDLE';
    for (const [name, node] of buttons) {
      node.hidden = ['take', 'gamble'].includes(name) && (!s.winVisible || !!s.pending);
      node.disabled = (previewOnly && ['spin', 'auto', 'take', 'gamble'].includes(name)) || (name === 'bet' && (s.wagerControlsDisabled || presentationBusy)) ||
        (name === 'auto' && !autoRunning && (s.wagerControlsDisabled || presentationBusy)) ||
        (name === 'gamble' && presentationBusy) ||
        (name === 'menu' && (busy || !!s.pending)) ||
        (name === 'take' && (busy || !!s.pending || renderer.snapshot.phase !== 'IDLE' || controller && !controller.snapshot.canTake)) ||
        (name === 'spin' && renderer.snapshot.phase === 'IDLE' && (busy || !!s.pending));
    }
    buttons.get('spin').setAttribute('aria-label', renderer.snapshot.phase !== 'IDLE' ? 'Stop current spin' : 'Spin');
    stage.dataset.phase = s.phase; stage.dataset.cashEnabled = String(cashEnabled());
  }
  const dialogs = new MultiHot10Dialogs(stage.querySelector('.m10-dialog-layer'), atlas, (name, value) => void action(name, value));
  async function action(name, value, automatic = false) {
    if (disposed) return;
    if (previewOnly && ['spin', 'auto', 'auto-start', 'take', 'gamble'].includes(name)) {
      status('Visual preview — no rounds or wallet transactions.'); return;
    }
    audio.unlock();
    if (name !== 'spin') audio.once('button', String(++clickOrdinal));
    const s = controls.snapshot;
    if (autoRunning && (name === 'auto' || (name === 'spin' && !automatic))) {
      stopAuto(); sync(); return; // Finish the accepted current round.
    }
    if (automatic && !autoRunning) return;
    if (name === 'spin' && renderer.snapshot.phase !== 'IDLE') {
      if (renderer.requestStop()) audio.once('quick-stop', renderer.requestKey);
      sync(); return; // Presentation only; retain the original pending identity.
    }
    if (name === 'close') { quickDialog = false; controls.closeModal(); sync(); return; }
    if (name === 'tab') { controls.openModal(value); sync(); return; }
    if (name === 'menu') { controls.openModal('rules'); sync(); return; }
    if (name === 'bet' || name === 'auto') {
      if (!busy && !s.pending && renderer.snapshot.phase === 'IDLE') controls.openModal(name);
      sync(); return;
    }
    if (name === 'preview') { controls.selectPaytablePreview(value); sync(); return; }
    if (name === 'choose-bet') { controls.selectBet(value); sync(); return; }
    if (name === 'auto-count') { controls.selectAutoCount(Number(value)); sync(); return; }
    if (name === 'auto-start') {
      if (s.modal !== 'auto' || busy || s.pending || s.hidden || renderer.snapshot.phase !== 'IDLE') return;
      // The modal intentionally disables ordinary SPIN. Close this exact
      // selection first, then ask the authenticated controller for authority.
      controls.closeModal();
      if (!isolatedPresentation && !cashEnabled()) { status('Automatic play is not available yet.'); sync(); return; }
      autoRemaining = s.autoOptions.selectedCount; autoRunning = true; autoGeneration++;
      sync(); void action('spin', undefined, true); return;
    }
    if (name === 'quick') { if (quick) quick = false; else quickDialog = true; sync(); return; }
    if (name === 'quick-enable') { quick = true; quickDialog = false; sync(); return; }
    if (name === 'gamble') { status('Gamble is not available yet.'); return; }
    if (name === 'sound') {
      controls.openModal('settings');
      if (s.settings.effects || s.settings.music) controls.disableEffects(); else controls.enableEffects();
      controls.closeModal(); sync(); return;
    }
    if (name === 'setting') {
      if (value === 'effects') { if (s.settings.effects) controls.disableEffects(); else controls.enableEffects(); }
      if (value === 'music') controls.setMusic(!s.settings.music);
      if (value === 'fullscreen') {
        const result = controls.requestFullscreen(!s.settings.fullscreen); const requestId = result.intents[0]?.requestId;
        try { if (s.settings.fullscreen) await document.exitFullscreen?.(); else await root.requestFullscreen?.(); }
        catch { /* Checked preference is distinct from observed browser state. */ }
        controls.applyFullscreenObservation({ requestId, active: document.fullscreenElement === root });
      }
      sync(); return;
    }
    if (!['spin', 'take'].includes(name) || busy || s.pending || renderer.snapshot.phase !== 'IDLE') return;
    if (!controller && !isolatedPresentation) { status('This game is not available yet.'); return; }
    busy = true;
    try {
      if (isolatedPresentation) {
        const key = 'isolated-' + crypto.randomUUID();
        const command = name === 'spin' ? controls.requestSpin(key) : controls.requestTakeWin(key);
        if (!command.accepted) return;
        if (name === 'spin' && autoRunning) autoRemaining--;
        sync();
        const result = await isolatedPresentation.dispatch(command.intents[0]);
        const accepted = name === 'spin' ? controls.applyRoundView(result) : controls.applyTakeAcknowledgement(result);
        if (!accepted.accepted) throw new Error('Presentation identity mismatch');
      } else if (name === 'spin') {
        // Reserve exactly one AUTO slot for this original action. Retries and
        // presentation STOP never enter here and never consume another slot.
        if (autoRunning) {
          if (autoRemaining < 1) { stopAuto(); return; }
          autoRemaining--;
        }
        await controller.spin();
      }
      else await controller.takeWin();
      if (name === 'take') { audio.once('take-win', controls.snapshot.round.roundId); renderer.collected(); if (controller) await controller.refresh(); }
    } catch (error) {
      stopAuto();
      const pending = controls.snapshot.pending;
      if (isolatedPresentation && pending) controls.markRequestUncertain(pending.requestKey);
      status(controller ? 'This game is not available yet.' : 'The round is waiting for its original result.');
    } finally { busy = false; sync(); }
  }
  for (const [name, rect] of Object.entries(CONTROL_RECTS)) {
    const node = document.createElement('button'); node.type = 'button'; node.className = 'm10-hitbox m10-hitbox-' + name;
    node.setAttribute('aria-label', ({ spin: 'Spin', auto: 'Autoplay', bet: 'Choose bet', quick: 'Quick play',
      take: 'Take win', gamble: 'Double win', menu: 'Menu', sound: 'Sound' })[name]);
    node.dataset.control = name;
    Object.assign(node.style, { left: rect.x / STAGE.width * 100 + '%', top: rect.y / STAGE.height * 100 + '%',
      width: rect.width / STAGE.width * 100 + '%', height: rect.height / STAGE.height * 100 + '%' });
    on(node, 'click', () => void action(name));
    on(node, 'pointerdown', () => { audio.unlock(); renderer.setPressed(name); });
    on(node, 'pointerup', () => renderer.setPressed(null));
    on(node, 'pointercancel', () => renderer.setPressed(null));
    on(node, 'pointerleave', () => renderer.setPressed(null));
    on(node, 'keydown', event => { if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); });
    hitboxes.append(node); buttons.set(name, node);
  }
  const resize = new ResizeObserver(() => renderer.resize()); resize.observe(stage);
  on(document, 'visibilitychange', () => { if (document.hidden) stopAuto(); controls.setHidden(document.hidden); audio.setHidden(document.hidden); sync(); });
  on(window, 'blur', () => { stopAuto(); sync(); });
  on(window, 'pagehide', () => { stopAuto(); sync(); });
  on(window, 'keydown', event => {
    if (previewOnly || event.code !== 'Space' || event.repeat || event.target.closest('button,input,select,textarea,[contenteditable]') || controls.snapshot.modal || quickDialog) return;
    event.preventDefault(); void action('spin');
  });
  if (host) { controller = createMultiHot10DeferredController({ ...host, controls, onState: sync }); }
  sync();
  if (controller) controller.connect().catch(() => status('This game is not available yet.'));
  return {
    controls, renderer, controller,
    sync, action,
    // Host-only presentation API: accepts arbitrary validated views, never a
    // stored sample sequence or client-generated result. No money is changed.
    acceptValidatedPresentation(view) { const result = controls.applyRoundView(view); if (result.accepted) sync(); return result; },
    get snapshot() { return { controls: controls.snapshot, renderer: renderer.snapshot, quick, autoRunning, autoRemaining,
      financialHostConnected: !!controller, isolated: !!isolatedPresentation, previewOnly, cashEnabled: cashEnabled() }; },
    dispose() { if (disposed) return; stopAuto(); disposed = true; clearTimeout(statusTimer); resize.disconnect();
      listeners.forEach(remove => remove()); dialogs.dispose(); renderer.dispose(); audio.dispose();
      controller?.dispose(); controls.dispose(); root.replaceChildren(); },
  };
}

const root = document.getElementById('multi-hot-10');
if (root && !globalThis.__M10_MANUAL_MOUNT__) {
  mountMultiHot10({ root, host: globalThis.SUPERWIN_M10_HOST || null })
    .then(app => { globalThis.zplayMultiHot10 = app; })
    .catch(() => { root.replaceChildren(); const error = document.createElement('p'); error.className = 'm10-loading';
      error.setAttribute('role', 'alert'); error.textContent = 'Game artwork could not load. Please reload.'; root.append(error); });
}
