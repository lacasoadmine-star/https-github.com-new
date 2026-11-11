import { canonicalJson, sha256 } from './auth.mjs';
import { fail } from './errors.mjs';

// These names/types come from the current deployed wallet adapter, not a guessed
// replacement ledger. Catalog/constraint and integration evidence are STILL
// required against the actual database before enabling financial actions.
export const REQUIRED_COLUMNS = Object.freeze({
  'sw_rebuild.sessions': { token: ['text', 'varchar'], user_id: ['text', 'varchar'], expires: ['int8'] },
  'sw_rebuild.users': { id: ['text', 'varchar'], role: ['text', 'varchar'], status: ['text', 'varchar'] },
  'sw_rebuild.wallets': { id: ['text', 'varchar'], balance: ['int8'] },
  'sw_rebuild.transfers': { id: ['text', 'varchar'], sender: ['text', 'varchar'], recipient: ['text', 'varchar'], amount: ['int8'], kind: ['text', 'varchar'], actor: ['text', 'varchar'] },
  'sw_rebuild.ledger': { transfer_id: ['text', 'varchar'], wallet_id: ['text', 'varchar'], delta: ['int8'] },
  'sw_independent74.rounds': { id: ['uuid'], user_id: ['text'], game_id: ['text'], request_id: ['uuid'], state: ['jsonb'], status: ['text'], version: ['int4'], created_at: ['timestamptz'], updated_at: ['timestamptz'] },
  'sw_independent74.requests': { user_id: ['text'], request_id: ['uuid'], fingerprint: ['text'], round_id: ['uuid'], created_at: ['timestamptz'] },
  'sw_independent74.receipts': { round_id: ['uuid'], user_id: ['text'], game_id: ['text'], result: ['jsonb'], updated_at: ['timestamptz'] },
  'sw_independent74.liabilities': { round_id: ['uuid'], user_id: ['text'], bank_wallet_id: ['text'], game_id: ['text'], amount_minor: ['int8'], created_at: ['timestamptz'] },
});

export async function readSchemaMetadata(query) {
  const tables = await query(`SELECT n.nspname AS table_schema,c.relname AS table_name,c.relkind AS table_kind,c.relrowsecurity AS row_security
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE (n.nspname='sw_rebuild' AND c.relname IN ('sessions','users','wallets','transfers','ledger'))
       OR (n.nspname='sw_independent74' AND c.relname IN ('rounds','requests','receipts','liabilities'))
    ORDER BY n.nspname,c.relname`);
  const columns = await query(`SELECT table_schema,table_name,column_name,udt_name,is_nullable,column_default,is_identity,is_generated,character_maximum_length
    FROM information_schema.columns WHERE (table_schema='sw_rebuild' AND table_name IN ('sessions','users','wallets','transfers','ledger'))
       OR (table_schema='sw_independent74' AND table_name IN ('rounds','requests','receipts','liabilities'))
    ORDER BY table_schema,table_name,ordinal_position`);
  const constraints = await query(`SELECT n.nspname AS table_schema,c.relname AS table_name,k.conname AS name,k.contype AS type,pg_catalog.pg_get_constraintdef(k.oid,true) AS definition
    FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE (n.nspname='sw_rebuild' AND c.relname IN ('sessions','users','wallets','transfers','ledger'))
       OR (n.nspname='sw_independent74' AND c.relname IN ('rounds','requests','receipts','liabilities'))
    ORDER BY n.nspname,c.relname,k.conname`);
  const triggers = await query(`SELECT n.nspname AS table_schema,c.relname AS table_name,t.tgname AS name,pg_catalog.pg_get_triggerdef(t.oid,true) AS definition
    FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE NOT t.tgisinternal AND t.tgenabled<>'D' AND ((n.nspname='sw_rebuild' AND c.relname IN ('sessions','users','wallets','transfers','ledger'))
       OR (n.nspname='sw_independent74' AND c.relname IN ('rounds','requests','receipts','liabilities')))
    ORDER BY n.nspname,c.relname,t.tgname`);
  const indexes = await query(`SELECT schemaname AS table_schema,tablename AS table_name,indexname AS name,indexdef AS definition
    FROM pg_catalog.pg_indexes WHERE (schemaname='sw_rebuild' AND tablename IN ('sessions','users','wallets','transfers','ledger'))
       OR (schemaname='sw_independent74' AND tablename IN ('rounds','requests','receipts','liabilities'))
    ORDER BY schemaname,tablename,indexname`);
  return { tables: Array.from(tables), columns: Array.from(columns), constraints: Array.from(constraints), triggers: Array.from(triggers), indexes: Array.from(indexes) };
}

export async function verifySchemaMetadata(metadata) {
  const reasons = [];
  for (const [qualified, required] of Object.entries(REQUIRED_COLUMNS)) {
    const [schema, name] = qualified.split('.');
    const table = metadata.tables.find(row => row.table_schema === schema && row.table_name === name);
    if (!table || table.table_kind !== 'r' || table.row_security !== false) { reasons.push('TABLE_REQUIRES_REVIEW:' + qualified); continue; }
    for (const [column, types] of Object.entries(required)) {
      const actual = metadata.columns.find(row => row.table_schema === schema && row.table_name === name && row.column_name === column);
      if (!actual || !types.includes(actual.udt_name)) reasons.push('COLUMN_REQUIRES_REVIEW:' + qualified + '.' + column);
    }
  }
  // Shared financial inserts must not silently depend on additional mandatory
  // columns absent from the deployed adapter's explicit insert contract.
  for (const table of ['transfers', 'ledger']) {
    const known = REQUIRED_COLUMNS['sw_rebuild.' + table];
    for (const column of metadata.columns.filter(row => row.table_schema === 'sw_rebuild' && row.table_name === table)) {
      if (!Object.hasOwn(known, column.column_name) && column.is_nullable === 'NO' && column.column_default === null && column.is_identity !== 'YES' && column.is_generated === 'NEVER') reasons.push('UNMAPPED_REQUIRED_COLUMN:sw_rebuild.' + table + '.' + column.column_name);
    }
  }
  return { compatible: reasons.length === 0, reasons, sha256: await sha256(canonicalJson(metadata)) };
}

export function validateIntegrationEvidence(evidence, { schemaSha256, bankWalletId }) {
  if (!evidence || evidence.kind !== 'actual-postgresql-ledger-integration' || evidence.passed !== true || evidence.schema_sha256 !== schemaSha256 || evidence.bank_wallet_id !== bankWalletId || evidence.bank_isolated_from_legacy_engines !== true || !/^[a-f0-9]{64}$/.test(evidence.report_sha256 || '')) return false;
  const required = ['session_auth', 'double_entry_conservation', 'concurrent_idempotency', 'rollback_after_debit', 'rollback_after_credit', 'reserve_isolation', 'trigger_review'];
  return required.every(check => evidence.checks?.[check] === true);
}

export function requireVerifiedProductionLedger(repository) {
  if (repository.actualProductionLedgerVerified !== true) fail('LEDGER_NOT_VERIFIED', 'The actual production ledger has not been verified.', 503);
}
