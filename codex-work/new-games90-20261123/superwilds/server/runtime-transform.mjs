import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
const MARKER = 'zplay-new90-final-host-v1';
const fail = code => { throw Error('SUPERWILDS_RUNTIME_TRANSFORM_' + code); };
function once(source, before, after, label) {
  if (source.split(before).length !== 2) fail('ANCHOR_' + label);
  return source.replace(before, after);
}
function section(source, start, end, edit) {
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  if(a<0||b<0||source.indexOf(start,a+1)>=0)fail('FUNCTION_BOUNDARY');
  return source.slice(0,a)+edit(source.slice(a,b))+source.slice(b);
}

/** Pure build transform. The full private runtime is an input/output value,
 * never embedded in this public module, report, test or repository artifact.
 * Caller pins all three retained source SHA256s before producing a candidate.
 */
export function transformSuperWildsExistingHost({ runtimeSource, nativeBindingSource, stateRoutesSource,
  expectedSha256, modulePath='./native72-batch01/new90-superwilds-runtime.mjs' }={}) {
  const sources={runtime:runtimeSource,nativeBinding:nativeBindingSource,stateRoutes:stateRoutesSource};
  for(const[name,value]of Object.entries(sources)){
    if(typeof value!=='string'||value.length>8*1024*1024||value.includes(MARKER)||
      !/^[a-f0-9]{64}$/.test(expectedSha256?.[name]??'')||hash(value)!==expectedSha256[name])fail('SOURCE_IDENTITY_'+name);
  }
  if(!/^\.\/native72-batch01\/[a-z0-9-]+\.mjs$/.test(modulePath))fail('MODULE_PATH');
  let runtime=runtimeSource,binding=nativeBindingSource,state=stateRoutesSource;
  runtime=once(runtime,'import {createNative72Batch01Binding} from "./native72-batch01/m20-release-entry.mjs";',
    `import {createNative72Batch01Binding} from "./native72-batch01/new90-m20-release-entry.mjs";\nimport {createSuperWildsRuntimeHost,requested90RuntimeConfiguration,prepareSuperWildsRuntimeSchema} from ${JSON.stringify(modulePath)};\n// ${MARKER}`,'IMPORT');
  runtime=once(runtime,'}, qa = false }) {','}, qa = false, requested90Configuration = null }) {','CONSTRUCTOR');
  runtime=once(runtime,'  const houseFor = (uid) => qa ? "qa-house:" + uid : "house";',
    '  const houseFor = (uid) => qa ? "qa-house:" + uid : "house";\n  let requested90 = null;','OWNER');
  runtime=once(runtime,'  async function balance(c, uid) {','  async function rawBalance(c, uid) {','RAW_BALANCE');
  runtime=once(runtime,'  async function lockWallets(c, uid) {','  async function rawLockWallets(c, uid) {','RAW_LOCKS');
  runtime=once(runtime,'  async function move(c, uid, round, game, kind, amount, from, to) {',
    `  async function balance(c,uid){return requested90?requested90.legacyDependencies.balance(c,uid):rawBalance(c,uid);}
  async function lockWallets(c,uid){return requested90?requested90.legacyDependencies.lockWallets(c,uid):rawLockWallets(c,uid);}
  async function move(c, uid, round, game, kind, amount, from, to) {`,'WALLET_FACADE');
  const oldNative='  const native72Batch01 = await createNative72Batch01Binding({authenticate,transaction,lockWallets,move,balance,houseFor,hash,cash,accepting:()=>accepting,publicGames});';
  runtime=once(runtime,oldNative,`  if(requested90Configuration?.attach===true)await prepareSuperWildsRuntimeSchema(pool,{allowInstall:requested90Configuration.installSchema===true});
  const native72Batch01 = await createNative72Batch01Binding({authenticate,transaction,lockWallets,move,balance,houseFor,hash,cash,accepting:()=>accepting,publicGames,
    attachRequested90:requested90Configuration?.attach===true?async(finalDependencies,createRoutes)=>{
      const extension=await createSuperWildsRuntimeHost({dependencies:finalDependencies,rawBalance,rawLockWallets,createRoutes,configuration:requested90Configuration,origin});
      requested90=extension.binding;return extension;
    }:null});`,'FINAL_NATIVE');
  runtime=once(runtime,'isAccepting: () => accepting });','isAccepting: () => accepting, activeRound:(...args)=>requested90?.ownership.activeRound(...args) });','FRESH_DEFAULT');
  runtime=once(runtime,'isAccepting:()=>accepting,gameId}));','isAccepting:()=>accepting,activeRound:(...args)=>requested90?.ownership.activeRound(...args),gameId}));','FRESH_CACHED');
  runtime=once(runtime,'  isAccepting\n}) {','  isAccepting,\n  activeRound = null\n}) {','FRESH_CALLBACK');
  runtime=once(runtime,'  async function activeLibrary(connection, userId) {',`  async function activeLibrary(connection, userId) {
    if(typeof activeRound==='function'){const merged=await activeRound(connection,userId);if(merged!==undefined)return merged?.gameId??null;}`,'FRESH_STATE_OWNER');
  runtime=once(runtime,'      if (req.method === "GET" && path === "/api/fresh-state" && native72Batch01.handles(url.searchParams.get("gameId")))',
    `      if(requested90){const own=await requested90.handle(req);if(own)return own;}
      if (req.method === "GET" && path === "/api/fresh-state" && native72Batch01.handles(url.searchParams.get("gameId")))`,'AUTHENTICATED_DISPATCH');
  const wrap=(start,end,closing,guard)=>{
    runtime=section(runtime,start,end,body=>{
      body=once(body,'      await lockWallets(c, uid);','      await lockWallets(c, uid);\n      const perform=async()=>{','LEGACY_BEGIN');
      return once(body,closing,`      return result;
      };return requested90?${guard}:perform();
    }));${closing.endsWith('})));')?')':''}`,'LEGACY_END');
    });
  };
  // Originals has one extra json() wrapper compared with settle/action.
  runtime=section(runtime,'  async function originals(req, body, path, uid) {','  async function settle(req, body) {',body=>{
    body=once(body,'      await lockWallets(c, uid);','      await lockWallets(c, uid);\n      const perform=async()=>{','ORIGINALS_BEGIN');
    return once(body,'      return result;\n    })));',`      return result;
      };return requested90?requested90.guardLegacy(c,{userId:uid,gameId,requestKey:roundToken,kind:'SPIN'},perform):perform();
    })));`,'ORIGINALS_END');
  });
  wrap('  async function settle(req, body) {','  async function action(req, body, kind) {','      return result;\n    }));',
    "requested90.guardLegacy(c,{userId:uid,gameId,requestKey:roundToken,kind:'SPIN'},perform)");
  wrap('  async function action(req, body, kind) {','  async function reconcile() {','      return result;\n    }));',
    'requested90.guardLegacyAction(c,{userId:uid,roundId,requestKey:roundToken,kind},perform)');
  runtime=once(runtime,'  return { fetch: fetchHandler, pool, redis, transaction, settle, reconcile, referenceReceiptCheck, setEnabled(v) {',
    '  return { fetch: fetchHandler, pool, redis, transaction, settle, reconcile, referenceReceiptCheck, requested90, setEnabled(v) {','SERVICE_VIEW');
  runtime=once(runtime,'enabled: process.env.SLOT_ENGINE_ENABLED === "true" });',
    'enabled: process.env.SLOT_ENGINE_ENABLED === "true", requested90Configuration: requested90RuntimeConfiguration });','BOOT_CONFIGURATION');
  runtime=once(runtime,'native72Batch01: native72Batch01.releaseInfo(), nativeSchemaCompatibility:',
    'requested90: requested90?.releaseInfo()??null, native72Batch01: native72Batch01.releaseInfo(), nativeSchemaCompatibility:','HEALTH_IDENTITY');

  // Write this transformed binding to a NEW module. The accepted original
  // remains byte-identical for loadM20ReleaseInputs's real-file hash checks.
  binding=once(binding,"import {createExistingServerRoutes} from './existing-server-routes.mjs';",
    "import {createExistingServerRoutes} from './new90-existing-server-routes.mjs';",'ADDITIVE_STATE_MODULE');
  binding=once(binding,'  const hooks=createExistingServerRoutes({...existing,publicGames,','  const finalDependencies={...existing,publicGames,','FINAL_CALLBACK_START');
  binding=once(binding,"      if(cap!==null&&cap!==undefined&&before-stake+maximumPayout>BigInt(cap))fail('ACCOUNT_BALANCE_LIMIT',409);\n    }});",`      if(cap!==null&&cap!==undefined&&before-stake+maximumPayout>BigInt(cap))fail('ACCOUNT_BALANCE_LIMIT',409);
    }};
  // ${MARKER}: extension consumes the FINAL overrides, never an outer object.
  const extension=typeof existing.attachRequested90==='function'?await existing.attachRequested90(finalDependencies,createExistingServerRoutes):null;
  const hooks=extension?.routes??createExistingServerRoutes(finalDependencies);`,'FINAL_CALLBACK_END');
  binding=once(binding,'  return Object.freeze({...hooks,publicGames,releaseInfo:',
    '  return Object.freeze({...hooks,publicGames,requested90:extension?.binding??null,releaseInfo:','FINAL_BINDING_VIEW');
  state=once(state,'      const active=await client.query("SELECT game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status=\'active\' ORDER BY created_at,id LIMIT 1",[userId]);',
    `      // ${MARKER}: derive nested gamble availability in THIS transaction.
      const merged=typeof d.activeRound==='function'?await d.activeRound(client,userId):undefined;
      const active=merged===undefined?await client.query("SELECT game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 1",[userId]):{rows:merged?[{game_id:merged.gameId}]:[]};`,'MERGED_STATE');
  return Object.freeze({ runtimeSource:runtime,nativeBindingSource:binding,stateRoutesSource:state,
    report:Object.freeze({schema:'zplay/superwilds-existing-runtime-transform/v1',privateRuntimeIncluded:false,
      inputs:Object.fromEntries(Object.entries(sources).map(([name,value])=>[name,{bytes:Buffer.byteLength(value),sha256:hash(value)}])),
      outputs:{runtime:{bytes:Buffer.byteLength(runtime),sha256:hash(runtime)},nativeBinding:{bytes:Buffer.byteLength(binding),sha256:hash(binding)},stateRoutes:{bytes:Buffer.byteLength(state),sha256:hash(state)}},
      mountedByImport:false,coreLegacyRoutes:['originals','settle','GAMBLE','PICK'],nativeFinalCallbacks:true,insideExistingAuthenticationAndRateGate:true}) });
}
