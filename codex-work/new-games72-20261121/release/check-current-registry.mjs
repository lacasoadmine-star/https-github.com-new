// Read-only source verification plus new report files in this release directory.
// This does not generate release evidence or mutate any registry/game record.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateRegistry, reviewRelease, hashObject, fileArtifactReader } from './release-gate.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--expect-closed') || args.length > 1) {
  throw new Error('Usage: check-current-registry.mjs [--expect-closed]');
}
const expectClosed = args.includes('--expect-closed');
const registryBytes = await readFile(new URL('../registry.json', import.meta.url));
const baselineBytes = await readFile(new URL('../preservation/baseline.json', import.meta.url));
const registry = JSON.parse(registryBytes), baseline = JSON.parse(baselineBytes);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const checkedAt = new Date().toISOString();
const input = { checkedAt, registryFileSha256: sha256(registryBytes), baselineFileSha256: sha256(baselineBytes),
  registrySha256: hashObject(registry), baselineSha256: hashObject(baseline),
  sourceBaselineCommit: baseline.sourceCommit, inventoryScope: baseline.inventoryScope,
  newRegistryCount: registry.games?.length ?? 0, legacyCatalogCount: baseline.legacyCatalogCount ?? null,
  productionRequests: 0, productionWagers: 0, activationPerformed: false };
const identity = { schema: 'zplay/new-games72-actual-registry-validation/v1', ...input,
  ...validateRegistry(registry, baseline) };
let attestationManifest = null;
try { attestationManifest = JSON.parse(await readFile(new URL('./evidence-manifest.json', import.meta.url), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const statuses = registry.games.reduce((counts, game) => ({ ...counts, [game.status]: (counts[game.status] ?? 0) + 1 }), {});
const review = await reviewRelease({ registry, baseline, attestationManifest,
  readArtifact: fileArtifactReader(fileURLToPath(new URL('../../../', import.meta.url))),
  policy: { officialHosts: ['www.smartsoftgaming.com', 'smartsoftgaming.com', 'eu-server.ssgportal.com'],
    referenceNotBefore: '2026-11-21T00:00:00+03:00',
    // Populated from actual completed peer-review task records when available;
    // an empty roster cannot approve missing work and creates no account flow.
    reviewProducers: attestationManifest?.reviewProducers ?? { math: [], rights: [], release: [] } },
});
const release = { ...input, actualRegistryStatuses: statuses, evidenceManifestPresent: !!attestationManifest,
  limitations: ['Source inventory only; no current live Worker/backend inventory fetched by this command.',
    'No reference capture, gameplay, ETB settlement or live deployment was performed.'], review };
await writeFile(new URL('./actual-registry-validation.json', import.meta.url), JSON.stringify(identity, null, 2) + '\n');
await writeFile(new URL('./actual-release-review.json', import.meta.url), JSON.stringify(release, null, 2) + '\n');
const closedPreparationVerified = identity.valid && review.allowed === false &&
  registry.publicActivation === false && registry.games.every(game => game.backend?.enabled === false);
console.log(JSON.stringify({ identityValid: identity.valid, newGames: input.newRegistryCount,
  legacyCatalogCount: input.legacyCatalogCount, statuses, releaseAllowed: review.allowed,
  verifiedReleaseGames: review.verifiedGameCount, issueCodes: [...new Set(review.issues.map(issue => issue.code))],
  activationPerformed: false, expectClosed, closedPreparationVerified }, null, 2));
// A green preparation CI proves only that incomplete games remain unavailable.
// The normal release command continues to fail with exit 2 until all proof exists.
process.exitCode = expectClosed ? (closedPreparationVerified ? 0 : 1) :
  (identity.valid ? review.allowed ? 0 : 2 : 1);
