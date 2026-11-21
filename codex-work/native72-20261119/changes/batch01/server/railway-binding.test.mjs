import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createNative72Batch01Binding,RELEASE} from './railway-binding.mjs';
import {asETB} from './official-math.mjs';

const uid='qa-player',token='b'.repeat(64),hash=s=>createHash('sha256').update(s).digest('hex');
const guard=hash('fresh-account-session-v1\0'+uid+'\0'+token);
const request=new Request('https://qa.invalid/api/slots/fresh-state',{headers:{cookie:'sw_session='+token}});
function dependencies(){
  const original={id:'multi_hot_5_native',enabled:true};let moves=0;
  const source=[original,{id:'fresh_multihot10',betLevels:['0.10','0.20','0.50','1.00','2.00','200.00']},
    {id:'fresh_multihot20',betLevels:[],freshReleaseReady:true},
    {id:'fresh_multihot5burnwilds',betLevels:[],freshReleaseReady:true}];
  const client={query:async()=>({rowCount:0,rows:[]})};
  return {original,source,moves:()=>moves,existing:{
    authenticate:async()=>uid,hash,cash:asETB,publicGames:()=>source,accepting:()=>true,
    transaction:async fn=>fn(client),lockWallets:async()=>[{id:uid,balance:'10000'},{id:'house',balance:'100000000'}],
    move:async()=>{moves++},balance:async()=>10000n,houseFor:()=> 'house'}};
}
test('binding keeps both independently designed games closed despite old catalogue/engine flags',async()=>{
  const d=dependencies(),binding=await createNative72Batch01Binding(d.existing);
  assert.equal(binding.releaseInfo().release,RELEASE);assert.equal(binding.releaseInfo().realMoneyEnabled,false);
  const games=binding.publicGames();assert.equal(games[0],d.original);
  for(const id of ['fresh_multihot20','fresh_multihot5burnwilds']){
    const game=games.find(g=>g.id===id);assert.equal(game.enabled,false);assert.equal(game.freshReleaseReady,false);
    assert.deepEqual(game.betLevels,['1.00','2.00','200.00']);
    const state=await binding.state(request,id);assert.equal(state.sessionGuard,guard);assert.equal(state.game.enabled,false);
    assert.equal(state.game.providerRngReproduced,false);assert.equal(state.game.features.gambleRounds,5);
    await assert.rejects(binding.spin(request,{gameId:id,bet:'1.00',roundToken:crypto.randomUUID(),sessionGuard:guard,
      mathVersion:game.mathVersion,engineVersion:game.engineVersion,mathSha256:game.mathSha256}),/UNCERTIFIED_MATH_PROFILE/);
  }
  assert.equal(d.moves(),0);assert.deepEqual(d.source[2].betLevels,[]);
});
test('binding rejects anonymous requests before any database access',async()=>{
  const d=dependencies();let reads=0;d.existing.authenticate=async()=>{throw Object.assign(Error('PLAYER_LOGIN_REQUIRED'),{status:401})};
  d.existing.transaction=async()=>{reads++;throw Error('UNEXPECTED_DB')};
  const binding=await createNative72Batch01Binding(d.existing);
  await assert.rejects(binding.state(request,'fresh_multihot20'),/PLAYER_LOGIN_REQUIRED/);assert.equal(reads,0);
});
test('binding fails closed if no trusted existing ETB ladder is configured',async()=>{
  const d=dependencies();d.existing.publicGames=()=>d.source.filter(g=>g.id!=='fresh_multihot10');
  const binding=await createNative72Batch01Binding(d.existing);assert.throws(()=>binding.publicGames(),/EXISTING_BET_LADDER_UNAVAILABLE/);
});
