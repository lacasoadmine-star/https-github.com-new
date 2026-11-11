// This extension owns no wallet or settlement logic. It receives the existing
// protected pool and transaction; the deployment defaults to observations only.
export const PROTECTED60_GUARD_VERSION = 'existing-native60-v1';

export function createProtected60AdmissionGuard({ pool, gameIds, enabled = false, expectedNativeDatabaseIdentitySha256 = null } = {}) {
  if (typeof pool?.connect !== 'function' || !Array.isArray(gameIds) || gameIds.length !== 60 || new Set(gameIds).size !== 60 || gameIds.some(id => typeof id !== 'string' || !/^ind74_official_[a-z0-9_]{1,48}$/.test(id))) throw new TypeError('Exact existing protected pool and60 unique newgame IDs required.');
  if (typeof enabled !== 'boolean' || expectedNativeDatabaseIdentitySha256 !== null && !/^[a-f0-9]{64}$/.test(expectedNativeDatabaseIdentitySha256)) throw new TypeError('Reviewed guard switch and native SQL identity hash required.');
  const ids = Object.freeze([...gameIds]);
  let snapshot = Object.freeze({ version: PROTECTED60_GUARD_VERSION, status: 'pending', requestedEnabled: enabled,
    enabled: false, readOnly: true, writes: 0, individualAccountRowsReturned: 0, balanceAmountsReturned: 0,
    databaseIdentitySha256: null, librarySchemaPresent: false, rollbackConfirmed: false });
  const ready = (async () => {
    let connection;
    const observed = { ...snapshot };
    try {
      connection = await pool.connect();
      await connection.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await connection.query("SET LOCAL statement_timeout='5s'");
      await connection.query("SET LOCAL idle_in_transaction_session_timeout='5s'");
      const result = await connection.query("SELECT encode(sha256(convert_to(current_database()||':'||(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database())||':'||COALESCE(inet_server_addr()::text,'local')||':'||COALESCE(inet_server_port()::text,''),'UTF8')),'hex') AS database_identity_sha256, to_regclass('sw_native_library.rounds') IS NOT NULL AS library_rounds, to_regclass('sw_rebuild.wallets') IS NOT NULL AS canonical_wallets");
      if (result.rows.length !== 1 || !/^[a-f0-9]{64}$/.test(result.rows[0].database_identity_sha256 ?? '')) throw Error('IDENTITY_UNAVAILABLE');
      observed.databaseIdentitySha256 = result.rows[0].database_identity_sha256;
      observed.librarySchemaPresent = result.rows[0].library_rounds === true && result.rows[0].canonical_wallets === true;
      observed.sameNativeDatabaseVerified = expectedNativeDatabaseIdentitySha256 !== null && expectedNativeDatabaseIdentitySha256 === observed.databaseIdentitySha256;
      observed.status = observed.librarySchemaPresent ? 'observed' : 'schema_unavailable';
    } catch {
      observed.status = 'unavailable';
    } finally {
      if (connection) {
        try { await connection.query('ROLLBACK'); observed.rollbackConfirmed = true; }
        catch { observed.status = 'rollback_unconfirmed'; }
        finally { connection.release(); }
      }
    }
    observed.enabled = enabled && observed.status === 'observed' && observed.rollbackConfirmed && observed.sameNativeDatabaseVerified === true;
    snapshot = Object.freeze(observed);
    return snapshot;
  })();
  return Object.freeze({
    ready,
    snapshot: () => ({ ...snapshot }),
    async assertNoActive(connection, userId) {
      if (!enabled) return;
      await ready;
      if (!snapshot.enabled) throw Object.assign(new Error('NATIVE60_SHARED_ADMISSION_UNVERIFIED'), { status: 503 });
      if (typeof connection?.query !== 'function' || typeof userId !== 'string' || !userId || userId.length > 100) throw new TypeError('Authenticated existing protected transaction required.');
      // Caller has already locked the canonical user/house wallets in sorted
      // order and replayed any old receipt. This SELECT acquires no round lock.
      const result = await connection.query("SELECT game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' AND game_id=ANY($2::text[]) LIMIT 1", [userId, ids]);
      if (result.rows.length) throw Object.assign(new Error('FINISH_ACTIVE_ROUND:' + result.rows[0].game_id), { status: 409 });
    },
  });
}
