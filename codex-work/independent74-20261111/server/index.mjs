import { SQL } from 'bun';
import { PostgresRepository } from './postgres-repository.mjs';
import { createGameService } from './service.mjs';
import { createHttpHandler } from './http.mjs';
import { ServiceError } from './errors.mjs';

let integrationEvidence = null;
// No verification artifact is shipped while the actual PostgreSQL audit and
// financial integration tests are blocked. An environment boolean alone cannot
// turn this service into a live-money endpoint.
const evidenceFile = Bun.file(new URL('./ledger-verification.json', import.meta.url));
if (await evidenceFile.exists()) integrationEvidence = await evidenceFile.json();
let repository;
if (Bun.env.DATABASE_URL) {
  const database = new SQL(Bun.env.DATABASE_URL, { max: 8, connectionTimeout: 10, idleTimeout: 20 });
  repository = new PostgresRepository({ database, bankWalletId: Bun.env.IND74_BANK_WALLET_ID, integrationEvidence });
  try { await repository.inspectReadiness(); }
  catch { console.error(JSON.stringify({ event: 'independent74_schema_unavailable', financial_enabled: false })); }
} else repository = {
  actualProductionLedgerVerified: false,
  transact: async () => { throw new ServiceError('WALLET_UNAVAILABLE', 'The account database is unavailable.', 503); },
};
const service = createGameService({ repository });
const financialVerified = repository.actualProductionLedgerVerified === true;
const fetch = createHttpHandler({
  service, secret: Bun.env.NATIVE_ENGINE_SECRET,
  productionLedgerVerified: financialVerified,
  enableNewRounds: financialVerified && Bun.env.IND74_NEW_ROUNDS_ENABLED === 'true',
});
const configuration = { port: Number(Bun.env.PORT || 8080), fetch };
if (import.meta.main) Bun.serve(configuration);
export default configuration;
