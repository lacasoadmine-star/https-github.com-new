/**
 * Reconnect-safe transport for a future server-authoritative ETB round endpoint.
 * Never creates a payout or credits a wallet in the browser.
 * Requires backend support for unique client_token and immutable replay.
 */
export function createRoundClient({
  gameId, endpoint = '/api/player/game-rounds',
  fetcher = globalThis.fetch, storage = globalThis.sessionStorage,
  getAccessToken, tokenFactory = () => globalThis.crypto.randomUUID(),
}) {
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(gameId)) throw new Error('INVALID_GAME_ID');
  if (!storage || !fetcher || !getAccessToken) throw new Error('ROUND_CLIENT_CONFIGURATION');
  const key = `zplay.pending-round.v1.${gameId}`;
  let inFlight = null;

  function stakeString(value) {
    if (typeof value !== 'string' && typeof value !== 'number') throw new Error('INVALID_BET');
    const raw = String(value);
    if (!/^(?:0|[1-9][0-9]{0,7})(?:\.[0-9]{1,4})?$/.test(raw)) throw new Error('INVALID_BET');
    const [whole, fraction = ''] = raw.split('.');
    if (BigInt(whole) * 10000n + BigInt((fraction || '0').padEnd(4, '0')) <= 0n) throw new Error('INVALID_BET');
    return raw;
  }

  function pending() {
    const raw = storage.getItem(key);
    if (!raw) return null;
    let item;
    try { item = JSON.parse(raw); } catch { throw new Error('ROUND_STORAGE_CORRUPT'); }
    if (item?.v !== 1 || item.gameId !== gameId ||
        typeof item.token !== 'string' || !/^[a-zA-Z0-9_-]{8,96}$/.test(item.token)) {
      throw new Error('ROUND_STORAGE_CORRUPT');
    }
    try { stakeString(item.bet); } catch { throw new Error('ROUND_STORAGE_CORRUPT'); }
    return item;
  }

  function beginRound(bet) {
    const stake = stakeString(bet);
    const existing = pending();
    if (existing && existing.bet !== stake) throw new Error('ROUND_PENDING');
    if (inFlight) return inFlight;
    let current = existing;
    if (!current) {
      const token = tokenFactory();
      if (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{8,96}$/.test(token)) throw new Error('INVALID_ROUND_TOKEN');
      current = {v: 1, gameId, bet: stake, token};
      // Save before POST so a network timeout cannot accidentally open a second round.
      storage.setItem(key, JSON.stringify(current));
    }
    inFlight = (async () => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error('AUTH_REQUIRED');
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`},
        body: JSON.stringify({game_id: gameId, bet: stake, client_token: current.token}),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 202) return {status: 'pending', client_token: current.token};
      if (response.ok) {
        const valid = data?.status === 'settled' && data.game_id === gameId &&
          data.client_token === current.token && data.bet === stake &&
          typeof data.round_id === 'string' && data.round_id.length > 0 &&
          data.currency === 'ETB' && data.result_json &&
          typeof data.result_json === 'object' && !Array.isArray(data.result_json) &&
          typeof data.total_win === 'string' && typeof data.balance === 'string' &&
          /^\d+(?:\.\d{1,4})?$/.test(data.total_win) &&
          /^\d+(?:\.\d{1,4})?$/.test(data.balance);
        if (!valid) throw new Error('INVALID_SERVER_ROUND');
        storage.removeItem(key);
        return data;
      }
      if (data?.status === 'rejected' && data?.debit_applied === false &&
          data?.client_token === current.token && response.status >= 400 && response.status < 500) {
        storage.removeItem(key);
      }
      throw new Error('ROUND_NOT_SETTLED');
    })().finally(() => { inFlight = null; });
    return inFlight;
  }

  function resumePending() {
    const item = pending();
    return item ? beginRound(item.bet) : Promise.resolve(null);
  }

  return {beginRound, resumePending, getPending: pending};
}
