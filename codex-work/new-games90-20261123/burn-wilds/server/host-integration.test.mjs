import test from 'node:test';
import assert from 'node:assert/strict';
import {createBurnWildsExistingHostBinding} from './host-integration.mjs';
import {BURN_WILDS_GAME_ID} from '../expansion.mjs';
const origin='https://existing-host.invalid';
const guard='a'.repeat(64);
function callbacks(){
 let writes=0,old=0;
 const config={
  authenticate:async()=> 'fixture-player',sessionGuard:async()=>guard,
  transaction:async operation=>operation({
    authenticate:async()=> 'fixture-player',
    lockWallets:async()=>{},assertReady:async()=>{},
    withRequestOwner:async()=>{writes++;throw new Error('no licensed model');},
    findRequest:async()=>null,insertRequest:async()=>{},
    playerBalance:async()=>10000n,houseBalance:async()=>100000n,
    reservedBalance:async()=>0n,activeRound:async()=>null,
    assertNoActiveRound:async()=>{},assertPlayerCapacity:async()=>{},
    debitStake:async()=>{},reserveWin:async()=>{},creditReservedWin:async()=>{},
    insertRound:async()=>{},registerRound:async()=>{}
  }),
  hash:async()=> 'f'.repeat(64),
  getApprovedModel:async()=>null,releaseEnabled:()=>false,
  uuid:()=> '00000000-0000-4000-8000-000000000001',
  existingFetch:async req=>{old++;return new Response('old '+new URL(req.url).pathname,{status:202});},
  assertWriteOrigin:async request=>request.headers.get('origin')===origin
 };
 return {config,counts:()=>({old,writes})};
}
test('one runtime attachment preserves unrelated existing APIs with original request identity',async()=>{
 const h=callbacks(),host=createBurnWildsExistingHostBinding(h.config);
 assert.equal(host.addsDatabase,false);assert.equal(host.createsWallet,false);
 assert.equal(host.releaseEnabledByDefault,false);
 assert.equal(host.handles(BURN_WILDS_GAME_ID),true);
 assert.equal(host.handles('other-game'),false);
 const req=new Request(origin+'/api/slots/spin',{method:'POST',body:'old wager'});
 const res=await host.fetch(req);
 assert.equal(res.status,202);
 assert.equal(await res.text(),'old /api/slots/spin');
 assert.equal(await req.text(),'old wager');
 assert.deepEqual(h.counts(),{old:1,writes:0});
});
test('existing unauthorised release is listed but cannot accept a real-money wager',async()=>{
 const h=callbacks(),host=createBurnWildsExistingHostBinding(h.config);
 const state=await host.fetch(new Request(origin+'/api/slots/new-games90/burn-wilds/state'));
 assert.equal(state.status,200);
 const body=await state.json();
 assert.equal(body.authenticated,true);
 assert.equal(body.game.enabled,false);
 assert.equal(body.game.productionApproved,false);
 assert.equal(body.game.betLevels.length,0);
 assert.deepEqual(h.counts(),{old:0,writes:0});
});
test('cannot mount with fabricated server dependencies or weakened financial/origin hooks',()=>{
 const h=callbacks();
 for(const field of ['transaction','authenticate','hash','getApprovedModel','releaseEnabled','existingFetch','assertWriteOrigin']){
   const invalid={...h.config,[field]:null};
   assert.throws(()=>createBurnWildsExistingHostBinding(invalid),/EXISTING_RUNTIME_CALLBACKS_REQUIRED/);
 }
});

