import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { ENGINE_VERSION, MATH_VERSIONS, applyVerifiedDefinitions } from '../src/model-patch.mjs';
import { createVersionedCore } from '../src/version-dispatch.mjs';
import { NATIVE_SCHEMA_QUERY, startNativeSchemaProbe } from '../src/schema-probe.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(root + path, 'utf8');
const hash = source => createHash('sha256').update(source).digest('hex');
const replaceOnce = (source, before, after) => {
  if (source.split(before).length !== 2) throw new Error('Unexpected production source: ' + before.slice(0, 80));
  return source.replace(before, after);
};
const rules = JSON.parse(await read('evidence/verified-linepaths-gamble.json'));
const legacySource = await read('source/legacy-core.mjs'), original = await read('source/legacy-runtime.mjs');
if (hash(legacySource) !== 'f40f441ed26e2448076ff291c2c9a714542b2aaf32e802a31c2645ad46723c2d' ||
    hash(original) !== '23012dd4f8829c3809a3e13573e24b7a404d0466d47a9697e030b8947a73b9ab') throw new Error('Legacy source changed');
let source = replaceOnce(legacySource, 'export const MATH=Object.freeze(decoded);',
  `(${applyVerifiedDefinitions.toString()})(decoded,${JSON.stringify(rules)},${JSON.stringify(MATH_VERSIONS)});\nexport const MATH=Object.freeze(decoded);`);
source = replaceOnce(source, "export const ENGINE_VERSION='superwin-slot-runtime-reference-v3000';", `export const ENGINE_VERSION=${JSON.stringify(ENGINE_VERSION)};`);
source = replaceOnce(source, "scatter:g.id==='multi_hot_5_video'?null:", "scatter:['multi_hot_5_video','multi_hot_5_native','foxy_hot_20_native'].includes(g.id)?null:");
source = replaceOnce(source, 'const scatterUnits=!jackpotMult&&scatterCount>=3?', "const scatterUnits=g.id!=='foxy_hot_20_native'&&!jackpotMult&&scatterCount>=3?");
source = replaceOnce(source, "(g.id==='hot_foxy_20'&&s==='fox')", "(['hot_foxy_20','foxy_hot_20_native'].includes(g.id)&&s==='fox')");
source = replaceOnce(source, "wildSymbols:g.id==='multi_hot_5_video'?[]:g.id==='hot_foxy_20'?['fox']", "wildSymbols:['multi_hot_5_video','multi_hot_5_native'].includes(g.id)?[]:['hot_foxy_20','foxy_hot_20_native'].includes(g.id)?['fox']");
source = replaceOnce(source, 'maxRounds:g.features.gambleRounds}:null', "maxRounds:g.features.gambleRounds,...(g.features.gambleMaxStake?{maxStake:g.features.gambleMaxStake}:{})}:null");
await writeFile(root + 'source/revised-core.mjs', source);
const legacy = await import('../source/legacy-core.mjs');
const revised = await import('../source/revised-core.mjs?build=' + hash(source));
if (legacy.mathSha256 !== '9bc6cfaad2fa6558882bc88a3eb78514f1432ab1c11a52217a427d1f383ba8e7') throw new Error('Legacy math identity changed');
const versioned = createVersionedCore(legacy, revised), targets = ['foxy_hot_20_native', 'multi_hot_5_native'], families = { foxy_hot_20_native: 'hot_foxy_20', multi_hot_5_native: 'multi_hot_5_video' };
const encoded = gzipSync(Buffer.from(source), { level: 9 }).toString('base64');
let runtime = replaceOnce(original,
  'const {MATH,mathSha256,publicGames,spin,toUnits,fromUnits,gambleDraw,bonusRewards,getGame}=loaded;',
  `const revisedBytes=gunzipSync(Buffer.from('${encoded}','base64'));\nconst revised=await import('data:text/javascript;base64,'+revisedBytes.toString('base64'));\nconst versioned=(${createVersionedCore.toString()})(loaded,revised);\nconst {MATH,mathSha256,publicGames,spin,toUnits,fromUnits,gambleDraw,bonusRewards,getGame,modelIdentity,receiptGame}=versioned;`);
runtime = replaceOnce(runtime, " let accepting=enabled;", ` const nativeSchemaProbe=(${startNativeSchemaProbe.toString()})(pool,${JSON.stringify(NATIVE_SCHEMA_QUERY)});\n let accepting=enabled;`);
runtime = replaceOnce(runtime,
  "if(!keyOK(roundToken)||!Object.hasOwn(MATH.games,gameId)||!(MATH.games[gameId].betLevels||MATH.betLevels).includes(bet))fail(400,'GAME_BET_OR_TOKEN_INVALID');",
  "const targetGame=['foxy_hot_20_native','multi_hot_5_native'].includes(gameId);if(!keyOK(roundToken)||!Object.hasOwn(MATH.games,gameId)||(!targetGame&&!(MATH.games[gameId].betLevels||MATH.betLevels).includes(bet)))fail(400,'GAME_BET_OR_TOKEN_INVALID');");
runtime = replaceOnce(runtime,
  "if(free&&integer(fs.rows[0].bet)!==baseBet)fail(409,'FREE_SPIN_BET_LOCKED');const charge=free?0n:baseBet;",
  `const roundModel=getGame(gameId),expectedModel=modelIdentity(gameId);
 // Replay was resolved above. New paid requests must explicitly acknowledge the current rules.
 if(targetGame&&((!free&&body.mathVersion!==expectedModel.mathVersion)||(body.mathVersion!==undefined&&body.mathVersion!==expectedModel.mathVersion)||(body.engineVersion!==undefined&&body.engineVersion!==expectedModel.engineVersion)||(body.mathSha256!==undefined&&body.mathSha256!==expectedModel.mathSha256)))fail(409,'GAME_RULES_UPDATED_RELOAD');
 if(!(roundModel.betLevels||MATH.betLevels).includes(bet))fail(400,'GAME_BET_OR_TOKEN_INVALID');
 if(free&&integer(fs.rows[0].bet)!==baseBet)fail(409,'FREE_SPIN_BET_LOCKED');const charge=free?0n:baseBet;`);
runtime = replaceOnce(runtime, 'baseBet*BigInt(getGame(gameId).maxWinMultiplier)', 'baseBet*BigInt(roundModel.maxWinMultiplier)');
runtime = replaceOnce(runtime, 'JSON.stringify(result),mathSha256,free]', 'JSON.stringify(result),result.mathSha256,free]');
runtime = replaceOnce(runtime, 'const parent=r.rows[0],g=getGame(parent.game_id);', "const parent=r.rows[0],nativeParent=['foxy_hot_20_native','multi_hot_5_native'].includes(parent.game_id);if(nativeParent&&kind==='GAMBLE'&&body.replayOnly===true)fail(409,'GAMBLE_STATE_CHANGED');const g=receiptGame(parent.game_id,parent.result_json);if(!g)fail(409,'ROUND_MODEL_NOT_SUPPORTED');");
runtime = replaceOnce(runtime, "if(stake<=0n)fail(409,'NO_GAMBLE_WINNINGS');", "if(stake<=0n)fail(409,'NO_GAMBLE_WINNINGS');if(g.features.gambleMaxStake&&stake>cents(g.features.gambleMaxStake))fail(409,'GAMBLE_STAKE_LIMIT');");
runtime = replaceOnce(runtime, "attempt=Number(last.rows[0]?.attempt||0)+1;if(attempt>g.features.gambleRounds)fail(409,'GAMBLE_LIMIT');", "attempt=Number(last.rows[0]?.attempt||0)+1;");
runtime = replaceOnce(runtime, "if(stake<=0n)fail(409,'NO_GAMBLE_WINNINGS');", String.raw`if(nativeParent&&((body.expectedAttempt!==undefined&&(!Number.isInteger(body.expectedAttempt)||body.expectedAttempt!==attempt))||(body.expectedStake!==undefined&&(typeof body.expectedStake!=='string'||!/^(0|[1-9]\d{0,9})(?:\.\d{1,4})?$/.test(body.expectedStake)||toUnits(body.expectedStake)!==stake*100n))))fail(409,'GAMBLE_STATE_CHANGED');if(attempt>g.features.gambleRounds)fail(409,'GAMBLE_LIMIT');if(stake<=0n)fail(409,'NO_GAMBLE_WINNINGS');`);
const stateEndpoint = ` if(req.method==='GET'&&path.startsWith('/api/state/')){
  const gameId=path.slice('/api/state/'.length);if(!Object.hasOwn(MATH.games,gameId))fail(404,'GAME_NOT_FOUND');
  const r=await pool.query('SELECT remaining,bet FROM sw_nine.free_spins WHERE user_id=$1 AND game_id=$2',[uid,gameId]);
  const remaining=Number(r.rows[0]?.remaining||0),legacyFreeSpins=['hot_foxy_20','multi_hot_5_video'].includes(gameId)&&remaining>0;
  const next=modelIdentity(gameId,{legacy:legacyFreeSpins}),current=modelIdentity(gameId);
  return json({gameId,freeSpinsRemaining:remaining,bet:remaining>0?cash(r.rows[0].bet):null,legacyFreeSpins,...next,activeMathVersion:next.mathVersion,activeEngineVersion:next.engineVersion,activeMathSha256:next.mathSha256,currentMathVersion:current.mathVersion,currentEngineVersion:current.engineVersion,currentMathSha256:current.mathSha256});
 }
`;
runtime = replaceOnce(runtime, " if(req.method==='GET'&&path==='/api/balance')", stateEndpoint + " if(req.method==='GET'&&path==='/api/balance')");
runtime = replaceOnce(runtime, 'mathSha256,engineVersion:loaded.ENGINE_VERSION', `mathSha256,engineVersion:revised.ENGINE_VERSION,legacyEngineVersion:loaded.ENGINE_VERSION,nativeSchemaCompatibility:nativeSchemaProbe.get(),activeModels:Object.fromEntries(${JSON.stringify(targets)}.map(id=>[id,modelIdentity(id)]))`);
await writeFile(root + 'source/runtime-after.mjs', runtime);
const definitions = (core, ids) => Object.fromEntries(ids.map(id => {
  const g = core.getGame(id), publicModel = core.publicGames().find(model => model.id === id), symbolNames = [...new Set(g.reelStrips.flat())];
  const stripCodes = g.reelStrips.map(strip => strip.map(symbol => String.fromCharCode(65 + symbolNames.indexOf(symbol))).join(''));
  return [id, { ...publicModel, ...(families[id] ? { presentationGameId: families[id] } : {}), mathSha256: core.mathSha256, symbolNames, stripCodes, enabled: true }];
}));
await mkdir(root + 'artifacts', { recursive: true });
const client = { active: definitions(revised, targets), legacy: definitions(legacy, Object.values(families)), families, preservedLegacyGameIds: legacy.publicGames().map(g => g.id), versions: MATH_VERSIONS, engineVersion: ENGINE_VERSION,
  notes: ['Two additive machine IDs; all eleven original machines, receipts and free-spin obligations remain on the exact legacy core.', 'Operator probabilities and wheel weights are retained; official private RNG is not established.'] };
await writeFile(root + 'artifacts/client-models.json', JSON.stringify(client) + '\n');
await writeFile(root + 'artifacts/versioned-core.mjs', "import * as legacy from '../source/legacy-core.mjs';\nimport * as revised from '../source/revised-core.mjs';\nimport {createVersionedCore} from '../src/version-dispatch.mjs';\nexport const runtime=createVersionedCore(legacy,revised);\nexport {legacy,revised};\nexport const {MATH,mathSha256,publicGames,spin,toUnits,fromUnits,gambleDraw,bonusRewards,getGame,modelIdentity,receiptGame}=runtime;\n");
const settle = runtime.slice(runtime.indexOf(' async function settle('), runtime.indexOf(' async function action(')).trim();
const action = runtime.slice(runtime.indexOf(' async function action('), runtime.indexOf(' async function reconcile(')).trim();
const deps = 'authenticate,keyOK,MATH,fail,hash,locked,transaction,lockWallets,accepting,integer,cents,balance,houseFor,getGame,spin,toUnits,move,fault,settlementReceipt,mathSha256,modelIdentity,receiptGame,randomUUID,gambleDraw,cash,bonusRewards';
await writeFile(root + 'artifacts/transaction-bodies.mjs', `// Exact production bodies extracted by the build. Dependencies are injected only for synthetic tests.\nexport function bindTransactions(deps){const {${deps}}=deps;\n${settle}\n${action}\nreturn {settle,action};}\n`);
await writeFile(root + 'artifacts/state-endpoint.mjs', `// Exact authenticated state route body. Auth/rate checks remain in the production caller.\nexport function bindState({MATH,fail,pool,modelIdentity,cash,json}){return async function(req,path,uid){\n${stateEndpoint}\nreturn null;};}\n`);
const healthEndpoint = runtime.slice(runtime.indexOf(" if(path==='/health')"), runtime.indexOf(" if(req.method==='GET'&&(path==='/api/games'"));
await writeFile(root + 'artifacts/health-endpoint.mjs', `// Exact production health route; only dependencies are injected for tests.\nexport function bindHealth({pool,redis,json,MATH,Originals,accepting,mathSha256,revised,loaded,modelIdentity,nativeSchemaProbe}){return async function(path){\n${healthEndpoint}\nreturn null;};}\n`);
const manifest = { engineVersion: ENGINE_VERSION, versions: MATH_VERSIONS, legacyMathSha256: legacy.mathSha256, activeMathSha256: revised.mathSha256,
  runtimeBytes: Buffer.byteLength(runtime), runtimeSha256: hash(runtime), revisedCoreSha256: hash(source), legacyCoreSha256: hash(legacySource),
  newGameIds: targets, preservedLegacyGames: legacy.publicGames().map(g => g.id), gameCount: versioned.publicGames().length,
  changes: ['Additive two-machine dispatcher; all eleven original models remain unchanged', 'Exact old receipt replay before rule guards', 'Legacy free-spin obligations preserved without schema/data migration', 'New requests pin rules before settlement', 'New receipt identity selects five attempts; original parent rules remain unchanged', 'Authoritative next-spin state endpoint', 'Optional asynchronous metadata-only native schema compatibility in existing health response'],
  verificationPending: ['Official RNG/strip distribution and ETB-specific operator limits are not established.'] };
await writeFile(root + 'artifacts/build-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
