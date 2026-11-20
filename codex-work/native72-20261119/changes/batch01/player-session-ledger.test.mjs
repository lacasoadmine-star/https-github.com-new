import test from 'node:test';
import assert from 'node:assert/strict';
import * as m20 from './multihot20/controller.mjs';
import * as b5 from './multihot5burnwilds/controller.mjs';
import {Session as M20Session, STORAGE_KEY as M20KEY} from './multihot20/session.mjs';
import {Session as B5Session, STORAGE_KEY as B5KEY} from './multihot5burnwilds/session.mjs';

const UUID='a73c9267-43f4-458f-a85e-2e4372189ab0';
const GUARD='f'.repeat(64);
const variants=[
 {mod:m20,Session:M20Session,key:M20KEY},
 {mod:b5,Session:B5Session,key:B5KEY}
];
function create(v){
 const game={id:v.mod.GAME_ID,enabled:true,freshReleaseReady:true,currency:'ETB',reels:5,rows:3,
  paylines:v.mod.GAME_SPEC.fixedPaylines,mathVersion:'qa-v1',engineVersion:'existing-server-v1',
  mathSha256:'a'.repeat(64),betLevels:['1.00','2.00'],symbols:['seven','cherry'],
  paytable:{source:'existing_server'}};
 const state={authenticated:true,currency:'ETB',balance:'100.00',sessionGuard:GUARD,game};
 const store=new Map(),storage={
  getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value),
  removeItem:key=>store.delete(key)
 };
 let calls=0,throwStatus=null,lastToken=null,forceGuard=null;
 const request=async(path,body)=>{
  if(path==='/api/slots/fresh-state?gameId='+v.mod.GAME_ID)return {...state,balance:calls>0&&throwStatus===null?'99.00':'100.00',sessionGuard:forceGuard||GUARD};
  assert.equal(path,'/api/slots/spin');
  calls++;lastToken=body.roundToken;
  if(throwStatus)throw Object.assign(new Error('HTTP_'+throwStatus),{status:throwStatus,code:'HTTP_'+throwStatus});
  return {gameId:game.id,bet:body.bet,currency:'ETB',roundId:UUID,isFree:false,
   mathVersion:game.mathVersion,engineVersion:game.engineVersion,mathSha256:game.mathSha256,
   grid:Array.from({length:3},()=>Array(5).fill('seven')),wheelMultiplier:3,winLines:[],features:{expandedWildReels:[]},
   finalWin:'0.00',walletReceipt:{currency:'ETB',balanceBefore:'100.00',chargedStake:body.bet,finalWin:'0.00',balanceAfter:'99.00'}};
 };
 const session=new v.Session({request,storage,uuid:()=>UUID});
 return {session,store,storage,state,key:v.key,metrics:()=>({calls,lastToken}),fail:status=>{throwStatus=status},sessionChange:guard=>{forceGuard=guard}};
}

for(const v of variants){
 const label=v.mod.GAME_SPEC.title;
 test(label+' uses original ZPLAY server receipts and refreshed ledger for every round',async()=>{
  const f=create(v),s=f.session;
  const account=await s.connect();
  assert.equal(account.game.id,v.mod.GAME_ID);
  assert.equal(s.phase,'READY');
  const receipt=await s.spin('1.00');
  assert.equal(s.phase,'SHOWING_RESULT');
  assert.equal(s.account.balance,'99.00');
  assert.equal(s.storage.getItem(v.key),null);
  const fresh=await s.finish();
  assert.equal(fresh.balance,'99.00');
  assert.equal(s.phase,'READY');
  assert.equal(receipt.roundId,UUID);
 });
 test(label+' ambiguous 503 preserves round token across refresh and recovery',async()=>{
  const f=create(v),s=f.session;await s.connect();f.fail(503);
  await assert.rejects(()=>s.spin('1.00'),/HTTP_503/);
  assert.equal(s.phase,'WAITING_FOR_RESULT');
  const token=f.metrics().lastToken;
  assert.ok(s.storage.getItem(v.key),'original roundToken stays in same session storage');
  f.fail(null);
  await s.connect();assert.equal(s.phase,'WAITING_FOR_RESULT');
  const r=await s.recover();
  assert.equal(r.roundId,UUID);assert.equal(f.metrics().lastToken,token);
  assert.equal(s.phase,'SHOWING_RESULT');
  assert.equal(s.storage.getItem(v.key),null);
  assert.equal((await s.finish()).balance,'99.00');
 });
 test(label+' explicitly rejected 402 clears token without stuck confirmation',async()=>{
  const f=create(v),s=f.session;await s.connect();f.fail(402);
  await assert.rejects(()=>s.spin('1.00'),/HTTP_402/);
  assert.equal(s.storage.getItem(v.key),null);
  assert.equal(s.pending,null);
  assert.equal(s.phase,'READY');
 });
 test(label+' Player switch refuses to replay another account pending wager',async()=>{
  const f=create(v),s=f.session;await s.connect();f.fail(503);
  await assert.rejects(()=>s.spin('1.00'));
  s.logout();
  f.sessionChange('a'.repeat(64));
  await assert.rejects(()=>s.connect(),/SAVED_ROUND_BELONGS_TO_ANOTHER_SESSION/);
  assert.equal(s.phase,'DISCONNECTED');
  assert.ok(s.storage.getItem(v.key),'old wager must be reconciled in original account');
 });
 test(label+' never calls a wallet API or a detached bonus endpoint',async()=>{
  const f=create(v);
  assert.equal(await f.session.connect().then(x=>x.currency),'ETB');
  assert.equal(f.metrics().calls,0);
  assert.equal(f.session.account.game.id,v.mod.GAME_ID);
 });
}
