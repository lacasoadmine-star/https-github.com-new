import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {patchSessionRuntime} from '../../deploy/smartsoft/session-runtime-r20.mjs';
const original=await readFile(new URL('./fixtures/session-r17.mjs',import.meta.url),'utf8');
assert.equal(createHash('sha256').update(original).digest('hex'),'38fcda1e5ed0e4d62d34c0226002fff7a71f29f427462d5f8088928445a29417');
async function sessionClass(source){
 const merge=new URL('../../deploy/smartsoft/reference-state-r14.mjs',import.meta.url).href;
 source=source.replace(/^import[^\n]+\n/,"import {mergeReferenceGame} from '"+merge+"';\n");
 return (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).ExpansionSession;
}
function fixture(Class,{throwView=false,delay=0}={}){
 const id='burningice10_native',game={id,version:'superwin-burningice10-2-etb1-40000-v1',launchable:true,minStake:'1.00',maxStake:'40000.00'};
 const round={round_id:'00000000-0000-4000-8000-000000000002',game_id:id,model_version:game.version,status:'settled',version:0,stakeMinor:'100',payoutMinor:'0'};
 let accepted=false,posts=0;const requests=[];const saved=new Map();
 const snapshot=()=>({authenticated:true,sessionId:'isolated-receipt-test',game_id:id,game,currency:'ETB',balance:accepted?'9.00':'10.00',round:accepted?round:null,accepting:true});
 const client=new Class({gameId:id,timeoutMs:15,uuid:()=> '00000000-0000-4000-8000-000000000001',pause:async()=>{},storage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
  fetchImpl:async(url,options)=>{
   requests.push({url,method:options.method||'GET'});
   if(options.method==='POST'){
    posts++;accepted=true;const body=JSON.parse(options.body);
    if(delay)await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,delay);options.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(Object.assign(Error('aborted'),{name:'AbortError'}));},{once:true});});
    return Response.json({status:'SUCCESS',request_id:body.request_id,...snapshot()});
   }
   return Response.json(snapshot());
  },onChange:state=>{if(throwView&&state.busy&&state.round)throw Error('view-paint-failed');}});
 client.setGame(game);
 return {client,posts:()=>posts,requests,saved};
}

test('a rendering exception reproduces the old rejected financial completion and no longer strands confirmation',async()=>{
 const before=fixture(await sessionClass(original),{throwView:true});await before.client.refresh();
 await assert.rejects(before.client.start('1.00'),/view-paint-failed/);
 const errors=[],prior=globalThis.reportError;globalThis.reportError=e=>errors.push(e.message);
 try{
  const after=fixture(await sessionClass(patchSessionRuntime(original)),{throwView:true});await after.client.refresh();
  assert.equal(await after.client.start('1.00'),true);assert.equal(after.posts(),1);assert.equal(after.client.state.balance,'9.00');assert.equal(after.client.state.busy,false);assert.equal(after.client.state.pending,false);assert.equal(after.client.state.connected,true);assert.equal(after.saved.size,0);assert.ok(errors.includes('view-paint-failed'));
 }finally{globalThis.reportError=prior;}
});

test('an accepted action may outlive the read deadline without another submission or lost receipt',async()=>{
 const after=fixture(await sessionClass(patchSessionRuntime(original)),{delay:50});await after.client.refresh();
 assert.equal(await after.client.start('1.00'),true);assert.equal(after.posts(),1);assert.equal(after.client.state.balance,'9.00');assert.equal(after.client.state.pending,false);assert.equal(after.client.state.busy,false);assert.ok(after.requests.every(x=>x.url.startsWith('/api/remaining20/')));
});

test('unreviewed session source is not silently patched',()=>{
 assert.throws(()=>patchSessionRuntime(patchSessionRuntime(original)),/RETAINED_SESSION_CONTRACT_CHANGED/);
});
