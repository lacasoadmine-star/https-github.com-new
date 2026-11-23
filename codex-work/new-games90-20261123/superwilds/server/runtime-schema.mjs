import { createHash } from 'node:crypto';
import { RESERVATION_SQL } from './reservations.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw Error('SUPERWILDS_SCHEMA_' + code); };
export const MIGRATION_GROUPS = Object.freeze([
  { name: 'm10-journal', tables: ['sw_new_m10.rounds', 'sw_new_m10.collections', 'sw_new_m10.requests', 'sw_new_m10.gambles'] },
  { name: 'm10-reservations', tables: ['sw_new_m10.reservations', 'sw_new_m10.wallet_movements', 'sw_new_m10.reservation_events'] },
  { name: 'superwilds-journal', tables: ['sw_new_superwilds.rounds', 'sw_new_superwilds.collections', 'sw_new_superwilds.requests', 'sw_new_superwilds.gambles'] },
  { name: 'superwilds-reservations', tables: ['sw_new_superwilds.reservations', 'sw_new_superwilds.wallet_movements', 'sw_new_superwilds.reservation_events'] },
]);

/** Install the additive schemas on the SAME existing database connection.
 * All DDL shares one transaction and advisory lock. A partial prior schema is
 * rejected without guessing a repair. There is no account or balance DML.
 * Existing complete groups are preserved; startup validates the actual floor.
 */
export async function prepareSuperWildsSchema(pool, migrations, { allowInstall = false } = {}) {
  if (typeof pool?.connect !== 'function' || !Array.isArray(migrations) || migrations.length !== MIGRATION_GROUPS.length) fail('INPUT_INVALID');
  const scripts = MIGRATION_GROUPS.map((group, index) => {
    const supplied = migrations[index];
    if (supplied?.name !== group.name || typeof supplied.sql !== 'string' || hash(supplied.sql) !== supplied.sha256) fail('MIGRATION_IDENTITY_INVALID');
    // Only strip the known outer transaction; inner PL/pgSQL BEGIN blocks
    // remain byte-identical. Nested commits cannot split the atomic install.
    if (!/^--[\s\S]*?\bBEGIN;/.test(supplied.sql) || !/COMMIT;\s*$/.test(supplied.sql)) fail('TRANSACTION_BOUNDARY_INVALID');
    return { ...group, sha256: supplied.sha256,
      sql: supplied.sql.replace(/\bBEGIN;/, '').replace(/COMMIT;\s*$/, '') };
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL statement_timeout='30s'");
    await client.query('SELECT pg_advisory_xact_lock(1515213395,1)');
    const existing = ['sw_rebuild.users', 'sw_rebuild.wallets', 'sw_rebuild.transfers', 'sw_rebuild.ledger',
      'sw_rebuild.rounds', 'sw_rebuild.sessions', 'sw_rebuild.account_limits', 'sw_nine.game_rounds', 'sw_nine.actions', 'sw_native_library.rounds'];
    const installed = await client.query('SELECT name,to_regclass(name) IS NOT NULL AS present FROM unnest($1::text[]) AS name', [existing]);
    if (installed.rowCount !== existing.length || installed.rows.some(row => row.present !== true)) fail('EXISTING_HOST_REQUIRED');
    const applied = [];
    for (const group of scripts) {
      const result = await client.query('SELECT name,to_regclass(name) IS NOT NULL AS present FROM unnest($1::text[]) AS name', [group.tables]);
      if (result.rowCount !== group.tables.length || result.rows.some(row => typeof row.present !== 'boolean')) fail('INVENTORY_INVALID');
      const count = result.rows.filter(row => row.present).length;
      if (count !== 0 && count !== group.tables.length) fail('PARTIAL_INSTALLATION_' + group.name.toUpperCase().replaceAll('-', '_'));
      if (count === 0) {
        if (!allowInstall) fail('INSTALLATION_REQUIRED_' + group.name.toUpperCase().replaceAll('-', '_'));
        await client.query(group.sql); applied.push(group.name);
      }
    }
    const result = await client.query(RESERVATION_SQL.installation), row = result.rows?.[0];
    if (result.rowCount !== 1 || row.isolation !== 'read committed' ||
      !['wallet_floor', 'reservation_funding', 'm10_installed', 'm10_funding'].every(key => row[key] === true)) fail('PROTECTED_FLOOR_INVALID');
    const ordering = await client.query("SELECT attname FROM pg_catalog.pg_attribute WHERE attrelid='sw_rebuild.rounds'::regclass AND attname='settled_order' AND NOT attisdropped");
    if (ordering.rowCount !== 1) fail('SHARED_ROUND_ORDER_REQUIRED');
    await client.query('COMMIT');
    return Object.freeze({ installed: true, applied: Object.freeze(applied), accountWrites: 0, balanceWrites: 0,
      migrations: Object.freeze(scripts.map(({ name, sha256 }) => Object.freeze({ name, sha256 }))) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {}); throw error;
  } finally { client.release(); }
}
