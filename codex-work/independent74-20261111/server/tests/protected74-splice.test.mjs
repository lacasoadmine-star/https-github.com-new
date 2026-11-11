import test from'node:test';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{mkdtemp,rm,readFile}from'node:fs/promises';import{join}from'node:path';import{tmpdir}from'node:os';
import{buildProtected74Readonly}from'../build-protected74-readonly.mjs';import{prepareProtected74ClosureSplice}from'../prepare-protected74-splice.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const runtime=`import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
export async function createSlotService({databaseUrl,redisUrl,migration,enabled=false,origin,fault=()=>{},qa=false}){
 const pool={end:async()=>{}};const redis={quit:async()=>{}};let accepting=enabled;const cash=x=>String(x);
 async function transaction(fn){throw Error('STRUCTURAL_FIXTURE_NO_SQL');}
 async function authenticate(req,c=pool,locked=false){throw Error('STRUCTURAL_FIXTURE_NO_AUTH');}
 async function balance(c,uid){throw Error('STRUCTURAL_FIXTURE_NO_BALANCE');}
 async function lockWallets(c,uid){throw Error('FINANCIAL_HELPER_MUST_REMAIN_UNUSED');}
 async function move(c,uid,round,game,kind,amount,from,to){throw Error('FINANCIAL_HELPER_MUST_REMAIN_UNUSED');}
 async function locked(uid,key,action){throw Error('FINANCIAL_HELPER_MUST_REMAIN_UNUSED');}
 function settlementReceipt(){throw Error('NO_FINANCE');}
 async function settle(req,body){throw Error('FINANCIAL_HELPER_MUST_REMAIN_UNUSED');}
 async function action(req,body,kind){throw Error('FINANCIAL_HELPER_MUST_REMAIN_UNUSED');}
 async function reconcile(){throw Error('FINANCIAL_HELPER_MUST_REMAIN_UNUSED');}
 const json=value=>Response.json(value);
 async function fetchHandler(req){return new Response('original13-handler');}
 return {fetch:fetchHandler,pool,redis,transaction,settle,reconcile,setEnabled(v){accepting=!!v;},async close(){await redis.quit().catch(()=>{});await pool.end();}};
}
const service=await createSlotService({enabled:true});
Bun.serve({hostname:'0.0.0.0',port:Number(process.env.PORT||3000),fetch:service.fetch});
`;
test('small readonly artifact has64staticcandidate views, zeroengines/classes/imports and no moneyactivation',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'protected74-readonly-'));
 try{const built=await buildProtected74Readonly({outdir:folder});assert.equal(built.manifest.staticCandidateModels,64);assert.equal(built.manifest.mathematicalEvaluators,0);assert.equal(built.manifest.financialClasses,0);assert.deepEqual(built.manifest.executableImports,[]);assert.equal(built.manifest.newWagerActions,'HARD503');assert.equal(built.manifest.operatorAuditEndpoint,false);assert.doesNotMatch(built.source,/startRound|class LibraryService|new pg\.Pool|\.action\(/);}finally{await rm(folder,{recursive:true,force:true});}
});
test('bounded factory splice is reversible, financial functionbodies andoriginalserverbootstrap byte-identical; hookcaptured beforeBun.serve',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'protected74-splice-'));const oldBun=globalThis.Bun;let serverStarts=0,captured;
 try{
  const built=await buildProtected74Readonly({outdir:folder});const patched=prepareProtected74ClosureSplice({runtime,reviewInstaller:built.source,expectedRuntimeSha256:hash(runtime)});
  assert.equal(patched.manifest.restoredOriginalSha256,hash(runtime));assert.equal(patched.manifest.old13ModelsChanged,0);assert.equal(patched.manifest.newFinancialClassesConstructed,0);assert.equal(patched.manifest.originalBootstrapByteIdentical,true);assert.equal(patched.manifest.newWagerActions,'HARD503');assert.equal(Object.keys(patched.manifest.originalFinancialHelperBodiesPreserved).length,10);
  globalThis.Bun={serve:options=>{serverStarts++;captured=options;return{};}};
  await import('data:text/javascript;base64,'+Buffer.from(patched.runtime).toString('base64'));assert.equal(serverStarts,1);
  for(const path of ['/api/slots/games/multi_hot_5_video','/api/slots/games/hot_foxy_20'])assert.equal(await(await captured.fetch(new Request('https://review.invalid'+path))).text(),'original13-handler');
  for(const prefix of ['/api/slots/independent74/','/api/independent74/']){
   const catalog=await captured.fetch(new Request('https://review.invalid'+prefix+'catalog'));assert.equal(catalog.status,200);const view=await catalog.json();assert.equal(view.games.length,64);assert.equal(view.candidateOnly,true);assert(view.games.every(g=>!g.accepting));
   const action=await captured.fetch(new Request('https://review.invalid'+prefix+'action',{method:'POST',body:'{"allowNewRounds":true}'}));assert.equal(action.status,503);
  }
  assert.throws(()=>prepareProtected74ClosureSplice({runtime,reviewInstaller:built.source}),/ACTUAL_PROTECTED_RUNTIME_CHANGED/);
  assert.throws(()=>prepareProtected74ClosureSplice({runtime:runtime.replace('fetch:fetchHandler,pool','fetch:different,pool'),reviewInstaller:built.source,expectedRuntimeSha256:hash(runtime.replace('fetch:fetchHandler,pool','fetch:different,pool'))}),/EXACT_PROTECTED_SPLICE_ANCHOR_REQUIRED/);
 }finally{if(oldBun===undefined)delete globalThis.Bun;else globalThis.Bun=oldBun;await rm(folder,{recursive:true,force:true});}
});
