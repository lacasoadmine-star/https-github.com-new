import { GAME_ID, MODEL_VERSION, money, minor } from '../client/fresh74-account.mjs';

export const GUARD = 'a'.repeat(64);
export const OTHER_GUARD = 'b'.repeat(64);
export const MATH_HASH = 'c'.repeat(64);
export const ROUND_ID = '10000000-0000-4000-8000-000000000001';
export const REQUEST_IDS = [1, 2, 3, 4].map(n => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
export const SYMBOLS = ['seven', 'bell', 'grape', 'watermelon', 'lemon', 'plum', 'orange', 'cherry'];

export function receipt({ bet = '2.00', before = '100.00', win = '4.00', ...overrides } = {}) {
  return {
    roundId: ROUND_ID, gameId: GAME_ID, mathVersion: MODEL_VERSION,
    engineVersion: 'zplay-fresh-slot-v1', mathSha256: MATH_HASH,
    currency: 'ETB', bet, finalWin: win,
    grid: [['seven', 'bell', 'grape', 'watermelon', 'lemon'],
      ['orange', 'plum', 'cherry', 'seven', 'bell'],
      ['lemon', 'orange', 'bell', 'grape', 'plum']],
    wheelMultiplier: 2, winLines: [],
    walletReceipt: { currency: 'ETB', balanceBefore: before, chargedStake: bet,
      finalWin: win, balanceAfter: money(minor(before) - minor(bet) + minor(win)) },
    ...overrides,
  };
}

export function state({ guard = GUARD, balance = '100.00', result = null, gamble = {}, game = {}, ...overrides } = {}) {
  return {
    authenticated: true, currency: 'ETB', sessionGuard: guard, balance,
    game: { id: GAME_ID, mathVersion: MODEL_VERSION, mathSha256: MATH_HASH,
      engineVersion: 'zplay-fresh-slot-v1', enabled: true, freshReleaseReady: true,
      betLevels: ['2.00', '5.00'], symbols: SYMBOLS, ...game },
    blockedByActiveGame: null,
    round: result ? { result, createdAt: '2026-11-11T17:00:00.000Z',
      gamble: { attempt: 0, stake: result.finalWin, available: true, maxAttempts: 5, ...gamble } } : null,
    ...overrides,
  };
}

export function storage() {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key), values: () => [...map.values()] };
}

export function mockApi(steps) {
  const requests = [];
  const fetchImpl = async (path, options) => {
    const request = { path, method: options.method,
      body: options.body ? JSON.parse(options.body) : null, options };
    requests.push(request);
    if (!steps.length) throw Error('UNEXPECTED_REQUEST:' + path);
    let step = steps.shift();
    if (typeof step === 'function') step = await step(request);
    if (step instanceof Error) throw step;
    return new Response(JSON.stringify(step?.value ?? step), {
      status: step?.status ?? 200, headers: { 'content-type': 'application/json' },
    });
  };
  return { fetchImpl, requests, steps };
}

export function ids() { let next = 0; return () => REQUEST_IDS[next++]; }
