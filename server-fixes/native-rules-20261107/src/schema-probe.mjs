// Catalog metadata only. No game rounds, player records, credentials or wallet rows are read.
export const NATIVE_SCHEMA_QUERY = `
SELECT c.relkind AS table_kind, c.relrowsecurity AS row_security,
       t.typname AS type_name, t.typtype AS type_kind,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS column_type,
       CASE WHEN t.typname = 'varchar' AND a.atttypmod >= 4 THEN a.atttypmod - 4 ELSE NULL END AS max_length,
       a.attgenerated AS generated,
       COALESCE((
         SELECT json_agg(json_build_object('name', k.conname, 'type', k.contype,
           'definition', pg_catalog.pg_get_constraintdef(k.oid)) ORDER BY k.conname)
         FROM pg_catalog.pg_constraint k
         WHERE k.conrelid = c.oid AND (
           (k.contype = 'c' AND (a.attnum = ANY(k.conkey) OR COALESCE(cardinality(k.conkey), 0) = 0))
           OR (k.contype = 'f' AND a.attnum = ANY(k.conkey)))
       ), '[]'::json) AS game_constraints,
       COALESCE((
         SELECT json_agg(json_build_object('name', x.tgname,
           'definition', pg_catalog.pg_get_triggerdef(x.oid)) ORDER BY x.tgname)
         FROM pg_catalog.pg_trigger x
         WHERE x.tgrelid = c.oid AND NOT x.tgisinternal AND x.tgenabled <> 'D' AND (x.tgtype & 4) <> 0
       ), '[]'::json) AS insert_triggers,
       COALESCE((
         SELECT json_agg(r.rulename ORDER BY r.rulename)
         FROM pg_catalog.pg_rewrite r WHERE r.ev_class = c.oid AND r.ev_type = '3'
       ), '[]'::json) AS insert_rules
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
WHERE n.nspname = 'sw_rebuild' AND c.relname = 'rounds'
  AND a.attname = 'game' AND a.attnum > 0 AND NOT a.attisdropped
`;

// This function is serialized into the deployable runtime; keep it self-contained.
export function startNativeSchemaProbe(pool, query) {
  const target = 'sw_rebuild.rounds.game';
  const gameIds = ['foxy_hot_20_native', 'multi_hot_5_native'];
  let snapshot = Object.freeze({ status: 'pending', compatible: null, target, gameIds });
  const ready = Promise.resolve().then(() => pool.query({ text: query, query_timeout: 2000 })).then(result => {
    const row = result.rows[0];
    if (result.rows.length !== 1 || !row) {
      snapshot = Object.freeze({ status: 'review_required', compatible: false, target, gameIds, reasons: ['COLUMN_NOT_FOUND'] });
      return snapshot;
    }
    const constraints = Array.isArray(row.game_constraints) ? row.game_constraints : null;
    const triggers = Array.isArray(row.insert_triggers) ? row.insert_triggers : null;
    const rules = Array.isArray(row.insert_rules) ? row.insert_rules : null;
    const reasons = [];
    if (!['r', 'p'].includes(row.table_kind)) reasons.push('TABLE_KIND_REQUIRES_REVIEW');
    if (row.type_kind !== 'b' || !['text', 'varchar'].includes(row.type_name)) reasons.push('COLUMN_TYPE_REQUIRES_REVIEW');
    if (row.max_length !== null && (!Number.isInteger(Number(row.max_length)) || Number(row.max_length) < Math.max(...gameIds.map(id => id.length)))) reasons.push('COLUMN_LENGTH_TOO_SMALL');
    if (row.generated !== '') reasons.push('GENERATED_COLUMN_REQUIRES_REVIEW');
    if (row.row_security !== false) reasons.push('ROW_SECURITY_REQUIRES_REVIEW');
    if (!constraints || !triggers || !rules) reasons.push('CATALOG_RESULT_INCOMPLETE');
    if (constraints?.length) reasons.push('GAME_CONSTRAINTS_REQUIRE_REVIEW');
    if (triggers?.length) reasons.push('INSERT_TRIGGERS_REQUIRE_REVIEW');
    if (rules?.length) reasons.push('INSERT_RULES_REQUIRE_REVIEW');
    snapshot = Object.freeze({ status: reasons.length ? 'review_required' : 'compatible', compatible: reasons.length === 0,
      target, gameIds, columnType: row.column_type, maxLength: row.max_length === null ? null : Number(row.max_length),
      constraints: constraints || [], insertTriggers: triggers || [], insertRules: rules || [], reasons });
    return snapshot;
  }).catch(() => {
    // Do not leak a database error message or change the legacy health/settlement path.
    snapshot = Object.freeze({ status: 'unavailable', compatible: null, target, gameIds, reasons: ['CATALOG_QUERY_FAILED'] });
    return snapshot;
  });
  return { get: () => snapshot, ready };
}
