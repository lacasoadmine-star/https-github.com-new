import { isDeepStrictEqual } from 'node:util';
import { GAME_ID, UUID, HASH, MONEY, minor, copy, freeze, fail } from '../../new-games72-20261121/games/multi-hot-10/backend/contract.mjs';

const textId = value => typeof value === 'string' && value.length > 0 && value.length <= 512 && !value.includes('\0');
const positiveOrder = value => typeof value === 'string' && /^[1-9]\d*$/.test(value);
const expectedReceipt = receipt => receipt?.schema === 'zplay/m10-deferred-round-receipt/v1' &&
  receipt.kind === 'SPIN' && receipt.gameId === GAME_ID && receipt.currency === 'ETB';

export const SQL = Object.freeze({
  journal: `SELECT round_id,user_id,game_id,request_key,stake_minor::text,win_minor::text,receipt
 FROM sw_new_m10.rounds WHERE round_id=$1::uuid FOR SHARE`,
  insertOrder: `INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome)
 VALUES($1,$2,$3,$4::bigint,$5::bigint,$6::jsonb) ON CONFLICT(id) DO NOTHING RETURNING settled_order::text`,
  order: 'SELECT id,user_id,game,bet::text,payout::text,outcome,settled_order::text FROM sw_rebuild.rounds WHERE id=$1',
  nativeActive: `SELECT id,game_id FROM sw_native_library.rounds
 WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 2`,
  m10Active: `SELECT h.round_id,h.user_id,h.amount_minor::text,r.user_id AS round_user_id,r.game_id,r.receipt,
 c.collection_id FROM sw_new_m10.reservations h
 LEFT JOIN sw_new_m10.rounds r ON r.round_id=h.round_id
 LEFT JOIN sw_new_m10.collections c ON c.round_id=h.round_id
 WHERE h.user_id=$1 AND h.amount_minor>0 ORDER BY h.round_id LIMIT 2`,
});

/** Same-client hooks for the existing wallet-locked host transaction.
 * These functions install no route, table, profile or release flag.
 */
export function createM10RoundOwnership({ lockWallets } = {}) {
  if (typeof lockWallets !== 'function') fail('M10_EXISTING_WALLET_LOCKS_REQUIRED');
  async function lock(client, userId) {
    if (typeof client?.query !== 'function' || !textId(userId)) fail('M10_EXISTING_TRANSACTION_REQUIRED');
    await lockWallets(client, userId);
  }
  async function registerRound(client, supplied) {
    const round = copy(supplied);
    if (!round || !textId(round.userId) || round.gameId !== GAME_ID || !UUID.test(round.roundId ?? '') ||
      !UUID.test(round.requestKey ?? '') || !MONEY.test(round.bet ?? '') || !MONEY.test(round.winAmount ?? '') ||
      !expectedReceipt(round.receipt) || round.receipt.roundId !== round.roundId ||
      round.receipt.requestKey !== round.requestKey || round.receipt.bet !== round.bet ||
      round.receipt.winAmount !== round.winAmount) fail('M10_SHARED_ROUND_INVALID');
    const stake = minor(round.bet), win = minor(round.winAmount), receipt = round.receipt;
    if (stake <= 0n || receipt.collectionStatus !== (win > 0n ? 'PENDING' : 'NOT_REQUIRED') ||
      receipt.walletReceipt?.currency !== 'ETB' || receipt.walletReceipt.chargedStake !== round.bet ||
      receipt.walletReceipt.reservedWin !== round.winAmount || receipt.walletReceipt.creditedWin !== '0.00') {
      fail('M10_SHARED_ROUND_INVALID');
    }
    await lock(client, round.userId);
    const own = await client.query(SQL.journal, [round.roundId]);
    const saved = own.rows?.[0];
    if (own.rowCount !== 1 || saved.round_id !== round.roundId.toLowerCase() || saved.user_id !== round.userId ||
      saved.game_id !== GAME_ID || saved.request_key !== round.requestKey.toLowerCase() ||
      saved.stake_minor !== stake.toString() || saved.win_minor !== win.toString() || !isDeepStrictEqual(saved.receipt, receipt)) {
      fail('M10_SHARED_ROUND_JOURNAL_MISMATCH');
    }
    const sharedId = 'new-m10:' + round.roundId.toLowerCase();
    // payout is the immutable accepted base-game award, not a claim that a
    // deferred win has been credited. Its receipt keeps PENDING/creditedWin=0.
    // Ledger/collection records remain the authority for actual transfers.
    await client.query(SQL.insertOrder, [sharedId, round.userId, GAME_ID, stake.toString(), win.toString(), JSON.stringify(receipt)]);
    const registered = await client.query(SQL.order, [sharedId]), row = registered.rows?.[0];
    if (registered.rowCount !== 1 || row.id !== sharedId || row.user_id !== round.userId || row.game !== GAME_ID ||
      row.bet !== stake.toString() || row.payout !== win.toString() || !isDeepStrictEqual(row.outcome, receipt)) {
      fail('M10_SHARED_ROUND_CONFLICT', 409);
    }
    if (!positiveOrder(row.settled_order)) fail('M10_SHARED_ROUND_ORDER_UNAVAILABLE');
    return freeze({ gameId: GAME_ID, roundId: round.roundId.toLowerCase(), sharedRoundId: sharedId, settledOrder: row.settled_order });
  }
  async function activeRound(client, userId) {
    await lock(client, userId);
    const native = await client.query(SQL.nativeActive, [userId]);
    const pending = await client.query(SQL.m10Active, [userId]);
    if (!Array.isArray(native.rows) || !Array.isArray(pending.rows) ||
      native.rows.length > 1 || pending.rows.length > 1 || native.rows.length && pending.rows.length) {
      fail('M10_CROSS_GAME_ACTIVE_CONFLICT');
    }
    const old = native.rows[0], own = pending.rows[0];
    if (old) {
      if (!textId(old.id) || !textId(old.game_id) || old.game_id === GAME_ID) fail('M10_NATIVE_ACTIVE_RECORD_INVALID');
      return freeze({ gameId: old.game_id, roundId: old.id });
    }
    if (!own) return null;
    if (own.user_id !== userId || own.round_user_id !== userId || own.game_id !== GAME_ID ||
      !UUID.test(own.round_id ?? '') || !/^[1-9]\d*$/.test(own.amount_minor ?? '') ||
      own.collection_id !== null || !expectedReceipt(own.receipt) || own.receipt.roundId !== own.round_id ||
      own.receipt.collectionStatus !== 'PENDING') fail('M10_ACTIVE_JOURNAL_MISMATCH');
    return freeze({ gameId: GAME_ID, roundId: own.round_id });
  }
  async function assertNoActive(client, userId) {
    const active = await activeRound(client, userId);
    if (active) fail('FINISH_ACTIVE_ROUND:' + active.gameId, 409);
  }
  /** Wire inside the host's existing authenticated state transaction. The
   * readSnapshot closure is the existing catalogue/balance/latest read, using
   * this client. The actual old gamble describe method receives merged owner
   * BEFORE deriving availability; no post-transaction response patch is used.
   */
  async function describeLegacyState(client, userId, { readSnapshot, describeGamble } = {}) {
    if (typeof readSnapshot !== 'function' || typeof describeGamble !== 'function') fail('M10_EXISTING_STATE_CALLBACKS_REQUIRED');
    const active = await activeRound(client, userId);
    const snapshot = await readSnapshot(client, userId), base = snapshot?.state, parent = snapshot?.parent;
    if (!base || base.authenticated !== true || base.currency !== 'ETB' || !HASH.test(base.sessionGuard ?? '') ||
      !MONEY.test(base.balance ?? '') || !textId(base.game?.id) || base.game.id === GAME_ID ||
      typeof base.game.enabled !== 'boolean') fail('M10_EXISTING_STATE_INVALID');
    if (parent && (parent.result_json?.gameId !== base.game.id ||
      parent.user_id !== undefined && parent.user_id !== userId)) fail('M10_EXISTING_STATE_OWNER_MISMATCH');
    const blockedByActiveGame = active?.gameId ?? null;
    const gamble = parent ? await describeGamble(client, userId, parent, {
      enabled: base.game.enabled, blockedByActiveGame, currentProfile: snapshot.currentProfile,
    }) : null;
    return freeze({ ...copy(base), blockedByActiveGame,
      round: parent ? { result: copy(parent.result_json), createdAt: copy(parent.created_at), gamble: copy(gamble) } : null });
  }
  return Object.freeze({ registerRound, activeRound, assertNoActive, describeLegacyState });
}
