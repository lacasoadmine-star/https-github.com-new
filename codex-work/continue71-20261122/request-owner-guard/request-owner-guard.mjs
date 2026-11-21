/**
 * Cross-adapter request ownership, on the caller's existing PostgreSQL client.
 * No account, ledger, migration, model or network transport is created here.
 * The caller must already hold its normal wallet locks in a real transaction.
 */
export class RequestOwnerError extends Error {
  constructor(code, status = 503) { super(code); this.name = 'RequestOwnerError'; this.code = code; this.status = status; }
}
const fail = (code, status) => { throw new RequestOwnerError(code, status); };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const M10 = 'zplay72_multi_hot_10_v1';
const kinds = Object.freeze({ legacy: ['SPIN', 'GAMBLE', 'PICK'], m10: ['SPIN', 'TAKE_WIN', 'GAMBLE'] });

// Fixed SQL only. Identities are query parameters, never SQL identifiers.
export const SQL = Object.freeze({
  lock: 'SELECT pg_advisory_xact_lock(1515213391, hashtext($1::text))',
  newJournal: "SELECT to_regclass('sw_new_m10.requests') IS NOT NULL AS installed",
  legacyOwners: `SELECT 'legacy-round'::text AS journal, game_id::text AS game_id, 'SPIN'::text AS action
FROM sw_nine.game_rounds
WHERE user_id=$1 AND (request_key=$2 OR ($3::text IS NOT NULL AND lower(request_key)=$3::text))
UNION ALL
SELECT 'legacy-action'::text AS journal, r.game_id::text AS game_id, a.kind::text AS action
FROM sw_nine.actions a
LEFT JOIN sw_nine.game_rounds r ON r.round_id=a.parent_id AND r.user_id=a.user_id
WHERE a.user_id=$1 AND (a.request_key=$2 OR ($3::text IS NOT NULL AND lower(a.request_key)=$3::text))`,
  newOwners: `SELECT 'm10'::text AS journal, receipt->>'gameId' AS game_id, kind::text AS action
FROM sw_new_m10.requests WHERE user_id=$1 AND request_key=$2::uuid`,
});

function identity(input) {
  if (!input || !Object.hasOwn(kinds, input.family) || !kinds[input.family].includes(input.action) ||
    typeof input.userId !== 'string' || !input.userId || input.userId.length > 512 ||
    typeof input.gameId !== 'string' || !input.gameId || input.gameId.length > 64 ||
    typeof input.requestKey !== 'string' || !input.requestKey || input.requestKey.length > 128 ||
    [input.userId, input.gameId, input.requestKey].some(value => value.includes('\0')) ||
    input.family === 'm10' && (input.gameId !== M10 || !UUID.test(input.requestKey))) {
    fail('REQUEST_OWNER_IDENTITY_INVALID', 400);
  }
  return Object.freeze({ userId: input.userId, gameId: input.gameId, requestKey: input.requestKey,
    family: input.family, action: input.action,
    canonicalUuid: UUID.test(input.requestKey) ? input.requestKey.toLowerCase() : null });
}

function assertOwner(rows, expected, required) {
  if (!Array.isArray(rows)) fail('REQUEST_OWNER_QUERY_INVALID');
  if (!rows.length) {
    if (required) fail('REQUEST_OWNER_CLAIM_NOT_RECORDED');
    return false;
  }
  // Do not choose one of several historical claims and hide the other debit.
  if (rows.length !== 1) fail('REQUEST_OWNER_AMBIGUOUS');
  const row = rows[0];
  const family = row.journal === 'm10' ? 'm10' : ['legacy-round', 'legacy-action'].includes(row.journal) ? 'legacy' : null;
  if (!family || !kinds[family].includes(row.action) || typeof row.game_id !== 'string' || !row.game_id ||
    row.journal === 'legacy-round' && row.action !== 'SPIN' ||
    row.journal === 'legacy-action' && !['GAMBLE', 'PICK'].includes(row.action) ||
    row.journal === 'm10' && row.game_id !== M10) fail('REQUEST_OWNER_JOURNAL_INVALID');
  if (family !== expected.family || row.game_id !== expected.gameId || row.action !== expected.action) {
    fail('IDEMPOTENCY_PARAMETER_CONFLICT', 409);
  }
  return true;
}

/**
 * Run one unchanged adapter settlement/replay inside its existing transaction.
 * The callback's own fingerprint, receipt, policy and wager checks still apply.
 * A matching owner only permits that callback to run; it does not authorize a
 * new charge. Failure to journal a successful action aborts the transaction.
 */
export async function withRequestOwnerGuard(client, input, run) {
  if (typeof client?.query !== 'function' || typeof run !== 'function') fail('REQUEST_OWNER_TRANSACTION_REQUIRED');
  const expected = identity(input);
  const lockKey = JSON.stringify(['zplay-request-owner-v1', expected.userId, expected.canonicalUuid ?? expected.requestKey]);
  await client.query(SQL.lock, [lockKey]);
  const installed = await client.query(SQL.newJournal);
  if (installed?.rowCount !== 1 || typeof installed.rows?.[0]?.installed !== 'boolean') fail('REQUEST_OWNER_INSTALLATION_QUERY_INVALID');
  const hasNewJournal = installed.rows[0].installed;
  if (expected.family === 'm10' && !hasNewJournal) fail('M10_REQUEST_JOURNAL_NOT_INSTALLED');
  const read = async () => {
    const legacy = await client.query(SQL.legacyOwners, [expected.userId, expected.requestKey, expected.canonicalUuid]);
    if (!Array.isArray(legacy?.rows)) fail('REQUEST_OWNER_QUERY_INVALID');
    const rows = [...legacy.rows];
    if (hasNewJournal && expected.canonicalUuid) {
      const next = await client.query(SQL.newOwners, [expected.userId, expected.canonicalUuid]);
      if (!Array.isArray(next?.rows)) fail('REQUEST_OWNER_QUERY_INVALID');
      rows.push(...next.rows);
    }
    return rows;
  };
  assertOwner(await read(), expected, false);
  const result = await run();
  assertOwner(await read(), expected, true);
  return result;
}

export const REQUEST_OWNER_COMPONENT = Object.freeze({
  schema: 'zplay/request-owner-guard/v1', mounted: false, productionEnabled: false,
  modelInstalled: false, schemaChanged: false,
});
