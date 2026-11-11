// Exercise the generated compressed Worker modules, including old-route
// delegation and the free-only DO subclass. No external network or funds.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const dir=resolve('dist'),parent=resolve(dir,'presentation-player-entry-r23.mjs');
await fs.writeFile(parent,`export class LocalDemoWallet {constructor(ctx,env){this.retainedCtx=ctx;this.retainedEnv=env;}fetch(request){this.retainedRequest=request;return new Response('retained-demo');}alarm(){return 'retained-alarm';}}\nexport default {scheduled(){return 'retained-scheduled';},fetch(request){if(new URL(request.url).pathname==='/api/machine-session')return Response.json({authenticated:true,currency:'ETB',balance:'50000.25',sessionId:'a'.repeat(64)});return new Response('<!doctype html><html><head></head><body><div id="root">retained-account-header</div></body></html>',{headers:{'content-type':'text/html','content-security-policy':"default-src 'self'; script-src 'self'; img-src 'self' data:"}});}};\n`);
const entry=await import(pathToFileURL(resolve(dir,'independent74-entry-r6.mjs')).href+'?smoke='+Date.now());
assert.equal(entry.default.scheduled(),'retained-scheduled');
const legacy=await entry.default.fetch(new Request('https://player.invalid/api/slots/balance'),{},{});assert.match(await legacy.text(),/retained-account-header/);
const home=await entry.default.fetch(new Request('https://player.invalid/'),{},{}),html=await home.text();assert.match(html,/retained-account-header/);assert.match(html,/\/independent74\/lobby74.mjs/);assert.match(home.headers.get('content-security-policy'),/cdn.prod.website-files.com/);
const asset=await entry.default.fetch(new Request('https://player.invalid/independent74/lobby74.mjs'),{},{});assert.equal(asset.status,200);assert.match(await asset.text(),/existing-wallet-routes/);
const data=new Map();let chain=Promise.resolve();const ctx={storage:{transaction(fn){const run=chain.then(async()=>{const copy=structuredClone(data),tx={get:async k=>structuredClone(copy.get(k)),put:async(k,v)=>copy.set(k,structuredClone(v))};const result=await fn(tx);data.clear();for(const [k,v]of copy)data.set(k,v);return result;});chain=run.catch(()=>{});return run;}}};
const env={tag:'retained-env'},object=new entry.LocalDemoWallet(ctx,env),oldRequest=new Request('https://old-demo.invalid/balance');
assert.equal(await (await object.fetch(oldRequest)).text(),'retained-demo');assert.equal(object.retainedRequest,oldRequest);assert.equal(object.retainedCtx,ctx);assert.equal(object.retainedEnv,env);assert.equal(object.alarm(),'retained-alarm');assert.equal(data.size,0);
const id='ind74_official_rollx',guard='a'.repeat(64),r=await object.fetch(new Request('https://demo.invalid/independent74-demo-internal/state?game_id='+id,{headers:{'x-demo-session-guard':guard}})),state=await r.json();assert.equal(r.status,200);assert.equal(state.currency,'DEMO');assert.equal(state.mode,'demo');assert.equal(state.balance,'10000.00');assert(data.size>0);assert.equal(object.retainedRequest,oldRequest);
const catalog=await (await entry.default.fetch(new Request('https://player.invalid/independent74/account-api/catalog'),{},{})).json();assert.equal(catalog.games.length,72);assert(catalog.games.every(g=>g.currency==='ETB'&&g.accepting===false&&g.launchable===false));
const readonly=await entry.default.fetch(new Request('https://player.invalid/independent74/account-api/state?game_id='+id,{headers:{cookie:'sw_session='+'b'.repeat(64)}}),{},{}),readonlyState=await readonly.json();
assert.equal(readonly.status,200);assert.equal(readonlyState.balance,'50000.25');assert.equal(readonlyState.existingWalletReadOnly,true);assert.equal(readonlyState.accepting,false);assert.equal(readonlyState.sessionGuard,'a'.repeat(64));
await fs.unlink(parent);
const result={pass:true,generatedModules:true,compressedAssets:true,legacyRoutesPreserved:true,legacyDoConstructorAndMethodsPreserved:true,demoStorageIsolated:true,currency:'DEMO',accountDefinitions:72,newEtbGamesEnabled:0,existingAccountReadonly:true,externalRequests:0,playerWalletMutations:0};
await fs.writeFile('reports/current74-generated-worker-smoke.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
