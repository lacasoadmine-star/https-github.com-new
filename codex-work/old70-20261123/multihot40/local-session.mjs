import {MH40_MODEL, minorAmount, validateBetMinor, validateLinePaths, evaluateGrid, sampleRound, secureIndex} from './model.mjs';

export const LOCAL_STORAGE_KEY = 'zplay:old70:multihot40:practice:v2';
const MAX_ROUNDS = 2048, MAX_ACTIONS = 4096;
const fail = code => { throw new Error(code); };
const clone = value => structuredClone(value);
const requestKey = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/.test(value)) fail('MH40_INVALID_REQUEST_ID');
  return value;
};
const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/;
const colors = ['RED', 'BLACK'];
const checkedChoice = value => { if (!colors.includes(value)) fail('MH40_INVALID_COLOR'); return value; };

function receiptFor(record, sessionId, paths) {
  const common = {gameId: MH40_MODEL.gameId, modelVersion: MH40_MODEL.version,
    mode: 'PRACTICE', cashEnabled: false, type: record.kind, requestId: record.requestId,
    sequence: record.sequence, balanceBeforeMinor: record.balanceBeforeMinor,
    balanceAfterMinor: record.balanceAfterMinor, pendingWinMinor: record.pendingAfterMinor};
  if (record.kind === 'spin') return {
    ...evaluateGrid({grid: record.grid, betMinor: record.betMinor, multiplier: record.multiplier, linePaths: paths}),
    ...common, roundId: sessionId + ':' + record.ordinal, ordinal: record.ordinal,
    collectedPendingMinor: record.pendingBeforeMinor
  };
  if (record.kind === 'take') return {...common, roundId: record.roundId,
    collectedMinor: record.pendingBeforeMinor};
  return {...common, roundId: record.roundId, choice: record.choice, revealed: record.revealed,
    won: record.choice === record.revealed, attempt: record.attempt,
    riskedMinor: record.pendingBeforeMinor, gambleModel: 'independent_fair_color',
    providerGambleVerified: false, maxPracticeRounds: MH40_MODEL.gamblePracticeMaxRounds};
}

/**
 * Local practice credits only. start() is the sole opening-credit action.
 * SPIN debits once and holds wins pending. TAKE or the next SPIN collects them.
 * DOUBLE risks pending practice wins only; it never debits account funds.
 * Optional storage is browser-local and must expose synchronous getItem/setItem.
 */
export function createLocalSession({
  linePaths, storage = null, key = LOCAL_STORAGE_KEY, randomValues,
  createId = () => globalThis.crypto.randomUUID(), onState, onPresentation, onObserverError
} = {}) {
  const paths = validateLinePaths(linePaths);
  if (typeof key !== 'string' || !key.startsWith(LOCAL_STORAGE_KEY) || key.length > 200) fail('MH40_UNSAFE_STORAGE_KEY');
  if (storage && (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function')) fail('MH40_INVALID_STORAGE');
  if (typeof createId !== 'function') fail('MH40_INVALID_ID_SOURCE');
  const pathIdentity = JSON.stringify(paths);
  let disposed = false, state = null;
  const ensureOpen = () => { if (disposed) fail('MH40_SESSION_DISPOSED'); };
  const observerError = error => {
    try { onObserverError?.(error); } catch { /* UI failures cannot rewrite accepted accounting. */ }
  };
  const notify = (callback, value) => {
    if (typeof callback !== 'function') return;
    try {
      const pending = callback(clone(value));
      if (pending && typeof pending.then === 'function') Promise.resolve(pending).catch(observerError);
    } catch (error) { observerError(error); }
  };
  const restore = raw => {
    let saved;
    if (typeof raw !== 'string' || raw.length > 4000000) fail('MH40_INVALID_SAVED_PRACTICE');
    try { saved = JSON.parse(raw); } catch { fail('MH40_INVALID_SAVED_PRACTICE'); }
    if (!saved || saved.schema !== 2 || saved.gameId !== MH40_MODEL.gameId ||
        saved.modelVersion !== MH40_MODEL.version || saved.linePaths !== pathIdentity ||
        !SESSION_ID.test(saved.sessionId || '') || !Array.isArray(saved.journal) ||
        saved.journal.length > MAX_ACTIONS) fail('MH40_INVALID_SAVED_PRACTICE');
    let balance = BigInt(MH40_MODEL.initialBalanceMinor), pending = 0n;
    let currentRoundId = null, rounds = 0, doubleCount = 0;
    const seen = new Set();
    for (const [index, record] of saved.journal.entries()) {
      requestKey(record?.requestId);
      if (seen.has(record.requestId) || record.sequence !== index + 1 ||
          record.balanceBeforeMinor !== String(balance) ||
          record.pendingBeforeMinor !== String(pending)) fail('MH40_INVALID_SAVED_PRACTICE');
      seen.add(record.requestId);
      if (record.kind === 'spin') {
        const bet = validateBetMinor(record.betMinor);
        if (bet > balance + pending || record.ordinal !== rounds + 1 || rounds >= MAX_ROUNDS)
          fail('MH40_INVALID_SAVED_PRACTICE');
        const evaluated = evaluateGrid({...record, linePaths: paths});
        balance = balance + pending - bet;
        pending = BigInt(evaluated.winMinor);
        rounds++;
        currentRoundId = saved.sessionId + ':' + rounds;
        doubleCount = 0;
      } else if (record.kind === 'take') {
        if (pending === 0n || record.roundId !== currentRoundId) fail('MH40_INVALID_SAVED_PRACTICE');
        balance += pending;
        pending = 0n;
        doubleCount = 0;
      } else if (record.kind === 'double') {
        if (pending === 0n || record.roundId !== currentRoundId ||
            doubleCount >= MH40_MODEL.gamblePracticeMaxRounds ||
            record.attempt !== doubleCount + 1) fail('MH40_INVALID_SAVED_PRACTICE');
        checkedChoice(record.choice); checkedChoice(record.revealed);
        pending = record.choice === record.revealed ? pending * 2n : 0n;
        doubleCount++;
      } else fail('MH40_INVALID_SAVED_PRACTICE');
      minorAmount(balance); minorAmount(pending);
      if (record.balanceAfterMinor !== String(balance) ||
          record.pendingAfterMinor !== String(pending)) fail('MH40_INVALID_SAVED_PRACTICE');
    }
    if (saved.balanceMinor !== String(balance) || saved.pendingWinMinor !== String(pending) ||
        saved.roundCount !== rounds || saved.doubleCount !== doubleCount ||
        saved.currentRoundId !== currentRoundId ||
        saved.pendingRequestId !== null &&
        (saved.journal.at(-1)?.kind !== 'spin' ||
          saved.pendingRequestId !== saved.journal.at(-1)?.requestId)) fail('MH40_INVALID_SAVED_PRACTICE');
    return saved;
  };
  if (storage) {
    let raw;
    try { raw = storage.getItem(key); } catch { fail('MH40_PRACTICE_STORAGE_UNAVAILABLE'); }
    if (raw !== null && raw !== undefined) state = restore(raw);
  }
  const persist = next => {
    if (storage) {
      try { storage.setItem(key, JSON.stringify(next)); } catch { fail('MH40_PRACTICE_STORAGE_UNAVAILABLE'); }
    }
    state = next;
  };
  const snapshot = () => {
    const latest = state?.journal.findLast(record => record.kind === 'spin');
    const last = state?.journal.at(-1);
    return {
      gameId: MH40_MODEL.gameId, modelVersion: MH40_MODEL.version,
      mode: 'PRACTICE', cashEnabled: false, storageScope: 'browser_local_only',
      started: !!state, phase: !state ? 'not-started' : state.pendingRequestId ? 'presenting' : 'ready',
      sessionId: state?.sessionId ?? null, balanceMinor: state?.balanceMinor ?? null,
      pendingWinMinor: state?.pendingWinMinor ?? '0', roundCount: state?.roundCount ?? 0,
      actionCount: state?.journal.length ?? 0, doubleCount: state?.doubleCount ?? 0,
      maxPracticeDoubleRounds: MH40_MODEL.gamblePracticeMaxRounds,
      pendingRequestId: state?.pendingRequestId ?? null,
      pendingRoundId: state && state.pendingWinMinor !== '0' ? state.currentRoundId : null,
      round: latest ? receiptFor(latest, state.sessionId, paths) : null,
      lastAction: last ? receiptFor(last, state.sessionId, paths) : null,
      betLevelsMinor: [...MH40_MODEL.betLevelsMinor], providerRtpVerified: false,
      providerGambleVerified: false
    };
  };
  const emitState = () => notify(onState, snapshot());
  const start = () => {
    ensureOpen();
    if (state) return snapshot();
    const sessionId = createId();
    if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) fail('MH40_INVALID_SESSION_ID');
    persist({schema: 2, gameId: MH40_MODEL.gameId, modelVersion: MH40_MODEL.version,
      linePaths: pathIdentity, sessionId, balanceMinor: MH40_MODEL.initialBalanceMinor,
      pendingWinMinor: '0', currentRoundId: null, roundCount: 0, doubleCount: 0,
      pendingRequestId: null, journal: []});
    emitState();
    return snapshot();
  };
  const recover = id => {
    ensureOpen();
    requestKey(id);
    const record = state?.journal.find(item => item.requestId === id);
    if (!record) fail('MH40_UNKNOWN_REQUEST');
    return clone(receiptFor(record, state.sessionId, paths));
  };
  const previousAction = (id, kind) => {
    ensureOpen();
    if (!state) fail('MH40_EXPLICIT_START_REQUIRED');
    requestKey(id);
    const prior = state.journal.find(record => record.requestId === id);
    if (prior && prior.kind !== kind) fail('MH40_REQUEST_ID_CONFLICT');
    return prior;
  };
  const readyForNewAction = () => {
    if (state.pendingRequestId) fail('MH40_PRESENTATION_IN_PROGRESS');
    if (state.journal.length >= MAX_ACTIONS) fail('MH40_PRACTICE_SESSION_LIMIT');
  };
  const accept = (record, updates) => {
    persist({...state, ...updates, journal: [...state.journal, record]});
    const receipt = receiptFor(record, state.sessionId, paths);
    emitState();
    notify(onPresentation, {type: record.kind, round: receipt});
    return clone(receipt);
  };
  const spin = ({requestId, betMinor} = {}) => {
    const prior = previousAction(requestId, 'spin'), bet = validateBetMinor(betMinor);
    if (prior) {
      if (prior.betMinor !== String(bet)) fail('MH40_REQUEST_ID_CONFLICT');
      return recover(requestId);
    }
    readyForNewAction();
    if (state.roundCount >= MAX_ROUNDS) fail('MH40_PRACTICE_SESSION_LIMIT');
    const available = BigInt(state.balanceMinor) + BigInt(state.pendingWinMinor);
    if (bet > available) fail('MH40_INSUFFICIENT_PRACTICE_CREDITS');
    const result = sampleRound({betMinor: String(bet), linePaths: paths, randomValues});
    const after = available - bet;
    const record = {kind: 'spin', requestId, sequence: state.journal.length + 1,
      ordinal: state.roundCount + 1, betMinor: String(bet), grid: result.grid, multiplier: result.multiplier,
      balanceBeforeMinor: state.balanceMinor, balanceAfterMinor: String(after),
      pendingBeforeMinor: state.pendingWinMinor, pendingAfterMinor: result.winMinor};
    return accept(record, {balanceMinor: String(after), pendingWinMinor: result.winMinor,
      roundCount: record.ordinal, doubleCount: 0, currentRoundId: state.sessionId + ':' + record.ordinal,
      pendingRequestId: requestId});
  };
  const take = ({requestId} = {}) => {
    const prior = previousAction(requestId, 'take');
    if (prior) return recover(requestId);
    readyForNewAction();
    if (state.pendingWinMinor === '0') fail('MH40_NO_PENDING_WIN');
    const after = BigInt(state.balanceMinor) + BigInt(state.pendingWinMinor);
    minorAmount(after);
    const record = {kind: 'take', requestId, sequence: state.journal.length + 1,
      roundId: state.currentRoundId, balanceBeforeMinor: state.balanceMinor,
      balanceAfterMinor: String(after), pendingBeforeMinor: state.pendingWinMinor, pendingAfterMinor: '0'};
    return accept(record, {balanceMinor: String(after), pendingWinMinor: '0', doubleCount: 0});
  };
  const double = ({requestId, choice} = {}) => {
    const prior = previousAction(requestId, 'double');
    checkedChoice(choice);
    if (prior) {
      if (prior.choice !== choice) fail('MH40_REQUEST_ID_CONFLICT');
      return recover(requestId);
    }
    readyForNewAction();
    if (state.pendingWinMinor === '0') fail('MH40_NO_PENDING_WIN');
    if (state.doubleCount >= MH40_MODEL.gamblePracticeMaxRounds) fail('MH40_PRACTICE_DOUBLE_LIMIT');
    const revealed = colors[secureIndex(2, randomValues)];
    const pending = choice === revealed ? BigInt(state.pendingWinMinor) * 2n : 0n;
    minorAmount(pending);
    const record = {kind: 'double', requestId, sequence: state.journal.length + 1,
      roundId: state.currentRoundId, choice, revealed, attempt: state.doubleCount + 1,
      balanceBeforeMinor: state.balanceMinor, balanceAfterMinor: state.balanceMinor,
      pendingBeforeMinor: state.pendingWinMinor, pendingAfterMinor: String(pending)};
    return accept(record, {pendingWinMinor: String(pending), doubleCount: record.attempt});
  };
  const finishPresentation = id => {
    ensureOpen();
    requestKey(id);
    if (!state || !state.journal.some(record => record.requestId === id && record.kind === 'spin')) fail('MH40_UNKNOWN_REQUEST');
    if (state.pendingRequestId && state.pendingRequestId !== id) fail('MH40_PRESENTATION_ID_MISMATCH');
    if (state.pendingRequestId) {
      persist({...state, pendingRequestId: null});
      emitState();
    }
    return snapshot();
  };
  const stop = () => {
    ensureOpen();
    if (!state?.pendingRequestId) return false;
    notify(onPresentation, {type: 'stop', round: recover(state.pendingRequestId)});
    return true;
  };
  const actionHistory = () => state ? state.journal.map(record => receiptFor(record, state.sessionId, paths)) : [];
  const history = () => actionHistory().filter(receipt => receipt.type === 'spin');
  return Object.freeze({start, spin, take, double, recover, snapshot, finishPresentation, stop, history, actionHistory,
    dispose() { disposed = true; }});
}
