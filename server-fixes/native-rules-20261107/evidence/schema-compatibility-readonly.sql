-- Read-only release preflight: metadata only, no player or wallet records.
BEGIN READ ONLY;
SELECT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS column_type,
       a.attnotnull AS required
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE a.attnum > 0 AND NOT a.attisdropped
  AND ((n.nspname = 'sw_rebuild' AND c.relname = 'rounds' AND a.attname = 'game')
    OR (n.nspname = 'sw_nine' AND c.relname IN ('game_rounds', 'wallet_transactions', 'free_spins') AND a.attname = 'game_id'))
ORDER BY n.nspname, c.relname, a.attname;
SELECT n.nspname AS schema_name, c.relname AS table_name, k.conname AS constraint_name,
       k.contype AS constraint_type, pg_catalog.pg_get_constraintdef(k.oid) AS definition
FROM pg_catalog.pg_constraint k
JOIN pg_catalog.pg_class c ON c.oid = k.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'sw_rebuild' AND c.relname = 'rounds')
   OR (n.nspname = 'sw_nine' AND c.relname IN ('game_rounds', 'wallet_transactions', 'free_spins'))
ORDER BY n.nspname, c.relname, k.conname;
SELECT n.nspname AS schema_name, c.relname AS table_name, t.tgname AS trigger_name,
       pg_catalog.pg_get_triggerdef(t.oid) AS definition
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal AND ((n.nspname = 'sw_rebuild' AND c.relname = 'rounds')
   OR (n.nspname = 'sw_nine' AND c.relname IN ('game_rounds', 'wallet_transactions', 'free_spins')))
ORDER BY n.nspname, c.relname, t.tgname;
ROLLBACK;
