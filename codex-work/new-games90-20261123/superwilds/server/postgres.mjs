import { createSuperWildsLifecycle, GAME_ID, minor, SuperWildsError } from './lifecycle.mjs';

const fail = code => { throw new SuperWildsError(code); };
const WALLET_METHODS = ['lockWallets', 'assertReady', 'playerBalance', 'houseBalance', 'reservedBalance',
  'debitStake', 'reserveWin', 'creditReservedWin', 'assertNoActiveRound', 'claimActiveRound',
  'releaseActiveRound', 'assertPlayerCapacity', 'activeRound'];
export const SQL = Object.freeze({
  request: 'SELECT kind,fingerprint,receipt FROM sw_new_superwilds.requests WHERE user_id=$1 AND request_key=$2::uuid',
  insertRequest: 'INSERT INTO sw_new_superwilds.requests(user_id,request_key,kind,fingerprint,receipt) VALUES($1,$2::uuid,$3,$4,$5::jsonb)',
  round: 'SELECT user_id,game_id,round_id,request_key,receipt FROM sw_new_superwilds.rounds WHERE user_id=$1 AND round_id=$2::uuid',
  latest: 'SELECT user_id,game_id,round_id,request_key,receipt FROM sw_new_superwilds.rounds WHERE user_id=$1 AND game_id=$2 ORDER BY ordinal DESC LIMIT 1',
  insertRound: 'INSERT INTO sw_new_superwilds.rounds(round_id,user_id,game_id,request_key,stake_minor,win_minor,receipt) VALUES($1::uuid,$2,$3,$4::uuid,$5::bigint,$6::bigint,$7::jsonb)',
  collection: 'SELECT receipt FROM sw_new_superwilds.collections WHERE user_id=$1 AND round_id=$2::uuid',
  insertCollection: 'INSERT INTO sw_new_superwilds.collections(round_id,collection_id,user_id,amount_minor,receipt) VALUES($1::uuid,$2::uuid,$3,$4::bigint,$5::jsonb)',
});
function one(result, code) {
  if (!Array.isArray(result?.rows) || result.rowCount !== result.rows.length || result.rowCount > 1) fail(code);
  return result.rows[0] ?? null;
}
function savedRound(row) {
  if (!row) return null;
  const token = row.receipt?.requestKey;
  if (typeof row.request_key !== 'string' || typeof token !== 'string' || row.request_key.toLowerCase() !== token.toLowerCase()) {
    fail('SUPERWILDS_STORED_REQUEST_IDENTITY_INVALID');
  }
  return { userId: row.user_id, gameId: row.game_id, roundId: row.round_id, requestKey: token,
    bet: row.receipt.bet, winAmount: row.receipt.winAmount, receipt: structuredClone(row.receipt) };
}

/** Same-client journal adapter. The host supplies its actual protected wallet,
 * shared round-order hook and SYMMETRIC request ownership hook used by old and
 * new adapters. This module never substitutes a separate wallet or connection.
 *
 * withRequestOwner(client, identity, fn) must reject a legacy/M10/other-game
 * claim before fn, then verify exactly one matching journal claim after fn.
 * registerRound must order every accepted spin in sw_rebuild.rounds, including
 * zero wins, so old gamble eligibility observes the newer round.
 */
export function createSuperWildsPostgresService({ transaction, authenticate, wallet,
  withRequestOwner, registerRound, ...configuration } = {}) {
  for (const [name, value] of Object.entries({ transaction, authenticate, withRequestOwner, registerRound })) {
    if (typeof value !== 'function') fail('SUPERWILDS_EXISTING_HOST_REQUIRED_' + name);
  }
  for (const name of WALLET_METHODS) if (typeof wallet?.[name] !== 'function') fail('SUPERWILDS_EXISTING_WALLET_REQUIRED_' + name);
  return createSuperWildsLifecycle({ ...configuration, authenticate,
    transaction: fn => transaction(async client => {
      if (typeof client?.query !== 'function') fail('SUPERWILDS_EXISTING_PG_TRANSACTION_REQUIRED');
      const insert = async (sql, params) => {
        const r = await client.query(sql, params);
        if (r.rowCount !== 1) fail('SUPERWILDS_JOURNAL_WRITE_INCOMPLETE');
      };
      return fn({
        authenticate: request => authenticate(request, client, true),
        ...Object.fromEntries(WALLET_METHODS.map(name => [name, (...args) => wallet[name](client, ...args)])),
        withRequestOwner: (identity, operation) => withRequestOwner(client, identity, operation),
        registerRound: round => registerRound(client, round),
        async findRequest(userId, token) {
          const row = one(await client.query(SQL.request, [userId, token]), 'SUPERWILDS_REQUEST_JOURNAL_INVALID');
          return row ? { kind: row.kind, fingerprint: row.fingerprint, receipt: structuredClone(row.receipt) } : null;
        },
        insertRequest: (userId, token, kind, fingerprint, receipt) => insert(SQL.insertRequest,
          [userId, token, kind, fingerprint, JSON.stringify(receipt)]),
        async findRound(userId, roundId) {
          return savedRound(one(await client.query(SQL.round, [userId, roundId]), 'SUPERWILDS_ROUND_JOURNAL_INVALID'));
        },
        async latestRound(userId) {
          return savedRound(one(await client.query(SQL.latest, [userId, GAME_ID]), 'SUPERWILDS_ROUND_JOURNAL_INVALID'));
        },
        insertRound: round => insert(SQL.insertRound, [round.roundId, round.userId, GAME_ID, round.requestKey,
          minor(round.bet).toString(), minor(round.winAmount).toString(), JSON.stringify(round.receipt)]),
        async findCollection(userId, roundId) {
          const row = one(await client.query(SQL.collection, [userId, roundId]), 'SUPERWILDS_COLLECTION_JOURNAL_INVALID');
          return row ? structuredClone(row.receipt) : null;
        },
        insertCollection: (userId, roundId, receipt) => insert(SQL.insertCollection,
          [roundId, receipt.collectionId, userId, minor(receipt.amount).toString(), JSON.stringify(receipt)]),
      });
    }),
  });
}
