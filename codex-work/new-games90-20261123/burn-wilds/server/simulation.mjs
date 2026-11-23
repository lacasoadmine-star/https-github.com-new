import { BURN_WILDS_GAME_ID, validateBurnWildsReceipt } from '../expansion.mjs';
import { createBurnWildsCandidateSampler, BURN_CANDIDATE_MATH_VERSION } from '../candidate-math.mjs';
import { auditBurnWildsPayout } from '../outcome-audit.mjs';

/**
 * Explicit, ephemeral TEST ETB simulation inside the existing Railway engine.
 * No database, cash wallet, player authentication, payment or ledger is used.
 * This original ZPLAY candidate distribution is NOT the provider's RTP/RNG.
 * Sessions and all their accepted receipts expire and are lost on a restart.
 */
export const BURN_TEST_VERSION = 'burn-wilds-server-simulation-20261123-r1';
export const BURN_TEST_BASE = '/api/new-games90/burn-wilds/test';
export const BURN_TEST_PLAYER_BASE = '/api/slots/new-games90/burn-wilds/test';
export const BURN_TEST_BETS = Object.freeze([100, 200, 500, 1000, 2000]);
const MODE = Object.freeze({ mode: 'SIMULATION', currency: 'ETB', cashEnabled: false,
  authenticated: false, simulationOnly: true, gameId: BURN_WILDS_GAME_ID });
const MAX_BODY = 8192, MAX_MONEY = 1_000_000_000, MAX_DOUBLE = 5;
const REQUEST_KEY = /^[A-Za-z0-9-]{16,180}$/;
const TOKEN = /^[a-f0-9]{64}$/;
const copy = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const money = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_MONEY;
const routes = new Map([BURN_TEST_BASE, BURN_TEST_PLAYER_BASE].flatMap(base =>
  ['session', 'state', 'spin', 'take', 'double', 'history', 'logs', 'health'].map(name => [base + '/' + name, name])));

export class BurnTestError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
const fail = (code, status) => { throw new BurnTestError(code, status); };
const response = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), { status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff', ...extra } });

async function readBody(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
    fail('BURN_TEST_JSON_REQUIRED', 415);
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY))
    fail('BURN_TEST_BODY_LIMIT', 413);
  if (!request.body) fail('BURN_TEST_BODY_REQUIRED');
  const reader = request.body.getReader(), parts = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > MAX_BODY) fail('BURN_TEST_BODY_LIMIT', 413);
      parts.push(value);
    }
  } finally { try { await reader.cancel(); } catch {} reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  let result;
  try { result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('BURN_TEST_JSON_INVALID'); }
  if (!object(result)) fail('BURN_TEST_BODY_INVALID');
  return result;
}

function normalizeAction(operation, raw) {
  const action = { spin: 'SPIN', take: 'TAKE', double: 'DOUBLE' }[operation];
  const fields = operation === 'spin' ? ['betMinor', 'auto', 'collectRoundId'] :
    operation === 'take' ? ['roundId'] : ['roundId', 'choice', 'expectedStakeMinor'];
  const allowed = new Set(['gameId', 'action', 'requestKey', 'testSubject', 'replayOnly', ...fields]);
  if (!object(raw) || Object.keys(raw).some(key => !allowed.has(key)) ||
      raw.gameId !== undefined && raw.gameId !== BURN_WILDS_GAME_ID ||
      raw.action !== undefined && raw.action !== action || !REQUEST_KEY.test(raw.requestKey || '') ||
      typeof raw.testSubject !== 'string' || !/^bt_[a-f0-9-]{36}$/i.test(raw.testSubject) ||
      raw.replayOnly !== undefined && typeof raw.replayOnly !== 'boolean')
    fail('BURN_TEST_ACTION_INVALID');
  if (operation === 'spin') {
    if (!BURN_TEST_BETS.includes(raw.betMinor)) fail('BURN_TEST_BET_UNAVAILABLE', 422);
    if (typeof raw.auto !== 'boolean' || raw.collectRoundId !== null &&
        !(typeof raw.collectRoundId === 'string' && REQUEST_KEY.test(raw.collectRoundId)))
      fail('BURN_TEST_SPIN_INVALID');
  } else {
    if (!REQUEST_KEY.test(raw.roundId || '')) fail('BURN_TEST_ROUND_INVALID');
    if (operation === 'double' && (!['RED', 'BLACK'].includes(raw.choice) ||
        !money(raw.expectedStakeMinor) || raw.expectedStakeMinor <= 0)) fail('BURN_TEST_DOUBLE_INVALID');
  }
  const normalized = { gameId: BURN_WILDS_GAME_ID, action, requestKey: raw.requestKey, testSubject: raw.testSubject };
  for (const field of fields) normalized[field] = raw[field];
  return { action: normalized, fingerprint: JSON.stringify(normalized), replayOnly: raw.replayOnly === true };
}

export function createBurnTestRuntime({
  playerOrigin = 'https://superwin-player.apdiy61.workers.dev',
  cryptoImpl = globalThis.crypto, now = () => Date.now(), logger = record => console.info(JSON.stringify(record)),
  sessionTtlMs = 2 * 60 * 60 * 1000, maxSessions = 8, maxRounds = 2000, maxActions = 4096,
  initialBalanceMinor = 2_000_000, sampler = null, cardSampler = null
} = {}) {
  const origin = new URL(playerOrigin);
  if (origin.origin !== playerOrigin || origin.protocol !== 'https:' ||
      typeof cryptoImpl?.getRandomValues !== 'function' || typeof cryptoImpl?.randomUUID !== 'function' ||
      typeof now !== 'function' || typeof logger !== 'function' ||
      !Number.isSafeInteger(sessionTtlMs) || sessionTtlMs < 1000 || sessionTtlMs > 24 * 60 * 60 * 1000 ||
      !Number.isSafeInteger(maxSessions) || maxSessions < 1 || maxSessions > 128 ||
      !Number.isSafeInteger(maxRounds) || maxRounds < 1 || maxRounds > 5000 ||
      !Number.isSafeInteger(maxActions) || maxActions < 1 || maxActions > 10000 ||
      !money(initialBalanceMinor) || initialBalanceMinor < BURN_TEST_BETS[0])
    throw new TypeError('BURN_TEST_RUNTIME_CONFIGURATION');
  const model = sampler || createBurnWildsCandidateSampler({ getEntropy: bytes => cryptoImpl.getRandomValues(bytes) });
  if (typeof model.sampleOutcome !== 'function' || typeof model.maximumPayoutMinor !== 'function')
    throw new TypeError('BURN_TEST_MODEL_REQUIRED');
  const sessions = new Map(); let createTimes = [];
  function timestamp() {
    const value = now(); if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('BURN_TEST_CLOCK');
    return value;
  }
  function record(session, event, data = {}) {
    const item = { timestamp: new Date(timestamp()).toISOString(), ...MODE,
      event, testSessionId: session.subject, ...data };
    session.logs.push(item); if (session.logs.length > 200) session.logs.shift();
    // A logging sink cannot change an accepted simulation result. Never log
    // opaque session tokens, request headers, cookies or exception text.
    try { logger(copy(item)); } catch {}
  }
  function canDouble(session) {
    return session.pendingWinMinor > 0 && session.round !== null &&
      session.doubleCount < MAX_DOUBLE && session.pendingWinMinor * 2 + session.balanceMinor <= MAX_MONEY;
  }
  function state(session) {
    return { ...MODE, subject: session.subject, testSessionId: session.subject,
      expiresAt: new Date(session.expiresAt).toISOString(), serverTime: new Date(timestamp()).toISOString(),
      canPlay: session.rounds < maxRounds && session.requests.size < maxActions &&
        session.balanceMinor + session.pendingWinMinor >= BURN_TEST_BETS[0],
      balanceMinor: session.balanceMinor, pendingWinMinor: session.pendingWinMinor,
      betLevelsMinor: [...BURN_TEST_BETS], round: copy(session.round), canDouble: canDouble(session),
      remainingRounds: maxRounds - session.rounds, remainingActions: maxActions - session.requests.size,
      modelVersion: BURN_CANDIDATE_MATH_VERSION, providerProbabilityModel: false, verifiedRtp: null,
      settlementMode: 'SIMULATION_PENDING_WIN', persistence: 'ephemeral-until-expiry-or-restart' };
  }
  function authenticateTest(request) {
    const token = request.headers.get('x-burn-test-session');
    if (!TOKEN.test(token || '')) fail('BURN_TEST_SESSION_REQUIRED', 401);
    const session = sessions.get(token); if (!session) fail('BURN_TEST_SESSION_UNKNOWN', 401);
    if (timestamp() >= session.expiresAt) { sessions.delete(token); fail('BURN_TEST_SESSION_EXPIRED', 410); }
    return session;
  }
  function createSession() {
    const at = timestamp();
    for (const [key, session] of sessions) if (at >= session.expiresAt) sessions.delete(key);
    createTimes = createTimes.filter(value => at - value < 60_000);
    if (sessions.size >= maxSessions || createTimes.length >= 12) fail('BURN_TEST_SESSION_CAPACITY', 429);
    let token;
    for (let tries = 0; tries < 4; tries++) {
      const bytes = cryptoImpl.getRandomValues(new Uint8Array(32));
      token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      if (!sessions.has(token)) break;
      token = null;
    }
    if (!token || !TOKEN.test(token)) fail('BURN_TEST_ENTROPY_UNAVAILABLE', 503);
    const session = { subject: 'bt_' + cryptoImpl.randomUUID(), expiresAt: at + sessionTtlMs,
      balanceMinor: initialBalanceMinor, pendingWinMinor: 0, round: null, rounds: 0,
      doubleCount: 0, requests: new Map(), history: [], logs: [], actionTimes: [] };
    sessions.set(token, session); createTimes.push(at);
    record(session, 'test-session-started', { initialTestBalanceMinor: initialBalanceMinor });
    return { ...MODE, testSessionToken: token, state: state(session) };
  }
  function drawCard() {
    if (cardSampler) return cardSampler();
    let index;
    for (let tries = 0; tries < 1024; tries++) {
      const bytes = cryptoImpl.getRandomValues(new Uint8Array(2));
      const value = (bytes[0] << 8) | bytes[1];
      if (value < 65_520) { index = value % 52; break; }
    }
    if (index === undefined) fail('BURN_TEST_ENTROPY_UNAVAILABLE', 503);
    const suit = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'][Math.floor(index / 13)];
    return { rank: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][index % 13],
      suit, color: ['HEARTS', 'DIAMONDS'].includes(suit) ? 'RED' : 'BLACK' };
  }
  function perform(session, operation, raw) {
    const { action, fingerprint, replayOnly } = normalizeAction(operation, raw);
    if (action.testSubject !== session.subject) fail('BURN_TEST_SESSION_SUBJECT_CHANGED', 403);
    const previous = session.requests.get(action.requestKey);
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail('BURN_TEST_IDEMPOTENCY_CONFLICT', 409);
      record(session, 'test-action-replayed', { action: action.action, requestKey: action.requestKey,
        roundId: previous.result.roundId });
      return copy(previous.result);
    }
    if (replayOnly) fail('BURN_TEST_REPLAY_NOT_FOUND', 404);
    if (session.requests.size >= maxActions) fail('BURN_TEST_ACTION_LIMIT', 429);
    const at = timestamp(), recent = session.actionTimes.filter(value => at - value < 60_000);
    if (recent.length >= 120) fail('BURN_TEST_RATE_LIMIT', 429);
    const before = { balanceMinor: session.balanceMinor, pendingWinMinor: session.pendingWinMinor };
    let balance = session.balanceMinor, pending = session.pendingWinMinor,
      round = session.round, doubleCount = session.doubleCount, rounds = session.rounds, result;
    if (operation === 'spin') {
      if (rounds >= maxRounds) fail('BURN_TEST_ROUND_LIMIT', 429);
      if (pending > 0) {
        if (action.collectRoundId !== round?.roundId) fail('BURN_TEST_PENDING_WIN_MUST_BE_COLLECTED', 409);
        balance += pending; pending = 0;
      } else if (action.collectRoundId !== null) fail('BURN_TEST_COLLECTION_CONFLICT', 409);
      if (balance < action.betMinor) fail('BURN_TEST_INSUFFICIENT_BALANCE', 402);
      // Simulated stake is reserved before the server sampler runs; all changes
      // stay in local variables until outcome validation has fully succeeded.
      balance -= action.betMinor;
      const roundId = cryptoImpl.randomUUID();
      const outcome = model.sampleOutcome({ gameId: BURN_WILDS_GAME_ID, roundId, betMinor: action.betMinor });
      round = validateBurnWildsReceipt({ ...outcome, gameId: BURN_WILDS_GAME_ID, roundId,
        clientToken: action.requestKey, betMinor: action.betMinor, balanceMinor: balance });
      auditBurnWildsPayout(round);
      if (BigInt(round.winMinor) > model.maximumPayoutMinor(BigInt(action.betMinor)))
        fail('BURN_TEST_PAYOUT_LIMIT', 503);
      pending = round.winMinor; doubleCount = 0; rounds++;
      if (!money(balance + pending)) fail('BURN_TEST_BALANCE_LIMIT', 409);
      result = { ...copy(round), ...MODE, requestKey: action.requestKey, subject: session.subject,
        balanceMinor: balance, pendingWinMinor: pending, canDouble: pending > 0 && balance + pending * 2 <= MAX_MONEY,
        modelVersion: BURN_CANDIDATE_MATH_VERSION, providerProbabilityModel: false,
        settlementMode: 'SIMULATION_PENDING_WIN', collectedRoundId: action.collectRoundId };
    } else {
      if (!round || action.roundId !== round.roundId || pending <= 0)
        fail('BURN_TEST_NO_PENDING_WIN', 409);
      if (operation === 'take') {
        const collectedMinor = pending; balance += pending; pending = 0;
        if (!money(balance)) fail('BURN_TEST_BALANCE_LIMIT', 409);
        result = { ...MODE, requestKey: action.requestKey, roundId: round.roundId, subject: session.subject,
          balanceMinor: balance, pendingWinMinor: 0, canDouble: false, collected: true, collectedMinor };
      } else {
        if (action.expectedStakeMinor !== pending) fail('BURN_TEST_PENDING_STAKE_CHANGED', 409);
        if (!canDouble(session)) fail('BURN_TEST_DOUBLE_LIMIT', 409);
        const card = drawCard();
        if (!object(card) || !['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'].includes(card.suit) ||
            !['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].includes(card.rank) ||
            card.color !== (['HEARTS', 'DIAMONDS'].includes(card.suit) ? 'RED' : 'BLACK'))
          fail('BURN_TEST_CARD_INVALID', 503);
        const stakeMinor = pending, won = action.choice === card.color;
        pending = won ? pending * 2 : 0; doubleCount++;
        result = { ...MODE, requestKey: action.requestKey, roundId: round.roundId, subject: session.subject,
          choice: action.choice, won, stakeMinor, payoutMinor: pending, card: copy(card),
          balanceMinor: balance, pendingWinMinor: pending,
          canDouble: pending > 0 && doubleCount < MAX_DOUBLE && balance + pending * 2 <= MAX_MONEY,
          doubleCount, gambleModel: 'zplay-test-fair-card-colour-v1' };
      }
    }
    // No await occurs in validation/commit: overlapping input is serialized by
    // this process and the original accepted request is stored before response.
    session.balanceMinor = balance; session.pendingWinMinor = pending;
    session.round = copy(round); session.doubleCount = doubleCount; session.rounds = rounds;
    session.actionTimes = [...recent, at];
    session.requests.set(action.requestKey, { fingerprint, result: copy(result) });
    const entry = { action: action.action, requestKey: action.requestKey, roundId: result.roundId,
      ...(operation === 'spin' ? { betMinor: action.betMinor, winMinor: result.winMinor,
        multiplier: result.multiplier, auto: action.auto } : {}),
      ...(operation === 'take' ? { collectedMinor: result.collectedMinor } : {}),
      ...(operation === 'double' ? { choice: result.choice, won: result.won,
        stakeMinor: result.stakeMinor, payoutMinor: result.payoutMinor, card: result.card } : {}),
      balanceMinor: balance, pendingWinMinor: pending };
    session.history.push({ timestamp: new Date(at).toISOString(), ...MODE, ...copy(entry) });
    if (session.history.length > 1000) session.history.shift();
    record(session, 'test-action-accepted', { ...entry, before });
    return copy(result);
  }
  return Object.freeze({
    handles: request => routes.has(new URL(request.url).pathname),
    async fetch(request) {
      const url = new URL(request.url), operation = routes.get(url.pathname);
      if (!operation) return null;
      const method = ['session', 'spin', 'take', 'double'].includes(operation) ? 'POST' : 'GET';
      if (request.method !== method) return response({ ...MODE, code: 'METHOD_NOT_ALLOWED',
        definitiveRejection: true }, 405, { allow: method });
      try {
        if (url.search) fail('BURN_TEST_QUERY_NOT_ALLOWED');
        const requestOrigin = request.headers.get('origin');
        if (method === 'POST' ? requestOrigin !== playerOrigin : requestOrigin !== null && requestOrigin !== playerOrigin)
          fail('BURN_TEST_ORIGIN_REJECTED', 403);
        if (operation === 'health') return response({ ...MODE, version: BURN_TEST_VERSION,
          status: 'ready', serverAuthoritative: true, existingService: true,
          productionWalletUsed: false, databaseUsed: false, providerProbabilityModel: false,
          verifiedRtp: null, betLevelsMinor: [...BURN_TEST_BETS],
          persistence: 'ephemeral-until-expiry-or-restart', sessionTtlMs, maxSessions, maxRounds, maxActions });
        if (operation === 'session') {
          const body = await readBody(request);
          if (body.mode !== 'SIMULATION' || Object.keys(body).some(key => key !== 'mode'))
            fail('BURN_TEST_EXPLICIT_SIMULATION_REQUIRED');
          return response(createSession(), 201);
        }
        const session = authenticateTest(request);
        if (operation === 'state') return response(state(session));
        if (operation === 'history' || operation === 'logs') return response({ ...MODE,
          subject: session.subject, expiresAt: new Date(session.expiresAt).toISOString(),
          records: copy(session[operation]),
          ...(operation === 'history' ? { history: copy(session.history) } : {}) });
        return response(perform(session, operation, await readBody(request)));
      } catch (error) {
        const known = error instanceof BurnTestError;
        return response({ ...MODE, code: known ? error.code : 'BURN_TEST_UNAVAILABLE',
          definitiveRejection: known }, known ? error.status : 503);
      }
    }
  });
}

/** Compose with the retained runtime fetch; preserve unrelated input identity. */
export function bindBurnTestFetch(existingFetch, options) {
  if (typeof existingFetch !== 'function') throw new TypeError('BURN_TEST_EXISTING_FETCH_REQUIRED');
  const runtime = createBurnTestRuntime(options);
  return function(request, ...args) {
    return runtime.handles(request) ? runtime.fetch(request) : existingFetch.call(this, request, ...args);
  };
}
