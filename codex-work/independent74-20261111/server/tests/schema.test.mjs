import test from 'node:test';
import assert from 'node:assert/strict';
import { REQUIRED_COLUMNS, verifySchemaMetadata, validateIntegrationEvidence } from '../schema.mjs';
import { PostgresRepository } from '../postgres-repository.mjs';

function metadata() {
  const tables = [], columns = [];
  for (const [qualified, fields] of Object.entries(REQUIRED_COLUMNS)) {
    const [table_schema, table_name] = qualified.split('.');
    tables.push({ table_schema, table_name, table_kind: 'r', row_security: false });
    for (const [column_name, types] of Object.entries(fields)) columns.push({ table_schema, table_name, column_name, udt_name: types[0], is_nullable: 'NO', column_default: null, is_identity: 'NO', is_generated: 'NEVER', character_maximum_length: null });
  }
  return { tables, columns, constraints: [], triggers: [], indexes: [] };
}

test('schema validation rejects missing shared wallet columns or wrong money scale', async () => {
  const value = metadata(); value.columns.find(row => row.table_name === 'wallets' && row.column_name === 'balance').udt_name = 'numeric';
  const result = await verifySchemaMetadata(value);
  assert.equal(result.compatible, false); assert.ok(result.reasons.includes('COLUMN_REQUIRES_REVIEW:sw_rebuild.wallets.balance'));
});

test('schema validation rejects unreviewed RLS/view behavior and unmapped required insert columns', async () => {
  const value = metadata(); value.tables.find(row => row.table_name === 'transfers').row_security = true;
  value.columns.push({ table_schema: 'sw_rebuild', table_name: 'ledger', column_name: 'required_audit_tag', udt_name: 'text', is_nullable: 'NO', column_default: null, is_identity: 'NO', is_generated: 'NEVER' });
  const result = await verifySchemaMetadata(value);
  assert.equal(result.compatible, false);
  assert.ok(result.reasons.includes('UNMAPPED_REQUIRED_COLUMN:sw_rebuild.ledger.required_audit_tag'));
});

test('compatible metadata alone never establishes actual financial integration verification', async () => {
  const result = await verifySchemaMetadata(metadata()); assert.equal(result.compatible, true);
  assert.equal(validateIntegrationEvidence(null, { schemaSha256: result.sha256, bankWalletId: 'independent74_bank' }), false);
  assert.equal(validateIntegrationEvidence({ passed: true }, { schemaSha256: result.sha256, bankWalletId: 'independent74_bank' }), false);
});

test('constraint and trigger metadata changes invalidate a reviewed schema fingerprint', async () => {
  const original = metadata(); const first = await verifySchemaMetadata(original);
  original.triggers.push({ table_schema: 'sw_rebuild', table_name: 'wallets', name: 'new_audit_trigger', definition: 'AFTER UPDATE' });
  const changed = await verifySchemaMetadata(original);
  assert.notEqual(first.sha256, changed.sha256);
});

test('production repository refuses the legacy shared house bank without querying accounts', async () => {
  let calls = 0;
  const repository = new PostgresRepository({ database: { begin: async () => { calls++; } }, bankWalletId: 'house' });
  const readiness = await repository.inspectReadiness();
  assert.equal(readiness.financial_enabled, false); assert.deepEqual(readiness.reasons, ['DEDICATED_BANK_WALLET_REQUIRED']); assert.equal(calls, 0);
});

test('production repository cannot transact before actual database schema inspection', async () => {
  const repository = new PostgresRepository({ database: { begin: async () => { throw new Error('must not call'); } }, bankWalletId: 'independent74_bank' });
  await assert.rejects(repository.transact('a'.repeat(64), () => {}), error => error.code === 'WALLET_UNAVAILABLE');
  assert.equal(repository.actualProductionLedgerVerified, false);
});
