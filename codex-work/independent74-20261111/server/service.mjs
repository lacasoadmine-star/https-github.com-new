import * as defaultMath from '../math/index.mjs';
import { canonicalJson, sha256 } from './auth.mjs';
import { ServiceError, fail } from './errors.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MINOR = /^(0|[1-9][0-9]*)$/;
const OWN_KEYS = new Set(['request_id', 'game_id', 'type', 'stake_minor', 'round_id', 'expected_version', 'options']);
function validId(value) { return typeof value === 'string' && UUID.test(value); }
function cleanOptions(options, allowed) {
  if (options === undefined) return {};
  if (!options || Array.isArray(options) || typeof options !== 'object' || Object.keys(options).some(key => !allowed.includes(key))) fail('INVALID_OPTIONS', 'Invalid game options.', 422);
  return options;
}

export function validateAction(input) {
  if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(key => !OWN_KEYS.has(key))) fail('INVALID_ACTION', 'Invalid action fields.', 422);
  if (!validId(input.request_id)) fail('INVALID_REQUEST_ID', 'Use a UUID request identifier.', 422);
  if (typeof input.game_id !== 'string' || !/^ind74_[a-z0-9_]{1,80}$/.test(input.game_id)) fail('INVALID_GAME', 'Select an independent game.', 422);
  if (!['play', 'reveal', 'collect'].includes(input.type)) fail('INVALID_ACTION', 'Choose play, reveal or collect.', 422);
  if (input.type === 'play') {
    if (typeof input.stake_minor !== 'string' || input.stake_minor.length > 18 || !MINOR.test(input.stake_minor)) fail('INVALID_BET', 'Stake must be a canonical integer minor-unit string.', 422);
    if (input.round_id !== undefined || input.expected_version !== undefined) fail('INVALID_ACTION', 'A new play cannot select an existing round.', 422);
    const options = cleanOptions(input.options, ['mode', 'target', 'choice', 'number', 'numbers', 'targetBps', 'mineCount', 'ante', 'holdWin']);
    if (options.ante !== undefined && ![1, 5, 10].includes(options.ante)) fail('INVALID_OPTIONS', 'Choose a published ANTE value.', 422);
    if (options.holdWin !== undefined && typeof options.holdWin !== 'boolean') fail('INVALID_OPTIONS', 'Use a boolean hold-win option.', 422);
    if (options.mineCount !== undefined && (!Number.isInteger(options.mineCount) || options.mineCount < 1 || options.mineCount > 24)) fail('INVALID_OPTIONS', 'Choose from 1 through 24 mines.', 422);
    if (options.targetBps !== undefined && (!Number.isSafeInteger(options.targetBps) || options.targetBps < 10500 || options.targetBps > 100000000)) fail('INVALID_TARGET', 'Choose a supported target multiplier.', 422);
    if (options.mode !== undefined && !['easy', 'medium', 'hard'].includes(options.mode)) fail('INVALID_MODE', 'Choose easy, medium or hard.', 422);
    if (options.target !== undefined && (!Number.isInteger(options.target) || options.target < 1 || options.target > 99)) fail('INVALID_TARGET', 'Choose a supported integer target.', 422);
    if (options.choice !== undefined && (typeof options.choice !== 'string' || !/^[a-z0-9]{1,24}$/.test(options.choice))) fail('INVALID_OPTIONS', 'Choose a published bet type.', 422);
    if (options.number !== undefined && (!Number.isInteger(options.number) || options.number < 0 || options.number > 40)) fail('INVALID_OPTIONS', 'Choose a published number.', 422);
    if (options.numbers !== undefined && (!Array.isArray(options.numbers) || options.numbers.length < 1 || options.numbers.length > 5 || new Set(options.numbers).size !== options.numbers.length || options.numbers.some(n => !Number.isInteger(n) || n < 1 || n > 40))) fail('INVALID_OPTIONS', 'Choose one to five distinct numbers from 1 to 40.', 422);
    return { ...input, request_id: input.request_id.toLowerCase(), options };
  }
  if (input.stake_minor !== undefined) fail('INVALID_ACTION', 'Only play accepts a stake.', 422);
  if (!validId(input.round_id) || !Number.isSafeInteger(input.expected_version) || input.expected_version < 1) fail('INVALID_ROUND', 'Provide the round identifier and current version.', 422);
  const options = cleanOptions(input.options, input.type === 'reveal' ? ['cell', 'choice'] : []);
  if (input.type === 'reveal' && options.cell !== undefined && (!Number.isInteger(options.cell) || options.cell < 0 || options.cell > 24)) fail('INVALID_CELL', 'Choose a valid board cell.', 422);
  if (options.choice !== undefined && options.choice !== 'hit') fail('INVALID_OPTIONS', 'Use Hit or the Collect/Stand action.', 422);
  return { ...input, request_id: input.request_id.toLowerCase(), round_id: input.round_id.toLowerCase(), options };
}

function asMinor(value) {
  if (typeof value !== 'string' || !MINOR.test(value)) fail('ACCOUNT_INTEGRITY_ERROR', 'The account balance could not be verified.', 503);
  return BigInt(value);
}

export function createGameService({ repository, math = defaultMath, clock = () => new Date(), uuid = () => crypto.randomUUID(), rng } = {}) {
  if (!repository || typeof repository.transact !== 'function') throw new TypeError('A transactional account repository is required.');
  function definition(gameId) {
    const game = math.getGameDefinition(gameId);
    if (!game) fail('GAME_DISABLED', 'This game is not available for account play.', 404);
    if (typeof math.startRound !== 'function' && gameId !== math.GAME_ID) fail('GAME_DISABLED', 'This game has no verified server engine.', 404);
    return game;
  }
  function publicRound(record) {
    if (!record) return null;
    const round = typeof math.publicRound === 'function' ? math.publicRound(record.state, clock().getTime()) : math.publicMineIslandRound(record.state);
    return { ...round, id: record.id, game_id: record.game_id, version: record.version, created_at: record.created_at, updated_at: record.updated_at };
  }
  function validateForGame(input, game) {
    const keys = Object.keys(input.options);
    if (input.type === 'play') {
      if (game.family === 'lobby') fail('GAME_DISABLED', 'The lobby does not accept bets.', 404);
      const allowed = game.chargingFeature ? ['ante', 'holdWin'] : game.id === math.GAME_ID ? ['mode'] : game.configurableMines ? ['mineCount'] : game.family === 'dice' ? ['target'] : game.family === 'target-crash' ? ['targetBps'] : ['roulette', 'sicbo'].includes(game.family) ? ['choice', 'number'] : game.family === 'baccarat' ? ['choice'] : game.family === 'keno' ? ['numbers'] : [];
      if (keys.some(key => !allowed.includes(key))) fail('INVALID_OPTIONS', 'These options do not belong to the selected game.', 422);
    } else if (input.type === 'reveal') {
      const allowed = ['ladder', 'mines'].includes(game.family) ? ['cell'] : game.family === 'blackjack' ? ['choice'] : [];
      if (keys.some(key => !allowed.includes(key))) fail('INVALID_OPTIONS', 'These actions do not belong to the selected game.', 422);
      if (game.family === 'crash' && keys.length) fail('INVALID_OPTIONS', 'This game does not accept board cells.', 422);
      if (['ladder', 'mines'].includes(game.family)) {
        const maximum = game.family === 'mines' ? game.cells : (game.maxSteps || 10);
        if (!Number.isInteger(input.options.cell) || input.options.cell < 0 || input.options.cell >= maximum) fail('INVALID_CELL', 'Choose a valid cell for this game.', 422);
      }
    }
  }
  async function stateFor(tx, gameId) {
    const active = await reconcileActive(tx);
    const balance = await tx.getBalanceMinor(); asMinor(balance);
    const selectedGameId = gameId || active?.game_id || math.GAME_ID || math.listGameDefinitions()[0]?.id;
    return {
      authenticated: true, currency: 'ETB', minor_decimals: 2,
      wallet: { balance_minor: balance }, game: definition(selectedGameId),
      games: math.listGameDefinitions().map(({ id, title, catalogName, family, sourceCategory, mathVersion, implementationStatus, limits, maxSteps }) => ({ id, title, catalogName, family, sourceCategory, mathVersion, implementationStatus, limits, maxSteps })), activeRound: publicRound(active),
      history: await tx.listReceipts(20),
    };
  }
  async function currentRound(tx, input) {
    const record = await tx.getRound(input.round_id);
    if (!record || record.game_id !== input.game_id) fail('ROUND_NOT_FOUND', 'This round was not found in your account.', 404);
    if (record.status !== 'active') fail('ROUND_FINISHED', 'This round has already ended.', 409);
    if (record.version !== input.expected_version) fail('STALE_ROUND', 'The round changed. Refresh its state before acting.', 409);
    return record;
  }
  async function saveReceipt(tx, record, requestId) {
    const receipt = {
      id: record.id, round_id: record.id, request_id: record.request_id || requestId, last_action_request_id: requestId, game_id: record.game_id,
      stake_minor: record.state.betMinor, payout_minor: record.status === 'collected' ? record.state.winMinor : '0',
      balance_minor: await tx.getBalanceMinor(), status: record.status,
      version: record.version, created_at: record.created_at, updated_at: record.updated_at,
    };
    await tx.upsertReceipt(receipt); return receipt;
  }
  async function settleIfNeeded(tx, record, requestId) {
    if (record.status === 'collected') {
      const payout = asMinor(record.state.winMinor);
      const maxWin = BigInt(definition(record.game_id).limits.maxWinMinor);
      if (payout > maxWin) fail('PAYOUT_LIMIT_EXCEEDED', 'The computed payout exceeds the game limit.', 503);
      if (payout > 0n) await tx.credit(record.state.winMinor, { round_id: record.id, request_id: requestId, reference: 'ind74:win:' + record.id });
    }
    if (record.status !== 'active') {
      if (typeof tx.releaseLiability !== 'function') fail('RESERVE_NOT_VERIFIED', 'The game reserve could not be verified.', 503);
      await tx.releaseLiability(record.id);
    }
  }
  function runMath(operation) {
    try { return operation(); }
    catch (error) {
      if (error instanceof ServiceError) throw error;
      const status = ['ROUND_FINISHED', 'NO_PROGRESS'].includes(error.code) ? 409 : 422;
      if (/^INVALID_(BET|MODE|CELL|TARGET|OPTIONS)$/.test(error.code || '') || ['ROUND_FINISHED', 'NO_PROGRESS'].includes(error.code)) fail(error.code, error.message, status);
      throw error;
    }
  }
  async function reconcileActive(tx) {
    const record = await tx.findActiveRound();
    if (!record || typeof math.reconcileRound !== 'function') return record;
    const now = clock();
    const nextState = runMath(() => math.reconcileRound(record.state, now.getTime()));
    if (nextState.status === 'active') return record;
    if (!['lost', 'collected'].includes(nextState.status)) fail('ROUND_INTEGRITY_ERROR', 'The timed round could not be verified.', 503);
    const settled = { ...record, state: nextState, status: nextState.status, version: record.version + 1, updated_at: now.toISOString() };
    await tx.updateRound(settled, record.version);
    const settlementId = uuid();
    await settleIfNeeded(tx, settled, settlementId);
    await saveReceipt(tx, settled, settlementId);
    return null;
  }
  return {
    state: (sessionHash, gameId) => {
      if (gameId) definition(gameId);
      return repository.transact(sessionHash, tx => stateFor(tx, gameId));
    },
    history: (sessionHash, gameId) => {
      if (gameId) definition(gameId);
      return repository.transact(sessionHash, async tx => ({ ...await stateFor(tx, gameId), history: await tx.listReceipts(50, gameId) }));
    },
    async action(sessionHash, value) {
      const input = validateAction(value); const game = definition(input.game_id);
      validateForGame(input, game);
      const fingerprint = await sha256(canonicalJson(input));
      return repository.transact(sessionHash, async tx => {
        await reconcileActive(tx);
        const previous = await tx.findRequest(input.request_id);
        if (previous) {
          if (previous.fingerprint !== fingerprint) fail('IDEMPOTENCY_CONFLICT', 'This request identifier belongs to a different action.', 409);
          const currentState = await stateFor(tx, input.game_id);
          const record = await tx.getRound(previous.round_id);
          return { ...currentState, round: publicRound(record), receipt: await tx.getReceipt(previous.round_id), request_id: input.request_id, replayed: true };
        }
        const now = clock().toISOString(); let record;
        if (input.type === 'play') {
          if (await tx.findActiveRound()) fail('ACTIVE_ROUND_EXISTS', 'Finish your active round before starting another.', 409);
          const stake = asMinor(input.stake_minor);
          if (stake < BigInt(game.limits.minBetMinor) || stake > BigInt(game.limits.maxBetMinor) || stake % BigInt(game.limits.betStepMinor) !== 0n) fail('INVALID_BET', 'The stake is outside this game’s limits or increments.', 422);
          if (asMinor(await tx.getBalanceMinor()) < stake) fail('INSUFFICIENT_FUNDS', 'Your account balance is too low for this bet.', 422);
          let context;
          if (game.chargingFeature) {
            if (typeof tx.getChargingCarry !== 'function' || typeof math.chargingCarryBucket !== 'function' || typeof math.emptyChargingCarry !== 'function') fail('TRANSACTIONAL_CARRY_REQUIRED', 'The existing transaction must restore this stake bucket.', 503);
            const bucket = runMath(() => math.chargingCarryBucket(game, input.stake_minor, input.options));
            const priorCarry = await tx.getChargingCarry(input.game_id, game.mathVersion, bucket);
            context = { bucket, priorCarry: priorCarry ?? math.emptyChargingCarry() };
          }
          const state = runMath(() => {
            if (typeof math.startRound === 'function') return math.startRound({ gameId: input.game_id, betMinor: input.stake_minor, options: input.options, context, ...(rng ? { rng } : {}), now: Date.parse(now) });
            const started = math.startMineIslandRound({ betMinor: input.stake_minor, mode: input.options.mode || game.defaultMode, ...(rng ? { rng } : {}) });
            return math.advanceMineIslandRound(started, { cell: 0 });
          });
          record = { id: uuid(), request_id: input.request_id, game_id: input.game_id, state, status: state.status, version: 1, created_at: now, updated_at: now };
          if (typeof tx.reserveLiability !== 'function') fail('RESERVE_NOT_VERIFIED', 'The game reserve could not be verified.', 503);
          const liability = typeof math.maximumPayoutMinor === 'function'
            ? math.maximumPayoutMinor({ gameId: input.game_id, betMinor: input.stake_minor, options: input.options, context })
            : game.limits.maxWinMinor;
          asMinor(liability);
          await tx.reserveLiability(liability, { round_id: record.id, game_id: record.game_id });
          await tx.debit(input.stake_minor, { round_id: record.id, request_id: input.request_id, reference: 'ind74:bet:' + record.id });
          await tx.createRound(record);
          await settleIfNeeded(tx, record, input.request_id);
        } else {
          const current = await currentRound(tx, input);
          const state = runMath(() => input.type === 'reveal'
            ? (typeof math.advanceRound === 'function' ? math.advanceRound(current.state, input.options, Date.parse(now), rng) : math.advanceMineIslandRound(current.state, input.options))
            : (typeof math.collectRound === 'function' ? math.collectRound(current.state, input.options, Date.parse(now), rng) : math.collectMineIslandRound(current.state)));
          record = { ...current, state, status: state.status, version: current.version + 1, updated_at: now };
          await tx.updateRound(record, current.version);
          await settleIfNeeded(tx, record, input.request_id);
        }
        const receipt = await saveReceipt(tx, record, input.request_id);
        await tx.rememberRequest({ request_id: input.request_id, fingerprint, round_id: record.id, created_at: now });
        const currentState = await stateFor(tx, input.game_id);
        const currentRecord = await tx.getRound(record.id);
        return { ...currentState, round: publicRound(currentRecord), receipt: await tx.getReceipt(record.id) || receipt, request_id: input.request_id, replayed: false };
      });
    },
  };
}
