import { MultiHot10Dialogs } from '../render/dialogs.mjs';
import { MultiHot10Controls } from '../controls.mjs';

// Minimal DOM fixture for the actual dialog. No game logic is reimplemented.
class Element {
  constructor(tag, document) {
    this.tagName = tag; this.ownerDocument = document; this.children = []; this.parentElement = null;
    this.className = ''; this.style = {}; this.dataset = {}; this.attributes = new Map();
    this.listeners = new Map(); this.disabled = false; this.hidden = false;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) {
    for (const node of this.children) node.parentElement = null;
    this.children = []; this.append(...nodes);
  }
  matches(selector) {
    if (selector.startsWith('.')) return this.className.split(' ').includes(selector.slice(1));
    if (selector === 'button[data-action]') return this.tagName === 'button' && !!this.dataset.action;
    if (selector.endsWith(':not(:disabled)')) return this.tagName === selector.split(':')[0] && !this.disabled;
    return this.tagName === selector;
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
  querySelectorAll(selector) {
    const selectors = selector.split(','), result = [];
    const walk = node => {
      for (const child of node.children) { if (selectors.some(part => child.matches(part))) result.push(child); walk(child); }
    };
    walk(this); return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  focus() { this.ownerDocument.activeElement = this; }
}

export const observedLevels = Object.freeze([
  '0.10', '0.20', '0.30', '0.40', '0.50', '0.60', '0.70', '0.80', '1.00', '1.50',
  '2.00', '2.50', '3.00', '4.00', '5.00', '6.00', '7.00', '8.00', '10.00', '15.00',
  '20.00', '25.00', '30.00', '40.00', '50.00', '60.00', '70.00', '80.00', '100.00', '150.00', '200.00',
]);

export function dialogFixture(t, { levels = observedLevels, selectedBet = '5.00' } = {}) {
  const original = globalThis.document;
  const document = { activeElement: null, createElement: tag => new Element(tag, document) };
  globalThis.document = document;
  const container = new Element('div', document), frames = [], actions = [];
  const controls = new MultiHot10Controls({ betLevels: levels, selectedBet, currency: 'DMO' });
  const dialogs = new MultiHot10Dialogs(container, { url(frame) { frames.push(frame); return 'fixture:' + frame; } }, (name, value) => {
    actions.push({ name, value });
    if (name === 'choose-bet') controls.selectBet(value);
    if (name === 'close') controls.closeModal();
    dialogs.show(controls.snapshot);
  });
  t.after(() => { dialogs.dispose(); globalThis.document = original; });
  const allButtons = () => container.querySelectorAll('button');
  const target = (action, value) => allButtons().find(node => node.dataset.action === action && node.dataset.value === value);
  return {
    container, dialogs, controls, frames, actions, document, target,
    open() { controls.openModal('bet'); dialogs.show(controls.snapshot); },
    click(node) {
      if (!node) throw Error('Required dialog target is absent');
      const event = { target: node, prevented: false, stopped: false,
        preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
      container.listeners.get('click')(event); return event;
    },
    visible() { return allButtons().filter(node => node.dataset.action === 'choose-bet').map(node => node.dataset.value); },
    offset() { return Number(container.querySelector('.m10-bet-choices').dataset.startIndex); },
  };
}
