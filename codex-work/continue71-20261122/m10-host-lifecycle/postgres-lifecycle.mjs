import { createMultiHot10DeferredLifecycle } from './deferred-lifecycle.mjs';
import { GAME_ID, copy, fail, minor } from '../../new-games72-20261121/games/multi-hot-10/backend/contract.mjs';

const walletMethods = ['lockWallets', 'playerBalance', 'houseBalance', 'reserveBalance',
  'debitStake', 'reserveWin', 'creditReservedWin', 'assertNoActiveRound', 'claimActiveRound',
  'releaseActiveRound', 'assertPlayerCapacity', 'activeRound', 'releaseReservedWin'];

/**
 * PostgreSQL journal bridge continued with explicit shared round ordering.
 * It writes this game's sw_new_m10 journal, then calls the required host
 * round-order hook on the SAME client. Existing wallet transfers and active
 * ownership come from the composed, unmounted host callbacks.
 * No migration, wallet creation or activation occurs when importing/creating.
 */
export function createMultiHot10PostgresLifecycle({ transaction, authenticate, sessionGuard,
  wallet, roundHooks, ...configuration } = {}) {
  if (typeof transaction !== 'function' || typeof authenticate !== 'function') fail('M10_EXISTING_TRANSACTION_REQUIRED');
  if (typeof roundHooks?.registerRound !== 'function') fail('M10_SHARED_ROUND_HOOK_REQUIRED');
  for (const name of walletMethods) if (typeof wallet?.[name] !== 'function') fail('M10_EXISTING_WALLET_CALLBACK_REQUIRED_' + name);
  return createMultiHot10DeferredLifecycle({ ...configuration, authenticate, sessionGuard,
    transaction: fn => transaction(async client => {
      if (typeof client?.query !== 'function') fail('M10_EXISTING_POSTGRES_CLIENT_REQUIRED');
      const selectRound = row => row ? { userId: row.user_id, gameId: row.game_id, roundId: row.round_id,
        requestKey: row.request_key, bet: row.receipt.bet, winAmount: row.receipt.winAmount, receipt: copy(row.receipt) } : null;
      const tx = {
        authenticate: request => authenticate(request, client, true),
        ...Object.fromEntries(walletMethods.map(name => [name, (...args) => wallet[name](client, ...args)])),
        async findRequest(userId, token) {
          const own = await client.query('SELECT kind,fingerprint,receipt FROM sw_new_m10.requests WHERE user_id=$1 AND request_key=$2', [userId, token]);
          if (own.rowCount) {
            if (own.rowCount !== 1) fail('M10_REQUEST_JOURNAL_INVALID');
            return { kind: own.rows[0].kind, fingerprint: own.rows[0].fingerprint, receipt: copy(own.rows[0].receipt) };
          }
          // Preserve the original engine's request-token collision domain.
          const old = await client.query('SELECT 1 FROM sw_nine.game_rounds WHERE user_id=$1 AND request_key=$2 UNION ALL SELECT 1 FROM sw_nine.actions WHERE user_id=$1 AND request_key=$2 LIMIT 1', [userId, token]);
          return old.rowCount ? { kind: 'EXISTING_OTHER_ACTION', fingerprint: null, receipt: null } : null;
        },
        async insertRequest(userId, token, kind, fingerprint, receipt) {
          await client.query('INSERT INTO sw_new_m10.requests(user_id,request_key,kind,fingerprint,receipt) VALUES($1,$2,$3,$4,$5::jsonb)',
            [userId, token, kind, fingerprint, JSON.stringify(receipt)]);
        },
        async findRound(userId, roundId) {
          const result = await client.query('SELECT user_id,game_id,round_id,request_key,receipt FROM sw_new_m10.rounds WHERE user_id=$1 AND round_id=$2', [userId, roundId]);
          return selectRound(result.rows[0]);
        },
        async latestRound(userId) {
          const result = await client.query('SELECT user_id,game_id,round_id,request_key,receipt FROM sw_new_m10.rounds WHERE user_id=$1 AND game_id=$2 ORDER BY ordinal DESC LIMIT 1', [userId, GAME_ID]);
          return selectRound(result.rows[0]);
        },
        async insertRound(round) {
          await client.query('INSERT INTO sw_new_m10.rounds(round_id,user_id,game_id,request_key,stake_minor,win_minor,receipt) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',
            [round.roundId, round.userId, GAME_ID, round.requestKey, minor(round.bet).toString(), minor(round.winAmount).toString(), JSON.stringify(round.receipt)]);
          // Required for zero-win rounds too: the old gamble eligibility path
          // relies on ANY newer shared order, not just newer winning rounds.
          await roundHooks.registerRound(client, copy(round));
        },
        async findCollection(userId, roundId) {
          const result = await client.query('SELECT receipt FROM sw_new_m10.collections WHERE user_id=$1 AND round_id=$2', [userId, roundId]);
          return result.rows[0] ? copy(result.rows[0].receipt) : null;
        },
        async insertCollection(userId, roundId, receipt) {
          await client.query('INSERT INTO sw_new_m10.collections(round_id,collection_id,user_id,amount_minor,receipt) VALUES($1,$2,$3,$4,$5::jsonb)',
            [roundId, receipt.collectionId, userId, minor(receipt.amount).toString(), JSON.stringify(receipt)]);
        },
        async listGambles(userId, roundId) {
          const result = await client.query('SELECT receipt FROM sw_new_m10.gambles WHERE user_id=$1 AND round_id=$2 ORDER BY attempt', [userId, roundId]);
          return result.rows.map(row => copy(row.receipt));
        },
        async insertGamble(userId, roundId, receipt) {
          await client.query('INSERT INTO sw_new_m10.gambles(round_id,attempt,gamble_id,user_id,request_key,pending_minor,receipt) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',
            [roundId, receipt.attempt, receipt.gambleId, userId, receipt.requestKey, minor(receipt.pendingWinAfter).toString(), JSON.stringify(receipt)]);
        },
      };
      return fn(tx);
    }),
  });
}
