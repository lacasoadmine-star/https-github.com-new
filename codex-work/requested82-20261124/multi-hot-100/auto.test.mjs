import test from 'node:test';
import assert from 'node:assert/strict';
import {createM100Auto,M100_OWN_AUTO_POLICY} from './auto.mjs';
import {MultiHot100Controls} from './controls.mjs';
import {MultiHot100Presentation} from './presentation.mjs';
import {MultiHot100Controller} from './controller.mjs';
import {createM100NativeFixture} from './host/test-support.mjs';
import {createExistingM100Transport} from './host/transport.mjs';
import {quoteM100Grid} from './rules/quote.mjs';
import {NATIVE_SYMBOLS} from './host/model.mjs';

// Explicit disposable original-wire fixture. Each of100 lines has3grapes:
// 100 × (1ETB /100) × coefficient10 × multiplier3 =30ETB.
const grid=Array.from({length:4},()=>['grapes','grapes','grapes','lemon','plum']);
const quote=quoteM100Grid({grid,betMinor:100n,multiplier:3});
const delay=ms=>new Promise(done=>setTimeout(done,ms));

test('increase limit includes accepted pending win before another wager and collects once',async()=>{
 assert.equal(quote.winMinor,3000n);
 const fixture=createM100NativeFixture();let stateAtCollection=null;
 const fetcher=async(path,options)=>{
  const body=options.method==='POST'?JSON.parse(options.body):null;
  if(body?.action==='collect')stateAtCollection={cash:fixture.state.balance,pending:fixture.state.round.currentCashoutMinor};
  const response=await fixture.fetcher(path,options);
  if(body?.type!=='start')return response;
  const raw=await response.json(),round={...raw.round,
   grid:Array.from({length:5},(_,column)=>grid.map(row=>NATIVE_SYMBOLS.indexOf(row[column]))),
   feature:{multiplier:3},currentCashoutMinor:'3000',
   wins:quote.lines.map(line=>({line:line.lineId,symbol:String(NATIVE_SYMBOLS.indexOf(line.symbol)),cells:Array.from({length:line.count},(_,column)=>[column,line.path[column]]),payoutMinor:String(line.winMinor)}))};
  fixture.state={...fixture.state,round};const envelope={...raw,round};fixture.cache.set(body.request_id,structuredClone(envelope));return Response.json(envelope);
 };
 const transport=createExistingM100Transport({fetcher,storage:fixture.storage,sessionStorage:fixture.storage});
 const {hostPolicy}=await transport.connect();
 const controls=new MultiHot100Controls({currency:'ETB',hostPolicy,betLevels:hostPolicy.betLevels});
 const presentation=new MultiHot100Presentation();let automatic,game;
 const controller=new MultiHot100Controller({controls,presentation,transport,onChange(state){automatic?.observe(state);if(state.phase==='PRESENTING')queueMicrotask(()=>controller.frame({clockMs:1,progress:1}));}});
 game={controls,controller,snapshot:()=>controller.snapshot()};automatic=createM100Auto({getGame:()=>game,isHidden:()=>false});
 try{
  const configuration={maximumRounds:25,winAtLeast:null,balanceDecrease:null,balanceIncrease:'20.00'};
  assert(controls.configureAuto(configuration));assert(controls.requestAutoStart().accepted);automatic.start(configuration);
  const until=Date.now()+3000;
  while(Date.now()<until&&(fixture.posts<2||controller.snapshot().phase!=='IDLE'||automatic.snapshot().active))await delay(10);
  assert.equal(fixture.draws,1,'No second wager after accepted99cash+30pending reaches129');
  assert.equal(fixture.posts,2,'Exactly one original SPIN and one TAKE');
  assert.deepEqual(stateAtCollection,{cash:'99.00',pending:'3000'},'The limit projection never edits displayed cash or the ledger');
  assert.equal(fixture.state.balance,'129.00');assert.equal(controller.snapshot().balance,'129.00');assert.equal(controller.snapshot().pendingWin,'0.00');assert.equal(automatic.snapshot().remaining,24);
  assert.equal(fixture.requests.filter(row=>row.options.method==='POST'&&JSON.parse(row.options.body).action==='collect').length,1);
  assert.match(M100_OWN_AUTO_POLICY.balanceConditions,/cash plus accepted pending win/);
 }finally{automatic.dispose();controller.dispose();transport.dispose();}
});
