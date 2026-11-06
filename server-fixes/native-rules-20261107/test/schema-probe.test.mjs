import test from 'node:test';
import assert from 'node:assert/strict';
import { NATIVE_SCHEMA_QUERY, startNativeSchemaProbe } from '../src/schema-probe.mjs';
import { bindHealth } from '../artifacts/health-endpoint.mjs';
import { runtime, legacy, revised } from '../artifacts/versioned-core.mjs';

const compatibleRow = overrides => ({ table_kind: 'r', row_security: false, type_name: 'text', type_kind: 'b',
  column_type: 'text', max_length: null, generated: '', game_constraints: [], insert_triggers: [], insert_rules: [], ...overrides });
const probeFor = row => startNativeSchemaProbe({ query: async () => ({ rows: row ? [row] : [] }) }, NATIVE_SCHEMA_QUERY);

test('schema probe reads only bounded catalog metadata and reports compatible text/varchar', async () => {
  for (const row of [compatibleRow(), compatibleRow({ type_name: 'varchar', column_type: 'character varying(64)', max_length: 64 })]) {
    const calls = [], probe = startNativeSchemaProbe({ query: async query => { calls.push(query); return { rows: [row] }; } }, NATIVE_SCHEMA_QUERY);
    assert.equal(probe.get().status, 'pending');
    const result = await probe.ready;
    assert.equal(result.status, 'compatible');assert.equal(result.compatible, true);assert.deepEqual(result.reasons, []);
    assert.equal(calls.length, 1);assert.equal(calls[0].query_timeout, 2000);assert.equal(calls[0].text, NATIVE_SCHEMA_QUERY);
    assert.equal(probe.get(), result);
  }
  assert.match(NATIVE_SCHEMA_QUERY, /^\s*SELECT/);
  assert.doesNotMatch(NATIVE_SCHEMA_QUERY, /(?:FROM|JOIN)\s+(?!pg_catalog\.)[a-z_][a-z_0-9.]*\b/i);
  assert.doesNotMatch(NATIVE_SCHEMA_QUERY, /\b(?:UPDATE|DELETE|INSERT\s+INTO|ALTER|CREATE|DROP)\b/i);
});

test('schema uncertainty and potentially restricting metadata require review without throwing', async () => {
  for (const [overrides, reason] of [
    [{ type_name: 'varchar', column_type: 'character varying(10)', max_length: 10 }, 'COLUMN_LENGTH_TOO_SMALL'],
    [{ type_name: 'game_enum', type_kind: 'e' }, 'COLUMN_TYPE_REQUIRES_REVIEW'],
    [{ type_name: 'game_domain', type_kind: 'd' }, 'COLUMN_TYPE_REQUIRES_REVIEW'],
    [{ game_constraints: [{ name: 'round_game_check', type: 'c', definition: 'CHECK (game <> native)' }] }, 'GAME_CONSTRAINTS_REQUIRE_REVIEW'],
    [{ game_constraints: [{ name: 'round_game_fkey', type: 'f', definition: 'FOREIGN KEY (game) REFERENCES registry(id)' }] }, 'GAME_CONSTRAINTS_REQUIRE_REVIEW'],
    [{ insert_triggers: [{ name: 'validate_game', definition: 'CREATE TRIGGER validate_game BEFORE INSERT' }] }, 'INSERT_TRIGGERS_REQUIRE_REVIEW'],
    [{ insert_rules: ['route_insert'] }, 'INSERT_RULES_REQUIRE_REVIEW'],
    [{ row_security: true }, 'ROW_SECURITY_REQUIRES_REVIEW'],
    [{ generated: 's' }, 'GENERATED_COLUMN_REQUIRES_REVIEW'],
    [{ table_kind: 'v' }, 'TABLE_KIND_REQUIRES_REVIEW'],
    [{ table_kind: 'p' }, 'TABLE_KIND_REQUIRES_REVIEW'],
    [{ game_constraints: null }, 'CATALOG_RESULT_INCOMPLETE'],
  ]) {
    const result = await probeFor(compatibleRow(overrides)).ready;
    assert.equal(result.status, 'review_required');assert.equal(result.compatible, false);assert.ok(result.reasons.includes(reason));
  }
  assert.deepEqual((await probeFor(null).ready).reasons, ['COLUMN_NOT_FOUND']);
});

test('catalog timeout or permissions failure becomes unavailable without exposing database errors', async () => {
  const probe = startNativeSchemaProbe({ query: async () => { throw new Error('sensitive server connection details'); } }, NATIVE_SCHEMA_QUERY);
  const result = await probe.ready;
  assert.equal(result.status, 'unavailable');assert.equal(result.compatible, null);
  assert.deepEqual(result.reasons, ['CATALOG_QUERY_FAILED']);assert.doesNotMatch(JSON.stringify(result), /sensitive|connection/);
});

test('exact health route retains normal health behavior while optional metadata is pending or unavailable', async () => {
  let complete, catalogCalls = 0, healthCalls = 0, redisCalls = 0;
  const probe = startNativeSchemaProbe({ query: async () => { catalogCalls++;return new Promise((resolve, reject) => { complete = reject; }); } }, NATIVE_SCHEMA_QUERY);
  const route = bindHealth({ pool: { query: async sql => { assert.equal(sql, 'SELECT 1');healthCalls++; } },
    redis: { ping: async () => { redisCalls++; } }, json: value => value, ...runtime,
    Originals: { GAMES: ['old-a'], VERSION: 'original-version' }, accepting: true,
    revised, loaded: legacy, nativeSchemaProbe: probe });
  const pending = await route('/health');
  assert.equal(pending.nativeSchemaCompatibility.status, 'pending');assert.equal(pending.db, 'up');assert.equal(pending.redis, 'up');
  assert.equal(pending.enabled, true);assert.equal(pending.games, 13);assert.equal(pending.originalGames, 1);
  assert.deepEqual(Object.keys(pending.activeModels), ['foxy_hot_20_native', 'multi_hot_5_native']);
  complete(new Error('permission denied'));await probe.ready;
  const unavailable = await route('/health');
  assert.equal(unavailable.nativeSchemaCompatibility.status, 'unavailable');assert.equal(unavailable.enabled, true);
  assert.equal(healthCalls, 2);assert.equal(redisCalls, 2);assert.equal(catalogCalls, 1);
  assert.equal(await route('/not-a-health-route'), null);
});
