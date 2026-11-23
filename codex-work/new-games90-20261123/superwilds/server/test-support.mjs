/** Disposable synthetic host contract. Never imported by production modules. */
import { createHash } from 'node:crypto';
import { createSuperWildsLifecycle, GAME_ID, SuperWildsError } from './lifecycle.mjs';
export const TOKEN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const GUARD = 'a'.repeat(64);
const copy = value => structuredClone(value);
const error = code => { throw new SuperWildsError(code); };
export function fixture({ win = 300n, initialPlayer = 10000n, initialHouse = 1000000n } = {}) {
  let database = { player: initialPlayer, house: initialHouse, reserved: 0n, active: null,
    gambles: new Map(), reservationEvents: [], requests: new Map(), rounds: new Map(), collections: new Map(), owners: new Map(), ledger: [], order: [] };
  const controls = { release: true, modelAvailable: true, guard: GUARD, userId: 'fixture-player',
    inTransactionUser: 'fixture-player', failAt: null, sampled: 0, maximum: 10000n,
    malformed: false, validOutcome: true, sampledAfterDebit: null, debitWrites: 0, creditWrites: 0 };
  let sequence = 1, queue = Promise.resolve();
  const nextId = () => '00000000-0000-4000-8000-' + String(sequence++).padStart(12, '0');
  const invoke = name => { if (controls.failAt === name) error('FIXTURE_FAILURE_' + name); };
  const key = (userId, token) => `${userId}:${token.toLowerCase()}`;
  const model = {
    gameId: GAME_ID, approved: true, engineVersion: 'fixture-engine', mathVersion: 'fixture-math', mathSha256: 'f'.repeat(64),
    betLevels: ['1.00', '2.00'], verification: { legalOutcomesVerified: true, outcomeDistributionVerified: true,
      aggregatePayoutVerified: true, roundingVerified: true, deferredLifecycleVerified: true, etbPolicyVerified: true },
    maximumPayoutMinor: () => controls.maximum,
    sampleOutcome: () => {
      controls.sampled++; controls.sampledAfterDebit = database.player;
      invoke('sample');
      return { grid: controls.malformed ? [['wrong']] : Array.from({ length: 3 }, () => ['wild', 'cherry', 'plum', 'seven', 'bell']),
        winLines: [], totalWinMinor: win };
    },
    validateOutcome: () => controls.validOutcome,
  };
  const transaction = fn => {
    const job = queue.then(async () => {
      const before = copy(database), tx = {
        authenticate: async () => controls.inTransactionUser,
        lockWallets: async () => invoke('lock'), assertReady: async () => invoke('ready'),
        withRequestOwner: async (identity, operation) => {
          const stored = database.owners.get(key(identity.userId, identity.requestKey));
          if (stored && (stored.gameId !== identity.gameId || stored.kind !== identity.kind)) {
            throw new SuperWildsError('IDEMPOTENCY_PARAMETER_CONFLICT', 409);
          }
          const result = await operation();
          const saved = database.owners.get(key(identity.userId, identity.requestKey));
          if (!saved || saved.gameId !== identity.gameId || saved.kind !== identity.kind) error('OWNER_NOT_RECORDED');
          return result;
        },
        findGambles: async (uid, id) => { if (database.rounds.get(id)?.userId !== uid) return []; return copy(database.gambles.get(id) ?? []); },
        insertGamble: async (uid, id, receipt) => { invoke('insertGamble'); const all = database.gambles.get(id) ?? [];
          if (all.some(r => r.attempt === receipt.attempt || r.actionId === receipt.actionId)) error('DUPLICATE_GAMBLE');
          database.gambles.set(id, [...all, copy(receipt)]); },
        findRequest: async (uid, token) => copy(database.requests.get(key(uid, token)) ?? null),
        insertRequest: async (uid, token, kind, fingerprint, receipt) => {
          invoke('insertRequest');
          if (database.requests.has(key(uid, token))) error('DUPLICATE_REQUEST');
          database.requests.set(key(uid, token), { kind, fingerprint, receipt: copy(receipt) });
          database.owners.set(key(uid, token), { gameId: GAME_ID, kind });
        },
        findRound: async (uid, id) => { const r = database.rounds.get(id); return r?.userId === uid ? copy(r) : null; },
        latestRound: async uid => copy([...database.rounds.values()].filter(r => r.userId === uid).at(-1) ?? null),
        insertRound: async round => { invoke('insertRound'); database.rounds.set(round.roundId, copy(round)); },
        registerRound: async round => { invoke('registerRound'); database.order.push(copy(round)); },
        findCollection: async (uid, id) => {
          if (database.rounds.get(id)?.userId !== uid) return null;
          return copy(database.collections.get(id) ?? null);
        },
        insertCollection: async (uid, id, receipt) => { invoke('insertCollection'); database.collections.set(id, copy(receipt)); },
        playerBalance: async () => database.player,
        houseBalance: async () => database.house - database.reserved,
        reservedBalance: async () => database.reserved,
        assertNoActiveRound: async () => { if (database.active) throw new SuperWildsError('FINISH_ACTIVE_ROUND', 409); },
        assertPlayerCapacity: async () => invoke('capacity'),
        activeRound: async () => copy(database.active),
        claimActiveRound: async (uid, gameId, roundId) => { invoke('claim'); database.active = { gameId, roundId }; },
        releaseActiveRound: async () => { invoke('release'); database.active = null; },
        debitStake: async ({ amountMinor, roundId }) => {
          invoke('debit'); controls.debitWrites++;
          database.player -= amountMinor; database.house += amountMinor;
          database.ledger.push({ kind: 'BET', roundId, debit: -amountMinor, credit: amountMinor });
        },
        reserveWin: async ({ amountMinor }) => {
          invoke('reserve'); if (database.house - database.reserved < amountMinor) error('HOUSE_FLOOR');
          database.reserved += amountMinor;
        },
        increaseReservedWin: async args => { invoke('increase'); if (database.house - database.reserved < args.amountMinor) error('HOUSE_FLOOR');
          database.reserved += args.amountMinor; database.reservationEvents.push({kind:'INCREASE', ...args}); },
        releaseReservedWin: async args => { invoke('lose'); if (database.reserved < args.amountMinor) error('HOLD_MISSING');
          database.reserved -= args.amountMinor; database.reservationEvents.push({kind:'RELEASE', ...args}); },
        creditReservedWin: async ({ amountMinor, roundId }) => {
          invoke('credit'); controls.creditWrites++;
          database.reserved -= amountMinor; database.house -= amountMinor; database.player += amountMinor;
          database.ledger.push({ kind: 'WIN', roundId, debit: -amountMinor, credit: amountMinor });
        },
      };
      try { return await fn(tx); } catch (e) { database = before; throw e; }
    });
    queue = job.catch(() => {});
    return job;
  };
  const dependencies = { authenticate: async () => controls.userId, sessionGuard: async () => controls.guard,
    transaction, hash: value => createHash('sha256').update(value).digest('hex'),
    getApprovedModel: async () => controls.modelAvailable ? model : null,
    releaseEnabled: () => controls.release, uuid: nextId, now: () => '2026-11-23T00:00:00.000Z' };
  const service = createSuperWildsLifecycle(dependencies);
  const action = (token = TOKEN, values = {}) => ({ gameId: GAME_ID, roundToken: token, sessionGuard: controls.guard,
    bet: '1.00', engineVersion: model.engineVersion, mathVersion: model.mathVersion, mathSha256: model.mathSha256,
    collectRoundId: null, ...values });
  const take = (round, token = nextId(), values = {}) => {
    const a = action(token, { roundId: round.roundId, ...values }); delete a.collectRoundId; return a;
  };
  return { service, action, take, model, controls, dependencies, nextId,
    request: () => new Request('https://fixture.invalid/api/native/superwilds'),
    snapshot: () => copy(database), mutate: fn => fn(database) };
}
