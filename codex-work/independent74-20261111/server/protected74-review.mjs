// OFFLINE REVIEW CANDIDATE ONLY. Does not start a server, construct a financial
// class, migrate, configure a service, or enable any new wager. Deployment and
// financial activation are separate reviews; the 64 action gates are hard shut.
import {createHash} from 'node:crypto';
import * as officialMath from '../math/official72.mjs';
import {createExistingLibrary74Adapter} from './existing-library74-adapter.mjs';
import {installExistingLibrary74} from './existing-library74-service.mjs';

export const PROTECTED74_PREFIX='/api/slots/independent74/';
export const PROTECTED74_NEW_ROUNDS_ENABLED=false;
export const ACTUAL_PROTECTED_RUNTIME_SHA256='c434a085e736326db5f9c8822bf1feb8212073495174889527a0655e9a5b5c91';
// These ten identities already exist in the protected-game backend. Neither
// protected legacy evaluator nor its current receipt/version is replaced.
export const PROTECTED_EXISTING_MODELS=Object.freeze({
 ind74_official_multihot40:'multi_hot_40',ind74_official_multihot5superwilds:'multi_hot_5_super_wilds',
 ind74_official_burningice:'burning_ice',ind74_official_wildmultistars:'wild_multi_stars',
 ind74_official_safarisimba:'safari_simba',ind74_official_junglesisters:'jungle_sisters',
 ind74_official_baoslot5x:'bao_slot_5x',ind74_official_multihot100:'multi_hot_100',
 ind74_official_multihot5:'multi_hot_5_video',ind74_official_foxyhot20:'hot_foxy_20',
});
const definitions=officialMath.listGameDefinitions().filter(d=>!Object.hasOwn(PROTECTED_EXISTING_MODELS,d.id));
if(definitions.length!==64)throw Error('PROTECTED74_EXPECTED_64_MISSING_MODELS');
const ids=new Set(definitions.map(d=>d.id));
export const protected64Math=Object.freeze({...officialMath,
 listGameDefinitions:()=>structuredClone(definitions),
 getGameDefinition:id=>ids.has(id)?officialMath.getGameDefinition(id):null,
});
const reviewAdapter=createExistingLibrary74Adapter({math:protected64Math,reviewedGameIds:[],allowNewRounds:false,gameLimits:{}});
const sha=value=>createHash('sha256').update(value).digest('hex');
const integer=value=>{if(typeof value!=='string'||!/^(0|[1-9][0-9]*)$/.test(value))throw Error('CANONICAL_INTEGER_MONEY_REQUIRED');return BigInt(value);};
// Existing protected math uses four decimal places; canonical wallet/retained
// LibraryService use cents. Preserve the existing floor at the money boundary.
export const protectedMinorToCoreUnits=value=>(integer(value)*100n).toString();
export const protectedCoreUnitsToMinor=value=>(integer(value)/100n).toString();
export function protectedDecimalToMinor(value){
 if(typeof value!=='string'||!/^(0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/.test(value))throw Error('EXACT_PROTECTED_DECIMAL_REQUIRED');
 const [whole,fraction='']=value.split('.');return protectedCoreUnitsToMinor((BigInt(whole)*10000n+BigInt(fraction.padEnd(4,'0'))).toString());
}

// An eventual enabled transport must reuse a server-resolved machine-session
// ID from the existing protected gateway. The expected value is injected by
// trusted server context, never derived from a browser-supplied user ID.
export function validateProtected74MachineSessionHeaders(request,{playerOrigin,sessionId}={}){
 session(request);
 if(request.method!=='POST'||request.headers.get('origin')!==playerOrigin)throw error('INVALID_ORIGIN',403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))throw error('JSON_REQUIRED',415);
 if(typeof sessionId!=='string'||!/^[a-f0-9]{64}$/.test(sessionId))throw error('VERIFIED_MACHINE_SESSION_REQUIRED',503);
 if(request.headers.get('x-zplay-machine-session')!==sessionId)throw error('PLAYER_SESSION_CHANGED',403);
 return true;
}

export function protected74ReviewReadiness(evidence={}){
 const required=['sameProtectedDatabaseVerified','actualSchemaConstraintsVerified','retainedFinancialClassHashesVerified',
  'protectedSessionResolverVerified','protectedMachineSessionGuardVerified','accountCapsAndHouseReserveVerified','reciprocalLegacyAdmissionGuardVerified',
  'canonicalUserHouseRowLockOrderVerified','all74ReferenceEvidenceComplete','persistentPerPlayerGameStakeCarryVerified','verifiedPerGamePolicy'];
 const reasons=required.filter(key=>evidence[key]!==true).map(key=>'MISSING_'+key.replace(/[A-Z]/g,c=>'_'+c).toUpperCase());
 return {reviewOnly:true,newRoundsEnabled:false,hardGate:'PROTECTED74_NEW_ROUNDS_ENABLED=false',
  readyForSeparateReleaseReview:reasons.length===0,reasons};
}

export function protected74ReviewCatalog(){
 return {currency:'ETB',reviewOnly:true,new_rounds_enabled:false,existing_models:PROTECTED_EXISTING_MODELS,
  existing_unique_catalogue_count:10,additional_models:64,total_catalogue_identities:74,
  games:Object.values(reviewAdapter.definitions)};
}

// This candidate registers evaluators only into an ALREADY INITIALIZED retained
// LibraryService supplied by the caller. It never constructs SharedWallet or
// LibraryService and never calls migrate/recoverTimers/setEnabled. Actual live
// protected process does not yet expose such an initialized instance: block.
// Driver-shape adapter only: retained classes use unsafe()/begin(), the exact
// protected process uses pg query()/transaction(). No ledger SQL, DB client,
// wallet or financial class is implemented or constructed here.
const protectedSqlOrigins=new WeakMap();
export function createProtectedSqlFacade({pool,transaction}={}){
 if(typeof pool?.query!=='function'||typeof transaction!=='function')throw new TypeError('Existing protected pool/transaction references are required.');
 const wrap=connection=>Object.freeze({unsafe:async(text,parameters=[])=>{const result=await connection.query(text,parameters);return result.rows;}});
 const facade=Object.freeze({unsafe:async(text,parameters=[])=>{const result=await pool.query(text,parameters);return result.rows;},begin:callback=>transaction(connection=>callback(wrap(connection)))});
 protectedSqlOrigins.set(facade,pool);return facade;
}
export function assertProtectedSqlPool(sql,pool){if(protectedSqlOrigins.get(sql)!==pool)throw Error('RETAINED_CLASSES_MUST_USE_EXACT_PROTECTED_POOL');return true;}

export function attachProtected74ReviewModels({retainedLibrary,protectedPool=null,evidence={}}={}){
 const readiness=protected74ReviewReadiness(evidence);
 if(!retainedLibrary)throw Error('EXISTING_RETAINED_LIBRARY_INSTANCE_REQUIRED');
 if(protectedPool)assertProtectedSqlPool(retainedLibrary.shared?.sql,protectedPool);
 if(evidence.sameProtectedDatabaseVerified!==true||evidence.actualSchemaConstraintsVerified!==true||evidence.retainedFinancialClassHashesVerified!==true)throw Error('ACTUAL_PROTECTED_DATABASE_AND_RETAINED_CLASS_PROOF_REQUIRED');
 const facade=installExistingLibrary74({service:retainedLibrary,math:protected64Math,reviewedGameIds:[],allowNewRounds:false,gameLimits:{}});
 return {facade,readiness};
}

const response=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
function error(code,status){return Object.assign(new Error(code),{status});}
function session(request){
 const parts=(request.headers.get('cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('sw_session='));
 if(parts.length!==1||!/^sw_session=[a-f0-9]{64}$/.test(parts[0]))throw error('PLAYER_LOGIN_REQUIRED',401);
 return parts[0].slice(11);
}

export function createProtected74ReviewNamespace({previous,facade=null,evidence={},resolveAuthenticatedPlayer=null}={}){
 if(typeof previous?.fetch!=='function')throw new TypeError('The exact existing protected fetch handler is required.');
 const readiness=protected74ReviewReadiness(evidence);
 return {...previous,async fetch(request,...rest){
  const url=new URL(request.url);
  if(!url.pathname.startsWith(PROTECTED74_PREFIX))return previous.fetch.call(previous,request,...rest);
  const route=url.pathname.slice(PROTECTED74_PREFIX.length);
  if(route==='catalog'&&request.method==='GET')return response({...protected74ReviewCatalog(),readiness});
  if(!['state','history','action'].includes(route))return response({error:{code:'NOT_FOUND'}},404);
  if(request.method!==(route==='action'?'POST':'GET'))return response({error:{code:'METHOD_NOT_ALLOWED'}},405);
  // The hard gate precedes every financial adapter, SQL, or service action.
  // Neither a browser field nor caller-supplied evidence can enable this build.
  if(route==='action')return response({error:{code:'PROTECTED74_REVIEW_ONLY_NEW_ROUNDS_DISABLED'},new_rounds_enabled:false},503);
  try{
   const gameId=url.searchParams.get('game_id');
   if(!ids.has(gameId)||[...url.searchParams.keys()].some(key=>key!=='game_id')||url.searchParams.getAll('game_id').length!==1)throw error('GAME_MODEL_UNAVAILABLE',404);
   session(request);
   if(!facade||typeof resolveAuthenticatedPlayer!=='function'||evidence.sameProtectedDatabaseVerified!==true||evidence.actualSchemaConstraintsVerified!==true||evidence.protectedSessionResolverVerified!==true||evidence.protectedMachineSessionGuardVerified!==true)throw error('PROTECTED74_ACCOUNT_READINESS_UNVERIFIED',503);
   // Existing authenticated resolver must derive user ID from this cookie;
   // no browser body, query parameter or header may supply an account ID.
   const authenticated=await resolveAuthenticatedPlayer(request);
   const user=authenticated?.userId,guard=authenticated?.machineSessionId;
   if(typeof user!=='string'||!user||user.startsWith('@')||typeof guard!=='string'||!/^[a-f0-9]{64}$/.test(guard))throw error('ACTIVE_PLAYER_SESSION_REQUIRED',401);
   const value=route==='state'?await facade.state(user,gameId):await facade.history(user,gameId);
   return response({...value,currency:'ETB',accepting:false,sessionGuard:guard,reviewOnly:true});
  }catch(failure){return response({error:{code:failure.status&&failure.status<500?failure.message:'PROTECTED74_ACCOUNT_READINESS_UNVERIFIED'},new_rounds_enabled:false},failure.status??503);}
 }};
}

// Append-only, export-only offline candidate. The existing Bun.serve bootstrap
// remains untouched; consequently this alone does NOT install any HTTP route.
export function prepareProtectedRuntimeExportOnly(source,{expectedSha256=ACTUAL_PROTECTED_RUNTIME_SHA256}={}){
 if(typeof source!=='string'||sha(source)!==expectedSha256)throw Error('EXACT_PROTECTED_RUNTIME_SHA256_REQUIRED');
 if(source.includes('independent74RetainedProtectedService'))throw Error('ALREADY_EXPORTED');
 const suffix='\n// OFFLINE REVIEW: existing instance export only; no new routes or gates.\nexport {service as independent74RetainedProtectedService};\n';
 return {source:source+suffix,manifest:{reviewOnly:true,deployableIntegration:false,originalSha256:sha(source),
  originalBytes:Buffer.byteLength(source),appendedBytes:Buffer.byteLength(suffix),candidateSha256:sha(source+suffix),
  exactOriginalPrefixPreserved:true,changedExistingCodeBytes:0,newFinancialClasses:0,newWallets:0,newRoutesInstalled:0,
  newRoundGatesEnabled:0,exportsOnly:'existing service instance',unexposedPrivateHelpers:['authenticate','balance','lockWallets','move','houseFor'],
  blocker:'Existing Bun.serve already captures its fetch handler; a separately reviewed bootstrap hook and compatible retained-service injection are still required.'}};
}

// In-process closure hook for the ACTUAL protected slot factory. References are
// its existing private helpers, not newly implemented authentication or money
// functions. No LibraryService/SharedWallet instance is created here. This build
// exposes closed catalogue + read-only account snapshots only; persistent new
// round admission/settlement remains blocked pending the separate proofs.
export function createProtected74ClosureReviewNamespace({previous,capabilities}={}){
 if(typeof previous?.fetch!=='function'||typeof capabilities?.authenticate!=='function'||typeof capabilities?.transaction!=='function'||typeof capabilities?.balance!=='function'||typeof capabilities?.cash!=='function')throw new TypeError('Exact protected factory helper references are required.');
 const {authenticate,transaction,balance,cash}=capabilities;
 return {...previous,async fetch(request,...context){
  const url=new URL(request.url);
  const pathname=url.pathname.startsWith('/api/independent74/')?url.pathname.replace('/api/','/api/slots/'):url.pathname;
  if(!pathname.startsWith(PROTECTED74_PREFIX))return previous.fetch.call(previous,request,...context);
  const route=pathname.slice(PROTECTED74_PREFIX.length);
  if(request.method==='GET'&&route==='catalog')return response({...protected74ReviewCatalog(),wallet:'same-existing-protected-account',persistentNewRoundsReady:false});
  if(!['state','history','action'].includes(route))return response({error:{code:'NOT_FOUND'}},404);
  if(request.method!==(route==='action'?'POST':'GET'))return response({error:{code:'METHOD_NOT_ALLOWED'}},405);
  // No session/gate/config input can make this review build move money.
  if(route==='action')return response({error:{code:'PROTECTED74_REVIEW_ONLY_NEW_ROUNDS_DISABLED'},new_rounds_enabled:false},503);
  const id=url.searchParams.get('game_id');
  if(!ids.has(id)||url.searchParams.getAll('game_id').length!==1||[...url.searchParams.keys()].some(k=>k!=='game_id'))return response({error:{code:'GAME_MODEL_UNAVAILABLE'}},404);
  try{
   const snapshot=await transaction(async connection=>{
    // Existing transaction() has only SET LOCAL statements before this hook;
    // establish database-enforced read-only mode before any data query.
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const user=await authenticate(request,connection,false);
    const actualBalance=await balance(connection,user);
    const rows=route==='history'?await connection.query('SELECT id,game,bet::text AS stake_minor,payout::text AS payout_minor,created_at FROM sw_rebuild.rounds WHERE user_id=$1 AND game=$2 ORDER BY created_at DESC,id DESC LIMIT 20',[user,id]):{rows:[]};
    return {authenticated:true,mode:'account',currency:'ETB',balance:cash(actualBalance),
      game:reviewAdapter.definitions[id],game_id:id,model_version:reviewAdapter.definitions[id].version,
      accepting:false,reviewOnly:true,walletSource:'existing-protected-account',
      // No accepted new round exists in this hardclosed candidate. Do not
      // pretend that settled canonical history proves active-round recovery.
      round:null,activeRecoveryVerified:false,other_active_game:null,
      ...(route==='history'?{history:rows.rows.map(r=>({round_id:r.id,game_id:r.game,stakeMinor:r.stake_minor,payoutMinor:r.payout_minor,status:'settled',created_at:r.created_at}))}:{}),
      machineSessionContract:'Use the existing /api/machine-session and X-Zplay-Machine-Session gateway guard; future action transport remains unverified and disabled.'};
   });
   return response(snapshot);
  }catch(failure){const status=Number.isInteger(failure.status)&&failure.status>=400&&failure.status<500?failure.status:503;return response({error:{code:status<500?failure.message:'PROTECTED74_ACCOUNT_READINESS_UNVERIFIED'},new_rounds_enabled:false},status);}
 }};
}
