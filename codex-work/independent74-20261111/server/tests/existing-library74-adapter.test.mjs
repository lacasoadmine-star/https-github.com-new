import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../../math/official72.mjs';
import scope from '../../scope/official74.json' with { type: 'json' };
import { createRegistry } from './support/retained-library/library-service.mjs';
import { createExistingLibrary74Adapter, composeExistingLibrary74Registry, publicLibrary74Definitions, integerRngFromLibrary, minorToMoney } from '../existing-library74-adapter.mjs';

const definitions = math.listGameDefinitions();
const ids = definitions.map(game => game.id);
const definition = family => definitions.find(game => game.family === family && (family !== 'crash' || game.crashMechanic !== 'cascade'));
const openAdapter = options => createExistingLibrary74Adapter({ reviewedGameIds: ids, allowNewRounds: true, gameLimits: Object.fromEntries(ids.map(id=>[id,{maxBetMinor:'5000000',maxWinMinor:'999999999999999'}])), ...options });
const startedAt = 1794355200000;
const zero = () => 0;

test('the bridge catalog contains all 72 official independent models and no protected machine', () => {
  const published = publicLibrary74Definitions();
  assert.equal(published.length, 72);
  assert.deepEqual(new Set(published.map(game => game.id)), new Set(scope.entries.filter(entry => !entry.protected).map(entry => entry.gameId)));
  for (const game of published) {
    assert.match(game.version, /^library74-v1:official72-/);
    assert.equal(game.accepting, false); assert.equal(game.launchable, false);
    assert.equal(game.currency, 'ETB');
    assert.equal(game.providerPrivateMathVerified, false);
    assert.equal(game.completeReferenceParityVerified, false);
    assert.ok(game.layout); assert.ok(Array.isArray(game.rules));
    assert.equal(game.returnBps, undefined); assert.equal(game.nominalReturn, undefined);
    assert.equal(game.ticketCount, undefined); assert.equal(game.provenance, undefined);
    for (const symbol of game.symbols ?? []) assert.equal(symbol.weight, undefined);
    for (const sector of game.sectors ?? []) assert.equal(sector.weight, undefined);
    assert.doesNotMatch(JSON.stringify(game.paytable ?? []), /"(?:survival|probability|weight|returnBps)[^"]*":/i);
    assert.doesNotMatch(JSON.stringify(game.wildRule ?? {}), /"[^"]*(?:weight|probability)[^"]*":/i);
  }
});

test('new rounds need both explicit model review and an enabled release gate', () => {
  const game = definitions[0];
  for (const adapter of [createExistingLibrary74Adapter(), createExistingLibrary74Adapter({ allowNewRounds: true }), createExistingLibrary74Adapter({ reviewedGameIds: ids })]) {
    assert.throws(() => adapter.start(game.id, { stakeMinor: '100' }, zero, startedAt), /INDEPENDENT74_NEW_ROUNDS_DISABLED/);
  }
  let enabled = false;
  const adapter = openAdapter({ allowNewRounds: () => enabled });
  assert.equal(adapter.definitions[game.id].accepting, false);
  enabled = true;
  assert.equal(adapter.definitions[game.id].accepting, true);
  const accepted = adapter.start(game.id, { stakeMinor: '100' }, zero, startedAt).state;
  assert.ok(accepted);
  enabled = false;
  if (accepted.status === 'active') assert.equal(adapter.act(accepted, { type: 'collect' }, zero, startedAt + 1).state.status, 'settled');
  assert.throws(() => createExistingLibrary74Adapter({ reviewedGameIds: ['multihot5_native'] }), /Reviewed game IDs/);
});

test('all 72 adapters accept configured stakes above 40,000 ETB, preserve test presets and reject unconfigured exposure', () => {
  const adapter=openAdapter(), published=adapter.definitions;
  for(const game of definitions){
    assert.equal(published[game.id].maxStake,'50000.00');
    assert.deepEqual(published[game.id].limits.testPresetsMinor,Array.from({length:20},(_,i)=>String((i+1)*100)));
    for(const stakeMinor of ['100','2000','4000100','5000000']){
      const result=adapter.start(game.id,{stakeMinor},zero,startedAt);
      assert.equal(result.debitMinor,stakeMinor);
      assert.equal(result.maxPayoutMinor,math.maximumPayoutMinor({gameId:game.id,betMinor:stakeMinor}));
    }
    for(const stakeMinor of ['0','99','101','5000001','5000100']){
      let draws=0;
      assert.throws(()=>adapter.start(game.id,{stakeMinor},()=>{draws++;return 0;},startedAt),/INVALID_BET/);
      assert.equal(draws,0);
    }
  }
});
test('policy must be supplied by the server and maximum liability is checked before RNG',()=>{
  const game=definition('slots');
  const disabled=createExistingLibrary74Adapter({reviewedGameIds:ids,allowNewRounds:true});
  assert.equal(disabled.definitions[game.id].maxStake,null);
  assert.equal(disabled.definitions[game.id].accepting,false);
  assert.throws(()=>disabled.start(game.id,{stakeMinor:'100'},zero,startedAt),/INDEPENDENT74_NEW_ROUNDS_DISABLED/);
  const narrow=openAdapter({gameLimits:{[game.id]:{maxBetMinor:'5000000',maxWinMinor:'100'}}});
  let draws=0;
  assert.throws(()=>narrow.start(game.id,{stakeMinor:'4000100'},()=>{draws++;return 0;},startedAt),/PAYOUT_LIMIT_EXCEEDED/);
  assert.equal(draws,0);
});

test('bounded RNG conversion rejects the biased tail and rejects invalid entropy', () => {
  const range = 2 ** 53;
  const values = [(range - 1) / range, 15 / range];
  const bounded = integerRngFromLibrary(() => values.shift());
  assert.equal(bounded(10), 5); assert.equal(values.length, 0);
  for (const bad of [-1, 1, NaN, Infinity, '0']) assert.throws(() => integerRngFromLibrary(() => bad)(25), /INVALID_SERVER_RANDOM/);
  assert.throws(() => integerRngFromLibrary(zero)(0), /INVALID_RNG_BOUND/);
  assert.throws(() => integerRngFromLibrary(undefined), /SERVER_RANDOM_REQUIRED/);
  assert.equal(minorToMoney('999999999999999'), '9999999999999.99');
  assert.throws(() => minorToMoney('01'), /INVALID_ENGINE_MONEY/);
  assert.throws(() => minorToMoney(100), /INVALID_ENGINE_MONEY/);
});

test('all 72 adapters start and settle inside their exact per-round reserve bound', () => {
  const adapter = openAdapter();
  for (const game of definitions) {
    let transition = adapter.start(game.id, { stakeMinor: game.limits.minBetMinor }, zero, startedAt);
    const bound = math.maximumPayoutMinor({ gameId: game.id, betMinor: game.limits.minBetMinor });
    assert.equal(transition.debitMinor, game.limits.minBetMinor, game.id);
    assert.equal(transition.maxPayoutMinor, bound, game.id);
    if (transition.state.status === 'active' && game.family === 'mines') {
      transition = adapter.act(transition.state, { type: 'reveal', cell: game.cells - 1 }, zero, startedAt + 1);
      assert.equal(transition.debitMinor, '0', game.id);
    }
    if (transition.state.status === 'active') transition = adapter.act(transition.state, { type: 'collect' }, zero, startedAt + 1000);
    assert.equal(transition.state.status, 'settled', game.id);
    assert.equal(transition.maxPayoutMinor, bound, game.id);
    assert.ok(BigInt(transition.payoutMinor) <= BigInt(bound), game.id);
    const view = adapter.publicState(transition.state, startedAt + 1000);
    assert.equal(view.payoutMinor, transition.payoutMinor, game.id);
    assert.equal(view.mathState, undefined); assert.equal(view.private, undefined);
    assert.equal(view.resultStatus, transition.state.mathState.status);
  }
});

test('active public state hides seeds, future mine cells, survival arrays and crash deadlines', () => {
  const adapter = openAdapter();
  for (const family of ['crash', 'mines', 'ladder']) {
    const game = definition(family);
    const round = adapter.start(game.id, { stakeMinor: '100' }, zero, startedAt).state;
    assert.equal(round.status, 'active');
    const before = structuredClone(round);
    const view = adapter.publicState(round, startedAt + 1);
    for (const key of ['private', 'mathState', 'seed', 'secret_seed', 'mineCells', 'bustMultiplierBps', 'survival']) assert.equal(view[key], undefined, `${family}: ${key}`);
    if (family === 'crash') assert.equal(view.expiresAt, undefined);
    view.history.push({ cell: 999 });
    assert.deepEqual(round, before, family);
  }
});

test('expiry returns an unplayed mine stake, collects an earned award and resolves actual crash loss', () => {
  const adapter = openAdapter({ activeTtlMs: 1000 });
  const mine = definition('mines');
  const unplayed = adapter.start(mine.id, { stakeMinor: '100' }, zero, startedAt).state;
  assert.throws(() => adapter.expire(unplayed, zero, startedAt + 999), /ROUND_NOT_EXPIRED/);
  const returned = adapter.expire(unplayed, zero, startedAt + 1000);
  assert.equal(returned.debitMinor, '0'); assert.equal(returned.payoutMinor, '100');
  assert.equal(returned.state.settlementReason, 'EXPIRED_UNPLAYED_STAKE_RETURN');
  const played = adapter.act(unplayed, { type: 'reveal', cell: mine.cells - 1 }, zero, startedAt + 10);
  const earned = adapter.expire(played.state, zero, startedAt + 1000);
  assert.equal(earned.payoutMinor, adapter.publicState(played.state, startedAt + 10).collectibleMinor);
  assert.equal(earned.state.settlementReason, 'EXPIRED_EARNED_AWARD');
  const crash = definition('crash');
  const ticket = Math.floor(crash.ticketCount / 2);
  const flight = adapter.start(crash.id, { stakeMinor: '100' }, () => ticket / (2 ** 53), startedAt).state;
  assert.equal(flight.status, 'active');
  const terminal = adapter.expire(flight, zero, flight.expiresAt);
  assert.equal(terminal.state.mathState.status, 'lost'); assert.equal(terminal.payoutMinor, '0');
  const capped = adapter.start(crash.id, { stakeMinor: '100' }, zero, startedAt).state;
  const autoCollect = adapter.expire(capped, zero, capped.expiresAt);
  assert.equal(autoCollect.state.mathState.status, 'collected');
  assert.equal(autoCollect.payoutMinor, capped.maximumPayoutMinor);
});

test('actions cannot supply money, choose a hidden outcome or reset a crash clock', () => {
  const adapter = openAdapter();
  const game = definition('mines');
  const round = adapter.start(game.id, { stakeMinor: '100' }, zero, startedAt).state;
  for (const input of [{ type: 'reveal', cell: 24, payoutMinor: '999' }, { type: 'reveal', cell: 24, seed: 'seed' }, { type: 'sync' }, { type: 'start' }]) {
    assert.throws(() => adapter.act(round, input, zero, startedAt + 1), /INVALID_LIBRARY_(OPTIONS|ACTION)/);
  }
  assert.throws(() => adapter.start(game.id, { stakeMinor: '100', private: { mines: [] } }, zero, startedAt), /INVALID_OPTIONS/);
  assert.throws(() => adapter.act(round, { type: 'reveal', cell: 24 }, zero, startedAt - 1), /INVALID_SERVER_TIME/);
  assert.throws(() => adapter.publicState({ ...round, payoutMinor: '900', status: 'settled' }, startedAt), /INVALID_LIBRARY74_STATE/);
  const corrupted = structuredClone(round); corrupted.mathState.private.mines = [];
  assert.throws(() => adapter.publicState(corrupted, startedAt), error => error.message === 'INVALID_ROUND' && error.status === 500);
});

test('registry composition keeps every retained version and forbids same-version replacement', () => {
  const original = { definitions: { retained_game: { version: 'retained-v1' } }, start() {}, act() {}, expire() {}, publicState() {} };
  const base = createRegistry([original]);
  const first = openAdapter();
  const composed = composeExistingLibrary74Registry(base, first);
  assert.equal(composed.get('retained_game', 'retained-v1').adapter, original);
  assert.equal(Object.keys(base.definitions()).length, 1);
  assert.equal(Object.keys(composed.definitions()).length, 73);
  const versions = Object.fromEntries(Object.entries(first.definitions).map(([id, value]) => [id, { ...value, version: value.version + '-next' }]));
  const next = { ...first, definitions: versions };
  const updated = composeExistingLibrary74Registry(composed, next);
  const game = definitions[0];
  assert.equal(updated.get(game.id).adapter, next);
  assert.equal(updated.get(game.id, first.definitions[game.id].version).adapter, first);
  assert.throws(() => composeExistingLibrary74Registry(composed, first), /DUPLICATE_LIBRARY74_MODEL/);
});

test('held Multi Hot 100 wins reserve the full gamble chain and settle exactly at its cap', () => {
  const adapter = openAdapter({ activeTtlMs: 1000 });
  const id = 'ind74_official_multihot100';
  let result = adapter.start(id, { stakeMinor: '100', holdWin: true }, zero, startedAt);
  assert.equal(result.state.status, 'active');
  assert.equal(result.payoutMinor, null);
  const pending = BigInt(result.state.mathState.pendingWinMinor);
  assert.ok(pending > 0n);
  const bound = math.maximumPayoutMinor({ gameId: id, betMinor: '100', options: { holdWin: true } });
  assert.equal(result.maxPayoutMinor, bound);
  assert.equal(BigInt(bound), BigInt(math.maximumPayoutMinor({ gameId: id, betMinor: '100' })) * 8n);
  const publicWin = adapter.publicState(result.state, startedAt);
  assert.deepEqual(publicWin.allowedActions, ['gamble', 'collect']);
  assert.ok(publicWin.outcome.grid); assert.equal(publicWin.private, undefined);
  assert.equal(publicWin.winMinor, '0'); assert.equal(publicWin.pendingWinMinor, String(pending));
  const initial = structuredClone(result.state);
  for (let step = 1; step <= 3; step++) {
    result = adapter.act(result.state, { type: 'gamble', color: 'red' }, zero, startedAt + step);
    assert.equal(result.debitMinor, '0'); assert.equal(result.maxPayoutMinor, bound);
    assert.equal(result.state.mathState.gambleRounds, step);
    assert.equal(result.state.mathState.gambleHistory.length, step);
    if (step < 3) {
      assert.equal(result.state.status, 'active'); assert.equal(result.payoutMinor, null);
      assert.equal(result.state.mathState.pendingWinMinor, String(pending * (2n ** BigInt(step))));
    }
  }
  assert.equal(result.state.status, 'settled'); assert.equal(result.payoutMinor, String(pending * 8n));
  const timed = adapter.expire(initial, zero, startedAt + 1000);
  assert.equal(timed.payoutMinor, String(pending));
  assert.equal(timed.state.settlementReason, 'EXPIRED_EARNED_AWARD');
  const lost = adapter.act(initial, { type: 'gamble', color: 'black' }, zero, startedAt + 1);
  assert.equal(lost.state.status, 'settled'); assert.equal(lost.payoutMinor, '0');
  assert.throws(() => adapter.act(initial, { type: 'gamble', color: 'blue' }, zero, startedAt + 1), error => error.status === 422 && error.message === 'INVALID_OPTIONS');
  assert.throws(() => adapter.act(initial, { type: 'reveal' }, zero, startedAt + 1), /INVALID_LIBRARY_OPTIONS/);
});

test('Plinko server color multiplies the bucket award, reserves the full bound and adds no extra stake', () => {
  const adapter = openAdapter(), id = 'ind74_official_plinkoxclassic';
  const game = math.getGameDefinition(id);
  for (const { factor, ticket, type } of [{ factor: 1, ticket: 0, type: 'pink' }, { factor: 5, ticket: 995, type: 'orange' }, { factor: 10, ticket: 999, type: 'fire' }]) {
    let draws = 0;
    const random = () => draws++ < game.rows ? 0 : ticket / (2 ** 53);
    const result = adapter.start(id, { stakeMinor: '100' }, random, startedAt);
    const view = adapter.publicState(result.state, startedAt);
    assert.equal(draws, game.rows + 1);
    assert.equal(result.debitMinor, '100'); assert.equal(result.state.stakeMinor, '100');
    assert.equal(view.baseBetMinor, '100'); assert.equal(view.totalBetMinor, '100');
    assert.equal(view.ballMultiplier, factor); assert.equal(view.outcome.ballType, type);
    assert.equal(BigInt(result.payoutMinor), 100n * BigInt(view.outcome.bucketMultiplierBps) * BigInt(factor) / 10000n);
    assert.equal(result.maxPayoutMinor, '1000000');
    assert.ok(BigInt(result.payoutMinor) <= BigInt(result.maxPayoutMinor));
    if (factor === 10) assert.equal(result.payoutMinor, result.maxPayoutMinor);
  }
  for (const options of [{ ballMultiplier: 5 }, { ballType: 'fire' }, { color: 'orange' }]) assert.throws(() => adapter.start(id, { stakeMinor: '100', ...options }, zero, startedAt), error => error.status === 422 && error.message === 'INVALID_OPTIONS');
});

test('PopX exposes the current cascade but keeps future grids and terminal deadline private', () => {
  const adapter = openAdapter(), id = 'ind74_official_popx';
  const started = adapter.start(id, { stakeMinor: '100' }, zero, startedAt);
  assert.equal(started.state.status, 'active'); assert.equal(started.maxPayoutMinor, '10000');
  assert.equal(started.state.expiresAt, started.state.mathState.private.terminalAt);
  const definition = adapter.definitions[id];
  assert.equal(definition.crashMechanic, 'cascade'); assert.equal(definition.symbols.length, 11);
  assert.equal(definition.minMatch, 8); assert.equal(definition.cascadeMs, 1500);
  const view = adapter.publicState(started.state, startedAt + 1500);
  assert.equal(view.cascadeIndex, 1); assert.equal(view.multiplierBps, 14000);
  assert.deepEqual(view.outcome.grid, started.state.mathState.private.sequence[1].grid);
  assert.doesNotMatch(JSON.stringify(view), /"(?:private|sequence|terminalAt|seed|expiresAt|mathState)"/);
  const synchronized = adapter.act(started.state, { type: 'sync' }, zero, startedAt + 1500);
  assert.equal(synchronized.debitMinor, '0'); assert.equal(synchronized.state.mathState.step, 2);
  const terminal = adapter.expire(synchronized.state, zero, synchronized.state.expiresAt);
  assert.equal(terminal.payoutMinor, '10000'); assert.equal(terminal.maxPayoutMinor, '10000');
});
