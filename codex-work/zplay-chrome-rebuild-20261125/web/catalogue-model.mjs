/** Fresh-reference catalogue data; no game maths or wallet state is held here. */
export function referenceKey(game) {
  const cover = new URL(game.image);
  // The current captures contain both the horizontal and Vertical cover of
  // the same named entry. Other path segments remain part of its identity.
  cover.pathname = cover.pathname.replace('/Vertical/', '/');
  return `${game.name}\n${cover.href}`;
}

export function buildCatalogue(allCapture, smartSoftCapture) {
  const entries = new Map();
  for (const game of allCapture.games) {
    const key = referenceKey(game);
    entries.set(key, { ...game, key, provider: null, referenceSource: allCapture.source });
  }
  for (const game of smartSoftCapture.games) {
    const key = referenceKey(game);
    entries.set(key, {
      ...entries.get(key), ...game, key, provider: 'SmartSoft',
      referenceSource: smartSoftCapture.source,
      providerEvidence: smartSoftCapture.selection,
    });
  }
  return [...entries.values()];
}

export function filterCatalogue(games, { search = '', provider = 'all', favourites = null, mostLiked = null } = {}) {
  const query = search.trim().toLocaleLowerCase();
  return games.filter(game => (!query || game.name.toLocaleLowerCase().includes(query))
    && (provider === 'all' || game.provider === provider)
    && (!favourites || favourites.has(game.key))
    && (!mostLiked || mostLiked.has(game.key)));
}

export function verifiedNewGameRoute(game, readiness, origin) {
  const entry = readiness?.games?.[game.key];
  if (entry?.newImplementation !== true || entry?.liveVerified !== true || !entry?.route || !entry?.referenceUrl) return null;
  let route, reference;
  try { route = new URL(entry.route, origin); reference = new URL(entry.referenceUrl); } catch { return null; }
  // New builds have their own route namespace. Old games cannot be relabelled
  // as fresh implementations by a display-only catalogue entry.
  if (route.origin !== new URL(origin).origin || !route.pathname.startsWith('/rebuild/games/')
      || route.username || route.password || route.search || route.hash
      || reference.origin !== 'https://zplaybet.xyz') return null;
  return route.pathname;
}

export function readFavourites(storage) {
  try {
    const raw = JSON.parse(storage.getItem('zplay.rebuild.favourites.v1') || '[]');
    return new Set(Array.isArray(raw) ? raw.filter(x => typeof x === 'string') : []);
  } catch { return new Set(); }
}

export function saveFavourites(storage, values) {
  try { storage.setItem('zplay.rebuild.favourites.v1', JSON.stringify([...values])); return true; }
  catch { return false; }
}

export function accountViewFromMe(user) {
  if (!user || user.id === undefined || user.id === null || user.balance === undefined || user.balance === null
      || !['number', 'string'].includes(typeof user.balance)
      || (typeof user.balance === 'string' && user.balance.trim() === '')) return null;
  const minor = Number(user.balance);
  if (!Number.isSafeInteger(minor) || (user.currency !== undefined && user.currency !== 'ETB')) return null;
  return { authenticated: true, currency: 'ETB', balance: minor / 100 };
}
