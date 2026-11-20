import test from 'node:test';
import assert from 'node:assert/strict';
import * as hot20 from './multihot20/controller.mjs';
import * as burn from './multihot5burnwilds/controller.mjs';

function fixtures(module){
 const model={
  id:module.GAME_ID,reels:5,rows:3,paylines:module.GAME_SPEC.fixedPaylines,
  enabled:true,freshReleaseReady:true,mathVersion:'m20-qa',engineVersion:'server-qa',mathSha256:'a'.repeat(64),
  betLevels:['1.00','2.00'],symbols:['cherry','seven'],paytable:{source:'server-only'}
 };
 const receipt={
  gameId:module.GAME_ID,bet:'1.00',currency:'ETB',roundId:'c4353465-1182-48dc-b1a2-617ccebe7def',
  isFree:false,mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256,
  grid:Array.from({length:3},()=>Array.from({length:5},()=> 'cherry')),
  wheelMultiplier:3,winLines:[],finalWin:'0.00',
  walletReceipt:{currency:'ETB',balanceBefore:'10.00',chargedStake:'1.00',finalWin:'0.00',balanceAfter:'9.00'},
  features:{expandedWildReels:[]}
 };
 const account={authenticated:true,sessionGuard:'a'.repeat(64),currency:'ETB',game:model};
 return {model,receipt,account};
}

for(const m of [hot20,burn]){
 const name=m.GAME_SPEC.title;
 test(name+' validates immutable math model and server receipt, not a client payout calculator',()=>{
  const {model,receipt}=fixtures(m);
  assert.equal(m.validateModel(model),model);
  assert.equal(m.validateReceipt(receipt,model,'1.00'),receipt);
  assert.throws(()=>m.validateModel({...model,betLevels:['0.10']}),/BET_OUTSIDE_EXISTING_WORKER_LIMIT/);
  assert.throws(()=>m.validateReceipt({...receipt,walletReceipt:{...receipt.walletReceipt,balanceAfter:'50.00'}},model,'1.00'),/INVALID_AUTHORITATIVE_SETTLEMENT/);
  assert.throws(()=>m.validateReceipt({...receipt,wheelMultiplier:100},model,'1.00'),/MULTIPLIER_NOT_AUTHORIZED/);
  assert.equal(m.GAME_SPEC.productionLaunchable,false);
 });
 test(name+' AUTO does not submit until START PLAY is pressed, then uses only existing session',async()=>{
  const {receipt,account}=fixtures(m);
  let posts=0,renders=0;const scene={start(){},async settle(){renders++}};
  const session={spin:async()=>{posts++;return receipt},pending:null};
  const c=new m.GameController({session,scene});
  assert.equal(c.connect(account),true);
  assert.equal(c.previewPaytable(),account.game.paytable);
  assert.equal(c.armAuto(2),true);
  assert.equal(posts,0);
  assert.equal(await c.startPlay(),true);
  await new Promise(r=>setTimeout(r,10));
  assert.equal(posts,2);
  assert.equal(renders,2);
  assert.equal(c.phase,'ready');
  assert.equal(c.auto.armed,0);
 });
 test(name+' prevents phantom wager on renderer-start failure',async()=>{
  const {account}=fixtures(m);
  let posts=0;
  const c=new m.GameController({session:{spin:async()=>{posts++},pending:null},scene:{start(){throw Error('CANVAS_UNAVAILABLE')},reset(){}}});
  c.connect(account);
  assert.equal(await c.spin(),false);assert.equal(posts,0);assert.equal(c.phase,'ready');
 });
 test(name+' retains ambiguous 503 for reconciliation rather than resubmitting',async()=>{
  const {account}=fixtures(m);let posts=0;
  const session={spin:async()=>{posts++;throw Object.assign(Error('TEMPORARY_ERROR'),{status:503})},pending:null};
  const c=new m.GameController({session,scene:{start(){},reset(){}}});
  c.connect(account);assert.equal(await c.spin(),false);
  assert.equal(c.phase,'confirm');
  assert.equal(posts,1);
  assert.equal(await c.spin(),false);
  assert.equal(posts,1);
 });
 test(name+' releases explicitly rejected 402 without leaving CONFIRM stuck',async()=>{
  const {account}=fixtures(m);let posts=0;
  const session={spin:async()=>{posts++;throw Object.assign(Error('INSUFFICIENT_FUNDS'),{status:402})},pending:null};
  const c=new m.GameController({session,scene:{start(){},reset(){}}});
  c.connect(account);assert.equal(await c.spin(),false);
  assert.equal(c.phase,'ready');assert.equal(posts,1);
 });
 test(name+' never overwrites a newer Player session with a late previous receipt',async()=>{
  const {account,receipt}=fixtures(m);let settle=0,resolve;
  const session={spin:()=>new Promise(r=>{resolve=r}),pending:null};
  const c=new m.GameController({session,scene:{start(){},async settle(){settle++},reset(){}}});
  c.connect(account);
  const pending=c.spin();
  c.logout();
  resolve(receipt);
  assert.equal(await pending,false);
  assert.equal(c.phase,'disconnected');
  assert.equal(settle,0);
 });
 test(name+' preserves settled receipt if only animation crashes',async()=>{
  const {account,receipt}=fixtures(m);let posts=0;
  const session={spin:async()=>{posts++;return receipt},pending:null};
  const c=new m.GameController({session,scene:{start(){},async settle(){throw Error('RENDER_FAIL')}}});
  c.connect(account);assert.equal(await c.spin(),true);
  assert.equal(posts,1);assert.equal(c.lastReceipt,receipt);
  assert.equal(c.phase,'ready');assert.equal(c.error,'ROUND_SETTLED_RENDER_ERROR');
 });
}
test('Burn Wilds expands only real Wilds on winning lines of authorized reels 2, 3 and 4',()=>{
 const {model,receipt}=fixtures(burn);
 const approvedModel={...model,symbols:[...model.symbols,'wild']};
 const grid=receipt.grid.map(row=>[...row]);
 grid[1][1]='wild';grid[1][3]='wild';
 const winning={...receipt,grid,features:{expandedWildReels:[1,3]},
  winLines:[{positions:[[1,0],[1,1],[1,2],[1,3],[1,4]]}],
  finalWin:'2.00',walletReceipt:{...receipt.walletReceipt,finalWin:'2.00',balanceAfter:'11.00'}};
 assert.equal(burn.validateReceipt(winning,approvedModel,'1.00'),winning);
 assert.throws(()=>burn.validateReceipt({...winning,features:{expandedWildReels:[0]}},approvedModel,'1.00'),/BURN_WILD_REEL_INVALID/);
 assert.throws(()=>burn.validateReceipt({...winning,features:{expandedWildReels:[1,1]}},approvedModel,'1.00'),/BURN_WILD_REEL_INVALID/);
 assert.throws(()=>burn.validateReceipt({...winning,grid:receipt.grid},approvedModel,'1.00'),/BURN_WILD_SYMBOL_REQUIRED/);
 assert.throws(()=>burn.validateReceipt({...winning,winLines:[]},approvedModel,'1.00'),/BURN_WILD_MUST_PARTICIPATE_IN_WIN/);
 assert.throws(()=>burn.validateReceipt({...winning,finalWin:'0.00',walletReceipt:receipt.walletReceipt},approvedModel,'1.00'),/BURN_WILD_REQUIRES_SETTLED_WIN/);
 assert.throws(()=>burn.validateReceipt({...winning,winLines:Array(6).fill(winning.winLines[0])},approvedModel,'1.00'),/TOO_MANY_PAYLINES/);
});

for(const m of [hot20,burn]){
 test(m.GAME_SPEC.title+' existing session pending() function never causes phantom CONFIRM after a rejected 402',async()=>{
  const {account}=fixtures(m);let posts=0;
  const session={pending:()=>null,spin:async()=>{posts++;throw Object.assign(Error('INSUFFICIENT_FUNDS'),{status:402})}};
  const c=new m.GameController({session,scene:{start(){},reset(){}}});
  assert.equal(c.connect(account),true);
  assert.equal(await c.spin(),false);
  assert.equal(posts,1);
  assert.equal(c.phase,'ready');
 });
 test(m.GAME_SPEC.title+' Player reconnection resets old receipt and blocks an unresolved token',async()=>{
  const {account,receipt}=fixtures(m);let posts=0,token=null;
  const session={pending:()=>token,spin:async()=>{posts++;return receipt}};
  const c=new m.GameController({session,scene:{start(){},settle:async()=>true,reset(){}}});
  assert.equal(c.connect(account),true);
  assert.equal(await c.spin(),true);
  assert.equal(c.lastReceipt,receipt);
  token={requestId:'OLD_SESSION_PENDING'};
  assert.equal(c.connect({...account,sessionGuard:'otherPlayer'}),false);
  assert.equal(c.phase,'confirm');
  assert.equal(c.lastReceipt,null,'never show Player A receipt on Player B');
  assert.equal(await c.spin(),false,'never duplicate unsettled token');
  assert.equal(posts,1);
  token=null;
  assert.equal(c.connect({...account,sessionGuard:'otherPlayer'}),true);
  c.logout();
  assert.equal(c.lastReceipt,null);
  assert.equal(c.phase,'disconnected');
 });
 test(m.GAME_SPEC.title+' default wager uses first authorized bet if 1 ETB is not offered by server',()=>{
  const {account}=fixtures(m);
  const levels=['2.00','5.00'];
  const c=new m.GameController({session:{spin:async()=>{},pending:()=>null},scene:{reset(){}}});
  assert.equal(c.connect({...account,game:{...account.game,betLevels:levels}}),true);
  assert.equal(c.bet,'2.00');
 });
}

for(const m of [hot20,burn]){
 test(m.GAME_SPEC.title+' honors existing Player active-game, house-capacity and session permission before wager',async()=>{
  const {account}=fixtures(m);let posts=0;
  const session={phase:'READY',pending:null,spin:async()=>{posts++;throw Error('NOT_ALLOWED')}};
  const controller=new m.GameController({session,scene:{reset(){}}});
  assert.equal(controller.connect({...account,blockedByActiveGame:true}),false);
  assert.equal(controller.phase,'unavailable');
  assert.equal(await controller.spin(),false);
  assert.equal(controller.connect({...account,game:{...account.game,wagerAvailability:'house_capacity'}}),false);
  assert.equal(controller.phase,'unavailable');
  session.phase='UNAVAILABLE';
  assert.equal(controller.connect(account),false);
  assert.equal(await controller.spin(),false);
  assert.equal(posts,0,'existing Player must never charge a refused wager');
 });
 test(m.GAME_SPEC.title+' stops AUTO when refreshed authenticated ledger disallows new wager',async()=>{
  const {account,receipt}=fixtures(m);let posts=0;
  const session={phase:'READY',pending:null,
   spin:async()=>{posts++;return receipt},
   finish:async()=>{session.phase='UNAVAILABLE';return {...account,blockedByActiveGame:true}}
  };
  const controller=new m.GameController({session,scene:{start(){},async settle(){},reset(){}}});
  assert.equal(controller.connect(account),true);
  assert.equal(controller.armAuto(20),true);
  assert.equal(await controller.startPlay(),true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(posts,1,'AUTO must not charge a second wager after server lock');
  assert.equal(controller.phase,'unavailable');
  assert.equal(controller.auto.armed,0);
  assert.equal(await controller.spin(),false);
 });
}
