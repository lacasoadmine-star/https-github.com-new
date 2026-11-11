// OFFLINE PREPARATION ONLY. Emits private review files; never contacts/deploys a
// service, executes a production runtime, reads credentials, or changes a DB.
import{createHash}from'node:crypto';import{gzipSync}from'node:zlib';
import{readFile,writeFile}from'node:fs/promises';import{resolve}from'node:path';import{fileURLToPath}from'node:url';
import{ACTUAL_PROTECTED_RUNTIME_SHA256}from'./protected74-review.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const FACTORY='export async function createSlotService({databaseUrl,redisUrl,migration,enabled=false,origin,fault=()=>{},qa=false}){';
const RETURN=' return {fetch:fetchHandler,pool,redis,transaction,settle,reconcile,setEnabled(v){accepting=!!v;},async close(){await redis.quit().catch(()=>{});await pool.end();}};';
const BOOTSTRAP="Bun.serve({hostname:'0.0.0.0',port:Number(process.env.PORT||3000),fetch:service.fetch});";
function once(source,needle){if(source.split(needle).length!==2)throw Error('EXACT_PROTECTED_SPLICE_ANCHOR_REQUIRED');}
export function prepareProtected74ClosureSplice({runtime,reviewInstaller,expectedRuntimeSha256=ACTUAL_PROTECTED_RUNTIME_SHA256}={}){
 if(typeof runtime!=='string'||hash(runtime)!==expectedRuntimeSha256)throw Error('ACTUAL_PROTECTED_RUNTIME_CHANGED');
 if(typeof reviewInstaller!=='string'||!reviewInstaller.includes('createProtected74ClosureReviewNamespace'))throw Error('CLOSED_REVIEW_INSTALLER_REQUIRED');
 once(runtime,FACTORY);once(runtime,RETURN);once(runtime,BOOTSTRAP);
 const compressed=gzipSync(Buffer.from(reviewInstaller),{level:9}),encoded=compressed.toString('base64');
 const imports=`// OFFLINE PROTECTED74 REVIEW MODULE: no new financial class or server.\nconst independent74ReviewBytes=gunzipSync(Buffer.from('${encoded}','base64'),{maxOutputLength:${Buffer.byteLength(reviewInstaller)}});\nif(independent74ReviewBytes.length!==${Buffer.byteLength(reviewInstaller)}||createHash('sha256').update(independent74ReviewBytes).digest('hex')!=='${hash(reviewInstaller)}')throw Error('PROTECTED74_REVIEW_MODULE_INTEGRITY_FAILED');\nconst independent74ReviewModule=await import('data:text/javascript;base64,'+independent74ReviewBytes.toString('base64'));\n`;
 const inside=` const independent74Review=independent74ReviewModule.createProtected74ClosureReviewNamespace({previous:{fetch:fetchHandler},capabilities:{authenticate,pool,transaction,balance,cash,lockWallets,move,locked,origin}});\n`;
 const changedReturn=RETURN.replace('fetch:fetchHandler','fetch:independent74Review.fetch');
 const candidate=runtime.replace(FACTORY,imports+FACTORY).replace(RETURN,inside+changedReturn);
 const restored=candidate.replace(imports,'').replace(inside+changedReturn,RETURN);
 if(restored!==runtime||!candidate.includes(BOOTSTRAP))throw Error('PROTECTED_RUNTIME_PRESERVATION_FAILED');
 const helpers={};for(const[name,start,end]of[
  ['transaction',' async function transaction(fn){',' async function authenticate('],
  ['authenticate',' async function authenticate(req,',' async function balance('],
  ['balance',' async function balance(c,',' async function lockWallets('],
  ['lockWallets',' async function lockWallets(c,',' async function move('],
  ['move',' async function move(c,',' async function locked('],
  ['locked',' async function locked(uid,',' function settlementReceipt('],
  ['settle',' async function settle(req,body){',' async function action('],
  ['action',' async function action(req,body,kind){',' async function reconcile('],
  ['reconcile',' async function reconcile(){',' const json='],
  ['fetchHandler',' async function fetchHandler(req){',RETURN],
 ]){const a=runtime.indexOf(start),b=runtime.indexOf(end,a+start.length);if(a<0||b<0)throw Error('FINANCIAL_HELPER_BOUNDARY_MISSING:'+name);const bytes=runtime.slice(a,b);if(!candidate.includes(bytes))throw Error('FINANCIAL_HELPER_CHANGED:'+name);helpers[name]={bytes:Buffer.byteLength(bytes),sha256:hash(bytes)};}
 return {runtime:candidate,manifest:{format:'protected74-in-factory-review-v1',reviewOnly:true,originalRuntimeSha256:hash(runtime),candidateRuntimeSha256:hash(candidate),restoredOriginalSha256:hash(restored),originalBytes:Buffer.byteLength(runtime),candidateBytes:Buffer.byteLength(candidate),installerBytes:Buffer.byteLength(reviewInstaller),installerGzipBytes:compressed.length,installerSha256:hash(reviewInstaller),splices:['Insert verified pure review module before existing factory declaration','Insert in-process closure hook immediately before existing return object','Return wrapped fetch pointer before original unchanged Bun.serve captures it'],originalFinancialHelperBodiesPreserved:helpers,originalBootstrapByteIdentical:true,originalMathPayloadsByteIdentical:true,newWagerActions:'HARD503',old13ModelsChanged:0,newFinancialClassesConstructed:0,newMigrationsAdded:0,newServicesCreated:0,newWalletsCreated:0,namespace:'/api/slots/independent74/{catalog,state,action,history}',runtimeCapabilities:'Existing private auth/transaction/balance/cash references; no copied money SQL. State/history use SETTRANSACTIONREADONLY; no financewrites.',unimplementedReleaseBlockers:['Same protected DB schema and class reuse proof','Persistent maximum-liability escrow and accepted-round recovery capability','Reciprocal legacy free-spin/bonus/gamble and active-round admission guards','Actual current account/house/per-game policies','All74 officialreference readiness','Verified existing machine-session guard for eventual action transport']}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const[runtimePath,installerPath,outputPath]=process.argv.slice(2);if(!outputPath)throw Error('Usage: node server/prepare-protected74-splice.mjs PRIVATE_RUNTIME REVIEW_INSTALLER PRIVATE_CANDIDATE');
 const result=prepareProtected74ClosureSplice({runtime:await readFile(runtimePath,'utf8'),reviewInstaller:await readFile(installerPath,'utf8')});
 await writeFile(outputPath,result.runtime,{mode:0o600});await writeFile(outputPath+'.manifest.json',JSON.stringify(result.manifest,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({candidate:outputPath,manifest:outputPath+'.manifest.json',originalSha256:result.manifest.originalRuntimeSha256,candidateSha256:result.manifest.candidateRuntimeSha256,newWagerActions:result.manifest.newWagerActions}));
}
