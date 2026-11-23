// Keep the existing cards and title artwork. Eight new account entries and
// the two retained Ice account entries replace credits-only primary links.
const ids = new Set(['multihot100_native', 'habeshafortune5_native', 'multihotwildways_native', 'multihot5wild_native', 'multihot5superwilds_native', 'multihotdeluxe_native', 'burningice_native', 'burningice10_native', 'burningice40_native', 'coinminer_native']);
const key = Symbol.for('zplay.account-entry.r13');
window[key]?.dispose();
function update() {
  for (const card of document.querySelectorAll('[data-r20-game]')) {
    if (!ids.has(card.getAttribute('data-r20-game'))) continue;
    const mode = card.querySelector('.r20-native-mode');
    if (mode && mode.textContent !== 'Preparing') mode.textContent = 'Preparing';
    const button = card.querySelector('.r20-native-open'), image = card.querySelector('img');
    if (button && image && button.getAttribute('aria-label') !== 'View ' + image.alt) button.setAttribute('aria-label', 'View ' + image.alt);
  }
  for (const dialog of document.querySelectorAll('.r20-game-sheet')) {
    const play = dialog.querySelector('.r20-sheet-play');
    if (!play) continue;
    let url; try { url = new URL(play.href, location.origin); } catch { continue; }
    const match = /^\/(?:demo\/)?games\/([a-z0-9_]+)$/.exec(url.pathname);
    if (url.origin !== location.origin || !ids.has(match?.[1])) continue;
    const href = '/games/' + match[1];
    if (play.getAttribute('href') !== href) play.setAttribute('href', href);
    if (play.lastChild?.nodeType === 3 && play.lastChild.textContent !== ' Open game') play.lastChild.textContent = ' Open game';
    const note = dialog.querySelector('.r20-mode-note');
    if (note && note.textContent !== 'Uses your existing ETB balance. New rounds are being prepared.') note.textContent = 'Uses your existing ETB balance. New rounds are being prepared.';
  }
}
const observer = new MutationObserver(update);
observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['href']});
document.addEventListener('click', update);
update();
window[key] = {dispose() { observer.disconnect(); document.removeEventListener('click', update); }};
