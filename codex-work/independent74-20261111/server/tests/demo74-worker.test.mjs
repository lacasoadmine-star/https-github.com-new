import test from 'node:test';
import assert from 'node:assert/strict';
import {handleDemo74Request,demo74Catalog} from '../demo74-worker.mjs';
import * as math from '../../math/official72.mjs';
import {randomInt,secureUnitRandom} from '../demo74-rng.mjs';
const guard='a'.repeat(64),base='https://demo.internal/independent74-demo-internal/';
function context(){
 const data=new Map();let pending=Promise.resolve();
 return {data,storage:{transaction:operation=>{const run=pending.then(async()=>{const next=structuredClone(data);const tx={get:async key=>structuredClone(next.get(key)),put:async(key,value)=>next.set(key,structuredClone(value))};const result=await operation(tx);data.clear();for(const [k,v]of next)data.set(k,v);return result;});pending=run.catch(()=>{});return run;}}};
}
function harness({random=()=>0}={}){
 const ctx=context();let time=1794355200000;
 const request=async(route,body,selected=math.listGameDefinitions()[0].id)=>{
 const r=await handleDemo74Request(ctx,new Request(base+route+(body?'':'?game_id='+selected),{method:body?'POST':'GET',headers:{'x-demo-session-guard':guard,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),{now:()=>time,random});return {status:r.status,data:await r.json()};};
 return {ctx,request,advance:ms=>time+=ms};
}
const action=(game,extra={})=>({request_id:crypto.randomUUID(),type:'start',game_id:game.id,model_version:game.version,stake:'1.00',options:{},...extra});
const commands=(round,type,input={})=>({request_id:crypto.randomUUID(),type:'action',game_id:round.game_id,model_version:round.model_version,round_id:round.round_id,expected_version:round.version,action:type,input});
test('demo catalog has72reviewed independent models,20credit cap,DEMO currency and no protected identities',()=>{
 const catalog=demo74Catalog();assert.equal(catalog.games.length,72);assert.equal(catalog.currency,'DEMO');assert.equal(catalog.mode,'demo');assert.equal(catalog.realMoney,false);
 for(const d of catalog.games){assert.equal(d.currency,'DEMO');assert.equal(d.maxStake,'20.00');assert.equal(d.accepting,true);assert.equal(d.limits.testPresetsMinor.length,20);}
 assert(!catalog.games.some(d=>/_(multihot5|foxyhot20)$/.test(d.id)));
});
test('every72DEMO game starts,recovers and settles through servercredit ledger with safe snapshots',async()=>{
 const games=demo74Catalog().games;
 for(const game of games){
  const h=harness();let res=await h.request('state',null,game.id);assert.equal(res.status,200);assert.equal(res.data.balance,'10000.00');
  const before=h.ctx.data.size;
  let r=await h.request('action',action(game));assert.equal(r.status,200,game.id+JSON.stringify(r.data));
  assert.equal(r.data.currency,'DEMO');assert.equal(r.data.mode,'demo');assert.equal(r.data.round.stakeMinor,'100');
  assert.equal(r.data.round.private,undefined);assert.equal(r.data.round.mathState,undefined);assert.equal(r.data.round.secret_seed,undefined);
  let round=r.data.round;
  if(round.status==='active'&&game.family==='ladder'){r=await h.request('action',commands(round,'reveal',{cell:round.step}));assert.equal(r.status,200);round=r.data.round;}
  if(round.status==='active'&&game.family==='mines'){
   const internal=[...h.ctx.data.values()].find(x=>x?.state?.mathState?.private?.mines);
   const cell=Array.from({length:game.cells},(_,i)=>i).find(i=>!internal.state.mathState.private.mines.includes(i));
   r=await h.request('action',commands(round,'reveal',{cell}));assert.equal(r.status,200);round=r.data.round;
  }
  if(round.status==='active'&&game.family==='crash'){
   h.advance(86400000);r=await h.request('state',null,game.id);assert.equal(r.status,200);round=r.data.round;
  }
  if(round.status==='active'){
   r=await h.request('action',commands(round,'collect'));assert.equal(r.status,200,game.id+JSON.stringify(r.data));round=r.data.round;
  }
  assert.equal(round.status,'settled',game.id);
  const actual=BigInt(r.data.balance.replace('.',''));assert.equal(actual,1000000n-100n+BigInt(round.payoutMinor),game.id);
  const history=await h.request('history',null,game.id);assert.equal(history.data.history.length,1);assert.equal(history.data.history[0].round_id,round.round_id);
  const recovered=await h.request('state',null,game.id);assert.equal(recovered.data.round.round_id,round.round_id);assert.equal(recovered.data.balance,r.data.balance);assert(h.ctx.data.size>before);
 }
});
test('concurrent duplicate UUID debitsonce,replayscachedreceipt and alteredrequest conflicts atomically',async()=>{
 const h=harness(),game=demo74Catalog().games.find(g=>g.family==='slots'),body=action(game);
 const r=await Promise.all(Array.from({length:12},()=>h.request('action',body)));
 assert(r.every(x=>x.status===200));assert.equal(r.filter(x=>!x.data.replayed).length,1);assert.equal(new Set(r.map(x=>x.data.round.round_id)).size,1);
 const balance=r[0].data.balance,changed=await h.request('action',{...body,stake:'2.00'});assert.equal(changed.status,409);assert.equal(changed.data.error.code,'REQUEST_ID_CONFLICT');
 assert.equal((await h.request('state',null,game.id)).data.balance,balance);
});
test('active round ownsone session; concurrentcollect pays once and staleactions cannot changecredit',async()=>{
 const h=harness(),game=demo74Catalog().games.find(g=>g.family==='slots'&&g.gamble?.enabled);
 let r=await h.request('action',action(game,{options:{holdWin:true}}));assert.equal(r.status,200);assert.equal(r.data.round.status,'active');
 const prior=r.data.balance,round=r.data.round;
 const blocked=await h.request('action',action(game));assert.equal(blocked.status,409);assert.match(blocked.data.error.code,/FINISH_ACTIVE_ROUND/);
 const stale=await h.request('action',commands({...round,version:99},'collect'));assert.equal(stale.status,409);assert.equal(stale.data.error.code,'STALE_ROUND');
 const collect=commands(round,'collect');const results=await Promise.all([h.request('action',collect),h.request('action',collect)]);assert(results.every(x=>x.status===200));assert.equal(results.filter(x=>!x.data.replayed).length,1);
 const balance=results[0].data.balance;assert(BigInt(balance.replace('.',''))>BigInt(prior.replace('.','')));
 const repeat=await h.request('action',commands(round,'collect'));assert.equal(repeat.status,409);assert.equal((await h.request('state',null,game.id)).data.balance,balance);
});
test('bets outside1..20,replacementmoney,unknownmodels and missinginternal session are rejected without demoledger writes',async()=>{
 const h=harness(),game=demo74Catalog().games[0];
 for(const body of [action(game,{stake:'0.99'}),action(game,{stake:'20.01'}),action(game,{stake:'21.00'}),action(game,{stake:1}),action(game,{balance:'1000000'}),action(game,{options:{stakeMinor:'2000'}}),action(game,{game_id:'ind74_official_multihot5'})]){
  const result=await h.request('action',body);assert(result.status>=400);assert.equal(h.ctx.data.size,0);
 }
 const r=await handleDemo74Request(h.ctx,new Request(base+'state?game_id='+game.id));assert.equal(r.status,401);assert.equal(h.ctx.data.size,0);
});
test('boundedWebCrypto integer RNG provides valid safe outputs and rejects invalidbounds',()=>{
 for(const bound of [1,2,8,25,1000,100000000])for(let i=0;i<10;i++){const n=randomInt(bound);assert(Number.isSafeInteger(n));assert(n>=0&&n<bound);}
 for(let i=0;i<10;i++){const n=secureUnitRandom();assert(n>=0&&n<1);}
 for(const args of [[0],[-1],[1.5],[2,1]])assert.throws(()=>randomInt(...args));
});
test('expired earnedladder pays freecredit award once and storedrequest replay cannot pay twice',async()=>{
 const h=harness(),game=demo74Catalog().games.find(g=>g.family==='ladder'),body=action(game,{stake:'20.00'});
 const start=await h.request('action',body);assert.equal(start.data.balance,'9980.00');assert.equal(start.data.round.status,'active');
 h.advance(86400000);const recovered=await h.request('state',null,game.id);assert.equal(recovered.status,200);assert.equal(recovered.data.round.status,'settled');const earned=BigInt(start.data.round.collectibleMinor);assert.equal(BigInt(recovered.data.balance.replace('.','')),998000n+earned);
 const replay=await h.request('action',body);assert.equal(replay.status,200);assert.equal(replay.data.replayed,true);assert.equal(replay.data.current_balance,recovered.data.balance);
 assert.equal((await h.request('state',null,game.id)).data.balance,recovered.data.balance);
});
test('independent sessioncontexts never share democredits,requests or active round ownership',async()=>{
 const a=harness(),b=harness(),game=demo74Catalog().games.find(g=>g.family==='ladder'),body=action(game,{stake:'20.00'});
 const accepted=await a.request('action',body);assert.equal(accepted.status,200);
 const state=await b.request('state',null,game.id);assert.equal(state.data.balance,'10000.00');assert.equal(state.data.round,null);
 const foreign=await b.request('action',commands(accepted.data.round,'reveal',{cell:1}));assert.equal(foreign.status,404);
 assert.equal((await a.request('state',null,game.id)).data.balance,'9980.00');
});
test('insufficientfreecredits rejects atomically and never accesses an accountorbackend service',async()=>{
 const h=harness(),game=demo74Catalog().games.find(g=>g.family==='slots');await h.request('state',null,game.id);
 const ledger=h.ctx.data.get('independent74:demo:ledger:v1');ledger.balanceMinor='99';h.ctx.data.set('independent74:demo:ledger:v1',ledger);
 const before=structuredClone(h.ctx.data),result=await h.request('action',action(game));assert.equal(result.status,409);assert.equal(result.data.error.code,'INSUFFICIENT_DEMO_CREDITS');assert.deepEqual(h.ctx.data,before);
});
test('Workerbundle usesWebCrypto shim and containsnoNode imports or financialbackend implementation',async()=>{
 const {build}=await import('esbuild');const {fileURLToPath}=await import('node:url');
 const compiled=await build({entryPoints:[fileURLToPath(new URL('../demo74-worker.mjs',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',alias:{'node:crypto':fileURLToPath(new URL('../demo74-rng.mjs',import.meta.url))},metafile:true});
 const text=compiled.outputFiles[0].text;assert(!Object.values(compiled.metafile.outputs).some(x=>x.imports.length));assert.doesNotMatch(text,/class LibraryService|class SharedWallet|NATIVE_ENGINE_ORIGIN|DATABASE_URL/);
 const module=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));assert.equal(module.demo74Catalog().games.length,72);assert.equal(module.demo74Catalog().currency,'DEMO');
});
test('PlinkoX DEMO batch cap applies to TOTAL and one batch/retry/reload credits the per-ball sum once',async()=>{
 const h=harness(),game=demo74Catalog().games.find(g=>g.id==='ind74_official_plinkox');
 assert.equal(game.batchTotalStake,true);assert.deepEqual(game.ballAmounts,[1,5,10,25]);
 for(const[stake,ballAmount]of[['25.00',25],['1.00',5],['6.00',5],['20.00',25]]){
  const before=h.ctx.data.size,res=await h.request('action',action(game,{stake,options:{risk:'low',ballAmount}}));
  assert.equal(res.status,422);assert.equal(h.ctx.data.size,before);
 }
 const body=action(game,{stake:'20.00',options:{risk:'low',ballAmount:10}}),r=await h.request('action',body);
 assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.round.stakeMinor,'2000');assert.equal(r.data.round.totalBetMinor,'2000');assert.equal(r.data.round.perBallBetMinor,'200');assert.equal(r.data.round.ballAmount,10);
 const balls=r.data.round.outcome.balls;assert.equal(balls.length,10);
 const sum=balls.reduce((sum,b)=>sum+200n*BigInt(b.bucketMultiplierBps)*BigInt(b.ballMultiplier)/10000n,0n);
 assert.equal(r.data.round.payoutMinor,sum.toString());assert.equal(BigInt(r.data.balance.replace('.','')),1000000n-2000n+sum);
 const replay=await h.request('action',body);assert.equal(replay.data.replayed,true);assert.equal(replay.data.balance,r.data.balance);
 const reload=await h.request('state',null,game.id);assert.equal(reload.data.balance,r.data.balance);assert.equal(reload.data.round.round_id,r.data.round.round_id);
 assert.equal((await h.request('history',null,game.id)).data.history.length,1);
});

test('all3PlinkoXrisks acceptTOTAL20DEMO with serverbound and wrongrisk remains422',async()=>{
 for(const risk of ['low','medium','high']){
  const h=harness(),game=demo74Catalog().games.find(g=>g.id==='ind74_official_plinkox');
  const response=await h.request('action',action(game,{stake:'20.00',options:{risk,ballAmount:10}}));
  assert.equal(response.status,200,JSON.stringify(response.data));assert.equal(response.data.round.risk,risk);assert.equal(response.data.round.stakeMinor,'2000');
  const sum=response.data.round.outcome.balls.reduce((sum,b)=>sum+200n*BigInt(b.bucketMultiplierBps)*BigInt(b.ballMultiplier)/10000n,0n);
  assert.equal(response.data.round.payoutMinor,sum.toString());assert.equal(BigInt(response.data.balance.replace('.','')),1000000n-2000n+sum);
  const wrong=await h.request('action',action(game,{stake:'1.00',options:{risk:'unknown'}}));assert.equal(wrong.status,422);assert.equal((await h.request('state',null,game.id)).data.balance,response.data.balance);
 }
});
