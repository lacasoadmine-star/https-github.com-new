import { buildCatalogue, filterCatalogue, referenceKey, verifiedNewGameRoute, readFavourites, saveFavourites, accountViewFromMe } from './catalogue-model.mjs';

const $ = selector => document.querySelector(selector);
let deviceStorage;
try { deviceStorage = window.localStorage; } catch { /* Device preferences may be unavailable. */ }
const state = { games: [], featured: [], icons: new Map(), readiness: { games: {} }, search: '', provider: 'all', category: 'All', favourites: readFavourites(deviceStorage), account: null, lastFocus: null };
const sections = [
  ['Deposit', 'category_icon-deposit', 'deposit'],
  ['Virtual Sport', 'category_icon-virtual_sport', 'virtual-sport'],
  ['Live Casino', 'category_icon-live_casino', 'live-casino'],
  ['TV Games', 'category_icon-tv_games', 'tv-games'],
  ['Sports', 'category_icon-sport', 'sports'],
  ['Tournaments', 'category_icon-tournament', 'tournaments'],
  ['Bonuses', 'category_icon-bonus_1', 'bonuses'],
  ['TopLeagues', 'category_icon-sport', 'top-leagues'],
  ['SportRace', 'category_icon-cricket', 'sport-race'],
  ['Live', 'category_icon-live_sport', 'live-sports'],
  ['Games', 'category_icon-casino_2', 'games'],
  ['Popular', 'category_icon-casino_1', 'popular'],
  ['Esport', 'category_icon-esport', 'esport'],
  ['ZPLAYCLUB', 'category_icon-ninja_crash_1', 'club'],
];
const categoryNames = ['All', 'Most Popular', 'Favourites', 'Slots', 'New', 'Baccarat', 'Roulette', 'BlackJack', 'Poker', 'Lottery Games', 'Last Played Games', 'Other', 'Most Liked', 'Trending Games', 'Table Games', 'Drops & Wins'];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(name) {
  const node = element('span', 'icon');
  node.setAttribute('aria-hidden', 'true');
  const observed = state.icons.get(name);
  if (observed && ['BuilderFont', 'PromotionsIcon'].includes(observed.font)) {
    node.style.fontFamily = observed.font;
    node.textContent = observed.content.replace(/^"|"$/g, '');
  }
  return node;
}

function hydrateIcons() {
  document.querySelectorAll('[data-icon]').forEach(node => {
    const rendered = icon(node.dataset.icon);
    node.classList.add('icon');
    node.style.fontFamily = rendered.style.fontFamily;
    node.textContent = rendered.textContent;
  });
}

function showDialog(title, message) {
  $('#dialog-title').textContent = title;
  $('#dialog-content').replaceChildren(element('p', '', message));
  $('#details-dialog').showModal();
}

function toast(text) {
  $('#toast').textContent = text;
  $('#toast').hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { $('#toast').hidden = true; }, 3200);
}

function requestSection(action) {
  closeMenu();
  if (['games', 'popular', 'home'].includes(action)) {
    selectCategory(action === 'popular' ? 'Most Liked' : 'All');
    document.querySelector(action === 'home' ? 'main' : '.catalogue').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const event = new CustomEvent('zplay:section', { detail: { section: action }, cancelable: true });
  if (!document.dispatchEvent(event)) return;
  showDialog(sections.find(s => s[2] === action)?.[0] || action, 'This section has not yet been connected in the unpublished rebuild. The existing website and its records remain unchanged.');
}

function requestAccount(action) {
  const event = new CustomEvent('zplay:account', { detail: { action }, cancelable: true });
  if (!document.dispatchEvent(event)) return;
  showDialog(action === 'login' ? 'Login' : 'My account', 'The account screen has not yet been connected in this unpublished rebuild. This source does not collect passwords, create balances or submit transactions.');
}

function navigationButton(label, glyph, action, className = '') {
  const button = element('button', className);
  button.type = 'button';
  button.append(icon(glyph), element('span', '', label));
  button.addEventListener('click', () => requestSection(action));
  return button;
}

function renderNavigation() {
  $('#desktop-primary').replaceChildren(...sections.slice(0, 5).map(item => navigationButton(...item)));
  const more = element('button', 'more-navigation');
  more.setAttribute('aria-label', 'More sections');
  more.append(icon('digi_icon-more_horiz'));
  more.addEventListener('click', openMenu);
  $('#desktop-primary').append(more);
  $('#drawer-navigation').replaceChildren(...sections.map(item => navigationButton(...item, 'drawer-link')));
  const bottom = [['Home', null, 'home'], ['Sports', 'category_icon-sport', 'sports'], ['Deposit', 'category_icon-deposit', 'deposit'], ['GAMES', 'category_icon-casino_2', 'games'], ['Popular', 'category_icon-casino_1', 'popular']];
  $('#mobile-nav').replaceChildren(...bottom.map(([label, glyph, action], index) => {
    const button = navigationButton(label, glyph, action, index === 0 ? 'active' : '');
    if (!glyph) button.querySelector('.icon')?.remove();
    return button;
  }));
  $('#categories').replaceChildren(...categoryNames.map(name => {
    const button = element('button', '', name);
    button.setAttribute('aria-pressed', name === state.category ? 'true' : 'false');
    button.addEventListener('click', () => selectCategory(name));
    return button;
  }));
}

function selectCategory(category) {
  if (!['All', 'Favourites', 'Most Liked'].includes(category)) {
    showDialog(category, 'The category label was observed on the reference website. Its complete game membership has not yet been captured, so this rebuild does not invent a result list.');
    return;
  }
  state.category = category;
  $('#categories').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.textContent === category)));
  document.querySelectorAll('[data-library]').forEach(button => {
    const selected = button.dataset.library === (category === 'Favourites' ? 'favourites' : 'all');
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderGames();
}

function renderProviders() {
  const query = $('#provider-search').value.trim().toLocaleLowerCase();
  const available = ['all', ...new Set(state.games.map(game => game.provider).filter(Boolean))];
  $('#provider-options').replaceChildren(...available.filter(name => name === 'all' || name.toLocaleLowerCase().includes(query)).map(name => {
    const count = name === 'all' ? state.games.length : state.games.filter(game => game.provider === name).length;
    const button = element('button', 'provider-option');
    button.setAttribute('aria-pressed', String(state.provider === name));
    button.append(element('span', '', `${name === 'all' ? 'ALL' : name.toUpperCase()} (${count})`), icon(state.provider === name ? 'digi_icon-checkbox_selected' : 'digi_icon-checkbox'));
    button.addEventListener('click', () => { state.provider = name; renderProviders(); renderGames(); });
    return button;
  }));
}

function buildCard(game, featured = false) {
  const article = element('article', 'game-card');
  article.dataset.gameKey = game.key;
  const titleId = `game-${crypto.randomUUID()}`;
  article.setAttribute('aria-labelledby', titleId);
  const imageButton = element('button', 'card-image-button');
  imageButton.type = 'button';
  imageButton.setAttribute('aria-label', `Show ${game.name}`);
  const artwork = element('img', 'game-art');
  artwork.src = game.image;
  artwork.alt = game.name;
  artwork.loading = featured ? 'eager' : 'lazy';
  artwork.decoding = 'async';
  artwork.addEventListener('error', () => {
    imageButton.classList.add('image-failed');
    imageButton.append(element('span', '', `${game.name} — original artwork unavailable`));
    article.dataset.artworkUnavailable = 'true';
  }, { once: true });
  imageButton.append(artwork);
  imageButton.addEventListener('click', () => {
    const opening = article.dataset.open !== 'true';
    document.querySelectorAll('.game-card[data-open=true]').forEach(card => { card.dataset.open = 'false'; });
    article.dataset.open = String(opening);
    if (opening) article.querySelector('.favorite-button')?.focus({ preventScroll: true });
  });
  const footer = element('div', 'card-footer');
  const title = element('h2', 'card-title', game.name);
  title.id = titleId;
  footer.append(title);
  const hover = element('div', 'card-hover');
  const top = element('div', 'card-hover-top');
  top.append(element('div', 'card-title', game.name));
  const favourite = element('button', 'favorite-button');
  favourite.setAttribute('aria-label', `Save ${game.name} on this device`);
  favourite.setAttribute('aria-pressed', String(state.favourites.has(game.key)));
  favourite.append(icon('digi_icon-favorite'));
  favourite.addEventListener('click', () => {
    if (state.favourites.has(game.key)) state.favourites.delete(game.key);
    else state.favourites.add(game.key);
    const persisted = saveFavourites(deviceStorage, state.favourites);
    document.querySelectorAll('.game-card').forEach(card => {
      if (card.dataset.gameKey === game.key) card.querySelector('.favorite-button')?.setAttribute('aria-pressed', String(state.favourites.has(game.key)));
    });
    if (state.category === 'Favourites') renderGames();
    toast(persisted ? 'Favourites updated on this device.' : 'Saved for this page only; device storage is unavailable.');
  });
  top.append(favourite);
  const route = verifiedNewGameRoute(game, state.readiness, location.origin);
  const play = element('button', 'play-button', route ? 'Play Now' : 'Awaiting game implementation');
  play.disabled = !route;
  if (route) play.addEventListener('click', () => { location.assign(route); });
  const availability = element('div', 'availability-label', route ? 'Verified new build' : 'Reference artwork · not a playable new game');
  hover.append(top, play, availability);
  article.append(imageButton, footer, hover);
  return article;
}

function renderGames() {
  const games = filterCatalogue(state.games, {
    search: state.search, provider: state.provider,
    favourites: state.category === 'Favourites' ? state.favourites : null,
    mostLiked: state.category === 'Most Liked' ? new Set(state.featured.map(g => g.key)) : null,
  });
  $('#games-grid').replaceChildren(...games.map(game => buildCard(game)));
  $('#empty-state').hidden = games.length > 0;
  $('#results-status').textContent = `${games.length} reference game records. No game is marked playable without an independently verified new build.`;
}

function openMenu() {
  state.lastFocus = document.activeElement;
  $('#site-menu').hidden = false;
  $('#menu-overlay').hidden = false;
  document.body.classList.add('menu-open');
  $('#menu-toggle').setAttribute('aria-expanded', 'true');
  $('#menu-close').focus();
}

function closeMenu() {
  if ($('#site-menu').hidden) return;
  $('#site-menu').hidden = true;
  $('#menu-overlay').hidden = true;
  document.body.classList.remove('menu-open');
  $('#menu-toggle').setAttribute('aria-expanded', 'false');
  state.lastFocus?.focus?.();
}

async function refreshAccount() {
  try {
    const response = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (response.status === 401 || response.status === 403) {
      state.account = null;
      $('#account-balance').textContent = 'Login';
      $('#account-balance').setAttribute('aria-label', 'Login');
      $('#account-balance').dataset.accountAction = 'login';
      return;
    }
    if (!response.ok) return;
    const account = await response.json();
    // Confirmed existing contract: direct user object, balance in minor ETB.
    // No wallet or auth state comes from storage or reference screenshots.
    const view = accountViewFromMe(account);
    if (view) document.dispatchEvent(new CustomEvent('zplay:account-view', { detail: view }));
    document.dispatchEvent(new CustomEvent('zplay:account-response', { detail: account }));
  } catch { /* Read-only account availability does not block reference rendering. */ }
}

document.addEventListener('zplay:account-view', event => {
  const view = event.detail;
  if (view?.authenticated !== true || view.currency !== 'ETB' || !Number.isFinite(view.balance)) return;
  state.account = view;
  $('#account-balance').textContent = `${view.balance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
  $('#account-balance').setAttribute('aria-label', 'Account balance in ETB');
  $('#account-balance').dataset.accountAction = 'wallet';
});

function bindControls() {
  $('#menu-toggle').addEventListener('click', openMenu);
  $('#menu-close').addEventListener('click', closeMenu);
  $('#menu-overlay').addEventListener('click', closeMenu);
  $('#dialog-close').addEventListener('click', () => $('#details-dialog').close());
  $('#details-dialog').addEventListener('click', event => { if (event.target === $('#details-dialog')) $('#details-dialog').close(); });
  document.addEventListener('click', event => {
    const account = event.target.closest('[data-account-action]');
    if (account) requestAccount(account.dataset.accountAction);
    const section = event.target.closest('[data-section]');
    if (section) requestSection(section.dataset.section);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMenu();
      document.querySelectorAll('.game-card[data-open=true]').forEach(card => { card.dataset.open = 'false'; });
    }
    if (event.key === 'Tab' && !$('#site-menu').hidden) {
      const controls = [...$('#site-menu').querySelectorAll('button,a[href],input')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  $('#game-search').addEventListener('input', event => { state.search = event.target.value; renderGames(); });
  $('#provider-search').addEventListener('input', renderProviders);
  $('#rail-previous').addEventListener('click', () => $('#featured-games').scrollBy({ left: -$('#featured-games').clientWidth, behavior: 'smooth' }));
  $('#rail-next').addEventListener('click', () => $('#featured-games').scrollBy({ left: $('#featured-games').clientWidth, behavior: 'smooth' }));
  document.querySelectorAll('[data-library]').forEach(button => button.addEventListener('click', () => selectCategory(button.dataset.library === 'favourites' ? 'Favourites' : 'All')));
  $('#theme-switch').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('#theme-switch').setAttribute('aria-pressed', String(dark));
    $('#theme-switch').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} appearance`);
  });
}

function renderDate() {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const text = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone }).format(now).replaceAll('/', '.');
  const zone = new Intl.DateTimeFormat('en', { timeZoneName: 'shortOffset', timeZone: timezone }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || timezone;
  $('#site-date').dateTime = now.toISOString();
  $('#site-date').textContent = `${text} · ${zone}`;
}

async function start() {
  bindControls();
  renderDate();
  try {
    const paths = ['./data/catalogue.json', './data/smartsoft-catalogue.json', './data/icons.json', './readiness.json'];
    const [all, smartsoft, icons, readiness] = await Promise.all(paths.map(async path => {
      const response = await fetch(new URL(path, import.meta.url));
      if (!response.ok) throw new Error(`Reference file could not be loaded: ${path}`);
      return response.json();
    }));
    for (const record of icons) for (const name of record.class.split(/\s+/).filter(Boolean)) if (/^(digi|category)_icon-/.test(name)) state.icons.set(name, record);
    state.games = buildCatalogue(all, smartsoft);
    state.featured = all.mostLiked.map(game => ({ ...game, key: referenceKey(game) }));
    state.readiness = readiness;
    hydrateIcons();
    renderNavigation();
    $('#featured-games').replaceChildren(...state.featured.map(game => buildCard(game, true)));
    renderProviders();
    renderGames();
    const verifiedCount = state.games.filter(game => verifiedNewGameRoute(game, state.readiness, location.origin)).length;
    $('#source-status').textContent = `Unpublished source preview · ${state.games.length} distinct reference records · ${smartsoft.games.length} entries independently observed in the SmartSoft filter · ${verifiedCount} new games verified.`;
    await refreshAccount();
  } catch (error) {
    $('#source-status').textContent = error.message;
    $('#results-status').textContent = 'The reference catalogue could not be loaded.';
  }
}

start();
