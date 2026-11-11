import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, sep } from 'node:path';

const [sourcePath, carrierPath, pinsPath, outputPath] = process.argv.slice(2);
if (!sourcePath || !carrierPath || !pinsPath || !outputPath) throw Error('Usage: node backend/prepare-candidate.mjs PRIVATE_RUNTIME PRIVATE_CARRIER PRIVATE_VERIFIED_PINS PRIVATE_OUTPUT_DIRECTORY');
const pins = JSON.parse(await readFile(resolve(pinsPath), 'utf8'));
if (pins.format !== 'fresh-slot-private-inputs-v1' || !/^[a-f0-9]{64}$/.test(pins.runtimeSha256 ?? '') || !/^[a-f0-9]{64}$/.test(pins.carrierSha256 ?? '')) throw Error('PRIVATE_VERIFIED_PINS_REQUIRED');
const expected = pins.runtimeSha256;
const base = pathToFileURL(resolve(outputPath) + sep);
const source = await readFile(resolve(sourcePath), 'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');
if (sha(source) !== expected) throw Error('VERIFIED_DEPLOYED_RUNTIME_CHANGED');
const hooks = (await readFile(new URL('./fresh-hooks.mjs', import.meta.url), 'utf8')).replace('export function createFreshReleaseHooks', 'function createFreshReleaseHooks');
let candidate = source;
const changes = [];
function replace(before, after, reason) {
  if (candidate.split(before).length !== 2) throw Error('PATCH_ANCHOR_NOT_UNIQUE:' + reason);
  candidate = candidate.replace(before, after);
  changes.push({ before, after, reason });
}
replace("export class ServiceError extends Error", hooks + '\nexport class ServiceError extends Error', 'add fresh-only hooks');
replace('const {MATH,mathSha256,publicGames,spin,toUnits,fromUnits,gambleDraw,bonusRewards,getGame,modelIdentity,receiptGame}=versioned;', "const {MATH,mathSha256,publicGames:retainedPublicGames,spin,toUnits,fromUnits,gambleDraw,bonusRewards,getGame,modelIdentity,receiptGame}=versioned;\nconst publicGames=()=>retainedPublicGames().map(game=>game.id==='fresh_multihot10'?{...game,buildStatus:game.freshReleaseReady?'ready':'draft'}:game);", 'fresh readiness metadata without changing model bytes');
replace(" let accepting=enabled;const rate=new Map();const houseFor=uid=>qa?'qa-house:'+uid:'house';", " let accepting=enabled;const rate=new Map();const houseFor=uid=>qa?'qa-house:'+uid:'house';\n const freshRelease=createFreshReleaseHooks({hash,authenticate,balance,lockWallets,transaction,cash,publicGames,modelIdentity,fail,isAccepting:()=>accepting});", 'reuse retained service dependencies');
replace("(!targetGame&&!(MATH.games[gameId].betLevels||MATH.betLevels).includes(bet))", "(!targetGame&&gameId!=='fresh_multihot10'&&!(MATH.games[gameId].betLevels||MATH.betLevels).includes(bet))", 'fresh immutable replay before release-dependent stake admission');
replace(" const fs=await c.query('SELECT remaining,bet FROM sw_nine.free_spins WHERE user_id=$1 AND game_id=$2 FOR UPDATE'", " if(gameId==='fresh_multihot10'){if(body.replayOnly===true)fail(409,'ROUND_NOT_CONFIRMED');freshRelease.assertEnabled();freshRelease.assertSession(req,uid,body);freshRelease.assertModel(body);await freshRelease.assertNoActive(c,uid);}\n const fs=await c.query('SELECT remaining,bet FROM sw_nine.free_spins WHERE user_id=$1 AND game_id=$2 FOR UPDATE'", 'fresh admission after exact receipt replay');
replace(" const result=spin(gameId,bet,{isFree:free}),win=toUnits(result.finalWin)/100n;", " if(gameId==='fresh_multihot10')await freshRelease.assertPlayerCapacity(c,uid,balanceBefore,charge,baseBet*BigInt(roundModel.maxWinMultiplier));\n const result=spin(gameId,bet,{isFree:free}),win=toUnits(result.finalWin)/100n;", 'fresh capacity preflight before RNG');
replace(" if(kind==='GAMBLE'){\n if(!g.features.gambleRounds", " if(kind==='GAMBLE'){\n if(parent.game_id==='fresh_multihot10'){freshRelease.assertEnabled();freshRelease.assertSession(req,uid,body);await freshRelease.assertNoActive(c,uid);await freshRelease.assertLatest(c,uid,parent.round_id);}\n if(!g.features.gambleRounds", 'fresh gamble authenticated current account and round');
replace(' const id=randomUUID();let result,attempt=1;', " const freshBalanceBefore=parent.game_id==='fresh_multihot10'?integer(await balance(c,uid)):null;\n const id=randomUUID();let result,attempt=1;", 'fresh gamble balance captured inside locked transaction');
replace("const stake=last.rowCount?cents(last.rows[0].result_json.payout):integer(parent.total_win);if(nativeParent", "const stake=last.rowCount?cents(last.rows[0].result_json.payout):integer(parent.total_win);if(parent.game_id==='fresh_multihot10')freshRelease.assertGambleState(body,attempt,stake);if(nativeParent", 'fresh gamble exact expected state');
replace(" result=parent.game_id==='fresh_multihot10'?fresh74.freshGambleDraw", " if(parent.game_id==='fresh_multihot10')await freshRelease.assertPlayerCapacity(c,uid,integer(await balance(c,uid)),stake,stake*2n);\n result=parent.game_id==='fresh_multihot10'?fresh74.freshGambleDraw", 'fresh gamble capacity before RNG');
replace(" result.balanceAfter=cash(await balance(c,uid));await c.query('INSERT INTO sw_nine.actions", " result.balanceAfter=cash(await balance(c,uid));if(parent.game_id==='fresh_multihot10'&&kind==='GAMBLE'){const receipt=settlementReceipt(freshBalanceBefore,cents(body.expectedStake),cents(result.payout),cents(result.balanceAfter));Object.assign(result,receipt,{gameId:parent.game_id,walletReceipt:receipt});}await c.query('INSERT INTO sw_nine.actions", 'fresh gamble canonical wallet receipt');
replace(" if(req.method==='GET'&&path.startsWith('/api/originals/'))", " if(req.method==='GET'&&path==='/api/fresh-state')return json(await freshRelease.state(req,uid));\n if(req.method==='GET'&&path.startsWith('/api/originals/'))", 'fresh authenticated recovery state');
let inverse = candidate;
for (const patch of [...changes].reverse()) {
  if (inverse.split(patch.after).length !== 2) throw Error('INVERSE_ANCHOR_NOT_UNIQUE');
  inverse = inverse.replace(patch.after, patch.before);
}
if (inverse !== source) throw Error('LEGACY_SOURCE_PRESERVATION_FAILED');
await mkdir(base, { recursive: true });
await writeFile(new URL('./native-slot-runtime-candidate.mjs', base), candidate);
// The original carrier is code-only and includes no credential values.
let carrier = await readFile(resolve(carrierPath), 'utf8');
if (sha(carrier) !== pins.carrierSha256) throw Error('VERIFIED_DEPLOYED_CARRIER_CHANGED');
const lengthAnchor = 'runtimeBytes.length !== ' + Buffer.byteLength(source);
if (carrier.split(lengthAnchor).length !== 2 || carrier.split(expected).length !== 2) throw Error('VERIFIED_CARRIER_ANCHOR_NOT_UNIQUE');
const payload = gzipSync(Buffer.from(candidate), { level: 9 }).toString('base64');
if (!/gunzipSync\(Buffer.from\('[^']+', 'base64'\)\)/.test(carrier)) throw Error('CARRIER_FORMAT_CHANGED');
carrier = carrier.replace(/gunzipSync\(Buffer.from\('[^']+', 'base64'\)\)/, "gunzipSync(Buffer.from('" + payload + "', 'base64'))");
carrier = carrier.replace(lengthAnchor, 'runtimeBytes.length !== ' + Buffer.byteLength(candidate));
carrier = carrier.replace(expected, sha(candidate));
await writeFile(new URL('./nine-slot-carrier-candidate.mjs', base), carrier);
await writeFile(new URL('./source-preservation.json', base), JSON.stringify({ sourceSha256: expected, candidateSha256: sha(candidate), sourceBytes: Buffer.byteLength(source), candidateBytes: Buffer.byteLength(candidate), inverselyRestored: inverse === source, freshOnly: true, newWallets: false, newTables: false, changes: changes.map(change => change.reason) }, null, 2) + '\n');
console.log(JSON.stringify({ candidate: fileURLToPath(new URL('./native-slot-runtime-candidate.mjs', base)), sourceSha256: expected, candidateSha256: sha(candidate), changes: changes.length, inverselyRestored: true }));
