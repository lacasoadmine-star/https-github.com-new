// Read-only release gate for the 71 dedicated games. Does not spin, settle,
// debit, alter balances, modify the Worker or make network requests.
// Run: node verify-remaining71.mjs --game multihot40 --evidence /path/to/evidence.json
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const REQUIRED_PROOFS = Object.freeze([
  'officialDemoInteractiveCapture',
  'dedicatedGameModelAndPaytable',
  'gameSpecificSymbolsAndReels',
  'liveControlsAndTouch',
  'animationAndAudioLifecycle',
  'existingPlayerSession',
  'existingBackendReceiptValidation',
  'accountingAndBalanceReconciliation',
  'livePlayNowRoute',
  'verifiedLivePlayAndVisualComparison'
]);

export function validateGame({ manifest, sourceKey, evidence }) {
  if (!manifest || manifest.schema !== 'zplay-existing-stack-game-readiness-v1')
    throw new Error('Unknown game readiness manifest');
  const game = manifest.entries.find(x => x.sourceKey === sourceKey);
  if (!game) throw new Error('Unknown sourceKey: ' + sourceKey);
  const failures = [];
  if (!game.officialDemo) failures.push('officialDemo: missing reference URL');
  if (!game.accountRoute || !game.playNowExposed) failures.push('accountRoute: not exposed to Player');
  if (!evidence || evidence.sourceKey !== sourceKey) failures.push('evidence: wrong or missing sourceKey');
  if (evidence?.productionFinancialWrites === true) failures.push('unsafe QA: real-money financial writes');
  if (evidence?.newWalletOrBackend === true) failures.push('architecture: new wallet or backend forbidden');
  for (const key of REQUIRED_PROOFS) {
    const entry = evidence?.proofs?.[key];
    if (entry?.passed !== true ||
        typeof entry?.artifact !== 'string' ||
        !entry.artifact.trim() ||
        typeof entry?.verifiedAt !== 'string' ||
        !Number.isFinite(Date.parse(entry.verifiedAt))) {
      failures.push(key + ': missing dated positive evidence and artifact');
    }
  }
  return { sourceKey, title: game.title, ready: failures.length === 0, failures };
}

function cli() {
  const args = process.argv.slice(2), idx = args.indexOf('--game'), eidx = args.indexOf('--evidence');
  if (idx < 0 || !args[idx + 1]) throw new Error('Pass --game <sourceKey>');
  const here = dirname(fileURLToPath(import.meta.url));
  const manifest = JSON.parse(readFileSync(resolve(here, 'remaining71-readiness.json'), 'utf8'));
  const evidence = eidx >= 0 && args[eidx + 1] ? JSON.parse(readFileSync(resolve(args[eidx + 1]), 'utf8')) : null;
  const report = validateGame({ manifest, sourceKey: args[idx + 1], evidence });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (!report.ready) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli();
