import assert from 'node:assert/strict';
import test from 'node:test';
import pinned from './verified-model.json' with {type:'json'};
import {validateHostModel} from './model.mjs';
import {createM100NativeFixture} from './test-support.mjs';
const published=()=>({...structuredClone(createM100NativeFixture().state.game),
 math:pinned.math.description,officialPrivateMathVerified:false,
 operatorWagerProfile:{id:'remaining20-etb1-40000-v1',currency:'ETB',
 stakeValues:[...pinned.stakeValues],stakeMinorValues:[...pinned.stakeMinorValues]}});
test('accept the exact deployed catalogue description without claiming server weight metadata',()=>{
 const model=published(),validated=validateHostModel(model);
 assert.equal(validated.math,pinned.math.description);
 assert.equal(typeof validated.math,'string');
 assert.equal(validated.version,pinned.version);
 const fixture=createM100NativeFixture({mutateModel:game=>Object.assign(game,published())});
 return fixture.make().connect().then(state=>{
  assert.equal(state.connected,true);assert.equal(state.canStart,true);
  assert.equal(fixture.posts,0);assert.equal(fixture.draws,0);
 });
});
test('published-wire compatibility still rejects changed descriptions, stakes and provider claims',()=>{
 for(const mutate of [
  g=>g.math+=' ',
  g=>g.officialPrivateMathVerified=true,
  g=>g.operatorWagerProfile.id='unapproved',
  g=>g.operatorWagerProfile.currency='DMO',
  g=>g.operatorWagerProfile.stakeValues=['0.01'],
  g=>g.paylinePaths[45]=[0,0,0,0,0],
  g=>g.paytable[0].counts[3].value=999,
  g=>g.id='multi_hot_100'
 ]){const game=published();mutate(game);assert.throws(()=>validateHostModel(game));}
});
test('structured compatibility retains its independently pinned distribution checks',()=>{
 const game=structuredClone(createM100NativeFixture().state.game);
 game.math.multiplierWeights=[1,1,1,1,1];
 assert.throws(()=>validateHostModel(game),/M100_EXISTING_MATH_INCOMPATIBLE/);
});
