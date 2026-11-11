import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createExistingLibrary74Adapter} from '../server/existing-library74-adapter.mjs';
import {canStartRound,roundNeedsRecovery} from '../client/machine74-controls.mjs';
import {CHICKEN_AUTO_MAX_ROUNDS,hasChickenAutoplay,chickenAutoplaySteps,chickenAutoplayPlan,runChickenAutoplay} from '../client/chicken74-autoplay.mjs';

const id='ind74_official_chickenhighway';
const adapter=createExistingLibrary74Adapter({reviewedGameIds:[id],allowNewRounds:true,gameLimits:{[id]:{maxBetMinor:'5000000',maxWinMinor:'999999999999999'}}});
const definition=adapter.definitions[id];
const money=minor=>String(minor/100n)+'.'+String(minor%100n).padStart(2,'0');
const plan=(overrides={})=>chickenAutoplayPlan(definition,{stake:'1.00',mode:'easy',rounds:2,targetStep:2,...overrides});

function fixture({balance=10000n,random=()=>0}={}){
  let state=null,roundNumber=0,version=0,now=1700000000000;
  const calls=[],progress=[],ledger={debit:0n,payout:0n};
  const live={gameId:id,running:true,disposed:false,hidden:false,busy:false,pending:null,needsRefresh:false,snapshot:{authenticated:true,currency:'ETB',accepting:true,balance:money(balance),sessionGuard:'a'.repeat(64),game:{id,version:definition.version,launchable:true},round:null}};
  function save(result){
    state=result.state;version++;balance-=BigInt(result.debitMinor);ledger.debit+=BigInt(result.debitMinor);
    if(result.payoutMinor!==null){balance+=BigInt(result.payoutMinor);ledger.payout+=BigInt(result.payoutMinor);}
    live.snapshot={...live.snapshot,balance:money(balance),round:{...adapter.publicState(state,now),game_id:id,round_id:'fixture-round-'+roundNumber,model_version:state.modelVersion,version}};
  }
  const f={live,calls,progress,ledger,definition,
    read:()=>live,
    request:async(action,input,selection)=>{
      assert.deepEqual(input,{});calls.push({action,stake:action==='start'?selection.stake:null,mode:action==='start'?selection.mode:null,priorStep:live.snapshot.round?.step??null});now+=100;
      let drawIndex=0;const rng=()=>random({action,roundNumber,calls,drawIndex:drawIndex++});
      if(action==='start'){roundNumber++;version=0;save(adapter.start(id,{stakeMinor:selection.stakeMinor,mode:selection.mode},rng,now));}
      else save(adapter.act(state,{type:action},rng,now));
      return true;
    },
    wait:async()=>{},
    onProgress:item=>progress.push(item),
    heartbeat(){now+=100;save(adapter.act(state,{type:'sync'},()=>{throw Error('Heartbeat cannot draw');},now));},
    elapse(ms){now+=ms;},
    async run(selection=plan()){return runChickenAutoplay({...f,plan:selection});},
  };
  return f;
}

test('saved Chicken Help explicitly documents count, cashout step, repeats and manual stopping',async()=>{
  const source=JSON.parse(await readFile(new URL('../reports/current74-evidence-nonslots/ind74_official_chickenhighway-rendered-rules.json',import.meta.url),'utf8'));
  const caption=key=>source.embeddedHelp.find(item=>item.caption==='help.games.chickenhighway.page6.'+key)?.text;
  assert.match(caption('text1'),/number|how many consecutive rounds/i);
  assert.match(caption('text2'),/multiplier \(step\).*automatically cash out/i);
  assert.match(caption('text3'),/restart until.*number.*completes.*manually stops.*balance becomes insufficient/i);
  assert.match(caption('text5'),/stopped manually at any time/i);
});

test('only Chicken gets AUTO and every target is an exact published mode step; operator count bound is explicit',()=>{
  assert.equal(hasChickenAutoplay(definition),true);assert.equal(hasChickenAutoplay({...definition,id:'ind74_official_mineisland'}),false);
  assert.equal(CHICKEN_AUTO_MAX_ROUNDS,100);
  assert.deepEqual(definition.modes.map(mode=>chickenAutoplaySteps(definition,mode).length),[25,23,19]);
  assert.deepEqual(chickenAutoplaySteps(definition,'hard').at(-1),{step:19,multiplierBps:100000000});
  assert.equal(plan({stake:'7.00',rounds:3}).stake,'7.00');
  for(const value of [0,101,1.5,NaN])assert.throws(()=>plan({rounds:value}),/wareeg/);
  assert.throws(()=>plan({mode:'hard',targetStep:20}),/CASHOUT/);
});

test('three confirmed target-three rounds keep the chosen stake and make one debit per round',async()=>{
  const f=fixture(),result=await f.run(plan({stake:'2.00',rounds:3,targetStep:3}));
  assert.deepEqual(result,{reason:'completed',completed:3,requested:3});
  assert.deepEqual(f.calls.map(call=>call.action),Array(3).fill(['start','reveal','reveal','collect']).flat());
  assert.deepEqual(f.calls.filter(call=>call.action==='start').map(call=>[call.stake,call.mode]),Array(3).fill(['2.00','easy']));
  assert.deepEqual(f.ledger,{debit:600n,payout:660n});assert.equal(f.live.snapshot.balance,'100.60');
  assert.deepEqual(f.progress.map(item=>item.completed),[1,2,3]);
});

test('the final published lane uses the server automatic settlement without an extra collect or wager',async()=>{
  const f=fixture(),result=await f.run(plan({mode:'hard',targetStep:19,rounds:1}));
  assert.equal(result.reason,'completed');assert.equal(result.completed,1);
  assert.deepEqual(f.calls.map(call=>call.action),['start',...Array(18).fill('reveal')]);
  assert.deepEqual(f.ledger,{debit:100n,payout:1000000n});assert.equal(f.live.snapshot.round.status,'settled');
});

test('a collision counts once then restarts at step one, never collecting the lost award',async()=>{
  const f=fixture({random:({action,roundNumber,drawIndex})=>action==='start'&&roundNumber===1&&drawIndex===1?10599/2**53:0});
  assert.deepEqual(await f.run(),{reason:'completed',completed:2,requested:2});
  assert.deepEqual(f.calls.map(call=>call.action),['start','reveal','start','reveal','collect']);
  assert.deepEqual(f.calls.filter(call=>call.action==='reveal').map(call=>call.priorStep),[1,1]);
  assert.deepEqual(f.ledger,{debit:200n,payout:106n});assert.equal(f.live.snapshot.balance,'99.06');
});

test('insufficient confirmed balance ends the batch before another START',async()=>{
  const f=fixture({balance:100n,random:({drawIndex})=>drawIndex===0?10199/2**53:0});
  assert.deepEqual(await f.run(plan({rounds:5})),{reason:'insufficient-balance',completed:1,requested:5});
  assert.equal(f.calls.length,1);assert.equal(f.ledger.debit,100n);assert.equal(f.live.snapshot.balance,'0.00');
});

test('STOP during an accepted crossing leaves that round for manual control and schedules no financial action',async()=>{
  const f=fixture(),request=f.request;f.request=async(...args)=>{await request(...args);f.live.running=false;return true;};
  assert.deepEqual(await f.run(),{reason:'cancelled',completed:0,requested:2});
  assert.deepEqual(f.calls.map(call=>call.action),['start']);assert.equal(f.live.snapshot.round.status,'active');assert.equal(f.ledger.debit,100n);
  f.live.running=true;assert.equal((await f.run()).reason,'start-unavailable');assert.equal(f.calls.length,1,'A new AUTO click cannot start over an existing active round.');
});

test('STOP after a confirmed cashout counts the receipt without starting the next round',async()=>{
  const f=fixture(),request=f.request;f.request=async(...args)=>{await request(...args);if(args[0]==='collect')f.live.running=false;return true;};
  assert.deepEqual(await f.run(plan({targetStep:1,rounds:5})),{reason:'cancelled',completed:1,requested:5});
  assert.deepEqual(f.calls.map(call=>call.action),['start','collect']);assert.equal(f.ledger.debit,100n);
});

test('hidden, disposed, changed-session and unresolved-connection states stop before another crossing',async()=>{
  for(const flag of ['hidden','disposed','needsRefresh','pending','session']){
    const f=fixture();f.wait=async()=>{if(flag==='session')f.live.snapshot={...f.live.snapshot,sessionGuard:'b'.repeat(64)};else f.live[flag]=flag==='pending'?{body:{action:'sync'}}:true;};
    const result=await f.run();assert.notEqual(result.reason,'completed');assert.deepEqual(f.calls.map(call=>call.action),['start'],flag);assert.equal(f.ledger.debit,100n);
  }
});

test('an in-flight heartbeat is serialized and an ambiguous completion cancels without a new identity',async()=>{
  const f=fixture();let heartbeat=false;const request=f.request;
  f.request=async(...args)=>{const ok=await request(...args);if(args[0]==='start'&&!heartbeat){heartbeat=true;f.live.busy=true;f.live.pending={body:{action:'sync',request_id:'original-id'}};}return ok;};
  f.wait=async kind=>{if(kind==='busy'){f.live.busy=false;f.live.needsRefresh=true;}};
  assert.equal((await f.run()).reason,'refresh-required');assert.equal(f.calls.length,1);assert.equal(f.live.pending.body.request_id,'original-id');
  const ready=fixture();let renewed=false;const readyRequest=ready.request;
  ready.request=async(...args)=>{const ok=await readyRequest(...args);if(args[0]==='start'&&!renewed){renewed=true;ready.live.busy=true;}return ok;};
  ready.wait=async kind=>{if(kind==='busy'){ready.heartbeat();ready.live.busy=false;}};
  assert.equal((await ready.run(plan({rounds:1,targetStep:1}))).reason,'completed');assert.deepEqual(ready.calls.map(call=>call.action),['start','collect']);assert.equal(ready.ledger.debit,100n);
});

test('server timeout settlement terminates AUTO rather than silently restarting after connection loss',async()=>{
  const f=fixture();let elapsed=false;f.wait=async()=>{if(!elapsed){elapsed=true;f.elapse(8001);}};
  const result=await f.run();assert.equal(result.reason,'connection-timeout');assert.equal(result.completed,1);
  assert.equal(f.live.snapshot.round.settlementReason,'CONNECTION_TIMEOUT_CASHOUT');
  assert.deepEqual(f.calls.map(call=>call.action),['start','reveal']);assert.deepEqual(f.ledger,{debit:100n,payout:102n});
});

test('a revoked server action is respected without inventing GO or CASHOUT',async()=>{
  const f=fixture();f.wait=async()=>{f.live.snapshot.round.allowedActions=['sync'];};
  assert.equal((await f.run()).reason,'action-unavailable');assert.equal(f.calls.length,1);
});

const controllerSource=await readFile(new URL('../client/machine74-controller.mjs',import.meta.url),'utf8');
function controllerRun(){
  const f=fixture(),calls=[],task={cancelled:false},selection=plan({stake:'7.00',mode:'medium'});
  const context={game:definition,snapshot:f.live.snapshot,working:false,refreshing:false,disposed:false,presenceNeedsRefresh:false,autoplay:true,chickenAutoTask:task,animation:null,document:{hidden:false},
    roundNeedsRecovery,canStartRound,updateControls(){},draw(){},walletChanged(){},isPlinkoX:()=>false,isDestiny:()=>false,isChargingWilds:()=>false,hasPaidFeatureModes:()=>false,parsedStake:()=> '19.00',options:()=>({mode:'hard'}),startRoundOptions:(_d,o)=>o,
    audio:{unlock:async()=>{},stop(){},startSpin(){},cue(){},stopSpin(){}},
    api:{start:async(stake,opts)=>{calls.push({kind:'start',stake,opts});return{...f.live.snapshot,round:null};}},
    present:async next=>{context.snapshot=next;},failure:()=>{context.stopAutoplay();},};
  vm.createContext(context);vm.runInContext(controllerSource.slice(controllerSource.indexOf('function stopAutoplay(){'),controllerSource.indexOf('\nfunction chickenAutoSelection('))+controllerSource.slice(controllerSource.indexOf('async function run('),controllerSource.indexOf('\nconst play=')),context);
  return{context,calls,task,selection};
}

test('controller rechecks cancellation after asynchronous sound unlock and never submits a late START',async()=>{
  const f=controllerRun();let unlock;f.context.audio.unlock=()=>new Promise(resolve=>{unlock=resolve;});
  const running=f.context.run('start',{}, {task:f.task,plan:f.selection});
  f.context.stopAutoplay();unlock();assert.equal(await running,false);assert.deepEqual(f.calls,[]);assert.equal(f.context.working,false);
});

test('the actual Refresh, STOP and hidden-page handlers cancel a pending AUTO start before sound unlock returns',async()=>{
  for(const trigger of ['refresh','stop','hidden']){
    const f=controllerRun();let unlock;f.context.audio.unlock=()=>new Promise(resolve=>{unlock=resolve;});
    const running=f.context.run('start',{}, {task:f.task,plan:f.selection});
    if(trigger==='refresh'){
      vm.runInContext(controllerSource.slice(controllerSource.indexOf('async function refresh('),controllerSource.indexOf('\nasync function select(')),f.context);
      await f.context.refresh(); // The in-flight request stays cancelled even though Refresh cannot yet read.
    }else if(trigger==='stop'){
      const handlers={};f.context.on=(id,_event,handler)=>{handlers[id]=handler;};f.context.auto=()=>{};
      vm.runInContext(controllerSource.split('\n').find(line=>line.startsWith("on('stop','click'")),f.context);
      handlers.stop();
    }else{
      let handler;f.context.document.addEventListener=(_name,value)=>{handler=value;};f.context.listeners={signal:undefined};
      vm.runInContext(controllerSource.split('\n').find(line=>line.startsWith("document.addEventListener('visibilitychange'")),f.context);
      f.context.document.hidden=true;handler();
    }
    unlock();assert.equal(await running,false,trigger);assert.equal(f.task.cancelled,true,trigger);assert.deepEqual(f.calls,[],trigger);
  }
});

test('controller freezes the selected stake/mode and prevents a manual START from overlapping AUTO',async()=>{
  const f=controllerRun();assert.equal(await f.context.run('start',{}, {task:f.task,plan:f.selection}),true);
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls)),[{kind:'start',stake:'7.00',opts:{mode:'medium'}}]);
  const other=controllerRun();assert.equal(await other.context.run('start'),false);assert.deepEqual(other.calls,[]);assert.equal(other.task.cancelled,true);
});

test('retrying a Chicken financial action reads current state and never restarts the cancelled AUTO',async()=>{
  const f=controllerRun();f.context.chickenAutoTask=null;f.context.autoplay=false;f.context.presenceNeedsRefresh=true;const sequence=[];
  f.context.api.retryPending=async()=>{sequence.push('same-request');return{...f.context.snapshot,round:{status:'active'}};};
  f.context.api.state=async()=>{sequence.push('state');return{...f.context.snapshot,round:{status:'settled'}};};
  assert.equal(await f.context.run('retry'),true);assert.deepEqual(sequence,['same-request','state']);assert.equal(f.context.snapshot.round.status,'settled');assert.equal(f.context.presenceNeedsRefresh,false);assert.equal(f.context.autoplay,false);assert.deepEqual(f.calls,[]);
  f.context.presenceNeedsRefresh=true;f.context.api.state=async()=>{throw Error('Fresh state unavailable');};
  assert.equal(await f.context.run('retry'),false);assert.equal(f.context.presenceNeedsRefresh,true);assert.equal(await f.context.run('start'),false);assert.deepEqual(f.calls,[]);
});

test('409 settlement/version conflicts block every further Chicken action until a state refresh',async()=>{
  const f=controllerRun();f.context.api.start=async()=>{throw Object.assign(Error('ROUND_ALREADY_SETTLED'),{status:409});};
  assert.equal(await f.context.run('start',{}, {task:f.task,plan:f.selection}),false);assert.equal(f.context.presenceNeedsRefresh,true);assert.equal(f.task.cancelled,true);assert.equal(f.context.autoplay,false);assert.deepEqual(f.calls,[]);
});
