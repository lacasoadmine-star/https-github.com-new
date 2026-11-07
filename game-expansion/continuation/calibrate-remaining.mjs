// Historical command name. This now measures disabled review models only.
// Never scale verified public prizes to force an RTP, modify a model, or
// overwrite the invalidated historical calibration evidence.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sampleRawSlot, slotScales} from './models/remaining-games.mjs';

if (process.argv[2] !== '--measure-draft') {
  throw Error('Old calibration is invalid after public-rule corrections. Explicit draft measurement: node calibrate-remaining.mjs --measure-draft [count] [gameId]. This does not establish official fidelity or production readiness.');
}
const count = Number(process.argv[3] || 100000);
const requestedId = process.argv[4];
if (!Number.isSafeInteger(count) || count < 1000 || count > 2000000) throw Error('Invalid sample count');
const ids = requestedId ? [requestedId] : Object.keys(slotScales);
if (ids.some(id => !Object.hasOwn(slotScales, id))) throw Error('Unknown draft slot');
function generator(seed) {
  let state = seed >>> 0;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}
const results = [];
for (const id of ids) {
  const index = Object.keys(slotScales).indexOf(id), seed = 0xa17ed9c3 + index * 1009;
  const rng = generator(seed), scale = slotScales[id];
  const limit = Math.ceil(100 * 10000 * scale.denominator / scale.numerator);
  const buckets = [10, 100, 1000, 10000].map(stake => ({stake, sum: 0, sumSquares: 0, capped: 0}));
  for (let i = 0; i < count; i++) {
    const raw = sampleRawSlot(id, rng, {record: false, maxRawPoints: limit}).totalPoints;
    for (const bucket of buckets) {
      const unbounded = BigInt(bucket.stake) * BigInt(raw) * BigInt(scale.numerator) / (10000n * BigInt(scale.denominator));
      const cap = BigInt(bucket.stake) * 100n, value = Number(unbounded > cap ? cap : unbounded) / bucket.stake;
      bucket.sum += value; bucket.sumSquares += value * value;
      if (unbounded >= cap) bucket.capped++;
    }
  }
  const result = {id, samples: count, seed, appliedScale: scale, reviewCapMultiplier: 100, stakes: buckets.map(bucket => {
    const mean = bucket.sum / count;
    const standardError = Math.sqrt(Math.max(0, (bucket.sumSquares - bucket.sum * bucket.sum / count) / (count - 1))) / Math.sqrt(count);
    return {stakeMinor: String(bucket.stake), measuredReturn: mean, standardError, confidence95: [mean - 1.96 * standardError, mean + 1.96 * standardError], cappedOutcomes: bucket.capped};
  })};
  results.push(result);
  console.log(JSON.stringify(result));
}
const sha256 = path => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');
writeFileSync(new URL('./references/remaining-experimental-measurement.json', import.meta.url), JSON.stringify({
  generatedAt: new Date().toISOString(),
  status: 'experimental-disabled-review-model-measurement',
  productionEnabled: false,
  officialPrivateMathVerified: false,
  sourceHashes: {engine: sha256('./models/remaining-engine.mjs'), definitions: sha256('./models/remaining-games.mjs'), facts: sha256('./models/remaining-reference-data.mjs')},
  limitation: 'Measurement of the present disabled prototypes, including unresolved numeric tables and explicit platform caps. No prize scaling, parameter fitting, provider RTP claim, or release approval follows from these samples.',
  results,
}, null, 2) + '\n');
