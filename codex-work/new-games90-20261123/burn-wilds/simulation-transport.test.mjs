import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {createBurnTestRuntime} from './server/simulation.mjs';
import {createBurnWildsSimulationTransport,BURN_TEST_SESSION_KEY} from './simulation-transport.mjs';
import {BURN_WILDS_GAME_ID} from './expansion.mjs';
import {auditBurnWildsPayout} from './outcome-audit.mjs';

const store=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,
  setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),values};};
async function harness(t){
  const runtime=createBurnTestRuntime({logger:()=>{}});
  const server=createServer(async(req,res)=>{
    try{
      const body=[];for await(const chunk of req)body.push(chunk);
      const request=new Request('https://test-engine.invalid'+req.url,{method:req.method,headers:req.headers,
        ...(body.length?{body:Buffer.concat(body),duplex:'half'}:{})});
      const response=await runtime.fetch(request);
      if(!response){res.writeHead(404);res.end();return;}
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    }catch{res.writeHead(500,{'content-type':'application/json'});res.end('{}');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin='http://127.0.0.1:'+server.address().port;
  let loseOneSpinResponse=false;
  const fetcher=async(path,options)=>{
    const response=await fetch(origin+path.replace('/api/slots/','/api/'),{
      ...options,headers:{...options.headers,origin:'https://superwin-player.apdiy61.workers.dev'}});
    if(loseOneSpinResponse&&path.endsWith('/spin')){
      loseOneSpinResponse=false;await response.arrayBuffer();throw new TypeError('Simulated response disconnect');
    }
    return response;
  };
  return {fetcher,loseNextSpinResponse:()=>{loseOneSpinResponse=true;}};
}
function spinIntent(state){return {action:'SPIN',gameId:BURN_WILDS_GAME_ID,requestKey:randomUUID(),
  betMinor:100,auto:false,collectRoundId:state.pendingWinMinor>0?state.round.roundId:null};}

test('real local HTTP transport completes 20 server-generated TEST ETB rounds with exact replay',async t=>{
  const h=await harness(t),storage=store(),transport=createBurnWildsSimulationTransport({...h,storage});
  assert.equal(transport.hasSession(),false);
  let state=await transport.createSession();
  assert.equal(state.mode,'SIMULATION');assert.equal(state.authenticated,false);assert.equal(state.cashEnabled,false);
  assert.deepEqual([...storage.values.keys()],[BURN_TEST_SESSION_KEY]);
  const rounds=new Set();
  for(let i=0;i<20;i++){
    const original=await transport.prepare(spinIntent(state));
    const result=await transport.dispatch(original);
    auditBurnWildsPayout(result);rounds.add(result.roundId);
    assert.equal(result.balanceMinor,state.balanceMinor+state.pendingWinMinor-100);
    assert.equal(result.pendingWinMinor,result.winMinor);
    assert.deepEqual(await transport.recover(original),result);
    state=await transport.state();
    assert.equal(state.balanceMinor,result.balanceMinor);
  }
  assert.equal(rounds.size,20);
  const history=await transport.history();
  assert.equal(history.history.filter(row=>row.action==='SPIN').length,20);
  assert.ok(!JSON.stringify(history).includes(storage.getItem(BURN_TEST_SESSION_KEY)));
  assert.deepEqual([...storage.values.keys()],[BURN_TEST_SESSION_KEY]);
});

test('lost accepted response recovers the same spin once and unknown recovery creates nothing',async t=>{
  const h=await harness(t),transport=createBurnWildsSimulationTransport({...h,storage:store()});
  const state=await transport.createSession(),action=await transport.prepare(spinIntent(state));
  h.loseNextSpinResponse();
  await assert.rejects(transport.dispatch(action),/Simulated response disconnect/);
  const recovered=await transport.recover(action);
  assert.equal(recovered.balanceMinor,state.balanceMinor-100);
  assert.deepEqual(await transport.recover(action),recovered);
  await assert.rejects(transport.recover({...action,requestKey:randomUUID()}),{code:'BURN_TEST_REPLAY_NOT_FOUND'});
  const history=await transport.history();assert.equal(history.history.length,1);
});

test('cash-shaped responses and invalid test stakes cannot authorize this transport',async()=>{
  const storage=store();storage.setItem(BURN_TEST_SESSION_KEY,'a'.repeat(64));let calls=0;
  const transport=createBurnWildsSimulationTransport({storage,fetcher:async()=>{
    calls++;return new Response(JSON.stringify({mode:'CASH',cashEnabled:true}),{headers:{'content-type':'application/json'}});
  }});
  await assert.rejects(transport.state(),{code:'BURN_TEST_RESPONSE_MODE'});
  assert.throws(()=>transport.prepare({action:'SPIN',gameId:BURN_WILDS_GAME_ID,requestKey:randomUUID(),betMinor:100}),/NOT_READY/);
  assert.equal(calls,1);
});
