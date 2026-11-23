import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createSuperWildsRuntimeHost, RUNTIME_SQL } from './runtime-host.mjs';
import { createRequested90RuntimeConfiguration, requested90RuntimeConfiguration } from './runtime-release.mjs';
import { prepareSuperWildsSchema, MIGRATION_GROUPS } from './runtime-schema.mjs';
import { RESERVATION_SQL } from './reservations.mjs';
import { ROUND_SQL } from './ownership.mjs';
import { SQL } from './postgres.mjs';
import { GAME_ID } from './lifecycle.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const result = rows => ({ rows, rowCount: rows.length });

test('runtime attachment keeps inactive source imports and unrelated routes side-effect free', async () => {
  assert.equal(requested90RuntimeConfiguration.attach, false);
  assert.equal(await createSuperWildsRuntimeHost({ configuration: requested90RuntimeConfiguration }), null);
  assert.throws(() => createRequested90RuntimeConfiguration({ cashEnabled: true }), /POLICY_INVALID/);
});

test('runtime uses actual host ETB limits, same session, gamble model and emergency stop', async () => {
  let accepting = true, writes = 0;
  const guards = { isolation: 'read committed', wallet_floor: true, reservation_funding: true, m10_installed: true, m10_funding: true };
  const client = { async query(sql) {
    if (/^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(sql)) writes++;
    if (sql === RESERVATION_SQL.installation) return result([guards]);
    if (sql === RUNTIME_SQL.journals) return result([{ requests: true, rounds: true, collections: true, gambles: true, m10_requests: true, shared_rounds: true }]);
    if (sql === ROUND_SQL.installation) return result([Object.fromEntries(['m10', 'superwilds'].flatMap(family => ['reservations', 'rounds', 'collections'].map(name => [family + '_' + name, true])))]);
    if ([SQL.latest, ROUND_SQL.nativeActive, ROUND_SQL.m10Active, ROUND_SQL.superwildsActive, RESERVATION_SQL.active].includes(sql)) return result([]);
    if (sql === RESERVATION_SQL.total || sql === RESERVATION_SQL.own) return result([{ amount: '0' }]);
    throw Error('UNEXPECTED_ISOLATED_QUERY');
  } };
  const balance = async (_, id) => id === 'fixture-house' ? '1000000' : '10000';
  const lockWallets = async () => [{ id: 'fixture-house', balance: '1000000' }, { id: 'fixture-player', balance: '10000' }];
  const publicGames = () => [{ id: 'fresh_multihot10', betLevels: ['0.10', '1.00', '2.00', '5.00', '40000.00', '40001.00'],
    features: { gambleRounds: 5, gambleMaxStake: '500.00' } }];
  const dependencies = { balance, lockWallets, publicGames, houseFor: () => 'fixture-house', hash: sha,
    accepting: () => accepting, transaction: fn => fn(client), authenticate: async () => 'fixture-player',
    sessionGuard: () => 'a'.repeat(64), assertNoActive: async () => {}, assertPlayerCapacity: async () => {} };
  const configuration = createRequested90RuntimeConfiguration({ attach: true, cashEnabled: true, gambleEnabled: true });
  const policy = configuration.resolve(dependencies), own = await policy.getApprovedModel(GAME_ID), gamble = await policy.getApprovedGambleModel(GAME_ID);
  assert.deepEqual(own.betLevels, ['1.00', '2.00', '5.00', '40000.00']);
  assert.equal(gamble.policy.maxAttempts, 5); assert.equal(gamble.policy.maxPendingMinor, 50000n); assert.equal(gamble.policy.maxTargetMinor, 100000n);
  const host = await createSuperWildsRuntimeHost({ dependencies, rawBalance: balance, rawLockWallets: lockWallets,
    origin: 'https://operator.invalid', configuration, createRoutes: () => ({ handles: () => false, state() {}, spin() {}, gamble() {} }) });
  const request = new Request('https://operator.invalid/api/slots/new-games90/superwilds/state');
  const response = await host.binding.handle(request), state = await response.json();
  assert.equal(response.status, 200); assert.equal(state.authenticated, true); assert.equal(state.game.enabled, true);
  assert.deepEqual(state.game.betLevels, own.betLevels); assert.equal(host.binding.releaseInfo().gambleEnabled, true);
  accepting = false;
  const stopped = await (await host.binding.handle(request)).json();
  assert.equal(stopped.game.enabled, false); assert.equal(host.binding.releaseInfo().cashEnabled, false);
  assert.equal(host.binding.releaseInfo().gambleEnabled, false); assert.equal(writes, 0);
  assert.equal(await host.binding.handle(new Request('https://operator.invalid/api/unrelated')), null);
});

const migrationPaths = ['../../../continue71-20261122/m10-host-lifecycle/prepare-journal.sql',
  '../../../continue71-20261122/m10-house-reservations/prepare-schema.sql', './prepare-journal.sql', './prepare-reservations.sql'];
async function migrations() { return Promise.all(migrationPaths.map(async (path, index) => {
  const sql = await readFile(new URL(path, import.meta.url), 'utf8'); return { name: MIGRATION_GROUPS[index].name, sql, sha256: sha(sql) };
})); }
test('schema installer preserves complete groups and refuses partial tables in one rollback', async () => {
  const statements = [], present = new Set(MIGRATION_GROUPS.flatMap(group => group.tables));
  const client = { release() { statements.push('RELEASE'); }, async query(sql, args) {
    statements.push(sql);
    if (sql.startsWith('SELECT name,to_regclass')) return result(args[0].map(name => ({ name, present: name.startsWith('sw_new_') ? present.has(name) : true })));
    if (sql === RESERVATION_SQL.installation) return result([{ isolation: 'read committed', wallet_floor: true, reservation_funding: true, m10_installed: true, m10_funding: true }]);
    if (sql.startsWith('SELECT attname')) return result([{ attname: 'settled_order' }]);
    return result([]);
  } };
  const pool = { connect: async () => client }, scripts = await migrations();
  const ready = await prepareSuperWildsSchema(pool, scripts);
  assert.deepEqual(ready.applied, []); assert.equal(ready.balanceWrites, 0); assert.ok(statements.includes('COMMIT'));
  assert.equal(statements.some(sql => /^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/.test(sql)), false);
  present.delete('sw_new_superwilds.collections'); statements.length = 0;
  await assert.rejects(prepareSuperWildsSchema(pool, scripts, { allowInstall: true }), /PARTIAL_INSTALLATION_SUPERWILDS_JOURNAL/);
  assert.ok(statements.includes('ROLLBACK')); assert.equal(statements.includes('COMMIT'), false);
});
