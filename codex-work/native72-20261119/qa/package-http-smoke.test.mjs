import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import net from 'node:net';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';

// Starts the existing local fixture server as this test's own child. This is
// HTTP/byte-contract verification only: no browser, production calls or wallets.
const stage=process.env.DEDICATED_QA_STAGE||'/workspace/scratch/9a8b0ddfa7e7/local-qa-built';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function availablePort(){const server=net.createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const {port}=server.address();await new Promise(resolve=>server.close(resolve));return port;}

test('dedicated packages serve their exact closure and synthetic API over isolated HTTP',async t=>{
 const report=JSON.parse(await readFile(path.join(stage,'package-report.json'),'utf8'));
 const port=await availablePort(),origin='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,[fileURLToPath(new URL('./browser-server.mjs',import.meta.url)),'--habesha',path.join(stage,'habesha'),'--deluxe',path.join(stage,'deluxe'),'--shared',path.join(stage,'shared'),'--port',String(port)],{stdio:['ignore','pipe','pipe']});
 let output='',errors='';child.stdout.on('data',part=>output+=part);child.stderr.on('data',part=>errors+=part);
 t.after(async()=>{if(child.exitCode===null){child.kill('SIGTERM');await Promise.race([once(child,'exit'),new Promise(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},3000);timer.unref();})]);}});
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('QA server did not start: '+errors)),10000);
  const ready=()=>{if(output.includes('"productionTransactions":0')){clearTimeout(timer);child.stdout.off('data',ready);resolve();}};
  child.stdout.on('data',ready);child.once('exit',code=>{clearTimeout(timer);reject(Error('QA server exited '+code+': '+errors));});child.once('error',error=>{clearTimeout(timer);reject(error);});ready();
 });
 const request=async(pathname,options={})=>{assert.match(pathname,/^\/(?!\/)/);return fetch(origin+pathname,{...options,signal:AbortSignal.timeout(10000)});};
 const json=async(pathname,options={},expected=200)=>{const response=await request(pathname,options);const value=await response.json();assert.equal(response.status,expected,pathname+': '+JSON.stringify(value));assert.equal(response.headers.get('x-local-qa'),'simulated-only');return value;};
 const post=(pathname,input,headers={},expected=200)=>json(pathname,{method:'POST',headers:{'content-type':'application/json',origin,...headers},body:JSON.stringify(input)},expected);
 let assetsChecked=0,bytesChecked=0;

 await t.test('both entry pages reference only served local assets and include the fixture toolbar',async()=>{
  for(const name of ['habesha','deluxe']){
   const response=await request('/qa/'+name+'/');assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/connect-src 'self'/);
   const html=await response.text();assert.match(html,/data-machine="(?:habesha_fortune_5_native|multi_hot_5_deluxe_native)"/);assert.ok(html.includes('/__qa/toolbar.js'));
   const sources=[...html.matchAll(/<(?:link|script)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
   for(const source of sources){assert.match(source,/^\/(?!\/)/);const asset=await request(source);assert.equal(asset.status,200,source);assert.equal(asset.headers.get('x-local-qa'),'simulated-only');await asset.arrayBuffer();}
   const presence=await request('/qa-assets/'+name+'/presence.63ed199a80b6c700.mjs');assert.match(await presence.text(),/production presence lease intentionally inactive/);
  }
 });

 await t.test('all game and shared manifest assets return exact SHA-256 and byte lengths',async()=>{
  for(const entry of report.packages){
   const manifest=JSON.parse(await readFile(path.join(stage,entry.name+'-manifest.json'),'utf8'));
   const assets=Object.entries(manifest.assets);
   for(let start=0;start<assets.length;start+=12)await Promise.all(assets.slice(start,start+12).map(async([name,expected])=>{
    const response=await request('/'+entry.release+'/'+name);assert.equal(response.status,200,entry.name+'/'+name);
    const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,expected.size,name+' bytes');assert.equal(digest(bytes),expected.sha256,name+' SHA-256');assert.notEqual(bytes.toString(),'Not found');assetsChecked++;bytesChecked+=bytes.length;
   }));
  }
  assert.equal(assetsChecked,report.packages.reduce((sum,entry)=>sum+entry.assets,0));
  assert.equal(bytesChecked,report.packages.reduce((sum,entry)=>sum+entry.assetBytes,0));
 });

 await t.test('actual staged validators accept local winning spins, gambles and idempotent replays',async()=>{
  for(const gameId of ['habesha_fortune_5_native','multi_hot_5_deluxe_native']){
   await post('/__qa/control',{action:'reset',scenario:'win',delayMs:0});
   const session=await json('/api/machine-session'),model=await json('/api/slots/games/'+gameId),headers={'x-zplay-machine-session':session.sessionId};
   const input={gameId,bet:model.betLevels[0],roundToken:randomUUID(),mathVersion:model.mathVersion};
   const result=await post('/api/slots/spin',input,headers);assert.equal(result.qaSimulated,true);assert.equal(result.gameId,gameId);assert.ok(Number(result.finalWin)>0);
   assert.deepEqual(await post('/api/slots/spin',input,headers),result);
   const gamble={roundId:result.roundId,choice:'RED',roundToken:randomUUID(),expectedStake:result.finalWin,expectedAttempt:1};
   const action=await post('/api/slots/gamble',gamble,headers);assert.equal(action.qaSimulated,true);assert.equal(action.won,true);assert.deepEqual(await post('/api/slots/gamble',gamble,headers),action);
   const state=await json('/__qa/state');assert.equal(state.rounds,1);assert.equal(state.requests.replays,2);assert.equal(state.productionTransactions,0);assert.equal(state.balance,action.balanceAfter);
  }
 });

 await t.test('interrupted, rejected and expired fixture responses remain local and recoverable',async()=>{
  const gameId='multi_hot_5_deluxe_native';
  await post('/__qa/control',{action:'reset',scenario:'interrupted-once',delayMs:0});
  const session=await json('/api/machine-session'),model=await json('/api/slots/games/'+gameId),headers={'x-zplay-machine-session':session.sessionId};
  const input={gameId,bet:model.betLevels[0],roundToken:randomUUID(),mathVersion:model.mathVersion};
  assert.equal((await post('/api/slots/spin',input,headers,503)).detail,'QA_SIMULATED_RESPONSE_INTERRUPTION');
  const before=await json('/__qa/state'),replay=await post('/api/slots/spin',input,headers);assert.equal(before.balance,replay.balanceAfter);assert.equal(before.rounds,1);
  await post('/__qa/control',{scenario:'reject-once'});assert.equal((await post('/api/slots/spin',{...input,roundToken:randomUUID()},headers,503)).detail,'HOUSE_RESERVE_INSUFFICIENT');
  const rejected=await json('/__qa/state');assert.equal(rejected.balance,before.balance);assert.equal(rejected.rounds,1);
  await post('/__qa/control',{action:'expire'});assert.equal((await json('/api/slots/balance',{},401)).detail,'PLAYER_SESSION_EXPIRED');
  const final=await json('/__qa/state');assert.equal(final.productionTransactions,0);assert.deepEqual(final.missingAssets,[]);
 });
 t.diagnostic(JSON.stringify({stage,assetsChecked,bytesChecked,productionTransactions:0,browserRenderingTested:false}));
});
