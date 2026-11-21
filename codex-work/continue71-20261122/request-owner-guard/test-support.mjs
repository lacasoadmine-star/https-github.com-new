import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { SQL } from './request-owner-guard.mjs';
import { createGuardedLegacyAction, createGuardedMultiHot10Lifecycle } from './adapter-seams.mjs';

export const M10 = 'zplay72_multi_hot_10_v1';
export const token = randomUUID;
export const request = (userId = 'isolated-user') => ({ userId });
export const body = (gameId, roundToken = token()) => ({ gameId, roundToken, bet: '1.00' });

class Locks {
  constructor() { this.tails = new Map(); }
  async acquire(key) {
    const before = this.tails.get(key) ?? Promise.resolve();
    let release; const own = new Promise(resolve => { release = resolve; });
    this.tails.set(key, own); await before;
    return () => { release(); if (this.tails.get(key) === own) this.tails.delete(key); };
  }
}

/** Transaction/concurrency fake only; it does not run PostgreSQL or a wallet. */
export function memoryDatabase({ installed = true } = {}) {
  const rows = [], debits = new Map(), locks = new Locks(), queries = [], transactions = [];
  const transaction = async fn => {
    const writes = [], changes = new Map(), held = new Map();
    const allRows = () => [...rows, ...writes];
    const client = {
      async lock(key) { if (!held.has(key)) held.set(key, await locks.acquire(key)); },
      async query(sql, parameters = []) {
        queries.push({ sql, parameters: structuredClone(parameters) });
        if (sql === SQL.lock) { await client.lock('request:' + parameters[0]); return { rowCount: 1, rows: [{}] }; }
        if (sql === SQL.newJournal) return { rowCount: 1, rows: [{ installed }] };
        if (sql === SQL.legacyOwners) {
          const [uid, key, canonical] = parameters;
          assert.ok(held.has('wallet:' + uid), 'the same existing wallet lock precedes owner lookup');
          const found = allRows().filter(row => row.userId === uid && row.journal !== 'm10' &&
            (row.key === key || canonical && row.key.toLowerCase() === canonical));
          return { rowCount: found.length, rows: found.map(({ journal, game_id, action }) => ({ journal, game_id, action })) };
        }
        if (sql === SQL.newOwners) {
          const [uid, key] = parameters;
          assert.ok(held.has('wallet:' + uid), 'new owner lookup uses the same existing wallet lock');
          const found = allRows().filter(row => row.userId === uid && row.journal === 'm10' && row.key.toLowerCase() === key.toLowerCase());
          return { rowCount: found.length, rows: found.map(({ journal, game_id, action }) => ({ journal, game_id, action })) };
        }
        throw new Error('Unknown isolated query');
      },
      lookup(journal, uid, key) {
        return allRows().find(row => row.journal === journal && row.userId === uid &&
          (journal === 'm10' ? row.key.toLowerCase() === key.toLowerCase() : row.key === key))?.receipt ?? null;
      },
      debit(uid) { assert.ok(held.has('wallet:' + uid)); changes.set(uid, (changes.get(uid) ?? 0) + 1); },
      insert(row) { assert.ok(held.has('wallet:' + row.userId)); writes.push(structuredClone(row)); },
    };
    try {
      const value = await fn(client);
      rows.push(...writes); for (const [uid, n] of changes) debits.set(uid, (debits.get(uid) ?? 0) + n);
      transactions.push('COMMIT'); return value;
    } catch (error) { transactions.push('ROLLBACK'); throw error; }
    finally { for (const release of [...held.values()].reverse()) release(); }
  };
  const authenticate = async req => req.userId;
  const lockWallets = async (client, uid) => client.lock('wallet:' + uid);
  return { transaction, authenticate, lockWallets, wallet: { lockWallets }, queries, transactions,
    rows, debits, seed(row) { rows.push(structuredClone(row)); }, setInstalled(value) { installed = value; } };
}

// Two tiny synthetic adapters emulate only accepted-key journalling/replay.
// They contain no game evaluator and are never imported by runtime code.
export function legacyFactory({ beforeWrite = async () => {}, afterWrite = async () => {},
  record = true, kind = 'SPIN', observe = () => {} } = {}) {
  return dependencies => async (req, input) => {
    observe(dependencies);
    if (!await dependencies.authenticate(req)) throw Object.assign(new Error('PLAYER_LOGIN_REQUIRED'), { status: 401 });
    return dependencies.transaction(async client => {
      const userId = await dependencies.authenticate(req, client, true);
      await dependencies.lockWallets(client, userId);
      const journal = kind === 'SPIN' ? 'legacy-round' : 'legacy-action';
      const previous = client.lookup(journal, userId, input.roundToken); if (previous) return previous;
      await beforeWrite(); client.debit(userId);
      const receipt = { testOnly: true, gameId: input.gameId, action: kind, requestKey: input.roundToken };
      if (record) client.insert({ journal, game_id: input.gameId, userId, key: input.roundToken, action: kind, receipt });
      await afterWrite(); return receipt;
    });
  };
}
export function m10Factory({ beforeWrite = async () => {}, afterWrite = async () => {}, record = true } = {}) {
  return dependencies => {
    const run = action => async (req, input) => dependencies.transaction(async client => {
      const userId = await dependencies.authenticate(req, client, true);
      await dependencies.wallet.lockWallets(client, userId);
      const previous = client.lookup('m10', userId, input.roundToken); if (previous) return previous;
      await beforeWrite(); client.debit(userId);
      const receipt = { testOnly: true, gameId: input.gameId, action, requestKey: input.roundToken };
      if (record) client.insert({ journal: 'm10', game_id: input.gameId, userId, key: input.roundToken, action, receipt });
      await afterWrite(); return receipt;
    });
    return { handles: id => id === M10, state: async () => ({ testOnly: true, readOnly: true }),
      spin: run('SPIN'), takeWin: run('TAKE_WIN'), gamble: run('GAMBLE') };
  };
}
export function setup(options = {}) {
  const db = memoryDatabase(options);
  return { db,
    legacy: (extra = {}) => createGuardedLegacyAction({ dependencies: db, createAction: legacyFactory(extra), kind: extra.kind ?? 'SPIN' }),
    m10: (extra = {}) => createGuardedMultiHot10Lifecycle({ dependencies: db, createLifecycle: m10Factory(extra) }) };
}
