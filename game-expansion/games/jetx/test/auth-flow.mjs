// Full authenticated HTTP flow against the packaged entry and a disposable DB.
// No production credentials, accounts, balances or wagers are used.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import https from 'node:https';
import {Readable} from 'node:stream';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import postgres from 'postgres';
import {installJetX,signedHeaders,CSP} from '../worker.mjs';
import {resolveSessionUser} from '../auth.mjs';
import {sessionGate,issue,LEASE} from '../../../../player-machines/worker/player-session-v236.mjs';

if(process.env.JETX_LOCAL_ENTRY_FIXTURE!=='1')throw Error('OPT_IN_LOOPBACK_FIXTURE_REQUIRED');
const database='postgres://postgres:local-test-only@127.0.0.1:55439/jetx_test';
const dbURL=new URL(database);assert.equal(dbURL.hostname,'127.0.0.1');assert.equal(dbURL.port,'55439');assert.equal(dbURL.pathname,'/jetx_test');
const root=new URL('/workspace/work/jetx-sequential/','file:');await mkdir(root,{recursive:true});
const browserMode=process.env.JETX_LOCAL_AUTH_BROWSER_FIXTURE==='1',realNow=Date.now;
let fixtureTime=realNow();if(browserMode)Date.now=()=>fixtureTime;
const connections=[],sql=postgres(database,{max:4,onnotice:()=>{}});
connections.push(sql);
const signingKey='fixture-only-jetx-native-signing-key-'.repeat(2),presenceKey='fixture-only-player-presence-key-'.repeat(2);
process.env.DATABASE_URL=database;process.env.NATIVE_ENGINE_SECRET=signingKey;process.env.NATIVE_ENGINE_ENABLED='true';process.env.NATIVE_ENGINE_ACCEPT_NEW_ROUNDS='false';process.env.JETX_NATIVE_ACCEPT_NEW_ROUNDS='true';
globalThis.Bun={SQL:class{constructor(url,options){assert.equal(url,database);const c=postgres(url,{...options,onnotice:()=>{}});connections.push(c);return c;}}};

const raw=randomBytes(32).toString('hex'),digest=createHash('sha256').update(raw).digest('hex');
const origin='https://superwin.test',env={PORTAL:'player',NATIVE_ENGINE_ORIGIN:'https://native.test',NATIVE_ENGINE_SECRET:signingKey,PLAYER_PRESENCE_KEY:presenceKey};
const fetchBefore=globalThis.fetch;
try{
 // The opt-in financial suite creates these disposable fixture accounts first.
 assert.equal((await sql.unsafe("SELECT count(*)::int n FROM sw_rebuild.users WHERE id='player-b' AND role='player' AND status='active'"))[0].n,1);
 await sql.unsafe('TRUNCATE sw_jetx_native.requests,sw_jetx_native.bets,sw_jetx_native.boards,sw_native_family.requests,sw_native_family.rounds CASCADE');
 await sql.unsafe('DELETE FROM sw_rebuild.sessions');
 await sql.unsafe('INSERT INTO sw_rebuild.sessions(token,user_id,expires) VALUES($1,$2,$3)',[digest,'player-b',Date.now()+(browserMode?3600000:60000)]);
 const {default:backend}=await import(new URL('backend/jetx-railway-entry.mjs',root));
 // Load the actual machine-session middleware; its unused presentation assets
 // are stubbed so Node does not need Cloudflare's binary-module loader.
 let source=await readFile(new URL('../../../../player-machines/worker/machine-routes.mjs',import.meta.url),'utf8');
 source=source.replace("import {cookies} from './player-session-v236.mjs';",`import {cookies} from '${new URL('../../../../player-machines/worker/player-session-v236.mjs',import.meta.url).href}';`)
  .replace("import {assets,release,htmlTemplate} from './machine-assets-20261106.mjs';","const assets={},release='unused-fixture-assets',htmlTemplate='';");
 await writeFile(new URL('fixture-machine-session.mjs',root),source);
 const {machineAPI}=await import(new URL('fixture-machine-session.mjs',root));
 const canonical={async fetch(request){
  const path=new URL(request.url).pathname;
  if(!['/api/slots/session','/api/slots/balance'].includes(path))return Response.json({detail:'NOT_FOUND'},{status:404});
  const cookie=(request.headers.get('cookie')||'').match(/sw_session=([a-f0-9]{64})/)?.[1];
  let user;try{user=await resolveSessionUser({sql},'@session:'+createHash('sha256').update(cookie||'').digest('hex'));}catch{return Response.json({authenticated:false});}
  if(path.endsWith('/session'))return Response.json({authenticated:true});
  const amount=BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[user]))[0].balance);
  return Response.json({currency:'ETB',balance:(amount/100n)+'.'+String(amount%100n).padStart(2,'0')});
 }};
 const previous={async fetch(request,env,ctx){
  const gate=await sessionGate(request,env,canonical,ctx);if(gate)return gate;
  return await machineAPI(request,env,ctx,canonical)||canonical.fetch(request);
 }};
 const worker=installJetX(previous),upstream=[];
 globalThis.fetch=async(url,options)=>{
  const request=new Request(url,options);assert.equal(new URL(request.url).origin,'https://native.test');
  upstream.push({cookie:request.headers.get('cookie'),subject:request.headers.get('x-native-user')});
  return backend.fetch(request);
 };
 const cookie='sw_session='+raw+'; '+LEASE+'='+await issue(raw,presenceKey);
 const state=await worker.fetch(new Request(origin+'/api/jetx/state',{headers:{cookie,'x-native-user':'forged-player'}}),env,{});
 assert.equal(state.status,200);const data=await state.json();assert.equal(data.userId,'player-b');assert.equal(data.accepting,true);
 const body={request_id:randomUUID(),type:'bet',board_id:data.board.id,position:0,stake:'5.50',auto_cashout:'1.01',model_version:'superwin-jetx-1'};
 const action=()=>worker.fetch(new Request(origin+'/api/jetx/action',{method:'POST',headers:{cookie,origin,'content-type':'application/json','X-Zplay-JetX-Session':data.sessionId},body:JSON.stringify(body)}),env,{});
 const accepted=await action();assert.equal(accepted.status,200);const receipt=await accepted.json();assert.equal(receipt.userId,'player-b');assert.equal(receipt.bets.length,1);
 const replay=await action();assert.equal(replay.status,200);assert.equal((await replay.json()).replayed,true);
 const minor=value=>BigInt(value.replace('.',''));assert.equal(minor(data.balance)-minor(receipt.balance),550n);
 assert.equal((await sql.unsafe("SELECT count(*)::int n FROM sw_jetx_native.bets WHERE user_id='player-b'"))[0].n,1);
 const expired=await worker.fetch(new Request(origin+'/api/jetx/state',{headers:{cookie:'sw_session='+raw+'; '+LEASE+'=invalid'}}),env,{});assert.equal(expired.status,401);assert.match(expired.headers.get('set-cookie'),/Max-Age=0/);
 assert.ok(upstream.every(r=>r.cookie===null&&r.subject==='@session:'+digest));
 const report={testMode:'Opt-in disposable loopback PostgreSQL; no production account, credit or wager',actualMachineSessionMiddleware:true,actualPresenceGate:true,actualPackagedBackendEntry:true,canonicalSessionLookup:true,clientIdentityIgnored:true,rawCookieNotForwarded:true,authenticatedStatePassed:true,betDebitedOnce:true,duplicateRequestReplayed:true,expiredPresenceRejected:true};
 await writeFile(new URL('../evidence/authenticated-flow.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 if(browserMode){
  const publicRoot=fileURLToPath(new URL('../public/',import.meta.url));
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.atlas':'text/plain','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.mp3':'audio/mpeg','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf'};
  const server=https.createServer({key:await readFile(new URL('localhost.key',root)),cert:await readFile(new URL('localhost.crt',root))},async(req,res)=>{
   const abort=new AbortController();res.once('close',()=>abort.abort());
   try{
    const url=new URL(req.url,'https://127.0.0.1:9445');
    if(url.pathname==='/__fixture/advance'&&req.method==='POST'){
     // Controlled test clock only; this file is never in a deployment bundle.
     let text='';for await(const chunk of req)text+=chunk;const value=JSON.parse(text).milliseconds;
     assert.ok(Number.isInteger(value)&&value>=0&&value<=180000);fixtureTime+=value;
     const p='/v2/jetx/reconcile',headers=await signedHeaders(signingKey,'@system','POST',p);
     const result=await backend.fetch(new Request('https://native.test'+p,{method:'POST',headers}));
     res.writeHead(result.status,{'content-type':'application/json'});res.end(await result.text());return;
    }
    if(url.pathname==='/games/jetx_native'||url.pathname.startsWith('/native-library/jetx/r1/')){
     const relative=url.pathname==='/games/jetx_native'?'index.html':decodeURIComponent(url.pathname.slice('/native-library/jetx/r1/'.length));
     const filename=path.resolve(publicRoot,relative);if(!filename.startsWith(publicRoot))throw Error('INVALID_TEST_ASSET');
     const headers={'content-type':types[path.extname(filename)]||'application/octet-stream','content-security-policy':CSP,'cache-control':'no-store'};
     if(url.pathname==='/games/jetx_native')headers['set-cookie']=['sw_session='+raw+'; Path=/; HttpOnly; Secure; SameSite=Lax',LEASE+'='+await issue(raw,presenceKey)+'; Path=/; HttpOnly; Secure; SameSite=Lax'];
     res.writeHead(200,headers);res.end(await readFile(filename));return;
    }
    let body='';for await(const chunk of req)body+=chunk;
    const response=await worker.fetch(new Request(url,{method:req.method,headers:req.headers,body:body||undefined,signal:abort.signal}),env,{});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
   }catch(error){if(!res.headersSent)res.writeHead(error.code==='ENOENT'?404:500,{'content-type':'application/json'});res.end(JSON.stringify({error:error.message}));}
  });
  await new Promise(resolve=>server.listen(9445,'127.0.0.1',resolve));
  console.log('Authenticated native browser fixture ready on https://127.0.0.1:9445; controlled clock; disposable database only.');
  await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 }
}finally{
 globalThis.fetch=fetchBefore;Date.now=realNow;for(const c of connections)await c.end({timeout:1});
}
