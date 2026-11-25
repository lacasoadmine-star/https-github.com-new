import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

// Standalone release audit. It never calls a player, wallet, or deployment API.
// Official public catalogue: https://www.smartsoftgaming.com/games
// A catalogue listing is not evidence of gameplay, licensing, or release readiness.
export const target = 74;
const key = value => typeof value === 'string' ? value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') : '';
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const validUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
};
const sha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
const verified = entry => entry?.passed === true && nonempty(entry.evidenceRef);

export function audit(existing, candidates) {
  if (!Array.isArray(existing) || !Array.isArray(candidates)) throw new TypeError('Expected existing and candidate arrays');
  const errors = [], seenIds = new Set(), seenTitles = new Set(), seenRoutes = new Set();
  const reserve = (game, index, scope) => {
    for (const [field, set] of [['id', seenIds], ['title', seenTitles], ['route', seenRoutes]]) {
      const raw = game?.[field];
      const value = field === 'route' && typeof raw === 'string' ? raw.trim().replace(/\/+$/, '').toLowerCase() : key(raw);
      if (!value || (field === 'route' && !/^\/[a-z0-9/_-]+$/i.test(value))) errors.push(`${scope}[${index}] invalid ${field}`);
      else if (set.has(value)) errors.push(`${scope}[${index}] duplicate ${field}: ${raw}`);
      else set.add(value);
    }
  };
  if (existing.length !== 69) errors.push(`Expected verified inventory of 69 existing games; received ${existing.length}`);
  existing.forEach((g, i) => reserve(g, i, 'existing'));
  if (candidates.length !== target) errors.push(`Expected ${target} new games; received ${candidates.length}`);
  const games = candidates.map((game, i) => {
    const before = errors.length;
    reserve(game, i, 'new');
    const reasons = [];
    if (game?.provider !== 'SmartSoft Gaming') reasons.push('provider not verified');
    if (!validUrl(game?.officialReference)) reasons.push('missing official HTTPS reference');
    if (!nonempty(game?.licenseEvidence)) reasons.push('missing distribution authorization evidence');
    if (!nonempty(game?.mathEvidence)) reasons.push('missing approved game math evidence');
    if (!sha256(game?.artifactSha256)) reasons.push('missing build digest');
    if (!Array.isArray(game?.demoRounds) || game.demoRounds.length < 7 || new Set(game.demoRounds).size !== game.demoRounds.length || !game.demoRounds.every(nonempty)) reasons.push('need seven distinct demo-round evidence references');
    for (const check of ['controls', 'mobile', 'audio', 'rules', 'backend', 'walletSafety', 'idempotency', 'rollback']) {
      if (!verified(game?.checks?.[check])) reasons.push(`missing ${check} evidence`);
    }
    if (errors.length !== before) reasons.push('inventory conflict');
    return { id: game?.id ?? null, title: game?.title ?? null, state: reasons.length ? 'BLOCKED' : 'EVIDENCE_COMPLETE', reasons };
  });
  // This checks evidence records, not the truth of those records. Human or CI
  // review must verify evidence independently; this script cannot authorize release.
  return { target, existingCount: existing.length, candidateCount: candidates.length,
    evidenceComplete: games.filter(g => g.state === 'EVIDENCE_COMPLETE').length,
    inventoryErrors: errors, games, releaseAuthorized: false };
}

function selfTest() {
  const existing = Array.from({ length: 69 }, (_, i) => ({id:`old-${i}`, title:`Old ${i}`, route:`/old/${i}`}));
  const checks = Object.fromEntries(['controls','mobile','audio','rules','backend','walletSafety','idempotency','rollback'].map(k => [k, {passed:true,evidenceRef:`test-${k}`}])) ;
  const fixture = i => ({ id:`new-${i}`, title:`New ${i}`, route:`/new/${i}`, provider:'SmartSoft Gaming', officialReference:'https://www.smartsoftgaming.com/games', licenseEvidence:'test-license',mathEvidence:'test-math',artifactSha256:'a'.repeat(64),demoRounds:Array.from({length:7},(_,j)=>`test-round-${j}`),checks });
  const all = Array.from({length:74},(_,i)=>fixture(i));
  assert.equal(audit(existing, all).evidenceComplete,74);
  assert.equal(audit(existing, all).releaseAuthorized,false);
  assert.equal(audit(existing, []).inventoryErrors.length,1);
  assert.equal(audit([], all).inventoryErrors.length,1);
  assert.equal(audit(existing,[{...fixture(0),title:'OLD 0'}]).games[0].state,'BLOCKED');
  assert.equal(audit(existing,[{...fixture(0),route:'/old/0/'}]).games[0].state,'BLOCKED');
  assert.equal(audit(existing,[{...fixture(0),demoRounds:Array(7).fill('same')}]).games[0].state,'BLOCKED');
  assert.equal(audit(existing,[{...fixture(0),licenseEvidence:''}]).games[0].state,'BLOCKED');
  assert.equal(audit(existing,[{...fixture(0),checks:{}}]).games[0].state,'BLOCKED');
  console.log('PASS: 9 audit assertions (synthetic fixtures only; no live games or money tested).');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === '--self-test') selfTest();
  else if (process.argv.length === 4) {
    const result = audit(JSON.parse(readFileSync(process.argv[2], 'utf8')), JSON.parse(readFileSync(process.argv[3], 'utf8')));
    console.log(JSON.stringify(result, null, 2));
    if (result.inventoryErrors.length || result.evidenceComplete !== target) process.exitCode = 1;
  } else { console.error('Usage: node audit.mjs EXISTING.json CANDIDATES.json | --self-test'); process.exitCode = 2; }
}
