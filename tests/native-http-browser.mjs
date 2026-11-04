import assert from 'node:assert/strict';
import {SQL} from 'bun';
import {randomBytes,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {GAMES} from '../apps/native-engine/catalog.mjs';
import {proxyNativeFamily} from '../deploy/cloudflare/native-family-proxy.mjs';
import {signedHeaders} from '../apps/native-engine/auth.mjs';
const url=new URL(process.env.NATIVE_TEST_DATABASE_URL||'http://invalid');
if(url.hostname!=='127.0.0.1'||url.username!=='native_test'||url.pathname!=='/native_tests')throw Error('Disposable local PostgreSQL required');
const sql=new SQL(url.href),secret=randomBytes(48).toString('hex');
process.env.DATABASE_URL=url.href;process.env.NATIVE_ENGINE_SECRET=secret;process.env.NATIVE_ENGINE_ENABLED='true';
await sql.unsafe('TRUNCATE sw_native_family.requests,sw_native_family.rounds,sw_rebuild.rounds,sw_rebuild.ledger,sw_rebuild.transfers,sw_rebuild.audit,sw_rebuild.live_revisions,sw_rebuild.account_limits,sw_rebuild.wallets,sw_rebuild.users CASCADE');
await sql.unsafe("INSERT INTO sw_rebuild.users(id,role,status,parent_id) VALUES('ui-player','player','active',NULL)");
await sql.unsafe("INSERT INTO sw_rebuild.wallets(id,balance) VALUES('house',1000000000),('ui-player',1000000)");
const backend=(await import('../apps/native-engine/server.mjs')).default;
const realFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const req=input instanceof Request?input:new Request(input,init);
 if(new URL(req.url).origin==='https://engine.test')return backend.fetch(req);
 return realFetch(req);
};
let loggedIn=true;
const env={NATIVE_ENGINE_ORIGIN:'https://engine.test',NATIVE_ENGINE_SECRET:secret};
const options={legacy:async()=>loggedIn?Response.json({id:'ui-player',role:'player'}):Response.json({error:'Please log in'},{status:401}),sessionHeaders:h=>h};
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch(req){
 const path=new URL(req.url).pathname;
 if(path==='/player-live-v244/presence.mjs')return new Response('',{headers:{'content-type':'text/javascript'}});
 return proxyNativeFamily(req,env,options);
}});
const base=server.url.origin;
const {chromium}=createRequire(new URL('../apps/native-engine/package.json',import.meta.url))('playwright');let browser;
const count=async()=>Number((await sql.unsafe('SELECT count(*)::int AS n FROM sw_rebuild.rounds'))[0].n);
try{
 assert.equal((await backend.fetch(new Request('https://engine.test/health'))).status,200);
 assert.equal((await backend.fetch(new Request('https://engine.test/v1/catalog'))).status,401);
 const signed=signedHeaders(secret,'@public','GET','/v1/catalog');
 assert.equal((await(await backend.fetch(new Request('https://engine.test/v1/catalog',{headers:signed}))).json()).games.length,30);
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [game,family] of [['burning_ice','slots'],['plinkox','plinko'],['roll_dice','dice'],['spin_x','wheel'],['turbo_mines','mines'],['mega_hilo','hilo'],['jetx','crash']]){
  await page.goto(base+'/native/'+game);await page.waitForFunction(()=>!document.getElementById('play').disabled);
  assert.equal(await page.locator('#family').textContent(),family);
  if(family==='crash')await page.locator('#auto-target').fill('1.01');
  const before=await count();await page.locator('#play').click();
  await page.waitForFunction(()=>!document.getElementById('round-status').textContent.includes('CONFIRM')&&document.getElementById('round-status').textContent!=='READY');
  if(family==='mines'){
   const rows=await sql.unsafe("SELECT state FROM sw_native_family.rounds WHERE user_id='ui-player' AND status='active'");const r=typeof rows[0].state==='string'?JSON.parse(rows[0].state):rows[0].state;
   const safe=Array.from({length:25},(_,i)=>i).find(i=>!r.mines.includes(i));
   await page.locator('#mines button').nth(safe).click();await page.waitForFunction(()=>!document.getElementById('cashout').disabled);await page.locator('#cashout').click();
  }
  if(family==='hilo'){
   while(await page.locator('#round-status').innerText()==='ACTIVE'){
    const raw=(await sql.unsafe("SELECT state FROM sw_native_family.rounds WHERE user_id='ui-player' AND status='active'"))[0]?.state;const r=typeof raw==='string'?JSON.parse(raw):raw;if(!r)break;
    await page.locator(r.rank<7?'#higher':'#lower').click();
    await page.waitForFunction(()=>document.getElementById('round-status').textContent!=='CONFIRMING');
   }
  }
  await page.waitForFunction(()=>!['READY','ACTIVE','CONFIRMING'].includes(document.getElementById('round-status').textContent));
  assert.equal(await count(),before+1);console.log('Verified browser family: '+family);
  await page.getByText('Latest round verification',{exact:true}).click();await page.locator('#verify').click();await page.waitForFunction(()=>document.getElementById('message').textContent==='Seed commitment verified.');
  for(const width of [320,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,game+' overflow');}
 }
 await page.goto(base+'/native/plinkox');await page.waitForFunction(()=>!document.getElementById('play').disabled);
 const before=await count();let dropped=false;const tokens=[];
 await page.route('**/api/native-families/action',async route=>{tokens.push(JSON.parse(route.request().postData()).request_id);if(!dropped){dropped=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.locator('#play').click();await page.waitForFunction(()=>document.getElementById('message').textContent.includes('same saved request'));
 await page.reload();await page.waitForFunction(()=>!['READY','CONFIRMING'].includes(document.getElementById('round-status').textContent));
 await page.waitForFunction(()=>Object.keys(localStorage).every(k=>!k.startsWith('superwin.native.v1.pending.')));
 assert.equal(await count(),before+1);assert.ok(tokens.length>=2);assert.equal(new Set(tokens).size,1);
 await page.unroute('**/api/native-families/action');
 loggedIn=false;await page.evaluate(()=>window.dispatchEvent(new Event('zplay:logout')));assert.equal(await page.locator('#balance').innerText(),'Sign in');assert.equal(await page.locator('#play').isDisabled(),true);
 assert.equal((await realFetch(base+'/native/jetx')).status,401);
 const totals=await sql.unsafe('SELECT sum(balance)::text AS total FROM sw_rebuild.wallets');assert.equal(totals[0].total,'1001000000');
 const bad=await sql.unsafe('SELECT transfer_id FROM sw_rebuild.ledger GROUP BY transfer_id HAVING sum(delta)<>0 OR count(*)<>2');assert.equal(bad.length,0);
 assert.deepEqual(errors,[]);
 console.log('PASS: real HTTP + isolated PostgreSQL + Chromium: seven distinct families, server settlement, seed verification, reserved funds, exact ledger conservation, interrupted response/reload/idempotent retry, login and logout, mobile and desktop');
}finally{await browser?.close();server.stop(true);await sql.close();globalThis.fetch=realFetch;}
process.exit(0);
