import test from 'node:test';
import assert from 'node:assert/strict';
import {BurnWildsAudio} from './audio.mjs';

function factory(){
  const voices=[],ctx={currentTime:1,destination:{},resume:async()=>{},suspend:async()=>{},close:()=>{}};
  ctx.createOscillator=()=>{const o={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
    connect(){},disconnect(){},start(){voices.push(o)},stop(){},onended:null};return o;};
  ctx.createGain=()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}});
  return {ctx,voices};
}
test('opt-in and mute are enforced for all Burn Wilds cues',async()=>{
  const{ctx,voices}=factory(),audio=new BurnWildsAudio({audioFactory:()=>ctx});
  assert.equal(audio.event('spin',{requestKey:'a'}),false);
  await audio.unlock();assert.equal(audio.event('spin',{requestKey:'a'}),false);
  audio.setPreferences({effects:true,music:false});
  assert.equal(audio.event('spin',{requestKey:'a'}),true);
  assert.equal(audio.event('spin',{requestKey:'a'}),false);
  assert.equal(voices.length,1);
  audio.setPreferences({effects:false,music:false});
  assert.equal(audio.event('burn-start',{roundId:'r',column:1}),false);
  audio.dispose();
  assert.equal(audio.event('spin',{requestKey:'b'}),false);
});
test('own burn cues are distinct, including each expanded reel and final settlement',async()=>{
  const{ctx,voices}=factory(),audio=new BurnWildsAudio({audioFactory:()=>ctx});
  audio.setPreferences({effects:true,music:false});await audio.unlock();
  for(const [type,column] of [['spin',undefined],['original-grid',undefined],['burn-start',1],['burn-start',2],
    ['column-expanded',1],['column-expanded',2],['settled',undefined]]){
    assert.equal(audio.event(type,{roundId:'r-1',requestKey:'key',column}),true);
  }
  assert.equal(voices.length,7);
  assert.equal(audio.event('column-expanded',{roundId:'r-1',column:1}),false);
  audio.dispose();
});
test('sound ambience starts only after opt-in and is stopped on pause and dispose',async()=>{
  const{ctx,voices}=factory(),audio=new BurnWildsAudio({audioFactory:()=>ctx});
  await audio.unlock();assert.equal(voices.length,0);
  audio.setPreferences({effects:false,music:true});assert.equal(voices.length,1);
  audio.setPreferences({effects:false,music:true});assert.equal(voices.length,1);
  await audio.pause();assert.equal(audio.unlocked,false);
  audio.dispose();assert.equal(audio.ambience,null);
});
