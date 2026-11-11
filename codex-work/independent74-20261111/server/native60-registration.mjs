// Additive installation into the already initialized native LibraryService.
// No financial class, database client, migration, wallet or scheduler is created.
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import * as officialMath from '../math/official72.mjs';
import { EXISTING_WALLET_ROUTES } from '../client/existing-wallet-routes.mjs';
import { installExistingLibrary74 } from './existing-library74-service.mjs';
import { installExistingLibrary74Http } from './existing-library74-http.mjs';

export const NATIVE60_RELEASE = 'existing-native60-v1';
// Public integration contract only. Exact deployed host identifiers and source
// fingerprints remain in a separate private deployment input. These metadata
// fields never authorize SQL access, policy admission or a financial action.
export const NATIVE60_HOST_CONTRACT = Object.freeze({
  initializedServiceExport: 'app.existingLibraryDependencies.service',
  privateDeploymentPinsRequired: true,
  privateHostMetadataPublished: false,
});

const fail = (code, status = 503) => { throw Object.assign(new Error(code), { code, status }); };
const money = value => typeof value === 'string' && /^(0|[1-9][0-9]{0,14})$/.test(value);
const protectedIds = new Set(Object.keys(EXISTING_WALLET_ROUTES));
const sourceDefinitions = officialMath.listGameDefinitions().filter(game => !protectedIds.has(game.id));
if (protectedIds.size !== 14 || sourceDefinitions.length !== 60) throw Error('EXACT_EXISTING14_AND_NEW60_REQUIRED');
export const NATIVE60_GAME_IDS = Object.freeze(sourceDefinitions.map(game => game.id));
const newIds = new Set(NATIVE60_GAME_IDS);
export const native60Math = Object.freeze({
  ...officialMath,
  listGameDefinitions: () => structuredClone(sourceDefinitions),
  getGameDefinition: id => newIds.has(id) ? officialMath.getGameDefinition(id) : null,
});
// Carry remains part of accepted immutable round state; no new player-progress
// table, request-record repurposing or financial class is introduced.
const carryIds = new Set([
  'ind74_official_multifruitschargingwilds', 'ind74_official_gemscrownchargingwilds',
]);
const auditProofs = new WeakMap();

// The caller chooses and reviews the games; this helper only turns that explicit
// choice and an exact whole-ETB ceiling into versioned per-game policy. It never
// supplies proof, enables a release, or assumes the house can fund that ceiling.
export function native60OperatorPolicies({ reviewedGameIds = [], maximumStakeMinor = '2000' } = {}) {
  if (!Array.isArray(reviewedGameIds) || new Set(reviewedGameIds).size !== reviewedGameIds.length || reviewedGameIds.some(id => !newIds.has(id)) ||
      !money(maximumStakeMinor) || BigInt(maximumStakeMinor) < 100n || BigInt(maximumStakeMinor) % 100n !== 0n) throw new TypeError('Explicit new60 IDs and canonical whole-ETB maximum required.');
  return Object.fromEntries(reviewedGameIds.map(id => {
    const definition = native60Math.getGameDefinition(id);
    if (definition.releaseReview?.realMoneyAdmissionBlocked === true) throw new Error('REAL_MONEY_MODEL_REVIEW_BLOCKED:' + id);
    const maxBet = BigInt(maximumStakeMinor) < BigInt(definition.limits.maxBetMinor) ? BigInt(maximumStakeMinor) : BigInt(definition.limits.maxBetMinor);
    const payout = definition.chargingFeature?.dynamicPayoutBound === true ? BigInt(definition.limits.maxWinMinor) : maxBet * BigInt(definition.maximumMultiplierBps) / 10000n;
    return [id, { reviewed: true, modelVersion: 'library74-v1:' + definition.mathVersion,
      maxBetMinor: String(maxBet), maxWinMinor: String(payout) }];
  }));
}

function existingService(dependencies) {
  const service = dependencies?.service;
  if (!service || service.sql !== service.shared?.sql ||
      ['state', 'action', 'snapshot', 'view', 'otherActive'].some(key => typeof service[key] !== 'function') ||
      ['transaction', 'balance', 'move', 'changed'].some(key => typeof service.shared?.[key] !== 'function') ||
      ['begin', 'unsafe'].some(key => typeof service.sql?.[key] !== 'function') ||
      ['get', 'definitions'].some(key => typeof service.registry?.[key] !== 'function')) {
    throw new TypeError('The existing initialized native service and its exact shared SQL are required.');
  }
  return service;
}

const REQUIRED_COLUMNS = Object.freeze({
  'sw_rebuild.wallets.id': 'text', 'sw_rebuild.wallets.balance': 'bigint',
  'sw_rebuild.wallets.credit_limit': 'bigint', 'sw_rebuild.account_limits.max_balance': 'bigint',
  'sw_rebuild.transfers.id': 'text', 'sw_rebuild.ledger.delta': 'bigint',
  'sw_rebuild.rounds.game': 'text',
  'sw_rebuild.rounds.settled_order': 'bigint',
  'sw_native_library.rounds.id': 'uuid', 'sw_native_library.rounds.user_id': 'text',
  'sw_native_library.rounds.state': 'jsonb', 'sw_native_library.rounds.model_version': 'text',
  'sw_native_library.rounds.reserve_wallet': 'text', 'sw_native_library.rounds.liability': 'bigint',
  'sw_native_library.rounds.total_stake': 'bigint', 'sw_native_library.rounds.status': 'text',
  'sw_native_library.requests.user_id': 'text', 'sw_native_library.requests.request_id': 'uuid',
  'sw_nine.free_spins.user_id': 'text', 'sw_nine.free_spins.remaining': 'integer',
  'sw_nine.game_rounds.result_json': 'jsonb', 'sw_nine.actions.kind': 'text',
});

// Uses the real service.sql reference. No credentials, individual account rows,
// balances, token values, trigger function bodies or configuration values leave
// the transaction. This primitive is not an HTTP endpoint or an automatic job.
export async function auditExistingNative60Sql(dependencies) {
  const service = existingService(dependencies), sql = service.sql;
  const report = { format: 'native60-existing-sql-audit-v1', readOnly: true, writes: 0,
    individualAccountRowsReturned: 0, balanceAmountsReturned: 0, success: false,
    sameProtectedDatabaseVerified: false, triggerFunctionSemanticsVerified: false };
  try {
    const observed = await sql.begin(async tx => {
      await tx.unsafe('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
      await tx.unsafe("SET LOCAL statement_timeout='5s'");
      await tx.unsafe("SET LOCAL idle_in_transaction_session_timeout='5s'");
      const identity = await tx.unsafe("SELECT encode(sha256(convert_to(current_database()||':'||(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database())||':'||COALESCE(inet_server_addr()::text,'local')||':'||COALESCE(inet_server_port()::text,''),'UTF8')),'hex') AS database_identity_sha256");
      // Preserve only the observed hash if a later metadata query fails. The
      // audit remains unsuccessful and cannot enable any game, while operators
      // can distinguish a connection mismatch from a schema/permission failure.
      if (/^[a-f0-9]{64}$/.test(identity[0]?.database_identity_sha256 ?? '')) report.databaseIdentitySha256 = identity[0].database_identity_sha256;
      const columns = await tx.unsafe("SELECT table_schema,table_name,column_name,data_type FROM information_schema.columns WHERE (table_schema='sw_rebuild' AND table_name IN ('wallets','transfers','ledger','rounds','account_limits')) OR (table_schema='sw_native_library' AND table_name IN ('rounds','requests')) OR (table_schema='sw_nine' AND table_name IN ('game_rounds','actions','free_spins')) ORDER BY table_schema,table_name,ordinal_position LIMIT 200");
      const indexes = await tx.unsafe("SELECT schemaname,tablename,indexname,indexdef FROM pg_catalog.pg_indexes WHERE (schemaname='sw_native_library' AND tablename IN ('rounds','requests')) OR (schemaname='sw_rebuild' AND tablename='wallets') ORDER BY schemaname,tablename,indexname LIMIT 32");
      const constraints = await tx.unsafe("SELECT ns.nspname AS table_schema,t.relname AS table_name,c.contype AS type,pg_catalog.pg_get_constraintdef(c.oid) AS definition FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_class t ON t.oid=c.conrelid JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace WHERE (ns.nspname='sw_rebuild' AND t.relname='wallets') OR (ns.nspname='sw_native_library' AND t.relname IN ('rounds','requests')) ORDER BY ns.nspname,t.relname,c.conname LIMIT 64");
      const triggers = await tx.unsafe("SELECT ns.nspname AS table_schema,t.relname AS table_name,g.tgname AS trigger_name,g.tgenabled AS enabled,encode(sha256(convert_to(pg_catalog.pg_get_triggerdef(g.oid),'UTF8')),'hex') AS definition_sha256,encode(sha256(convert_to(pg_catalog.pg_get_functiondef(g.tgfoid),'UTF8')),'hex') AS function_sha256 FROM pg_catalog.pg_trigger g JOIN pg_catalog.pg_class t ON t.oid=g.tgrelid JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace WHERE NOT g.tgisinternal AND ((ns.nspname='sw_rebuild' AND t.relname IN ('wallets','transfers','ledger','rounds','account_limits')) OR (ns.nspname='sw_native_library' AND t.relname IN ('rounds','requests'))) ORDER BY ns.nspname,t.relname,g.tgname LIMIT 64");
      const house = await tx.unsafe("SELECT count(*)=1 AS configured,COALESCE(bool_and(balance>=0),false) AS nonnegative,COALESCE(bool_and(balance>0),false) AS has_funds FROM sw_rebuild.wallets WHERE id='house'");
      const funding = await tx.unsafe("SELECT NOT EXISTS(SELECT 1 FROM sw_native_library.rounds r LEFT JOIN sw_rebuild.wallets w ON w.id=r.reserve_wallet WHERE r.status='active' AND (w.id IS NULL OR w.balance<r.liability)) AS active_reserves_funded");
      const caps = await tx.unsafe('SELECT count(*)::int AS configured_accounts,count(max_balance)::int AS capped_accounts FROM sw_rebuild.account_limits');
      return { databaseIdentitySha256: identity[0]?.database_identity_sha256, columns, indexes, constraints, triggers,
        house: house[0], existingActiveReservesFunded: funding[0]?.active_reserves_funded,
        accountCapCounts: caps[0] };
    });
    const columnTypes = new Map(observed.columns.map(row => [`${row.table_schema}.${row.table_name}.${row.column_name}`, row.data_type]));
    const missingColumns = Object.entries(REQUIRED_COLUMNS).filter(([key, type]) => columnTypes.get(key) !== type).map(([key]) => key);
    const activeIndex = observed.indexes.some(row => row.schemaname === 'sw_native_library' && row.tablename === 'rounds' &&
      /CREATE UNIQUE INDEX .*\(user_id\).*WHERE.*status.*active/i.test(row.indexdef));
    const requestKey = observed.constraints.some(row => row.table_schema === 'sw_native_library' && row.table_name === 'requests' &&
      row.type === 'p' && /^PRIMARY KEY \(user_id, request_id\)$/.test(row.definition));
    const reserveForeignKey = observed.constraints.some(row => row.table_schema === 'sw_native_library' && row.table_name === 'rounds' &&
      row.type === 'f' && /^FOREIGN KEY \(reserve_wallet\) REFERENCES (?:sw_rebuild\.)?wallets\(id\)/.test(row.definition));
    const walletHasPlayerForeignKey = observed.constraints.some(row => row.table_schema === 'sw_rebuild' && row.table_name === 'wallets' && row.type === 'f');
    Object.assign(report, { ...observed, missingColumns, activeIndex, requestKey, reserveForeignKey, walletHasPlayerForeignKey,
      metadataLimitsReached: observed.columns.length === 200 || observed.indexes.length === 32 || observed.constraints.length === 64 || observed.triggers.length === 64 });
    report.schemaCompatible = !missingColumns.length && activeIndex && requestKey && reserveForeignKey && !walletHasPlayerForeignKey && !report.metadataLimitsReached;
    report.schemaMetadataSha256 = createHash('sha256').update(JSON.stringify({ columns: observed.columns, indexes: observed.indexes, constraints: observed.constraints, triggers: observed.triggers })).digest('hex');
    report.triggerMetadataSha256 = createHash('sha256').update(JSON.stringify(observed.triggers)).digest('hex');
    report.success = /^[a-f0-9]{64}$/.test(observed.databaseIdentitySha256 ?? '') && report.schemaCompatible && observed.house?.configured === true && observed.house?.nonnegative === true && observed.existingActiveReservesFunded === true;
  } catch (error) {
    report.failureCode = typeof error.code === 'string' && /^[A-Z0-9_]{5,60}$/.test(error.code) ? error.code : 'READONLY_EXISTING_SQL_AUDIT_FAILED';
  }
  const proof = Object.freeze({ report: structuredClone(report) });
  auditProofs.set(proof, { sql, report: structuredClone(report) });
  return proof;
}

// A pure read check for the existing protected transaction AFTER lockWallets
// and receipt replay lookup. It must run before a fresh spin/gamble/bonus debit.
// It neither settles nor blocks receipt replay. Installing it in that service
// is a distinct reviewed source change, not performed by this module.
export async function assertNoNative60ActiveInProtectedTransaction(connection, userId) {
  if (typeof connection?.query !== 'function' || typeof userId !== 'string' || !userId || userId.length > 100) throw new TypeError('Existing authenticated protected transaction required.');
  const result = await connection.query("SELECT game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' AND game_id=ANY($2::text[]) LIMIT 1", [userId, NATIVE60_GAME_IDS]);
  if (result.rows.length) fail('FINISH_ACTIVE_ROUND:' + result.rows[0].game_id, 409);
}

function installAdmissionGuard(service) {
  const context = new AsyncLocalStorage(), original = service.otherActive;
  const guarded = async function(tx, user) {
    const scope = context.getStore();
    if (!scope || !newIds.has(scope.gameId)) return original.call(service, tx, user);
    if (scope.start) {
      // LibraryService calls otherActive after its own active-round row lock.
      // This sorted wallet lock order is the exact protected lockWallets order.
      // Both sides must hold these same locks before checking the other's state.
      const wallets = await tx.unsafe('SELECT id FROM sw_rebuild.wallets WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', [[user, 'house']]);
      if (wallets.length !== 2) fail('PLAYER_OR_HOUSE_WALLET_MISSING');
      scope.walletsLocked = true;
    }
    const free = await tx.unsafe('SELECT game_id FROM sw_nine.free_spins WHERE user_id=$1 AND remaining>0 ORDER BY game_id LIMIT 1', [user]);
    if (free.length) return free[0].game_id;
    const bonus = await tx.unsafe("SELECT r.game_id FROM sw_nine.game_rounds r WHERE r.user_id=$1 AND r.result_json->>'pendingBonusPick'='true' AND NOT EXISTS(SELECT 1 FROM sw_nine.actions a WHERE a.parent_id=r.round_id AND a.kind='PICK') ORDER BY r.created_at,r.round_id LIMIT 1", [user]);
    if (bonus.length) return bonus[0].game_id;
    if (scope.start && carryIds.has(scope.gameId) && !scope.carryLoaded) {
      if (typeof native60Math.chargingCarryBucket !== 'function' || typeof native60Math.emptyChargingCarry !== 'function') fail('TRANSACTIONAL_CHARGING_CARRY_UNAVAILABLE');
      const definition = native60Math.getGameDefinition(scope.gameId);
      let bucket;
      try { bucket = native60Math.chargingCarryBucket(definition, scope.stakeMinor, scope.options ?? {}); }
      catch (error) { if (['INVALID_OPTIONS', 'INVALID_BET'].includes(error.code)) fail(error.code, 422); throw error; }
      // created_at can tie within a millisecond. The canonical settled_order
      // identity reflects serialized accepted account transactions and avoids
      // choosing arbitrary UUID order when restoring a retained stake bucket.
      const prior = await tx.unsafe("SELECT l.state FROM sw_native_library.rounds l JOIN sw_rebuild.rounds r ON r.id='native-library:'||l.id::text WHERE l.user_id=$1 AND l.game_id=$2 AND l.model_version=$3 AND l.status='settled' AND l.state->'mathState'->'carryBucket'=$4::jsonb ORDER BY r.settled_order DESC LIMIT 1", [user, scope.gameId, scope.modelVersion, JSON.stringify(bucket)]);
      const stored = prior[0]?.state;
      const state = typeof stored === 'string' ? JSON.parse(stored) : stored;
      if (prior.length && !state?.mathState?.carryAfter) fail('PERSISTED_CHARGING_CARRY_INVALID');
      scope.mathStartContext = { bucket, priorCarry: prior.length ? structuredClone(state.mathState.carryAfter) : native60Math.emptyChargingCarry() };
      scope.carryLoaded = true;
    }
    return original.call(service, tx, user);
  };
  service.otherActive = guarded;
  return { run: (scope, fn) => context.run(scope, fn), context: () => context.getStore(), restore() { if (service.otherActive === guarded) service.otherActive = original; } };
}

export function installNative60Registration(previous, dependencies, { auditProof = null, release = null } = {}) {
  const service = existingService(dependencies);
  if (typeof previous?.fetch !== 'function' || ['verifyNative', 'readNativeBody', 'resolveSessionUser'].some(key => typeof dependencies[key] !== 'function') || typeof dependencies.engineSecret !== 'string' || dependencies.engineSecret.length < 40) throw new TypeError('Retained fetch and native session/signature dependencies required.');
  const priorRegistry = service.registry;
  const audit = auditProofs.get(auditProof);
  const serverRelease = release ? structuredClone(release) : {};
  const globalReasons = [];
  if (!audit || audit.sql !== service.sql || audit.report.success !== true) globalReasons.push('ACTUAL_EXISTING_SQL_AUDIT_REQUIRED');
  if (!audit || serverRelease.protectedDatabaseIdentitySha256 !== audit.report.databaseIdentitySha256) globalReasons.push('SAME_PROTECTED_DATABASE_IDENTITY_UNVERIFIED');
  const protectedGuard = serverRelease.protectedAdmissionGuard;
  const guardVerified = protectedGuard?.version === NATIVE60_RELEASE && protectedGuard.enabled === true && protectedGuard.status === 'observed' && protectedGuard.rollbackConfirmed === true && protectedGuard.sameNativeDatabaseVerified === true && audit?.report.databaseIdentitySha256 === protectedGuard.databaseIdentitySha256;
  if (!guardVerified) globalReasons.push('RECIPROCAL_PROTECTED_ADMISSION_GUARD_UNVERIFIED');
  if (serverRelease.canonicalTriggerSemanticsReviewed !== true) globalReasons.push('CANONICAL_TRIGGER_SEMANTICS_UNVERIFIED');
  if (serverRelease.enabled !== true) globalReasons.push('OPERATOR_RELEASE_DISABLED');
  const gameLimits = {}, reviewedGameIds = [], byGameReasons = {};
  for (const game of sourceDefinitions) {
    const policy = serverRelease.games?.[game.id], reasons = [...globalReasons];
    if (!policy || policy.reviewed !== true || policy.modelVersion !== 'library74-v1:' + game.mathVersion || !money(policy.maxBetMinor) || !money(policy.maxWinMinor) || BigInt(policy.maxBetMinor) < 100n || BigInt(policy.maxWinMinor) < 100n) reasons.push('EXACT_MODEL_WAGER_POLICY_REQUIRED');
    else { gameLimits[game.id] = { maxBetMinor: policy.maxBetMinor, maxWinMinor: policy.maxWinMinor }; reviewedGameIds.push(game.id); }
    if (carryIds.has(game.id) && (typeof native60Math.chargingCarryBucket !== 'function' || typeof native60Math.emptyChargingCarry !== 'function' || game.chargingFeature?.dynamicPayoutBound !== true)) reasons.push('TRANSACTIONAL_CHARGING_CARRY_UNAVAILABLE');
    if (game.releaseReview?.realMoneyAdmissionBlocked === true) reasons.push('REAL_MONEY_MODEL_REVIEW_BLOCKED', ...(game.releaseReview.codes ?? []).filter(code => typeof code === 'string' && /^[A-Z][A-Z0-9_]{3,80}$/.test(code)));
    byGameReasons[game.id] = reasons;
  }
  let guard;
  try {
    guard = installAdmissionGuard(service);
    const facade = installExistingLibrary74({ service, math: native60Math, reviewedGameIds, gameLimits, canonicalRoundOrder: true,
      allowNewRounds: id => byGameReasons[id]?.length === 0,
      getStartContext: ({ gameId, modelVersion, stakeMinor }) => {
        const scope = guard.context();
        if (!scope?.start || scope.walletsLocked !== true || scope.gameId !== gameId || scope.modelVersion !== modelVersion || scope.stakeMinor !== stakeMinor) fail('NATIVE60_GUARDED_ADMISSION_REQUIRED');
        return scope.mathStartContext;
      } });
    const scoped = { ...facade,
      action: (user, body) => guard.run({ gameId: body?.game_id, modelVersion: body?.model_version,
        stakeMinor: typeof body?.stake === 'string' && /^(0|[1-9]\d*)\.\d{2}$/.test(body.stake) ? BigInt(body.stake.replace('.', '')).toString() : null,
        options: body?.options, start: body?.type === 'start' }, () => facade.action(user, body)),
      state: (user, gameId) => guard.run({ gameId, start: false }, () => facade.state(user, gameId)),
      history: (user, gameId, options) => guard.run({ gameId, start: false }, () => facade.history(user, gameId, options)),
    };
    const installed = installExistingLibrary74Http(previous, { ...dependencies, facade: scoped });
    const readiness = () => ({ release: NATIVE60_RELEASE, installedModels: 60, preservedOfficialRoutes: 14,
      existingServiceReady: service.ready === true, newRoundGateDefault: 'disabled',
      sameProtectedDatabaseVerified: Boolean(audit?.report.success && serverRelease.protectedDatabaseIdentitySha256 === audit.report.databaseIdentitySha256),
      reciprocalProtectedGuardVerified: guardVerified,
      actualSqlAuditComplete: audit?.sql === service.sql && audit?.report.success === true,
      sqlAuditStatus: !audit ? 'not-run' : audit.report.success ? 'passed' : audit.report.failureCode ? 'query-failed' : 'schema-incompatible',
      sqlAuditFailureCode: audit?.report.failureCode ?? null,
      databaseIdentitySha256: audit?.report.databaseIdentitySha256 ?? null,
      schemaMetadataSha256: audit?.report.schemaMetadataSha256 ?? null,
      triggerMetadataSha256: audit?.report.triggerMetadataSha256 ?? null,
      schemaChecks: {
        requiredColumnsPresent: audit?.report.missingColumns?.length === 0,
        activeRoundUniqueness: audit?.report.activeIndex === true,
        requestReceiptKey: audit?.report.requestKey === true,
        reserveWalletReference: audit?.report.reserveForeignKey === true,
        internalReserveWalletsSupported: audit?.report.walletHasPlayerForeignKey === false,
        metadataWithinBounds: audit?.report.metadataLimitsReached === false,
      },
      houseConfigured: audit?.report.house?.configured === true,
      houseHasFunds: audit?.report.house?.has_funds === true,
      existingActiveReservesFunded: audit?.report.existingActiveReservesFunded === true,
      accountCapsConfigured: Number(audit?.report.accountCapCounts?.configured_accounts ?? 0) > 0,
      reasons: [...globalReasons],
      games: scoped.definitions().map(game => ({ id: game.id, modelVersion: game.version, accepting: game.accepting, reasons: [...byGameReasons[game.id]] })),
      createsFinancialService: false, createsDatabase: false, createsWalletAtInstallation: false,
      retainedReserveImplementation: 'existing LibraryService.reserve and SharedWallet.move',
      triggerFunctionSemanticsVerified: serverRelease.canonicalTriggerSemanticsReviewed === true });
    const app = { ...installed, async fetch(request, ...context) {
      const url = new URL(request.url);
      const response = await installed.fetch(request, ...context);
      if (request.method !== 'GET' || url.pathname !== '/v2/independent74/health' || url.search || response.status >= 400) return response;
      const health = await response.json(), capability = readiness();
      return Response.json({ ...health, new_rounds_enabled: health.accepting === true,
        release: NATIVE60_RELEASE, capability }, { status: response.status, headers: response.headers });
    } };
    return { app, facade: scoped, service, readiness,
      restoreBeforeUse() { guard.restore(); if (service.registry === facade.registry) service.registry = priorRegistry; } };
  } catch (error) {
    guard?.restore(); service.registry = priorRegistry; throw error;
  }
}
