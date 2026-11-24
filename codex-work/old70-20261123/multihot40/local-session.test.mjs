import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalSession, LOCAL_STORAGE_KEY} from './local-session.mjs';

const lines = () => Array.from({length: 40}, (_, index) => {
  let value = index;
  return Array.from({length: 5}, () => { const row = value % 4; value = Math.floor(value / 4); return row; });
});
const memory = () => {
  const data = new Map();
  return {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), data};
};
const winningEntropy = values => { values[0] = 0; };
const options = extra => ({linePaths: lines(), createId: () => 'practice-session', randomValues: winningEntropy, ...extra});
const loseEntropy = () => {
  let index = 0;
  return values => { values[0] = index++ % 5; };
};

test('creates no funds or storage entry before an explicit start action', () => {
  const storage = memory(), session = createLocalSession(options({storage}));
  assert.equal(session.snapshot().started, false);
  assert.equal(session.snapshot().balanceMinor, null);
  assert.equal(storage.data.size, 0);
  assert.throws(() => session.spin({requestId: 'one', betMinor: '40'}), /EXPLICIT_START_REQUIRED/);
  assert.equal(session.start().balanceMinor, '1000000');
  assert.equal(storage.data.size, 1);
  assert.equal(session.start().balanceMinor, '1000000');
  assert.equal(session.snapshot().cashEnabled, false);
  assert.equal(session.snapshot().storageScope, 'browser_local_only');
});

test('debits once, holds a win pending, and replays the exact same accepted request', () => {
  let entropyCalls = 0, animations = 0;
  const session = createLocalSession(options({randomValues: values => { entropyCalls++; values[0] = 0; },
    onPresentation: event => { if (event.type === 'spin') animations++; }}));
  session.start();
  const accepted = session.spin({requestId: 'round-one', betMinor: '40'});
  assert.equal(accepted.balanceBeforeMinor, '1000000');
  assert.equal(accepted.winMinor, '20000');
  assert.equal(accepted.balanceAfterMinor, '999960');
  assert.equal(accepted.pendingWinMinor, '20000');
  assert.equal(session.snapshot().pendingWinMinor, '20000');
  assert.equal(session.snapshot().balanceMinor, '999960');
  assert.deepEqual(session.spin({requestId: 'round-one', betMinor: 40}), accepted);
  assert.equal(entropyCalls, 21);
  assert.equal(animations, 1);
  assert.equal(session.snapshot().roundCount, 1);
  assert.throws(() => session.spin({requestId: 'round-one', betMinor: '80'}), /REQUEST_ID_CONFLICT/);
});

test('STOP only notifies presentation and cannot sample or change practice accounting', () => {
  const events = [];
  const session = createLocalSession(options({onPresentation: event => events.push(event.type)}));
  session.start();
  assert.equal(session.stop(), false);
  session.spin({requestId: 'one', betMinor: '40'});
  const before = session.snapshot();
  assert.equal(session.stop(), true);
  assert.equal(session.stop(), true);
  assert.deepEqual(session.snapshot(), before);
  assert.deepEqual(events, ['spin', 'stop', 'stop']);
});

test('serializes accepted presentation and rejects a stale completion callback', () => {
  const session = createLocalSession(options());
  session.start();
  session.spin({requestId: 'one', betMinor: '40'});
  assert.throws(() => session.spin({requestId: 'two', betMinor: '40'}), /PRESENTATION_IN_PROGRESS/);
  session.finishPresentation('one');
  assert.equal(session.snapshot().phase, 'ready');
  session.finishPresentation('one');
  session.spin({requestId: 'two', betMinor: '40'});
  assert.throws(() => session.finishPresentation('one'), /PRESENTATION_ID_MISMATCH/);
  assert.equal(session.snapshot().pendingRequestId, 'two');
  assert.equal(session.snapshot().roundCount, 2);
});

test('reload recovers the accepted original result without another debit or random sample', () => {
  const storage = memory(), first = createLocalSession(options({storage}));
  first.start();
  const accepted = first.spin({requestId: 'pending', betMinor: '80'});
  const second = createLocalSession(options({storage, randomValues: () => { throw Error('MUST_NOT_SAMPLE'); }}));
  assert.equal(second.snapshot().phase, 'presenting');
  assert.deepEqual(second.recover('pending'), accepted);
  assert.deepEqual(second.spin({requestId: 'pending', betMinor: '80'}), accepted);
  assert.equal(second.snapshot().balanceMinor, accepted.balanceAfterMinor);
  second.finishPresentation('pending');
  const third = createLocalSession(options({storage}));
  assert.equal(third.snapshot().phase, 'ready');
  assert.equal(third.snapshot().roundCount, 1);
  assert.deepEqual(third.recover('pending'), accepted);
});

test('losing rounds reduce balance exactly and an insufficient stake changes no state', () => {
  const session = createLocalSession(options({randomValues: loseEntropy()}));
  session.start();
  const loss = session.spin({requestId: 'loss', betMinor: '40'});
  assert.equal(loss.winMinor, '0');
  assert.equal(loss.balanceAfterMinor, '999960');
  session.finishPresentation('loss');
  const before = session.snapshot();
  assert.throws(() => session.spin({requestId: 'too-big', betMinor: '1000000'}), /BET_NOT_ALLOWED/);
  assert.deepEqual(session.snapshot(), before);
});

test('money remains integer-exact through twenty distinct accepted rounds', () => {
  const session = createLocalSession(options({randomValues: loseEntropy()}));
  session.start();
  let balance = 1000000n;
  for (let index = 0; index < 20; index++) {
    const requestId = 'round-' + index, result = session.spin({requestId, betMinor: '80'});
    balance = balance - 80n + BigInt(result.winMinor);
    assert.equal(result.balanceAfterMinor, String(balance));
    assert.equal(session.snapshot().balanceMinor, String(balance));
    session.finishPresentation(requestId);
  }
  assert.equal(session.history().length, 20);
});

test('rejects altered saved balances, geometry and results instead of silently creating funds', () => {
  const storage = memory(), session = createLocalSession(options({storage}));
  session.start(); session.spin({requestId: 'one', betMinor: '40'});
  const original = storage.getItem(LOCAL_STORAGE_KEY);
  for (const change of [
    saved => { saved.balanceMinor = '999999999'; },
    saved => { saved.journal[0].balanceAfterMinor = '999999999'; },
    saved => { saved.journal[0].grid[0][0] = 8; },
    saved => { saved.linePaths = '[]'; },
    saved => { saved.journal[0].ordinal = 7; },
    saved => { saved.pendingRequestId = 'foreign'; },
    saved => { saved.pendingWinMinor = '999999'; },
    saved => { saved.journal[0].pendingAfterMinor = '999999'; }
  ]) {
    const altered = JSON.parse(original); change(altered);
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(altered));
    assert.throws(() => createLocalSession(options({storage})));
  }
});

test('fails atomically if storage cannot persist an accepted result', () => {
  const storage = memory(), session = createLocalSession(options({storage}));
  session.start();
  const before = session.snapshot(), persisted = storage.getItem(LOCAL_STORAGE_KEY);
  storage.setItem = () => { throw Error('QUOTA'); };
  assert.throws(() => session.spin({requestId: 'one', betMinor: '40'}), /STORAGE_UNAVAILABLE/);
  assert.deepEqual(session.snapshot(), before);
  assert.equal(storage.getItem(LOCAL_STORAGE_KEY), persisted);
});

test('returned snapshots, rounds and history cannot mutate local state', () => {
  const session = createLocalSession(options());
  session.start();
  const result = session.spin({requestId: 'one', betMinor: '40'});
  result.grid[0][0] = 7; result.balanceAfterMinor = '0';
  const view = session.snapshot(); view.round.grid[0][0] = 5; view.betLevelsMinor.push('1');
  const history = session.history(); history[0].grid[0][0] = 6;
  assert.equal(session.recover('one').grid[0][0], 0);
  assert.equal(session.snapshot().balanceMinor, '999960');
  assert.equal(session.snapshot().betLevelsMinor.includes('1'), false);
});

test('separates practice storage from any account key and rejects invalid request identity', () => {
  assert.throws(() => createLocalSession(options({key: 'wallet'})), /UNSAFE_STORAGE_KEY/);
  assert.throws(() => createLocalSession(options({storage: {}})), /INVALID_STORAGE/);
  const session = createLocalSession(options()); session.start();
  for (const requestId of ['', '../wallet', 'a b', 'x'.repeat(129)])
    assert.throws(() => session.spin({requestId, betMinor: '40'}), /INVALID_REQUEST_ID/);
  assert.throws(() => session.recover('unknown'), /UNKNOWN_REQUEST/);
});

test('observer failure and disposal cannot rewrite or repeat accepted accounting', () => {
  let errors = 0;
  const session = createLocalSession(options({
    onState: () => { throw Error('UI observer'); },
    onPresentation: () => { throw Error('Renderer'); },
    onObserverError: () => { errors++; }
  }));
  session.start();
  const accepted = session.spin({requestId: 'one', betMinor: '40'});
  assert.equal(accepted.balanceAfterMinor, '999960');
  assert.equal(errors, 3);
  session.dispose();
  assert.throws(() => session.spin({requestId: 'two', betMinor: '40'}), /SESSION_DISPOSED/);
  assert.equal(session.snapshot().balanceMinor, accepted.balanceAfterMinor);
});

test('asynchronous renderer rejection is observed without unhandled rejection or duplicate settlement', async () => {
  let errors = 0;
  const session = createLocalSession(options({onPresentation: async () => { throw Error('async renderer'); },
    onObserverError: () => { errors++; }}));
  session.start();
  session.spin({requestId: 'one', betMinor: '40'});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(errors, 1);
  assert.equal(session.snapshot().roundCount, 1);
  assert.equal(session.snapshot().balanceMinor, '999960');
});

test('exhausted practice balance rejects a valid stake without changing the accepted journal', () => {
  const session = createLocalSession(options({randomValues: loseEntropy()}));
  session.start();
  for (let index = 0; index < 50; index++) {
    const requestId = 'loss-' + index;
    const result = session.spin({requestId, betMinor: '20000'});
    assert.equal(result.winMinor, '0');
    session.finishPresentation(requestId);
  }
  assert.equal(session.snapshot().balanceMinor, '0');
  const before = session.snapshot();
  assert.throws(() => session.spin({requestId: 'no-funds', betMinor: '40'}), /INSUFFICIENT_PRACTICE/);
  assert.deepEqual(session.snapshot(), before);
});

test('a previously completed animation cannot clear a newer accepted pending presentation', () => {
  const session = createLocalSession(options());
  session.start();
  session.spin({requestId: 'old', betMinor: '40'});
  session.finishPresentation('old');
  session.spin({requestId: 'new', betMinor: '80'});
  const before = session.snapshot();
  assert.throws(() => session.finishPresentation('old'), /PRESENTATION_ID_MISMATCH/);
  assert.deepEqual(session.snapshot(), before);
  assert.deepEqual(session.recover('new'), before.round);
});

test('TAKE credits pending win once and duplicate TAKE recovers the original receipt', () => {
  const session = createLocalSession(options()); session.start();
  session.spin({requestId: 'one', betMinor: '40'});
  assert.throws(() => session.take({requestId: 'take-before-animation'}), /PRESENTATION_IN_PROGRESS/);
  session.finishPresentation('one');
  const taken = session.take({requestId: 'take-one'});
  assert.equal(taken.collectedMinor, '20000');
  assert.equal(taken.balanceBeforeMinor, '999960');
  assert.equal(taken.balanceAfterMinor, '1019960');
  assert.equal(taken.pendingWinMinor, '0');
  assert.equal(session.snapshot().balanceMinor, '1019960');
  assert.equal(session.snapshot().pendingWinMinor, '0');
  assert.deepEqual(session.take({requestId: 'take-one'}), taken);
  assert.throws(() => session.take({requestId: 'new-take'}), /NO_PENDING_WIN/);
  assert.equal(session.snapshot().actionCount, 2);
});

test('next SPIN atomically collects the previous pending win and debits one new stake', () => {
  const session = createLocalSession(options()); session.start();
  session.spin({requestId: 'one', betMinor: '40'});
  session.finishPresentation('one');
  const second = session.spin({requestId: 'two', betMinor: '80'});
  assert.equal(second.collectedPendingMinor, '20000');
  assert.equal(second.balanceBeforeMinor, '999960');
  assert.equal(second.balanceAfterMinor, '1019880');
  assert.equal(second.pendingWinMinor, '40000');
  const before = session.snapshot();
  assert.deepEqual(session.spin({requestId: 'two', betMinor: '80'}), second);
  assert.deepEqual(session.snapshot(), before);
  assert.equal(session.recover('one').pendingWinMinor, '20000');
  assert.equal(session.snapshot().pendingWinMinor, '40000');
});

test('DOUBLE risks pending wins only and uses its own labelled fair-color candidate', () => {
  let entropyCalls = 0;
  const session = createLocalSession(options({randomValues: values => { entropyCalls++; values[0] = 0; }}));
  session.start(); session.spin({requestId: 'one', betMinor: '40'}); session.finishPresentation('one');
  const initialBalance = session.snapshot().balanceMinor;
  const won = session.double({requestId: 'double-one', choice: 'RED'});
  assert.equal(won.won, true);
  assert.equal(won.revealed, 'RED');
  assert.equal(won.riskedMinor, '20000');
  assert.equal(won.pendingWinMinor, '40000');
  assert.equal(won.balanceAfterMinor, initialBalance);
  assert.equal(won.gambleModel, 'independent_fair_color');
  assert.equal(won.providerGambleVerified, false);
  assert.deepEqual(session.double({requestId: 'double-one', choice: 'RED'}), won);
  assert.equal(entropyCalls, 22);
  assert.throws(() => session.double({requestId: 'double-one', choice: 'BLACK'}), /REQUEST_ID_CONFLICT/);
  const lost = session.double({requestId: 'double-two', choice: 'BLACK'});
  assert.equal(lost.won, false);
  assert.equal(lost.pendingWinMinor, '0');
  assert.equal(session.snapshot().balanceMinor, initialBalance);
  assert.equal(session.snapshot().pendingWinMinor, '0');
  assert.throws(() => session.take({requestId: 'take-loss'}), /NO_PENDING_WIN/);
});

test('DOUBLE refuses invalid colors and respects the explicit five-round practice limit', () => {
  const session = createLocalSession(options()); session.start();
  session.spin({requestId: 'one', betMinor: '40'}); session.finishPresentation('one');
  const before = session.snapshot();
  assert.throws(() => session.double({requestId: 'bad-color', choice: 'red'}), /INVALID_COLOR/);
  assert.deepEqual(session.snapshot(), before);
  for (let index = 1; index <= 5; index++) {
    const result = session.double({requestId: 'double-' + index, choice: 'RED'});
    assert.equal(result.attempt, index);
    assert.equal(result.balanceAfterMinor, '999960');
  }
  assert.equal(session.snapshot().pendingWinMinor, '640000');
  const limited = session.snapshot();
  assert.throws(() => session.double({requestId: 'double-six', choice: 'RED'}), /PRACTICE_DOUBLE_LIMIT/);
  assert.deepEqual(session.snapshot(), limited);
  const taken = session.take({requestId: 'take-max'});
  assert.equal(taken.balanceAfterMinor, '1639960');
});

test('reload reconstructs pending DOUBLE and TAKE accounting from the compact action journal', () => {
  const storage = memory(), first = createLocalSession(options({storage}));
  first.start(); first.spin({requestId: 'one', betMinor: '40'}); first.finishPresentation('one');
  const doubled = first.double({requestId: 'double-one', choice: 'RED'});
  const second = createLocalSession(options({storage, randomValues: () => { throw Error('MUST_NOT_SAMPLE'); }}));
  assert.equal(second.snapshot().balanceMinor, '999960');
  assert.equal(second.snapshot().pendingWinMinor, '40000');
  assert.equal(second.snapshot().doubleCount, 1);
  assert.deepEqual(second.double({requestId: 'double-one', choice: 'RED'}), doubled);
  const taken = second.take({requestId: 'take-one'});
  const third = createLocalSession(options({storage}));
  assert.equal(third.snapshot().balanceMinor, '1039960');
  assert.equal(third.snapshot().pendingWinMinor, '0');
  assert.deepEqual(third.take({requestId: 'take-one'}), taken);
  assert.equal(third.history().length, 1);
  assert.equal(third.actionHistory().length, 3);
});

test('request keys cannot be reused across SPIN, TAKE or DOUBLE actions', () => {
  const session = createLocalSession(options()); session.start();
  session.spin({requestId: 'one', betMinor: '40'}); session.finishPresentation('one');
  assert.throws(() => session.take({requestId: 'one'}), /REQUEST_ID_CONFLICT/);
  assert.throws(() => session.double({requestId: 'one', choice: 'RED'}), /REQUEST_ID_CONFLICT/);
  session.double({requestId: 'double', choice: 'RED'});
  assert.throws(() => session.take({requestId: 'double'}), /REQUEST_ID_CONFLICT/);
  session.take({requestId: 'take'});
  assert.throws(() => session.spin({requestId: 'take', betMinor: '40'}), /REQUEST_ID_CONFLICT/);
});

test('storage failure during TAKE or DOUBLE preserves every pending credit and accepted receipt', () => {
  for (const action of ['take', 'double']) {
    const storage = memory(), session = createLocalSession(options({storage}));
    session.start(); session.spin({requestId: 'one', betMinor: '40'}); session.finishPresentation('one');
    const before = session.snapshot(), persisted = storage.getItem(LOCAL_STORAGE_KEY);
    storage.setItem = () => { throw Error('QUOTA'); };
    assert.throws(() => session[action]({requestId: 'action', choice: 'RED'}), /STORAGE_UNAVAILABLE/);
    assert.deepEqual(session.snapshot(), before);
    assert.equal(storage.getItem(LOCAL_STORAGE_KEY), persisted);
  }
});

test('twenty winning SPINs collect only prior pending awards and leave the final win uncollected', () => {
  const session = createLocalSession(options()); session.start();
  let balance = 1000000n, pending = 0n;
  for (let index = 0; index < 20; index++) {
    const requestId = 'round-' + index, result = session.spin({requestId, betMinor: '40'});
    balance = balance + pending - 40n; pending = BigInt(result.winMinor);
    assert.equal(result.balanceAfterMinor, String(balance));
    assert.equal(session.snapshot().balanceMinor, String(balance));
    assert.equal(session.snapshot().pendingWinMinor, String(pending));
    session.finishPresentation(requestId);
  }
  const total = balance + pending;
  session.take({requestId: 'take-final'});
  assert.equal(session.snapshot().balanceMinor, String(total));
  assert.equal(session.snapshot().pendingWinMinor, '0');
});

test('restored gamble journal rejects changed results or attempts without manufacturing credits', () => {
  const storage = memory(), session = createLocalSession(options({storage}));
  session.start(); session.spin({requestId: 'one', betMinor: '40'}); session.finishPresentation('one');
  session.double({requestId: 'double-one', choice: 'RED'});
  const original = storage.getItem(LOCAL_STORAGE_KEY);
  for (const change of [
    saved => { saved.journal[1].revealed = 'BLACK'; },
    saved => { saved.journal[1].attempt = 7; },
    saved => { saved.journal[1].pendingAfterMinor = '999999'; },
    saved => { saved.doubleCount = 0; },
    saved => { saved.journal[1].balanceAfterMinor = '999999'; }
  ]) {
    const altered = JSON.parse(original); change(altered);
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(altered));
    assert.throws(() => createLocalSession(options({storage})));
  }
});
