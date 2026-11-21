import { RollXController } from './controller.mjs';
import { RollXRenderer } from './renderer.mjs';
import { RollXAudio } from './audio.mjs';

const TARGETS = [14_000, 20_000];
function exactAmount(value) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) throw new Error('Enter an amount with at most two decimal places.');
  return BigInt(match[1]).toString() + '.' + (match[2] ?? '').padEnd(2, '0');
}

export function handleRollXKeyboard(event, { controller, root }) {
  if (!['Space', 'Enter'].includes(event.code)) return;
  const interactive = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(event.target?.tagName);
  const wagerControl = event.target?.closest?.('#spin, #auto, #auto-form');
  // Repeated native keydown on a focused button can synthesize new clicks.
  // Cancel its default behavior before returning; a busy guard alone cannot
  // protect the next READY state while the same physical key remains held.
  if (event.repeat) {
    if (wagerControl || !interactive) event.preventDefault();
    return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey ||
      root.querySelector('dialog[open]') || interactive) return;
  event.preventDefault(); void controller.unlockAudio();
  if (controller.snapshot.canStop) controller.stop();
  else if (controller.snapshot.canSpin) void controller.spin();
}

export function handleRollXPageHide(event, { controller, dispose }) {
  if (event.persisted) controller.setHidden(true);
  else dispose();
}
export function handleRollXPageShow(event, { controller }) {
  if (event.persisted) void controller.resume();
}

export function mountRollX({ root, session, renderer: injectedRenderer, audio: injectedAudio } = {}) {
  if (!root || !session) throw new TypeError('A root element and session adapter are required.');
  const doc = root.ownerDocument, win = doc.defaultView;
  const find = id => root.querySelector('#' + id);
  const listeners = new AbortController();
  const audio = injectedAudio ?? new RollXAudio();
  const renderer = injectedRenderer ?? new RollXRenderer({ element: find('rollx-wheel') });
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const controller = new RollXController({
    session, renderer, audio, reducedMotion: motion?.matches === true,
    onState: state => {
      find('fixture-label').hidden = !state.fixture;
      find('status').textContent = state.message;
      find('balance').textContent = state.balance === null ? 'Unavailable' : state.balance + ' ETB';
      find('balance-caption').textContent = state.balanceFresh ? 'CONFIRMED ACCOUNT BALANCE' : state.balance === null ? 'ACCOUNT BALANCE' : 'LAST CONFIRMED BALANCE';
      find('target').value = String(Math.max(0, TARGETS.indexOf(state.targetBps)));
      find('target').setAttribute('aria-valuetext', state.targetBps / 10000 + ' times');
      find('target').disabled = state.wagerControlsDisabled || state.betLevels.length === 0;
      find('target-value').textContent = state.targetBps / 10000 + '×';
      find('bet').max = String(Math.max(0, state.betLevels.length - 1));
      find('bet').value = String(Math.max(0, state.betLevels.indexOf(state.bet)));
      find('bet').disabled = state.wagerControlsDisabled || state.betLevels.length < 2;
      find('bet').setAttribute('aria-valuetext', state.bet ? state.bet + ' ETB' : 'Unavailable');
      find('bet-value').textContent = state.bet ? state.bet + ' ETB' : 'Unavailable';
      find('bet-plus').disabled = state.wagerControlsDisabled || state.betLevels.indexOf(state.bet) >= state.betLevels.length - 1;
      find('spin').disabled = !state.canSpin && !state.canStop;
      find('spin').textContent = state.canStop ? 'STOP' : state.busy ? 'CONFIRMING…' : state.canSpin ? 'SPIN' : 'UNAVAILABLE';
      find('auto').disabled = !state.canAuto && !state.autoActive;
      find('auto').textContent = state.autoActive ? 'STOP AUTO' : 'AUTO';
      find('auto-progress').hidden = !state.autoActive;
      find('auto-progress').textContent = state.autoRemaining + ' AUTO rounds remaining';
      find('mute').setAttribute('aria-pressed', String(state.muted));
      find('mute').setAttribute('aria-label', state.muted ? 'Unmute sound' : 'Mute sound');
      find('sound-setting').checked = !state.muted;
      find('turbo').setAttribute('aria-pressed', String(state.turbo));
      find('turbo-setting').checked = state.turbo;
      find('recover').hidden = !state.canRecover;
      find('reconnect').hidden = state.canSpin || state.canStop || state.autoActive || state.canRecover;
      find('reconnect').disabled = state.busy;
      renderer.setPreview?.(state.targetBps, state.fixture);
      const history = find('history-rows');
      history.replaceChildren();
      for (const receipt of state.history) {
        const row = doc.createElement('tr');
        for (const text of [receipt.rollX.targetBps / 10000 + '×', receipt.bet, receipt.finalWin]) {
          const cell = doc.createElement('td'); cell.textContent = text; row.append(cell);
        }
        history.append(row);
      }
      find('history-empty').hidden = state.history.length !== 0;
      find('history-table').hidden = state.history.length === 0;
    },
  });
  const listen = (element, event, handler) => element.addEventListener(event, handler, { signal: listeners.signal });
  const gesture = action => event => { void controller.unlockAudio(); action(event); };
  const openDialog = id => {
    for (const dialog of root.querySelectorAll('dialog[open]')) dialog.close();
    find(id).showModal();
  };
  listen(find('spin'), 'click', gesture(() => controller.snapshot.canStop ? controller.stop() : void controller.spin()));
  listen(find('target'), 'input', event => controller.setTarget(TARGETS[Number(event.target.value)]));
  listen(find('bet'), 'input', event => controller.setBet(controller.snapshot.betLevels[Number(event.target.value)]));
  listen(find('bet-plus'), 'click', gesture(() => controller.stepBet(1)));
  listen(find('turbo'), 'click', gesture(() => controller.setTurbo(!controller.snapshot.turbo)));
  listen(find('mute'), 'click', gesture(() => controller.setMuted(!controller.snapshot.muted)));
  listen(find('sound-setting'), 'change', gesture(event => controller.setMuted(!event.target.checked)));
  listen(find('turbo-setting'), 'change', event => controller.setTurbo(event.target.checked));
  listen(find('menu'), 'click', () => openDialog('menu-dialog'));
  listen(find('history'), 'click', () => openDialog('history-dialog'));
  listen(find('recover'), 'click', gesture(() => { void controller.recover(); }));
  listen(find('reconnect'), 'click', () => { void controller.connect(); });
  listen(find('auto'), 'click', gesture(() => {
    if (controller.snapshot.autoActive) controller.stopAuto();
    else {
      const state = controller.snapshot;
      const populate = (select, choices, selected, label) => {
        select.replaceChildren(...choices.map(value => {
          const option = doc.createElement('option');
          option.value = String(value); option.textContent = label(value); return option;
        }));
        select.value = String(selected);
      };
      populate(find('auto-bet'), state.betLevels, state.bet, value => value + ' ETB');
      populate(find('auto-target'), TARGETS.filter(value => session.supportsTarget(value)), state.targetBps,
        value => value / 10000 + '×');
      find('auto-error').hidden = true; openDialog('auto-dialog');
    }
  }));
  listen(find('auto-form'), 'submit', event => {
    event.preventDefault();
    try {
      const settings = {
        count: Number(find('auto-count').value),
        bet: find('auto-bet').value,
        targetBps: Number(find('auto-target').value),
        stopOnWin: exactAmount(find('stop-win').value),
        stopOnLoss: exactAmount(find('stop-loss').value),
        stopOnGain: exactAmount(find('stop-gain').value),
      };
      if (!controller.snapshot.canAuto) throw new Error('AUTO is unavailable until the current round is confirmed.');
      if (!controller.snapshot.betLevels.includes(settings.bet) || !TARGETS.includes(settings.targetBps) ||
          !session.supportsTarget(settings.targetBps)) throw new Error('The selected AUTO bet or multiplier is no longer available.');
      find('auto-dialog').close();
      void controller.startAuto(settings).then(result => {
        if (!result.started && !controller.disposed) {
          find('auto-error').hidden = false;
          find('auto-error').textContent = 'The selected AUTO settings cannot start. Check the available bet and multiplier.';
          openDialog('auto-dialog');
        }
      });
    } catch (error) {
      find('auto-error').hidden = false; find('auto-error').textContent = error.message;
    }
  });
  for (const button of root.querySelectorAll('[data-open]')) listen(button, 'click', () => openDialog(button.dataset.open));
  for (const button of root.querySelectorAll('[data-close]')) listen(button, 'click', () => button.closest('dialog').close());
  listen(win, 'keydown', event => handleRollXKeyboard(event, { controller, root }));
  listen(doc, 'visibilitychange', () => {
    if (doc.hidden) controller.setHidden(true);
    else void controller.resume();
  });
  const dispose = () => {
    listeners.abort();
    for (const dialog of root.querySelectorAll('dialog[open]')) dialog.close();
    controller.dispose();
  };
  listen(win, 'pagehide', event => handleRollXPageHide(event, { controller, dispose }));
  listen(win, 'pageshow', event => handleRollXPageShow(event, { controller }));
  controller._notify();
  return { controller, connect: () => controller.connect(), dispose };
}
