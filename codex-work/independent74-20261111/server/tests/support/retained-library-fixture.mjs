import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LibraryService, createRegistry } from './retained-library/library-service.mjs';
import { installCrossActiveGuards } from './retained-library/library-backend.mjs';
import { installExistingLibrary74 } from '../../existing-library74-service.mjs';
import { listGameDefinitions } from '../../../math/official72.mjs';

// This module is test infrastructure, never a production bootstrap. It runs the
// exact retained financial classes against a disposable, in-memory PostgreSQL
// engine. PGlite has one connection: it does not prove multi-process locking.
let retainedClass;
async function loadRetainedSharedWallet() {
  if (process.env.DATABASE_URL) throw new Error('EXTERNAL_DATABASE_FORBIDDEN_IN_ISOLATED_FIXTURE');
  if (retainedClass) return retainedClass;
  retainedClass = (async () => {
    const base = new URL('./retained-library/', import.meta.url);
    const manifest = JSON.parse(await readFile(new URL('provenance.json', base), 'utf8'));
    const source = {};
    for (const entry of manifest.files) {
      const bytes = await readFile(new URL(entry.file, base));
      if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error('RETAINED_FINANCIAL_FIXTURE_HASH_CHANGED');
      source[entry.file] = bytes.toString('utf8');
    }
    const folder = await mkdtemp(join(tmpdir(), 'independent74-retained-'));
    const previousBun = globalThis.Bun;
    // Even an accidentally added bootstrap URL cannot construct a network DB.
    globalThis.Bun = { SQL: class { constructor() { throw new Error('NETWORK_DATABASE_FORBIDDEN'); } } };
    try {
      const path = join(folder, 'retained-shared-wallet.mjs');
      await writeFile(path, source['native-family-preserved.mjs'] + '\nexport { q as ReviewSharedWallet, L as ReviewNativeDefinitions };\n');
      const retained = await import(pathToFileURL(path).href);
      return { SharedWallet: retained.ReviewSharedWallet, nativeDefinitions: structuredClone(retained.ReviewNativeDefinitions), verifyNative: retained.verifyNative, readNativeBody: retained.readNativeBody };
    } finally {
      if (previousBun === undefined) delete globalThis.Bun; else globalThis.Bun = previousBun;
      await rm(folder, { recursive: true, force: true });
    }
  })();
  return retainedClass;
}

const fixtureSchema = `
CREATE SCHEMA sw_rebuild;
CREATE TABLE sw_rebuild.users(id text PRIMARY KEY,parent_id text,role text NOT NULL,status text NOT NULL);
CREATE TABLE sw_rebuild.wallets(id text PRIMARY KEY,balance bigint NOT NULL CHECK(balance>=0),credit_limit bigint NOT NULL);
CREATE TABLE sw_rebuild.transfers(id text PRIMARY KEY,sender text REFERENCES sw_rebuild.wallets(id),recipient text REFERENCES sw_rebuild.wallets(id),amount bigint NOT NULL CHECK(amount>0),kind text,actor text,notes text);
CREATE TABLE sw_rebuild.ledger(id bigserial PRIMARY KEY,transfer_id text REFERENCES sw_rebuild.transfers(id),wallet_id text REFERENCES sw_rebuild.wallets(id),delta bigint NOT NULL);
CREATE TABLE sw_rebuild.rounds(id text PRIMARY KEY,user_id text,game text,bet bigint,payout bigint,outcome jsonb);
CREATE TABLE sw_rebuild.audit(id bigserial PRIMARY KEY,actor text,event text,target text,details jsonb);
CREATE TABLE sw_rebuild.account_limits(user_id text PRIMARY KEY,max_balance bigint);
CREATE TABLE sw_rebuild.live_revisions(user_id text PRIMARY KEY,revision bigint NOT NULL);
CREATE FUNCTION sw_rebuild.sw_live_touch(text[]) RETURNS void LANGUAGE SQL AS 'SELECT';
CREATE SCHEMA sw_jetx_native;
CREATE TABLE sw_jetx_native.bets(id text PRIMARY KEY,user_id text,status text);
CREATE SCHEMA sw_observed_machines;
CREATE TABLE sw_observed_machines.rounds(id text PRIMARY KEY,status text,state jsonb);
INSERT INTO sw_rebuild.users VALUES('fixture-agent',NULL,'agent','active');
`;

export async function createRetainedLibrary74Fixture({
  isolated = false,
  reviewedGameIds = listGameDefinitions().map(game => game.id),
  allowNewRounds = true,
  accepting = true,
  activeTtlMs = 15 * 60 * 1000,
  legacyAdapters = [],
  initialPlayerMinor = '10000000000',
  houseMinor = '100000000000000',
  now = Date.now,
  seed,
  id,
} = {}) {
  if (isolated !== true || process.env.DATABASE_URL) throw new Error('EXPLICIT_ISOLATED_QA_WITHOUT_DATABASE_URL_REQUIRED');
  if (![initialPlayerMinor, houseMinor].every(value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value))) throw new TypeError('Fixture money must be canonical integer strings.');
  const [{ PGlite }, { SharedWallet, nativeDefinitions, verifyNative, readNativeBody }] = await Promise.all([
    process.env.PGLITE_MODULE ? import(pathToFileURL(process.env.PGLITE_MODULE).href) : import('@electric-sql/pglite'),
    loadRetainedSharedWallet(),
  ]);
  const db = new PGlite();
  await db.exec(fixtureSchema);
  let queryFault;
  const wrap = connection => ({ unsafe: async (query, args = []) => {
    if (queryFault) await queryFault(query, args);
    if (args.length === 0 && query.includes(';')) { await connection.exec(query); return []; }
    return (await connection.query(query, args)).rows;
  } });
  const sql = { ...wrap(db), begin: callback => db.transaction(tx => callback(wrap(tx))) };
  const shared = new SharedWallet(sql, { now });
  const fixtureUserId = 'fixture-player';
  async function addPlayer(userId = 'fixture-' + randomUUID(), balanceMinor = initialPlayerMinor) {
    await sql.begin(async tx => {
      await tx.unsafe('INSERT INTO sw_rebuild.users(id,parent_id,role,status) VALUES($1,$2,$3,$4)', [userId, 'fixture-agent', 'player', 'active']);
      await tx.unsafe('INSERT INTO sw_rebuild.wallets(id,balance,credit_limit) VALUES($1,$2,0)', [userId, balanceMinor]);
    });
    return userId;
  }
  await addPlayer(fixtureUserId);
  await sql.unsafe('INSERT INTO sw_rebuild.wallets(id,balance,credit_limit) VALUES($1,$2,0)', ['house', houseMinor]);
  await shared.migrate();
  const service = new LibraryService(shared, { registry: createRegistry(legacyAdapters), now, accepting, autoTimers: false, ...(seed ? { seed } : {}), ...(id ? { id } : {}) });
  // Isolated schema creation is deliberately outside installExistingLibrary74.
  await service.migrate();
  const facade = installExistingLibrary74({ service, reviewedGameIds, allowNewRounds, activeTtlMs, gameLimits: Object.fromEntries(listGameDefinitions().map(g=>[g.id,{maxBetMinor:'5000000',maxWinMinor:'999999999999999'}])) });
  installCrossActiveGuards(shared, service);
  return {
    db, pglite: db, sql, shared, service, facade, fixtureUserId, addPlayer, legacyNativeDefinitions: nativeDefinitions, verifyNative, readNativeBody,
    setQueryFault: fault => { queryFault = fault; },
    async close() { queryFault = undefined; service.close(); await db.close(); },
  };
}
