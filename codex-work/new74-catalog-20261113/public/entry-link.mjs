const ENTRY_ID = 'superwin-new74-entry';
const STYLE_ID = 'superwin-new74-lobby-style';
const REVISION = '20261113-all74-r1';

// Remove only the previous dashboard selection override. Existing game links,
// account handlers and other player styles remain owned by their current code.
document.getElementById('superwin-dashboard-selection-20261113')?.remove();

if (!document.getElementById(STYLE_ID)) {
  const stylesheet = document.createElement('link');
  stylesheet.id = STYLE_ID;
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/new74/lobby.css';
  document.head.append(stylesheet);
}

function element(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function mount() {
  if (location.pathname !== '/') return;
  document.getElementById('superwin-dashboard-selection-20261113')?.remove();
  const host = document.querySelector('main.player-main') || document.querySelector('main');
  if (!host) return;
  const existing = document.getElementById(ENTRY_ID);
  if (existing?.dataset.new74Revision === REVISION && host.contains(existing)) return;
  const section = element('aside');
  section.id = ENTRY_ID;
  section.dataset.new74Revision = REVISION;
  section.setAttribute('aria-label', 'Liiska 74-ka ciyaarood');
  const link = element('a', 'n74-home-link');
  link.href = '/new74/';
  const mark = element('span', 'n74-home-mark', '74');
  mark.setAttribute('aria-hidden', 'true');
  const copy = element('span', 'n74-home-copy');
  copy.append(element('span', 'n74-home-title', 'Ciyaaraha oo dhan'), element('span', 'n74-home-description', '74 cinwaan · 16 bog oo jira'));
  const action = element('span', 'n74-home-cta');
  action.append(element('span', 'n74-home-cta-label', 'Fur liiska 74-ka'));
  const arrow = element('span', 'n74-home-arrow', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  action.append(arrow);
  link.append(mark, copy, action);
  section.append(link);
  if (existing) existing.remove();
  host.prepend(section);
}

mount();
let pendingFrame = null;
function scheduleMount() {
  if (pendingFrame !== null) return;
  pendingFrame = requestAnimationFrame(() => { pendingFrame = null; mount(); });
}
const observer = new MutationObserver(scheduleMount);
observer.observe(document.body, {childList: true, subtree: true});
window.addEventListener('pageshow', () => {
  observer.observe(document.body, {childList: true, subtree: true});
  scheduleMount();
});
window.addEventListener('pagehide', () => {
  if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
  pendingFrame = null;
  observer.disconnect();
});
