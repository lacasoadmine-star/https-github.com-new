// TEST ONLY. This file is never imported by the production server.
// Account balances below are fixtures, never a fallback for an unavailable wallet.
import { fail } from '../../errors.mjs';

export class MemoryRepository {
  constructor({ beforeCommit, houseBalanceMinor = '1000000000000' } = {}) {
    this.accounts = new Map(); this.sessions = new Map(); this.locks = new Map();
    this.beforeCommit = beforeCommit;
    this.houseBalanceMinor = houseBalanceMinor; this.liabilities = new Map();
    this.actualProductionLedgerVerified = false;
  }
  addAccount(sessionHash, { userId = crypto.randomUUID(), balanceMinor = '10000', status = 'active', expiresAt = Date.now() + 3_600_000 } = {}) {
    this.accounts.set(userId, { userId, status, balanceMinor, rounds: new Map(), receipts: new Map(), requests: new Map(), ledger: [] });
    this.sessions.set(sessionHash, { userId, expiresAt }); return userId;
  }
  snapshot(sessionHash) { return structuredClone(this.accounts.get(this.sessions.get(sessionHash)?.userId)); }
  snapshotHouse() { return { balanceMinor: this.houseBalanceMinor, liabilities: structuredClone(this.liabilities) }; }
  async transact(sessionHash, operation) {
    const session = this.sessions.get(sessionHash);
    if (!session || session.expiresAt <= Date.now()) fail('AUTH_REQUIRED', 'Your account session has expired.', 401);
    const userId = session.userId;
    // The production adapter locks the shared bank as well as the player wallet.
    const lockKey = '__shared_bank__';
    const previous = this.locks.get(lockKey) || Promise.resolve();
    let release;
    const current = new Promise(resolve => { release = resolve; });
    const chained = previous.then(() => current); this.locks.set(lockKey, chained);
    await previous;
    try {
      const account = this.accounts.get(userId);
      const activeSession = this.sessions.get(sessionHash);
      if (!activeSession || activeSession.userId !== userId || activeSession.expiresAt <= Date.now() || !account || account.status !== 'active') fail('AUTH_REQUIRED', 'An active account session is required.', 401);
      const copy = structuredClone(account);
      let houseBalance = BigInt(this.houseBalanceMinor);
      const liabilities = structuredClone(this.liabilities);
      const record = id => copy.rounds.get(id) || null;
      const checkPositive = amount => { if (!/^[1-9]\d*$/.test(amount)) fail('INVALID_LEDGER_AMOUNT', 'Invalid ledger amount.', 503); return BigInt(amount); };
      const ledger = (kind, amount, metadata) => {
        const value = checkPositive(amount);
        if (copy.ledger.some(item => item.reference === metadata.reference)) fail('DUPLICATE_LEDGER_REFERENCE', 'This financial reference already exists.', 409);
        const balance = BigInt(copy.balanceMinor);
        if (kind === 'debit' && balance < value) fail('INSUFFICIENT_FUNDS', 'Your account balance is too low for this bet.', 422);
        if (kind === 'credit' && houseBalance < value) fail('HOUSE_RESERVE_INSUFFICIENT', 'The game reserve is insufficient.', 503);
        copy.balanceMinor = (kind === 'debit' ? balance - value : balance + value).toString();
        houseBalance = kind === 'debit' ? houseBalance + value : houseBalance - value;
        copy.ledger.push({ kind, amount_minor: amount, balance_minor: copy.balanceMinor, ...metadata });
      };
      const tx = {
        user: { id: userId },
        getBalanceMinor: async () => copy.balanceMinor,
        findActiveRound: async () => [...copy.rounds.values()].find(round => round.status === 'active') || null,
        getRound: async id => record(id),
        getChargingCarry: async (gameId, mathVersion, bucket) => {
          // Map insertion order is the fixture's accepted transaction order;
          // equal timestamps must not select an arbitrary UUID or older bucket.
          const previous = [...copy.rounds.values()].reverse().find(round => round.game_id === gameId && round.state.mathVersion === mathVersion && round.state.carryBucket?.baseBetMinor === bucket.baseBetMinor && round.state.carryBucket?.ante === bucket.ante);
          if (previous && !previous.state.carryAfter) fail('PERSISTED_CHARGING_CARRY_INVALID', 'The saved carry could not be verified.', 503);
          return previous ? structuredClone(previous.state.carryAfter) : null;
        },
        createRound: async value => {
          if (copy.rounds.has(value.id)) fail('ROUND_CONFLICT', 'The round already exists.', 409);
          if (value.status === 'active' && [...copy.rounds.values()].some(round => round.status === 'active')) fail('ACTIVE_ROUND_EXISTS', 'An active round already exists.', 409);
          copy.rounds.set(value.id, structuredClone(value));
        },
        updateRound: async (value, expectedVersion) => {
          if (!record(value.id) || record(value.id).version !== expectedVersion) fail('STALE_ROUND', 'The round changed.', 409);
          copy.rounds.set(value.id, structuredClone(value));
        },
        findRequest: async id => copy.requests.get(id) || null,
        rememberRequest: async value => {
          if (copy.requests.has(value.request_id)) fail('IDEMPOTENCY_CONFLICT', 'The request already exists.', 409);
          copy.requests.set(value.request_id, structuredClone(value));
        },
        upsertReceipt: async value => { copy.receipts.set(value.id, structuredClone(value)); },
        getReceipt: async id => copy.receipts.get(id) || null,
        listReceipts: async (limit, gameId) => [...copy.receipts.values()].filter(receipt => !gameId || receipt.game_id === gameId).sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.version - a.version).slice(0, limit),
        debit: async (amount, metadata) => ledger('debit', amount, metadata),
        credit: async (amount, metadata) => ledger('credit', amount, metadata),
        reserveLiability: async (amount, metadata) => {
          const value = checkPositive(amount);
          if (liabilities.has(metadata.round_id)) fail('ROUND_CONFLICT', 'The round reserve already exists.', 409);
          const reserved = [...liabilities.values()].reduce((sum, item) => sum + BigInt(item.amount_minor), 0n);
          if (houseBalance - reserved < value) fail('HOUSE_RESERVE_INSUFFICIENT', 'The game reserve is insufficient.', 503);
          liabilities.set(metadata.round_id, { ...metadata, amount_minor: amount });
        },
        releaseLiability: async roundId => { liabilities.delete(roundId); },
      };
      const result = await operation(tx);
      if (this.beforeCommit) await this.beforeCommit({ tx, account: copy, result });
      this.accounts.set(userId, copy); this.houseBalanceMinor = houseBalance.toString(); this.liabilities = liabilities; return result;
    } finally { release(); if (this.locks.get(lockKey) === chained) this.locks.delete(lockKey); }
  }
}
