/**
 * LOCAL ONLY: actual MultiHot40 client + canonical LibraryService/wallet in a
 * disposable in-memory PostgreSQL database. This does not connect to or publish
 * to production. The only listener address is 127.0.0.1.
 *
 * Start from this checkout:
 *   node test/multihot40-browser-server.mjs --port=8789
 *   open http://127.0.0.1:8789/games/multihot40_native
 *
 * Fixture controls (JSON POST, header X-Zplay-Local-Fixture: 1):
 *   /__fixture/reset  {"scenario":"win"} resets local accounts/rounds only.
 *   /__fixture/seed   {"scenario":"loss"} changes future local draws only.
 *   /__fixture/seed   {"scenario":"fixed","seed":"<64 lowercase hex>"}
 * GET /__fixture/status reports the local round, wallet/ledger counts, action
 * receipts, and the next minimum-stake result/first gamble colour for UI tests.
 * Scenarios: win (positive and gamble-eligible at 0.40 ETB), loss, natural,
 * fixed. Seeds still pass through the actual HMAC stream and native evaluator.
 *
 * Useful browser sequences:
 * - Reset win; reload; YES/NO; Spin; wait; reload pending; Take Win; view history.
 * - Reset win; Spin; Take Win via the next Spin; inspect exactly two paid rounds.
 * - Reset win; Spin; choose the colour from nextRoundPreview before that Spin;
 *   confirm the actual server card, pending amount, and eventual collection.
 * - Reset loss; enable autoplay with a small loss limit; check automatic stop.
 * - Press STOP while spinning; /__fixture/status must show one accepted start.
 * - Intercept one browser action response, then Retry; the canonical request ID
 *   and transfer counts must remain unchanged on replay.
 *
 * Player identity is a deliberately local shim. A real canonical session row
 * resolves player-a; the production Worker/HMAC edge login is not exercised.
 * Code modules are reread on each GET. Restart after changing the art manifest.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {dirname,extname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createFixture} from './multihot40-wallet-fixture.mjs';
import {seededRandom} from '../backend-baseline/library-service.mjs';
import {installLibrary} from '../backend-baseline/library-backend.mjs';
import {resolveSessionUser} from '../backend-baseline/jetx-auth.mjs';
import {installExpansionHistory} from '../expansion-history.mjs';
import * as engine from '../models/multihot40-rules.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PREFIX='/native-library/expansion/r1/';
const ART_PREFIX='/native-library/reference-art/r1/smartsoft/assets/';
const DEFAULT_ART_ROOT='/workspace/scratch/98e3dc6fcb3a/multihot40-static';
const LOCAL_SESSION='local-fixture-session';
const SUBJECT='@session:'+createHash('sha256').update(LOCAL_SESSION).digest('hex');
const gamePath='/games/'+engine.ID;
const manifestPath='presentation/manifests/'+engine.ID+'.json';
const clientFiles=new Set(['multihot40.html','multihot40.css','multihot40-app.mjs','multihot40-presentation.mjs','session.mjs','autoplay.mjs']);
const presentationFiles=new Set(['presentation/atlas.mjs','presentation/machine-renderer.mjs','presentation/multihot40-motion.mjs','presentation/multihot40-skeleton.mjs']);
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.gif':'image/gif','.mp3':'audio/mpeg','.otf':'font/otf','.ttf':'font/ttf','.woff2':'font/woff2'};
const sha=value=>createHash('sha256').update(value).digest('hex');
const fail=(code,status=422)=>{throw Object.assign(Error(code),{status});};
const roundId=sequence=>'00000000-0000-4000-8000-'+String(sequence).padStart(12,'0');
const scenarios=new Set(['win','loss','natural','fixed']);
function selection(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['scenario','seed'].includes(key)))fail('INVALID_LOCAL_FIXTURE_OPTIONS');
 const scenario=body.scenario??'win';
 if(!scenarios.has(scenario)||scenario==='fixed'&&!/^[a-f0-9]{64}$/.test(body.seed??'')||scenario!=='fixed'&&body.seed!==undefined)fail('INVALID_LOCAL_FIXTURE_SEED');
 return {scenario,seed:scenario==='fixed'?body.seed:null};
}
function outcome(seed,id){
 const result=engine.evaluateDraftRound(engine.ID,{stakeMinor:'40'},seededRandom(seed,id+':0'),Date.now());
 const suit=['clubs','diamonds','hearts','spades'][Math.floor(seededRandom(seed,id+':1')()*4)];
 return {roundId:id,minimumStakeMinor:'40',baseWinMinor:result.state.baseWinMinor,
  multiplier:result.state.feature.multiplier,firstGambleColor:['clubs','spades'].includes(suit)?'black':'red',
  firstGambleSuit:suit,gambleEligibleAtMinimumStake:result.state.status==='active'&&BigInt(result.state.currentCashoutMinor)<=50000n};
}
function selectedSeed(selected,id){
 if(selected.scenario==='natural')return randomBytes(32).toString('hex');
 if(selected.scenario==='fixed')return selected.seed;
 for(let index=0;index<10000;index++){
  const seed=sha('local-browser-only:'+selected.scenario+':'+id+':'+index),preview=outcome(seed,id);
  if(selected.scenario==='loss'?preview.baseWinMinor==='0':preview.gambleEligibleAtMinimumStake)return seed;
 }
 throw Error('LOCAL_FIXTURE_SEED_SEARCH_EXHAUSTED');
}
async function bodyJSON(request){
 if(request.headers['content-type']?.split(';')[0].trim()!=='application/json')fail('JSON_REQUIRED',415);
 let bytes=0;const parts=[];
 for await(const chunk of request){bytes+=chunk.length;if(bytes>8192)fail('REQUEST_TOO_LARGE',413);parts.push(chunk);}
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{fail('INVALID_JSON',400);}
}

export async function createBrowserFixtureServer({port=8789,assetRoot=DEFAULT_ART_ROOT,scenario='win'}={}){
 if(!Number.isSafeInteger(port)||port<0||port>65535)throw Error('INVALID_LOCAL_PORT');
 let selected=selection({scenario}),fixture,server,origin,closed=false;
 const traces=[];
 const seedCache=new Map();
 const seedFor=id=>{
  if(!seedCache.has(id))seedCache.set(id,selectedSeed(selected,id));
  return seedCache.get(id);
 };
 fixture=await createFixture({now:Date.now,seed:()=>seedFor(roundId(fixture.clock.roundSequence))});
 const close=async()=>{
  if(closed)return;closed=true;
  if(server?.listening){await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
  await fixture.cleanup();
 };
 try{
  const manifestBytes=await readFile(resolve(ROOT,manifestPath));
  const manifest=JSON.parse(manifestBytes);
  if(manifest.id!==engine.ID)throw Error('WRONG_LOCAL_MANIFEST');
  const config={...structuredClone(engine.publicConfig),launchable:true,fixtureOnly:true,
   referencePresentation:{manifestURL:PREFIX+manifestPath,manifestSha256:sha(manifestBytes),assetBaseURL:ART_PREFIX,modelVersion:engine.VERSION}};
  const createSession=()=>fixture.sql.unsafe('INSERT INTO sw_rebuild.sessions(token,user_id,expires) VALUES($1,$2,$3)',[LOCAL_SESSION,fixture.playerId,Date.now()+86400000]);
  await createSession();
  const dependencies={service:fixture.service,verifyNative:()=>SUBJECT,readNativeBody:request=>request.text(),engineSecret:'local-fixture-only',resolveSessionUser};
  const backend=installExpansionHistory(installLibrary({fetch:async()=>Response.json({error:'NOT_FOUND'},{status:404})},dependencies),dependencies);
  const reset=async options=>{
   const next=selection(options);fixture.service.close();await fixture.setup();await createSession();
   selected=next;seedCache.clear();traces.length=0;
  };
  const status=async()=>{
   const state=await fixture.service.state(fixture.playerId,engine.ID);
   const counts=(await fixture.sql.unsafe(`SELECT
    (SELECT COUNT(*) FROM sw_native_library.rounds)::int AS rounds,
    (SELECT COUNT(*) FROM sw_native_library.requests)::int AS accepted_requests,
    (SELECT COUNT(*) FROM sw_rebuild.transfers WHERE kind='casino_bet')::int AS paid_starts,
    (SELECT COUNT(*) FROM sw_rebuild.transfers WHERE kind='casino_win')::int AS credited_wins,
    (SELECT COUNT(*) FROM sw_rebuild.transfers)::int AS transfers,
    (SELECT COUNT(*) FROM sw_rebuild.ledger)::int AS ledger_entries`))[0];
   const id=roundId(fixture.clock.roundSequence+1);
   return {localFixtureOnly:true,productionConnected:false,origin,gameURL:origin+gamePath,
    sessionId:LOCAL_SESSION,playerId:fixture.playerId,scenario:selected.scenario,
    nextRoundPreview:outcome(seedFor(id),id),counts,traces:structuredClone(traces),state:{...state,authenticated:true,sessionId:LOCAL_SESSION}};
  };
  const headers={'cache-control':'no-store','x-content-type-options':'nosniff','x-zplay-local-fixture':'1',
   'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
  const send=(request,response,content,type='application/json; charset=utf-8',code=200)=>{
   const bytes=Buffer.isBuffer(content)?content:Buffer.from(typeof content==='string'?content:JSON.stringify(content));
   response.writeHead(code,{...headers,'content-type':type,'content-length':bytes.length});response.end(request.method==='HEAD'?undefined:bytes);
  };
  server=createServer(async(request,response)=>{
   try{
    const local=new Set(['127.0.0.1','::ffff:127.0.0.1']);
    if(!local.has(request.socket.remoteAddress))fail('LOCAL_FIXTURE_LOOPBACK_ONLY',403);
    const authority=request.headers.host;
    if(![new URL(origin).host,'localhost:'+server.address().port].includes(authority))fail('LOCAL_FIXTURE_HOST_REQUIRED',403);
    if(request.headers.origin&&request.headers.origin!==origin&&request.headers.origin!=='http://localhost:'+server.address().port)fail('LOCAL_FIXTURE_SAME_ORIGIN_REQUIRED',403);
    const url=new URL(request.url,origin),path=url.pathname;
    if(path==='/__fixture/status'&&request.method==='GET')return send(request,response,await status());
    if(path==='/__fixture/reset'||path==='/__fixture/seed'){
     if(request.method!=='POST')fail('METHOD_NOT_ALLOWED',405);
     if(request.headers['x-zplay-local-fixture']!=='1')fail('LOCAL_FIXTURE_HEADER_REQUIRED',403);
     const options=await bodyJSON(request);
     if(path.endsWith('/reset'))await reset(options);else{selected=selection(options);seedCache.clear();}
     return send(request,response,await status());
    }
    if(['/api/expansion/state','/api/expansion/action','/api/expansion/history'].includes(path)){
     const isAction=path.endsWith('/action');
     if(request.method!==(isAction?'POST':'GET'))fail('METHOD_NOT_ALLOWED',405);
     if(isAction&&request.headers['x-zplay-library-session']!==LOCAL_SESSION)fail('LIBRARY_SESSION_CHANGED',409);
     const input=isAction?await bodyJSON(request):null;
     const target='/v2/library/'+path.split('/').at(-1)+url.search;
     const result=await backend.fetch(new Request(origin+target,{method:request.method,...(isAction?{headers:{'content-type':'application/json'},body:JSON.stringify(input)}:{})}));
     const data=await result.json();
     if(isAction)traces.push({receivedAt:Date.now(),requestId:input.request_id,type:input.type,action:input.action??null,stake:input.stake??null,
      httpStatus:result.status,replayed:data.replayed===true,roundId:data.round?.round_id??null,roundStatus:data.round?.status??null,balance:data.balance??null,error:data.error??null});
     return send(request,response,result.ok?{...data,authenticated:true,sessionId:LOCAL_SESSION}:data,undefined,result.status);
    }
    if(!['GET','HEAD'].includes(request.method))fail('METHOD_NOT_ALLOWED',405);
    if(path==='/'||path===gamePath||path===gamePath+'/'){
     const html=(await readFile(resolve(ROOT,'client/multihot40.html'),'utf8')).replaceAll('href="./','href="'+PREFIX).replaceAll('src="./','src="'+PREFIX);
     return send(request,response,html,mime['.html']);
    }
    if(path==='/player-v236/presence.63ed199a80b6c700.mjs')return send(request,response,'// Identity is local-fixture-session; production presence is deliberately not contacted.\nexport const LOCAL_FIXTURE_ONLY=true;\n',mime['.mjs']);
    if(path===PREFIX+'games.json')return send(request,response,[config]);
    if(path===PREFIX+manifestPath)return send(request,response,manifestBytes,mime['.json']);
    if(path.startsWith(PREFIX)){
     const name=path.slice(PREFIX.length);
     if(!clientFiles.has(name)&&!presentationFiles.has(name))fail('NOT_FOUND',404);
     const isClient=clientFiles.has(name),file=resolve(ROOT,isClient?'client/'+name:name);
     let content=await readFile(file,'utf8');
     if(isClient&&name.endsWith('.mjs'))content=content.replaceAll("'../presentation/","'./presentation/").replaceAll('"../presentation/','"./presentation/');
     if(name.endsWith('.html'))content=content.replaceAll('href="./','href="'+PREFIX).replaceAll('src="./','src="'+PREFIX);
     return send(request,response,content,mime[extname(name)]);
    }
    if(path.startsWith(ART_PREFIX)){
     const name=path.slice(ART_PREFIX.length);
     if(!/^[a-f0-9]{64}\.(?:png|gif|mp3|json|txt|otf|ttf|woff2)$/.test(name)||!Object.hasOwn(manifest.files,name))fail('NOT_FOUND',404);
     return send(request,response,await readFile(resolve(assetRoot,ART_PREFIX.slice(1),name)),mime[extname(name)]);
    }
    if(path==='/favicon.ico'){response.writeHead(204,headers);return response.end();}
    fail('NOT_FOUND',404);
   }catch(error){
    if(response.headersSent){response.destroy();return;}
    const code=error.code==='ENOENT'?404:Number.isInteger(error.status)?error.status:500;
    send(request,response,{error:code===404?'NOT_FOUND':error.message,localFixtureOnly:true},undefined,code);
   }
  });
  await new Promise((yes,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',()=>{server.off('error',no);yes();});});
  origin='http://127.0.0.1:'+server.address().port;
  return {server,fixture,origin,url:origin+gamePath,config,reset,status,close};
 }catch(error){await close();throw error;}
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const args=process.argv.slice(2);
 if(args.includes('--help')){
  console.log('LOCAL ONLY: node test/multihot40-browser-server.mjs [--port=8789] [--scenario=win|loss|natural] [--asset-root=/absolute/path]');
  console.log('Read the header of this file for reset/seed endpoints and browser sequences.');
 }else{
  const options={};for(const arg of args){const match=arg.match(/^--(port|scenario|asset-root)=(.+)$/);if(!match)throw Error('UNKNOWN_LOCAL_ARGUMENT');options[match[1]==='asset-root'?'assetRoot':match[1]]=match[1]==='port'?Number(match[2]):match[2];}
  const instance=await createBrowserFixtureServer(options);
  console.log(JSON.stringify({event:'local_multihot40_browser_fixture',url:instance.url,fixtureOnly:true,productionConnected:false,sessionId:LOCAL_SESSION,statusURL:instance.origin+'/__fixture/status'}));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void instance.close().then(()=>process.exit(0));});
 }
}
