import test from 'node:test';
import assert from 'node:assert/strict';
import {listGameDefinitions} from '../../math/requested72.mjs';
import {createRequestedGameService} from '../requested-service.mjs';
import {MemoryRepository} from './support/memory-repository.mjs';
const session='a'.repeat(64),uuid=()=>crypto.randomUUID();
const games=listGameDefinitions().filter(g=>g.family!=='lobby');
for(const bet of ['100','200','4000000'])test('requested 71 engines settle through transactional test ledger at '+bet+' minor units',async()=>{
 for(const g of games){
  const repo=new MemoryRepository({houseBalanceMinor:'100000000000000000'});repo.addAccount(session,{balanceMinor:'100000000'});
  let time=1794355200000;
  const service=createRequestedGameService({repository:repo,rng:()=>0,clock:()=>new Date(time)});
  const action={request_id:uuid(),game_id:g.id,type:'play',stake_minor:bet};
  let reply=await service.action(session,action);
  if(reply.round.status==='active'&&g.family==='mines')reply=await service.action(session,{request_id:uuid(),game_id:g.id,type:'reveal',round_id:reply.round.id,expected_version:reply.round.version,options:{cell:g.cells-1}});
  if(reply.round.status==='active'){
   if(g.family==='crash')time+=1000;
   reply=await service.action(session,{request_id:uuid(),game_id:g.id,type:'collect',round_id:reply.round.id,expected_version:reply.round.version});
  }
  assert(['lost','collected'].includes(reply.round.status),g.id);
  const returned=BigInt(reply.receipt.payout_minor);
  assert.equal(reply.wallet.balance_minor,String(100000000n-BigInt(bet)+returned),g.id);
  assert.equal(repo.snapshotHouse().balanceMinor,String(100000000000000000n+BigInt(bet)-returned),g.id);
  assert.equal(repo.snapshotHouse().liabilities.size,0,g.id);
  assert.equal(reply.round.private,undefined);
  const prior=repo.snapshot(session);const replay=await service.action(session,action);
  assert.equal(replay.replayed,true);assert.deepEqual(repo.snapshot(session).ledger,prior.ledger,g.id);
 }
});
test('requested table options and blackjack Hit/Stand pass only their own contracts',async()=>{
 const repo=new MemoryRepository();repo.addAccount(session,{balanceMinor:'1000000'});
 const service=createRequestedGameService({repository:repo,rng:()=>0});
 for(const [game,options] of [['americanroulette',{choice:'straight',number:37}],['sicbo',{choice:'face',number:1}],['baccarat',{choice:'banker'}],['keno',{numbers:[1,2,3,4,5]}]]){
  const r=await service.action(session,{request_id:uuid(),game_id:'ind74_'+game,type:'play',stake_minor:'200',options});assert(r.receipt);
 }
 let r=await service.action(session,{request_id:uuid(),game_id:'ind74_blackjack',type:'play',stake_minor:'100'});
 r=await service.action(session,{request_id:uuid(),game_id:'ind74_blackjack',type:'reveal',round_id:r.round.id,expected_version:r.round.version,options:{choice:'hit'}});
 assert.equal(r.round.outcome.player.length,3);assert.equal(r.round.outcome.dealer[1],null);
 await service.action(session,{request_id:uuid(),game_id:'ind74_blackjack',type:'collect',round_id:r.round.id,expected_version:r.round.version});
 const before=repo.snapshot(session);
 for(const options of [{numbers:[1,1]},{numbers:[1,41]},{numbers:[1,2,3,4,5,6]},{numbers:['1']},{number:Infinity},{choice:'arbitrary'}]){
  await assert.rejects(service.action(session,{request_id:uuid(),game_id:'ind74_keno',type:'play',stake_minor:'100',options}));
 }
 await assert.rejects(service.action(session,{request_id:uuid(),game_id:'ind74_multihot100',type:'play',stake_minor:'100',options:{choice:'banker'}}));
 for(const game of ['multihot5','foxyhot20','smartsoftspecialeditionlobby'])await assert.rejects(service.action(session,{request_id:uuid(),game_id:'ind74_'+game,type:'play',stake_minor:'100'}));
 assert.deepEqual(repo.snapshot(session).ledger,before.ledger);
});
