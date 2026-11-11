import * as officialMath from '../math/official72.mjs';

// This adapter owns game state only. LibraryService retains every financial
// operation, its request receipts, model-version dispatch and reserve wallets.
export const BRIDGE_VERSION = 'library74-v1';
export const LIBRARY74_MIN_STAKE_MINOR = '100';
export const LIBRARY74_TEST_PRESETS_MINOR = Array.from({length:20}, (_,i) => String((i+1)*100));
const MINOR = /^(0|[1-9][0-9]*)$/;
const ID = /^ind74_official_[a-z0-9_]{1,48}$/;
const FAMILIES = new Set(['slots', 'crash', 'ladder', 'mines', 'wheel', 'plinko', 'dice']);
// Match the retained LibraryService's 15-digit minor-unit contract.
const MAX_MINOR = 999999999999999n;
const PUBLIC_FIELDS = ['rows', 'cols', 'cells', 'mines', 'minMatch', 'cascadeMs', 'crashMechanic', 'cascadeRules', 'maxPicks', 'maxSteps', 'modes', 'defaultMode', 'minTarget', 'maxTarget', 'defaultTarget', 'maxMultiplierBps', 'maximumMultiplierBps', 'growthBpsPerSecond', 'multiplierValues', 'multipliersBps', 'bucketMultipliersBps', 'bucketTablesBps', 'observedPegboard', 'implementedBallMultiplier', 'wildSymbol', 'wildRule', 'ballMultipliers', 'ballSelectionModel', 'betFields', 'displayWheelSymbolIndexes', 'bonusDisplaySymbolIndexes', 'bonusPrizes', 'destinyBonus', 'defaultBetSymbolIndex', 'defaultRisk', 'riskLevels', 'ballAmounts', 'defaultBallAmount', 'minBallStakeMinor', 'ballStakeStepMinor', 'batchTotalStake', 'baseGameMultiplier', 'respinFeature', 'coinSymbol', 'plusRespinSymbol', 'coinFeature', 'slotMechanic', 'tumbleFeature', 'scatterSymbol', 'magicSymbol', 'multiplierSymbol', 'chargingFeature', 'jungleFeature', 'bookFeature', 'bookSymbol', 'collectorSymbols', 'mariachiFeature', 'releaseReview', 'symbolPrizeDivisor'];
const ROUND_FIELDS = ['bets', 'gameId', 'mathVersion', 'family', 'betMinor', 'winMinor', 'step', 'multiplierBps', 'maxSteps', 'history', 'nextMultiplierBps', 'collectibleMinor', 'revealedCells', 'path', 'cells', 'rows', 'cols', 'mines', 'mode', 'startedAt', 'serverNow', 'growthBpsPerSecond', 'maxMultiplierBps', 'pendingResolution', 'pendingWinMinor', 'gambleHistory', 'gambleRounds', 'maxGambleRounds', 'holdWin', 'ballMultiplier', 'baseBetMinor', 'totalBetMinor', 'costBps', 'ante', 'carryBucket', 'carryBefore', 'carryAfter', 'risk', 'ballAmount', 'perBallBetMinor', 'crashMechanic', 'cascadeIndex', 'nextCascadeAt', 'grid', 'matchedPositions', 'matchedSymbols'];
const clone = value => structuredClone(value);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function fail(code, status = 422) { throw Object.assign(new Error(code), { code, status }); }
function integerMoney(value, code = 'INVALID_ENGINE_MONEY') {
  if (typeof value !== 'string' || !MINOR.test(value) || BigInt(value) > MAX_MINOR) fail(code, 500);
  return BigInt(value);
}
function clock(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail('INVALID_SERVER_TIME', 500);
  return value;
}
function connectionLease(definition) {
  const policy=definition.connectionPolicy;
  if(policy===undefined)return null;
  if(definition.id!=='ind74_official_chickenhighway'||definition.family!=='ladder'||policy.kind!=='authenticated-presence-lease'||
      policy.heartbeatAction!=='sync'||policy.heartbeatIntervalMs!==2000||policy.disconnectAfterMs!==8000||policy.timeoutComparison!=='strictly-greater'||policy.stateReadsRenew!==false)fail('INVALID_SERVER_CONNECTION_POLICY',500);
  return policy;
}
export function minorToMoney(value) {
  const n = integerMoney(value); return `${n / 100n}.${String(n % 100n).padStart(2, '0')}`;
}

// The retained service supplies a deterministic 53-bit HMAC draw in [0,1).
// Rejection sampling avoids modulo bias when converting to the math modules'
// bounded integer RNG contract. Never fall back to a browser/client seed.
export function integerRngFromLibrary(random) {
  if (typeof random !== 'function') fail('SERVER_RANDOM_REQUIRED', 500);
  const range = 2 ** 53;
  return bound => {
    if (!Number.isSafeInteger(bound) || bound < 1) fail('INVALID_RNG_BOUND', 500);
    const limit = Math.floor(range / bound) * bound;
    for (let attempt = 0; attempt < 1024; attempt++) {
      const unit = random();
      if (typeof unit !== 'number' || !Number.isFinite(unit) || unit < 0 || unit >= 1) fail('INVALID_SERVER_RANDOM', 500);
      const sample = Math.floor(unit * range);
      if (sample < limit) return sample % bound;
    }
    fail('SERVER_RANDOM_REJECTION_LIMIT', 500);
  };
}

function publishedTable(value) {
  if (Array.isArray(value)) return value.map(publishedTable);
  if (!plain(value)) return clone(value);
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/weight|probability|survival|private|secret|seed|ticket|returnBps/i.test(key))
    .map(([key, item]) => [key, publishedTable(item)]));
}

function effectiveLimits(definition, policy) {
  const limits = Object.fromEntries(['minBetMinor', 'maxBetMinor', 'betStepMinor', 'maxWinMinor'].map(key => {
    integerMoney(definition.limits?.[key]); return [key, definition.limits[key]];
  }));
  limits.minBetMinor = LIBRARY74_MIN_STAKE_MINOR;
  limits.testPresetsMinor = [...LIBRARY74_TEST_PRESETS_MINOR];
  limits.policy = 'server-game-policy-and-retained-account-house-reserve';
  if (!policy) return {...limits, maxBetMinor:null, maxWinMinor:null};
  if (!plain(policy)) fail('INVALID_LIBRARY74_BET_POLICY', 500);
  for (const key of ['maxBetMinor','maxWinMinor']) {
    integerMoney(policy[key], 'INVALID_LIBRARY74_BET_POLICY');
    if (BigInt(policy[key]) <= 0n) fail('INVALID_LIBRARY74_BET_POLICY', 500);
    if (BigInt(policy[key]) < BigInt(limits[key])) limits[key] = policy[key];
  }
  // Charging carry can increase its exact round liability beyond the fresh
  // bucket multiplier. The configured money ceiling still applies, while the
  // math module computes the actual reserve from the trusted persisted carry.
  if (definition.chargingFeature?.dynamicPayoutBound !== true) {
    const possible = BigInt(limits.maxBetMinor) * BigInt(definition.maximumMultiplierBps) / 10000n;
    if (possible < BigInt(limits.maxWinMinor)) limits.maxWinMinor = possible.toString();
  }
  if (BigInt(limits.minBetMinor) > BigInt(limits.maxBetMinor) || BigInt(limits.betStepMinor) === 0n) fail('INVALID_LIBRARY74_BET_POLICY', 500);
  return limits;
}

function acceptedStartStake(definition, value, policy) {
  if (typeof value !== 'string' || value.length > 15 || !MINOR.test(value)) fail('INVALID_BET');
  if (!policy) fail('BET_LIMITS_UNVERIFIED', 503);
  const amount = BigInt(value), limits = effectiveLimits(definition, policy);
  if (amount < BigInt(limits.minBetMinor) || amount > BigInt(limits.maxBetMinor) || amount % BigInt(limits.betStepMinor) !== 0n) fail('INVALID_BET');
  return limits;
}

export function publicLibrary74Definition(definition, { accepting = false, policy = null } = {}) {
  if (!definition || !ID.test(definition.id) || !FAMILIES.has(definition.family) || typeof definition.mathVersion !== 'string') fail('INVALID_LIBRARY74_DEFINITION', 500);
  const version = `${BRIDGE_VERSION}:${definition.mathVersion}`;
  if (version.length > 100) fail('INVALID_LIBRARY74_VERSION', 500);
  const limits = effectiveLimits(definition, policy);
  const lease=connectionLease(definition);
  const view = {
    id: definition.id, title: definition.title, name: definition.catalogName,
    catalogName: definition.catalogName, family: definition.family, sourceCategory: definition.sourceCategory,
    version, mathVersion: definition.mathVersion, currency: 'ETB', limits,
    minStake: minorToMoney(limits.minBetMinor), maxStake: limits.maxBetMinor === null ? null : minorToMoney(limits.maxBetMinor), betStep: minorToMoney(limits.betStepMinor),
    independentModel: true, providerPrivateMathVerified: false, completeReferenceParityVerified: false,
    modelDisclosure: { providerPrivateMathVerified: false, completeReferenceParityVerified: false, outcomeAuthority: 'server-owned round state and bounded integer RNG', clientPayoutAccepted: false, returnIsIndependent: true },
    launchable: accepting === true && policy !== null, accepting: accepting === true && policy !== null,
    controls: { actions: ['crash', 'ladder', 'mines'].includes(definition.family) ? ['reveal', 'collect', ...(definition.family === 'crash' ? ['sync'] : [])] : definition.gamble?.enabled ? ['gamble', 'collect'] : [] },
    expiryPolicy: definition.family === 'crash' ? 'server_terminal_result' : 'collect_earned_award_or_return_unplayed_stake',
  };
  if(lease){
    view.connectionPolicy=publishedTable(lease);
    view.controls.actions.push('sync');
    view.expiryPolicy='collect_confirmed_award_after_presence_lease_timeout';
  }
  for (const key of PUBLIC_FIELDS) if (definition[key] !== undefined) view[key] = publishedTable(definition[key]);
  if (definition.theme) view.theme = publishedTable(definition.theme);
  if (definition.layout) view.layout = publishedTable(definition.layout);
  if (definition.rules) view.rules = definition.rules.filter(rule => typeof rule === 'string');
  if (definition.gamble) view.gamble = publishedTable(definition.gamble);
  if (definition.ballSelection) view.ballTypes = definition.ballSelection.map(({ type, multiplier }) => ({ type, multiplier }));
  if (definition.symbols) view.symbols = definition.symbols.map(({ id, label, glyph, pays }) => ({ id, label, glyph, pays: clone(pays) }));
  // A ways game enumerates row combinations internally; do not publish that
  // implementation as a provider fixed-payline chart.
  if (definition.ways) view.ways = definition.ways;
  else if (definition.paylines) view.paylines = clone(definition.paylines);
  if (definition.sectors) view.sectors = definition.sectors.map(({ id, label, multiplierBps }) => ({ id, label, multiplierBps }));
  if (definition.paytable) view.paytable = publishedTable(definition.paytable);
  return view;
}

export function publicLibrary74Definitions({ math = officialMath } = {}) {
  return math.listGameDefinitions().map(definition => publicLibrary74Definition(definition));
}

function mathOperation(operation) {
  try { return operation(); }
  catch (error) {
    if (Number.isInteger(error?.status)) throw error;
    const code = typeof error?.code === 'string' ? error.code : 'LIBRARY74_ENGINE_FAILURE';
    if(code==='UNVERIFIED_BONUS')fail(code,503);
    if (/^(?:INVALID_(?:BET|MODE|CELL|TARGET|OPTIONS|BALL_AMOUNT|BALL_STAKE|WHEEL_BETS)|UNVERIFIED_RISK)$/.test(code)) fail(code, 422);
    if (['ROUND_FINISHED', 'NO_PROGRESS'].includes(code)) fail(code, 409);
    fail(code, 500);
  }
}

export function createExistingLibrary74Adapter({ math = officialMath, reviewedGameIds = [], allowNewRounds = false, gameLimits = {}, activeTtlMs = 15 * 60 * 1000, getStartContext = null } = {}) {
  if (['listGameDefinitions', 'getGameDefinition', 'startRound', 'advanceRound', 'collectRound', 'publicRound', 'reconcileRound', 'maximumPayoutMinor'].some(key => typeof math[key] !== 'function')) throw new TypeError('The complete official72 server math contract is required.');
  if (!Number.isSafeInteger(activeTtlMs) || activeTtlMs < 1000 || activeTtlMs > 86400000) throw new TypeError('Use a reviewed active-round timeout from one second through one day.');
  if (typeof allowNewRounds !== 'boolean' && typeof allowNewRounds !== 'function') throw new TypeError('New-round readiness must be a boolean or a function.');
  if (getStartContext !== null && typeof getStartContext !== 'function') throw new TypeError('Trusted start context must be a server function.');
  const source = math.listGameDefinitions();
  const originals = new Map(source.map(definition => {
    publicLibrary74Definition(definition); return [definition.id, clone(definition)];
  }));
  if (originals.size !== source.length) throw new TypeError('Duplicate official catalogue game IDs.');
  if (!Array.isArray(reviewedGameIds) || new Set(reviewedGameIds).size !== reviewedGameIds.length || reviewedGameIds.some(id => !originals.has(id))) throw new TypeError('Reviewed game IDs must be distinct members of this adapter.');
  const reviewed = new Set(reviewedGameIds);
  if (!plain(gameLimits) && typeof gameLimits !== 'function') throw new TypeError('Server game limits must be an ID map or a server resolver.');
  const policyFor = id => typeof gameLimits === 'function' ? gameLimits(id) : gameLimits[id];
  const enabled = id => Boolean(policyFor(id)) && reviewed.has(id) && (typeof allowNewRounds === 'function' ? allowNewRounds(id) === true : allowNewRounds === true);
  const definition = id => { const result = originals.get(id); if (!result) fail('GAME_MODEL_UNAVAILABLE', 409); return result; };
  const checked = state => {
    if (!plain(state) || state.bridgeVersion !== BRIDGE_VERSION || !plain(state.mathState)) fail('INVALID_LIBRARY74_STATE', 500);
    const d = definition(state.gameId);
    if (state.mathState.gameId !== d.id || state.mathState.mathVersion !== d.mathVersion || state.modelVersion !== `${BRIDGE_VERSION}:${d.mathVersion}` || state.mathState.betMinor !== state.stakeMinor || state.family !== d.family) fail('INVALID_LIBRARY74_STATE', 500);
    integerMoney(state.stakeMinor); integerMoney(state.maximumPayoutMinor); clock(state.expiresAt); clock(state.lastActionAt);
    const lease=connectionLease(d);
    if(lease&&state.status==='active'&&state.expiresAt!==state.lastActionAt+lease.disconnectAfterMs+1)fail('INVALID_LIBRARY74_STATE',500);
    if (!['active', 'settled'].includes(state.status) || (state.status === 'active') !== (state.mathState.status === 'active')) fail('INVALID_LIBRARY74_STATE', 500);
    if (state.mathState.pendingWinMinor !== undefined && integerMoney(state.mathState.pendingWinMinor) > BigInt(state.maximumPayoutMinor)) fail('PAYOUT_EXCEEDS_RESERVED_LIABILITY', 500);
    if (state.status === 'settled' && (state.payoutMinor !== (state.mathState.status === 'collected' ? state.mathState.winMinor : '0') || integerMoney(state.payoutMinor) > BigInt(state.maximumPayoutMinor))) fail('INVALID_LIBRARY74_STATE', 500);
    return d;
  };
  function deadline(d, round, now) {
    if (round.status !== 'active') return now;
    const lease=connectionLease(d);
    if(lease)return clock(now+lease.disconnectAfterMs+1);
    if (d.family !== 'crash') {
      const heldSlot = d.family === 'slots' && d.gamble?.enabled === true && Number.isSafeInteger(d.gamble.maxRounds) && d.gamble.maxRounds > 0 && round.holdWin === true && integerMoney(round.pendingWinMinor) > 0n;
      if (!['ladder', 'mines'].includes(d.family) && !heldSlot) fail('UNREVIEWED_ACTIVE_FAMILY', 500);
      return clock(now + activeTtlMs);
    }
    if (d.crashMechanic === 'cascade') return clock(round.private?.terminalAt);
    const bust = round.private?.bustMultiplierBps;
    if (!Number.isSafeInteger(bust) || !Number.isSafeInteger(d.growthBpsPerSecond) || d.growthBpsPerSecond <= 0 || !Number.isSafeInteger(d.maxMultiplierBps)) fail('INVALID_CRASH_TERMINAL', 500);
    const target = Math.min(bust, d.maxMultiplierBps);
    const duration = (BigInt(target - 10000) * 1000n + BigInt(d.growthBpsPerSecond) - 1n) / BigInt(d.growthBpsPerSecond);
    return clock(round.startedAt + Number(duration));
  }
  function result(d, round, { previous, maximum, debit, now, reason } = {}) {
    if (!plain(round) || round.gameId !== d.id || round.mathVersion !== d.mathVersion || !['active', 'lost', 'collected'].includes(round.status)) fail('INVALID_ENGINE_RESULT', 500);
    integerMoney(round.betMinor); const award = integerMoney(round.winMinor);
    const bound = integerMoney(maximum);
    if (award > bound || (previous && (round.betMinor !== previous.stakeMinor || maximum !== previous.maximumPayoutMinor))) fail('PAYOUT_EXCEEDS_RESERVED_LIABILITY', 500);
    if (round.pendingWinMinor !== undefined && integerMoney(round.pendingWinMinor) > bound) fail('PAYOUT_EXCEEDS_RESERVED_LIABILITY', 500);
    const settled = round.status !== 'active';
    const payoutMinor = settled ? (round.status === 'collected' ? round.winMinor : '0') : null;
    const state = {
      bridgeVersion: BRIDGE_VERSION, gameId: d.id, modelVersion: `${BRIDGE_VERSION}:${d.mathVersion}`, family: d.family,
      stakeMinor: round.betMinor, maximumPayoutMinor: maximum, status: settled ? 'settled' : 'active',
      expiresAt: settled ? now : connectionLease(d) ? deadline(d, round, now) : previous?.expiresAt ?? deadline(d, round, now), lastActionAt: now,
      mathState: clone(round), ...(settled ? { payoutMinor } : {}), ...(reason ? { settlementReason: reason } : {}),
    };
    if (!settled && state.expiresAt <= now) fail('INVALID_ACTIVE_ENGINE_STATE', 500);
    return { state, debitMinor: debit, maxPayoutMinor: maximum, payoutMinor };
  }
  function expire(state, _random, at) {
    const d = checked(state), now = clock(at);
    if (state.status !== 'active') fail('ROUND_ALREADY_SETTLED', 409);
    if (now < state.expiresAt || now < state.lastActionAt) fail('ROUND_NOT_EXPIRED', 409);
    let round = clone(state.mathState), reason;
    if (d.family === 'crash') {
      round = mathOperation(() => math.reconcileRound(round, now));
      if (round.status === 'active') fail('CRASH_TERMINAL_NOT_SETTLED', 500);
      reason = 'SERVER_CRASH_TERMINAL';
    } else if (d.family === 'slots' && d.gamble?.enabled === true && integerMoney(round.pendingWinMinor) > 0n || round.step > 0) {
      round = mathOperation(() => math.collectRound(round, {}, now));
      reason = connectionLease(d)?'CONNECTION_TIMEOUT_CASHOUT':'EXPIRED_EARNED_AWARD';
    } else {
      // No reveal or other risk action occurred; release the accepted stake.
      // This refund is a real, balanced settlement through LibraryService.
      if (d.family !== 'mines' || round.history?.length) fail('UNREVIEWED_EXPIRY_POLICY', 500);
      if (BigInt(round.betMinor) > BigInt(state.maximumPayoutMinor)) fail('PAYOUT_EXCEEDS_RESERVED_LIABILITY', 500);
      round = { ...round, status: 'collected', winMinor: round.betMinor, multiplierBps: 10000 };
      reason = 'EXPIRED_UNPLAYED_STAKE_RETURN';
    }
    return result(d, round, { previous: state, maximum: state.maximumPayoutMinor, debit: '0', now, reason });
  }
  const adapter = {
    get definitions() { return Object.fromEntries([...originals].map(([id, d]) => [id, publicLibrary74Definition(d, { accepting: enabled(id), policy: policyFor(id) })])); },
    has: id => originals.has(id),
    start(gameId, options, random, at) {
      const d = definition(gameId), now = clock(at);
      if (!enabled(gameId)) fail('INDEPENDENT74_NEW_ROUNDS_DISABLED', 503);
      if (!plain(options) || typeof options.stakeMinor !== 'string') fail('INVALID_LIBRARY_OPTIONS');
      const { stakeMinor, ...gameOptions } = options;
      // This admission boundary is independent of the retained financial
      // service or injected math module's potentially broader stake allowance.
      // Accepted-round actions and recovery do not apply this new-stake gate.
      const limits = acceptedStartStake(d, stakeMinor, policyFor(gameId));
      // Context is supplied by the initialized service integration while its
      // existing account transaction is held. It is never copied from options.
      const serverContext = getStartContext ? getStartContext({ gameId, modelVersion: `${BRIDGE_VERSION}:${d.mathVersion}`, stakeMinor, options: clone(gameOptions) }) : undefined;
      if (serverContext && typeof serverContext.then === 'function') fail('SYNCHRONOUS_TRUSTED_START_CONTEXT_REQUIRED', 500);
      const maximum = mathOperation(() => math.maximumPayoutMinor({ gameId, betMinor: stakeMinor, options: gameOptions, context: serverContext }));
      integerMoney(maximum);
      if (BigInt(maximum) > BigInt(limits.maxWinMinor)) fail('PAYOUT_LIMIT_EXCEEDED', 422);
      const round = mathOperation(() => math.startRound({ gameId, betMinor: stakeMinor, options: gameOptions, rng: integerRngFromLibrary(random), now, context: serverContext }));
      if (round.status === 'active' && d.family === 'mines' && BigInt(maximum) < BigInt(stakeMinor)) fail('UNPLAYED_REFUND_NOT_RESERVED', 500);
      return result(d, round, { maximum, debit: stakeMinor, now });
    },
    act(state, input, random, at) {
      const d = checked(state), now = clock(at);
      if (state.status !== 'active') fail('ROUND_ALREADY_SETTLED', 409);
      if (now < state.lastActionAt) fail('INVALID_SERVER_TIME', 500);
      if (now >= state.expiresAt) return expire(state, random, now);
      if (!plain(input) || !['reveal', 'collect', 'sync', 'gamble'].includes(input.type)) fail('INVALID_LIBRARY_ACTION');
      const { type, ...options } = input;
      const allowed = type === 'reveal' && ['mines', 'ladder'].includes(d.family) ? ['cell'] : type === 'gamble' && d.family === 'slots' && d.gamble?.enabled === true ? ['color'] : [];
      if (Object.keys(options).some(key => !allowed.includes(key)) || type === 'sync' && d.family !== 'crash' && !connectionLease(d) || type === 'gamble' && (d.family !== 'slots' || d.gamble?.enabled !== true) || type === 'reveal' && d.family === 'slots') fail('INVALID_LIBRARY_OPTIONS');
      const previousRound = clone(state.mathState);
      const round = mathOperation(() => type === 'collect' ? math.collectRound(previousRound, options, now) : type === 'sync' ? math.reconcileRound(previousRound, now) : math.advanceRound(previousRound, options, now, integerRngFromLibrary(random)));
      return result(d, round, { previous: state, maximum: state.maximumPayoutMinor, debit: '0', now });
    },
    publicState(state, at) {
      const d = checked(state), now = clock(at);
      const publicRound = mathOperation(() => math.publicRound(clone(state.mathState), Math.max(now, state.lastActionAt)));
      const view = Object.fromEntries(ROUND_FIELDS.filter(key => publicRound[key] !== undefined).map(key => [key, publishedTable(publicRound[key])]));
      view.family = d.family; view.status = state.status; view.resultStatus = state.mathState.status;
      view.stakeMinor = state.stakeMinor;
      const actions = state.status === 'active' ? publicRound.allowedActions || [] : [];
      view.allowedActions = actions.filter(action => ['reveal', 'collect', 'gamble'].includes(action));
      if(state.status==='active'&&connectionLease(d)){
        view.allowedActions.push('sync');
        view.connectionDeadlineAt=state.expiresAt;
        view.lastContactAt=state.lastActionAt;
        view.serverNow=now;
      }
      view.actions = [...view.allowedActions, ...(state.status === 'active' && d.family === 'crash' ? ['sync'] : [])];
      if (state.status === 'settled') {
        view.payoutMinor = state.payoutMinor;
        if (publicRound.outcome !== undefined) view.outcome = publishedTable(publicRound.outcome);
        if (publicRound.mineCells !== undefined) view.mineCells = clone(publicRound.mineCells);
        if (publicRound.bustMultiplierBps !== undefined) view.bustMultiplierBps = publicRound.bustMultiplierBps;
        if (state.settlementReason) view.settlementReason = state.settlementReason;
      } else {
        if (d.family !== 'crash') view.expiresAt = state.expiresAt;
        // A held slot win and a current cascade have already revealed their
        // visible grid. Future draws/grids and active mine maps remain private.
        if ((d.family === 'slots' || d.crashMechanic === 'cascade') && publicRound.outcome !== undefined) view.outcome = publishedTable(publicRound.outcome);
      }
      // Never include the wrapper's mathState, private outcomes, RNG seed, or
      // the private crash expiry timestamp while a wager remains active.
      return view;
    },
    expire,
  };
  return adapter;
}

export function composeExistingLibrary74Registry(existing, adapter) {
  if (typeof existing?.get !== 'function' || typeof existing?.definitions !== 'function' || typeof adapter?.start !== 'function') throw new TypeError('The retained registry and the new game adapter are required.');
  const ids = new Set(Object.keys(adapter.definitions));
  for (const id of ids) {
    let prior;
    try { prior = existing.get(id, adapter.definitions[id].version); }
    catch (error) {
      if (error?.message !== 'GAME_MODEL_UNAVAILABLE' && error?.code !== 'GAME_MODEL_UNAVAILABLE') throw error;
    }
    // Replacing an evaluator while retaining its version would change the
    // rules of accepted rounds. A revised model must have a new version.
    if (prior) throw new Error('DUPLICATE_LIBRARY74_MODEL');
  }
  // Delegate unknown versions to the previous registry, including earlier
  // independent74 adapters: accepted rounds always retain their evaluator.
  return {
    ...existing,
    definitions: () => ({ ...existing.definitions(), ...adapter.definitions }),
    get(id, version) {
      if (!ids.has(id)) return existing.get(id, version);
      const definition = adapter.definitions[id];
      if (version !== undefined && version !== definition.version) return existing.get(id, version);
      return { id, version: definition.version, definition, adapter };
    },
  };
}
