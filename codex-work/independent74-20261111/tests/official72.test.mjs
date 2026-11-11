import test from 'node:test';import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import scope from '../scope/official74.json' with{type:'json'};
import {freshChargingContext} from './support/charging-wilds-fixtures.mjs';
import {createGameService} from '../server/service.mjs';import {MemoryRepository} from '../server/tests/support/memory-repository.mjs';
const defs=math.listGameDefinitions(),session='b'.repeat(64);
test('fresh official selection has 74 publisher demo URLs, two protected titles and 72 separate model identities',()=>{
 assert.equal(scope.entries.length,74);assert.equal(defs.length,72);assert.equal(new Set(defs.map(d=>d.id)).size,72);
 assert.deepEqual(scope.entries.filter(e=>e.protected).map(e=>e.name).sort(),['Foxy Hot 20','Multi Hot 5']);
 for(const e of scope.entries){const url=new URL(e.demoUrl);assert.equal(url.protocol,'https:');assert.equal(url.hostname,'eu-server.ssgportal.com');assert.equal(url.searchParams.get('GameName')!==null,true);}
 assert.equal(math.getGameDefinition('ind74_official_multihot5'),null);assert.equal(math.getGameDefinition('ind74_official_foxyhot20'),null);
});
for(const d of defs)test(d.catalogName+' official collection: 1–20 presets and arithmetic above 40000 ETB, settlement and privacy',()=>{
 for(const betMinor of ['100','200','2000','4000100']){
  const context=freshChargingContext(d,betMinor);
  let r=math.startRound({gameId:d.id,betMinor,context,rng:()=>0,now:100000});
  if(r.status==='active'&&d.family==='mines')r=math.advanceRound(r,{cell:d.cells-1},100000);
  if(r.status==='active')r=math.collectRound(r,{},101000);
  assert(['collected','lost'].includes(r.status));assert(BigInt(r.winMinor)<=BigInt(math.maximumPayoutMinor({gameId:d.id,betMinor,context})));
  assert.equal(math.publicRound(r,101000).private,undefined);assert.equal(r.betMinor,betMinor);
 }
 for(const betMinor of ['99','101','400001'])assert.throws(()=>math.startRound({gameId:d.id,betMinor}));
});
test('72 official-catalogue models settle through transactional fixture service with exact wallet/house conservation',async()=>{
 for(const d of defs){const repo=new MemoryRepository({houseBalanceMinor:'10000000000000000'});repo.addAccount(session,{balanceMinor:'10000000'});let time=1794355200000;const service=createGameService({repository:repo,math,rng:()=>0,clock:()=>new Date(time)});
  let r=await service.action(session,{request_id:crypto.randomUUID(),game_id:d.id,type:'play',stake_minor:'200'});
  if(r.round.status==='active'&&d.family==='mines')r=await service.action(session,{request_id:crypto.randomUUID(),game_id:d.id,type:'reveal',round_id:r.round.id,expected_version:r.round.version,options:{cell:d.cells-1}});
  if(r.round.status==='active'){time+=1000;r=await service.action(session,{request_id:crypto.randomUUID(),game_id:d.id,type:'collect',round_id:r.round.id,expected_version:r.round.version});}
  const paid=BigInt(r.receipt.payout_minor);assert.equal(r.wallet.balance_minor,String(10000000n-200n+paid));assert.equal(repo.snapshotHouse().balanceMinor,String(10000000000000000n+200n-paid));assert.equal(repo.snapshotHouse().liabilities.size,0);
 }
});
