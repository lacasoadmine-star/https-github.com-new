import { fail } from './errors.mjs';
import { readSchemaMetadata, verifySchemaMetadata, validateIntegrationEvidence, requireVerifiedProductionLedger } from './schema.mjs';

function record(row) {
  if (!row) return null;
  return { id: row.id, request_id: row.request_id, game_id: row.game_id, state: row.state, status: row.status, version: Number(row.version), created_at: new Date(row.created_at).toISOString(), updated_at: new Date(row.updated_at).toISOString() };
}
const positive = amount => { if (typeof amount !== 'string' || !/^[1-9]\d*$/.test(amount) || BigInt(amount) > 9223372036854775807n) fail('INVALID_LEDGER_AMOUNT', 'The financial amount could not be verified.', 503); return amount; };

export class PostgresRepository {
  constructor({ database, bankWalletId, integrationEvidence = null } = {}) {
    if (!database || typeof database.begin !== 'function') throw new TypeError('A PostgreSQL transaction driver is required.');
    this.database = database;
    this.bankWalletId = bankWalletId;
    this.integrationEvidence = integrationEvidence;
    this.actualProductionLedgerVerified = false;
    this.schemaCompatible = false;
    this.readiness = { financial_enabled: false, reasons: ['ACTUAL_POSTGRESQL_VERIFICATION_REQUIRED'] };
  }
  async inspectReadiness() {
    if (typeof this.bankWalletId !== 'string' || !/^[a-zA-Z0-9:_-]{8,128}$/.test(this.bankWalletId) || this.bankWalletId === 'house') {
      this.readiness = { financial_enabled: false, reasons: ['DEDICATED_BANK_WALLET_REQUIRED'] }; return this.readiness;
    }
    const metadata = await this.database.begin(async connection => {
      const query = (text, params = []) => connection.unsafe(text, params);
      await query('SET TRANSACTION READ ONLY');
      await query("SET LOCAL statement_timeout = '5s'");
      return readSchemaMetadata(query);
    });
    const schema = await verifySchemaMetadata(metadata); this.schemaCompatible = schema.compatible;
    const evidenceVerified = schema.compatible && validateIntegrationEvidence(this.integrationEvidence, { schemaSha256: schema.sha256, bankWalletId: this.bankWalletId });
    this.actualProductionLedgerVerified = evidenceVerified;
    this.readiness = { financial_enabled: evidenceVerified, schema_sha256: schema.sha256, reasons: schema.compatible ? (evidenceVerified ? [] : ['ACTUAL_POSTGRESQL_INTEGRATION_EVIDENCE_REQUIRED']) : schema.reasons };
    return this.readiness;
  }
  async transact(sessionHash, operation) {
    if (!this.schemaCompatible) fail('WALLET_UNAVAILABLE', 'The account database schema has not been verified.', 503);
    if (typeof sessionHash !== 'string' || !/^[a-f0-9]{64}$/.test(sessionHash)) fail('AUTH_REQUIRED', 'An account session is required.', 401);
    return this.database.begin(async connection => {
      const query = (text, params = []) => connection.unsafe(text, params);
      await query("SET LOCAL lock_timeout = '5s'");
      await query("SET LOCAL statement_timeout = '15s'");
      const users = await query(`SELECT u.id,u.role,u.status FROM sw_rebuild.sessions s JOIN sw_rebuild.users u ON u.id=s.user_id
        WHERE (s.token=$1 OR encode(sha256(convert_to(s.token,'UTF8')),'hex')=$1) AND s.expires>$2::bigint FOR SHARE OF s,u`, [sessionHash, Date.now()]);
      if (users.length !== 1 || users[0].role !== 'player' || users[0].status !== 'active') fail('AUTH_REQUIRED', 'An active player account session is required.', 401);
      const userId = users[0].id;
      if (typeof userId !== 'string' || userId === this.bankWalletId) fail('ACCOUNT_INTEGRITY_ERROR', 'The player wallet could not be verified.', 503);
      // Every action locks the dedicated bank and player in a stable order.
      // Legacy engines continue using their existing house wallet.
      const wallets = await query('SELECT id,balance FROM sw_rebuild.wallets WHERE id IN ($1,$2) ORDER BY id FOR UPDATE', [userId, this.bankWalletId]);
      if (wallets.length !== 2) fail('WALLET_UNAVAILABLE', 'The player or dedicated bank wallet is unavailable.', 503);
      const getBalanceMinor = async () => {
        const rows = await query('SELECT balance::text AS balance FROM sw_rebuild.wallets WHERE id=$1', [userId]);
        if (rows.length !== 1 || !/^(0|[1-9]\d*)$/.test(rows[0].balance)) fail('ACCOUNT_INTEGRITY_ERROR', 'The account balance could not be verified.', 503);
        return rows[0].balance;
      };
      const move = async (kind, amount, metadata) => {
        requireVerifiedProductionLedger(this); positive(amount);
        const sender = kind === 'bet' ? userId : this.bankWalletId;
        const recipient = kind === 'bet' ? this.bankWalletId : userId;
        const rows = await query(`WITH debit AS (
          UPDATE sw_rebuild.wallets SET balance=balance-$3::bigint WHERE id=$1 AND balance >= $3::bigint RETURNING id),
          credit AS (UPDATE sw_rebuild.wallets SET balance=balance+$3::bigint WHERE id=$2 AND EXISTS(SELECT 1 FROM debit) RETURNING id),
          transfer AS (INSERT INTO sw_rebuild.transfers(id,sender,recipient,amount,kind,actor)
            SELECT $4,$1,$2,$3::bigint,$5,$6 WHERE EXISTS(SELECT 1 FROM credit) RETURNING id),
          entries AS (INSERT INTO sw_rebuild.ledger(transfer_id,wallet_id,delta)
            SELECT id,$1,-$3::bigint FROM transfer UNION ALL SELECT id,$2,$3::bigint FROM transfer RETURNING delta)
          SELECT (SELECT count(*)::int FROM debit) AS debited,(SELECT count(*)::int FROM credit) AS credited,
            (SELECT count(*)::int FROM transfer) AS transfers,(SELECT count(*)::int FROM entries) AS entries,
            (SELECT COALESCE(sum(delta),0)::text FROM entries) AS delta`, [sender, recipient, amount, metadata.reference, kind, userId]);
        const result = rows[0];
        if (result?.debited !== 1) fail(kind === 'bet' ? 'INSUFFICIENT_FUNDS' : 'HOUSE_RESERVE_INSUFFICIENT', kind === 'bet' ? 'Your account balance is too low for this bet.' : 'The dedicated bank reserve is unavailable.', kind === 'bet' ? 422 : 503);
        if (result.credited !== 1 || result.transfers !== 1 || result.entries !== 2 || result.delta !== '0') fail('LEDGER_INTEGRITY_ERROR', 'The double-entry transfer could not be verified.', 503);
      };
      const tx = {
        user: { id: userId }, getBalanceMinor,
        findActiveRound: async () => record((await query("SELECT * FROM sw_independent74.rounds WHERE user_id=$1 AND status='active' FOR UPDATE", [userId]))[0]),
        getRound: async id => record((await query('SELECT * FROM sw_independent74.rounds WHERE user_id=$1 AND id=$2::uuid', [userId, id]))[0]),
        createRound: async value => {
          requireVerifiedProductionLedger(this);
          await query(`INSERT INTO sw_independent74.rounds(id,user_id,game_id,request_id,state,status,version,created_at,updated_at)
            VALUES ($1::uuid,$2,$3,$4::uuid,$5::jsonb,$6,$7,$8::timestamptz,$9::timestamptz)`, [value.id, userId, value.game_id, value.request_id, JSON.stringify(value.state), value.status, value.version, value.created_at, value.updated_at]);
        },
        updateRound: async (value, expectedVersion) => {
          requireVerifiedProductionLedger(this);
          const rows = await query(`UPDATE sw_independent74.rounds SET state=$3::jsonb,status=$4,version=$5,updated_at=$6::timestamptz
            WHERE id=$1::uuid AND user_id=$2 AND version=$7 RETURNING id`, [value.id, userId, JSON.stringify(value.state), value.status, value.version, value.updated_at, expectedVersion]);
          if (rows.length !== 1) fail('STALE_ROUND', 'The round changed. Refresh its state.', 409);
        },
        findRequest: async id => (await query('SELECT fingerprint,round_id FROM sw_independent74.requests WHERE user_id=$1 AND request_id=$2::uuid', [userId, id]))[0] || null,
        rememberRequest: async value => {
          requireVerifiedProductionLedger(this);
          await query('INSERT INTO sw_independent74.requests(user_id,request_id,fingerprint,round_id,created_at) VALUES ($1,$2::uuid,$3,$4::uuid,$5::timestamptz)', [userId, value.request_id, value.fingerprint, value.round_id, value.created_at]);
        },
        upsertReceipt: async value => {
          requireVerifiedProductionLedger(this);
          await query(`INSERT INTO sw_independent74.receipts(round_id,user_id,game_id,result,updated_at) VALUES ($1::uuid,$2,$3,$4::jsonb,$5::timestamptz)
            ON CONFLICT (round_id) DO UPDATE SET result=EXCLUDED.result,updated_at=EXCLUDED.updated_at WHERE sw_independent74.receipts.user_id=EXCLUDED.user_id`, [value.id, userId, value.game_id, JSON.stringify(value), value.updated_at]);
        },
        getReceipt: async id => (await query('SELECT result FROM sw_independent74.receipts WHERE user_id=$1 AND round_id=$2::uuid', [userId, id]))[0]?.result || null,
        listReceipts: async (limit, gameId) => (await query(`SELECT result FROM sw_independent74.receipts WHERE user_id=$1${gameId ? ' AND game_id=$3' : ''} ORDER BY updated_at DESC,round_id LIMIT $2`, gameId ? [userId, limit, gameId] : [userId, limit])).map(row => row.result),
        debit: (amount, metadata) => move('bet', amount, metadata),
        credit: (amount, metadata) => move('win', amount, metadata),
        reserveLiability: async (amount, metadata) => {
          requireVerifiedProductionLedger(this); positive(amount);
          const rows = await query(`SELECT w.balance::text AS balance,COALESCE((SELECT sum(l.amount_minor) FROM sw_independent74.liabilities l WHERE l.bank_wallet_id=$1),0)::text AS reserved FROM sw_rebuild.wallets w WHERE w.id=$1`, [this.bankWalletId]);
          if (rows.length !== 1 || BigInt(rows[0].balance) - BigInt(rows[0].reserved) < BigInt(amount)) fail('HOUSE_RESERVE_INSUFFICIENT', 'The dedicated bank cannot reserve this round’s maximum payout.', 503);
          await query('INSERT INTO sw_independent74.liabilities(round_id,user_id,bank_wallet_id,game_id,amount_minor) VALUES ($1::uuid,$2,$3,$4,$5::bigint)', [metadata.round_id, userId, this.bankWalletId, metadata.game_id, amount]);
        },
        releaseLiability: async roundId => {
          requireVerifiedProductionLedger(this);
          await query('DELETE FROM sw_independent74.liabilities WHERE user_id=$1 AND round_id=$2::uuid', [userId, roundId]);
        },
      };
      return operation(tx);
    });
  }
}
