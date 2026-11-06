-- Exact metadata-only query used by the optional startup health probe.
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
  AND a.attname = 'game' AND a.attnum > 0 AND NOT a.attisdropped;
