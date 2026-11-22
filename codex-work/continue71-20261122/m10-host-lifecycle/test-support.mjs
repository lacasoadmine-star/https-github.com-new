// Synthetic relation/transaction fixture only. Real PostgreSQL coverage is in
// postgres/run-tests.mjs. The old gamble source is loaded only to check old
// compatibility, never as a new-game presentation or payout specification.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createM10RoundOwnership, SQL } from './round-ownership.mjs';
import { GAME_ID } from '../../new-games72-20261121/games/multi-hot-10/backend/contract.mjs';

export const userId = 'synthetic-m10-host-player';
export const guard = 'a'.repeat(64);
export const oldGameId = 'fresh_multihot20';
export const modelIdentity = { mathVersion: 'synthetic-host-test-v1', engineVersion: 'synthetic-host-test', mathSha256: 'b'.repeat(64) };
export const oldParent = () => ({ user_id: userId, round_id: randomUUID(), game_id: oldGameId,
  total_win: '50', created_at: new Date(0).toISOString(), result_json: { gameId: oldGameId, finalWin: '0.50', ...modelIdentity } });

export function acceptedRound({ winAmount = '0.00', bet = '1.00', roundId = randomUUID() } = {}) {
  const requestKey = randomUUID(), receipt = { schema: 'zplay/m10-deferred-round-receipt/v1', kind: 'SPIN',
    gameId: GAME_ID, roundId, requestKey, bet, currency: 'ETB', ...modelIdentity,
    grid: Array.from({ length: 3 }, () => ['seven', 'bell', 'grapes', 'watermelon', 'lemon']),
    multiplier: 1, winAmount, collectionStatus: winAmount === '0.00' ? 'NOT_REQUIRED' : 'PENDING',
    createdAt: new Date(0).toISOString(), previousCollection: null,
    walletReceipt: { currency: 'ETB', balanceBefore: '10.00', chargedStake: bet, creditedWin: '0.00', reservedWin: winAmount, balanceAfter: '9.00' } };
  return { userId, gameId: GAME_ID, roundId, requestKey, bet, winAmount, receipt };
}

export function fixture() {
  let data = { journal: new Map(), orders: new Map(), native: [], holds: new Map(), collections: new Map() };
  let sequence = 0n, queue = Promise.resolve();
  const lockWallets = async (client, owner) => { assert.equal(owner, userId); client.locked = true; };
  const ownership = createM10RoundOwnership({ lockWallets });
  const row = value => ({ rowCount: value ? 1 : 0, rows: value ? [structuredClone(value)] : [] });
  function clientFor(draft) {
    return { locked: false, async query(sql, args = []) {
      assert.equal(this.locked, true, 'Host queries must remain inside the locked transaction.');
      if (sql === SQL.journal) return row(draft.journal.get(args[0].toLowerCase()));
      if (sql === SQL.insertOrder) {
        const next = (++sequence).toString(); // PostgreSQL sequences may leave gaps.
        if (draft.orders.has(args[0])) return row(null);
        const record = { id: args[0], user_id: args[1], game: args[2], bet: args[3], payout: args[4], outcome: JSON.parse(args[5]), settled_order: next };
        draft.orders.set(record.id, record); return row({ settled_order: next });
      }
      if (sql === SQL.order) return row(draft.orders.get(args[0]));
      if (sql === SQL.nativeActive) {
        const rows = draft.native.filter(item => item.user_id === args[0]).map(({ id, game_id }) => ({ id, game_id })).slice(0, 2);
        return { rowCount: rows.length, rows: structuredClone(rows) };
      }
      if (sql === SQL.m10Active) {
        const rows = [...draft.holds.values()].filter(item => item.user_id === args[0] && BigInt(item.amount_minor) > 0n).map(item => {
          const parent = draft.journal.get(item.round_id);
          return { ...item, round_user_id: parent?.user_id ?? null, game_id: parent?.game_id ?? null,
            receipt: parent?.receipt ?? null, collection_id: draft.collections.get(item.round_id) ?? null };
        }).slice(0, 2);
        return { rowCount: rows.length, rows: structuredClone(rows) };
      }
      if (sql === "SELECT attempt,result_json FROM sw_nine.actions WHERE parent_id=$1 AND kind='GAMBLE' ORDER BY attempt DESC LIMIT 1") return row(null);
      if (sql === 'SELECT settled_order FROM sw_rebuild.rounds WHERE id=$1 AND user_id=$2') {
        const value = draft.orders.get(args[0]); return row(value?.user_id === args[1] ? { settled_order: value.settled_order } : null);
      }
      if (sql === 'SELECT 1 FROM sw_rebuild.rounds WHERE user_id=$1 AND settled_order>$2::bigint LIMIT 1') {
        return row([...draft.orders.values()].some(item => item.user_id === args[0] && BigInt(item.settled_order) > BigInt(args[1])) ? { '?column?': 1 } : null);
      }
      throw Error('UNEXPECTED_SYNTHETIC_QUERY: ' + sql);
    } };
  }
  async function transaction(fn) {
    const before = queue; let finish; queue = new Promise(resolve => { finish = resolve; }); await before;
    const draft = structuredClone(data), client = clientFor(draft);
    try { const value = await fn(client, draft); data = draft; return value; } finally { finish(); }
  }
  const insertJournal = (draft, round) => draft.journal.set(round.roundId.toLowerCase(), {
    round_id: round.roundId.toLowerCase(), user_id: round.userId, game_id: GAME_ID,
    request_key: round.requestKey.toLowerCase(), stake_minor: BigInt(round.bet.replace('.', '')).toString(),
    win_minor: BigInt(round.winAmount.replace('.', '')).toString(), receipt: structuredClone(round.receipt) });
  const seedOld = async parent => transaction(async (client, draft) => {
    await lockWallets(client, userId);
    draft.orders.set('nine:' + parent.round_id, { id: 'nine:' + parent.round_id, user_id: userId,
      game: oldGameId, bet: '100', payout: parent.total_win, outcome: parent.result_json, settled_order: (++sequence).toString() });
  });
  return { ownership, transaction, lockWallets, insertJournal, seedOld, snapshot: () => structuredClone(data) };
}

// A normal CI checkout imports the same tracked source. In a sparse local
// checkout, read the exact own-code Git blob instead of changing old files.
async function trackedSource(path) {
  const root = new URL('../../../', import.meta.url);
  try { return await readFile(new URL(path, root), 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return (await promisify(execFile)('git', ['show', 'HEAD:' + path], { cwd: fileURLToPath(root), maxBuffer: 1024 * 1024 })).stdout;
  }
}
let legacyFactory;
export async function existingGambleFactory() {
  if (!legacyFactory) {
    const prefix = 'codex-work/native72-20261119/changes/batch01/server/';
    const [math, gamble] = await Promise.all([trackedSource(prefix + 'official-math.mjs'), trackedSource(prefix + 'existing-gamble.mjs')]);
    const dataUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
    const needle = "from './official-math.mjs'";
    assert.equal(gamble.split(needle).length, 2, 'The tracked old module import contract changed.');
    legacyFactory = (await import(dataUrl(gamble.replace(needle, 'from ' + JSON.stringify(dataUrl(math)))))).createExistingGamble;
  }
  return legacyFactory;
}
export function oldDependencies(h) {
  return { authenticate: async () => userId, transaction: h.transaction, lockWallets: h.lockWallets,
    move: async () => { throw Error('NO_FINANCIAL_WRITE_IN_STATE_FIXTURE'); }, balance: async () => '10000',
    houseFor: () => 'synthetic-existing-house', hash: () => guard, accepting: () => true,
    profileForGame: async () => modelIdentity, publicGames: () => [{ id: oldGameId, freshReleaseReady: true }],
    assertOperatorWagerEnabled: async () => {}, assertNoActive: async () => {}, assertPlayerCapacity: async () => {}, now: () => 0 };
}
