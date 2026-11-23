import test from 'node:test';
import assert from 'node:assert/strict';
import { SuperWildsAudio } from './audio.mjs';

function device({resume}={}) {
  const oscillators=[];
  const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const context={destination:{},currentTime:0,resumes:0,suspends:0,closes:0,
    async resume(){this.resumes++;if(resume)await resume();},async suspend(){this.suspends++;},close(){this.closes++;},
    createGain(){return{gain:parameter(),connect(){},disconnect(){}};},
    createOscillator(){const o={frequency:parameter(),starts:[],stops:[],connect(){},disconnect(){},
      start(time){this.starts.push(time);},stop(time){this.stops.push(time);}};oscillators.push(o);return o;},
  };
  const audio=new SuperWildsAudio({audioFactory:()=>context});return{audio,context,oscillators};
}

test('repeated gestures create one ambient voice and accepted reel replay cannot duplicate its sound',async()=>{
  const{audio,oscillators}=device();await audio.unlock();await audio.unlock();
  assert.equal(oscillators.length,1);
  const event={type:'reel-stop',roundId:'accepted-round',column:0};
  assert.equal(audio.handle(event),true);assert.equal(audio.handle({...event}),false);
  assert.equal(audio.handle({...event,column:1}),true);assert.equal(oscillators.length,3);
  audio.setting({effects:false,music:false});
  assert.equal(audio.handle({...event,column:2}),false);assert.equal(audio.ambient,null);assert.equal(audio.voices.size,0);
  assert.ok(oscillators.every(o=>o.stops.length>0));audio.dispose();
});

test('accepted reel, wheel and win audio follows the displayed animation exactly once',async()=>{
  const{audio,oscillators}=device();await audio.unlock();
  const events=[{type:'spin',requestKey:'accepted-key'},
    ...Array.from({length:5},(_,column)=>({type:'reel-stop',roundId:'accepted',column})),
    {type:'wheel-start',roundId:'accepted'}, {type:'wheel-stop',roundId:'accepted'},
    {type:'win',roundId:'accepted',winMinor:5000,betMinor:100}];
  for(const e of events)assert.equal(audio.handle(e),true,JSON.stringify(e));
  for(const e of events)assert.equal(audio.handle(e),false,'repeated same animation event must not play twice');
  assert.equal(oscillators.length,events.length+1,'one ambience + one voice per accepted transition');
  audio.dispose();
});
test('leaving the page prevents queued effects; the next gesture resumes fresh audio without old voices',async()=>{
  const{audio,context,oscillators}=device();await audio.unlock();audio.once('spin','first-action');
  await audio.suspend();const stoppedCount=oscillators.length;
  assert.equal(audio.once('button','hidden-action'),false);assert.equal(oscillators.length,stoppedCount);
  assert.equal(audio.voices.size,0);assert.equal(context.suspends,1);
  assert.equal(await audio.unlock(),true);assert.equal(audio.once('spin','second-action'),true);
  assert.equal(context.resumes,2);assert.equal(audio.voices.size,1);audio.dispose();
});

test('a delayed resume after a page suspension or disposal cannot recreate ambient sound',async()=>{
  for(const ending of ['suspend','dispose']){
    let finish;const{audio,oscillators}=device({resume:()=>new Promise(resolve=>{finish=resolve;})});
    const unlocking=audio.unlock();await audio[ending]();finish();
    assert.equal(await unlocking,false);assert.equal(audio.ambient,null);assert.equal(oscillators.length,0);
    assert.equal(audio.once('win','stale-event'),false);
  }
});

test('new SPIN sound follows its request key even while the preceding accepted round is still displayed',async()=>{
  const{audio,oscillators}=device();await audio.unlock();
  const event={type:'spin',roundId:'prior-visible-round',requestKey:'new-action-1'};
  assert.equal(audio.handle(event),true);assert.equal(audio.handle({...event}),false);
  assert.equal(audio.handle({...event,requestKey:'new-action-2'}),true);
  assert.equal(oscillators.length,3);audio.dispose();
});
