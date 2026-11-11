import test from 'node:test';
import assert from 'node:assert/strict';
import {MachineAudio,machineAudioCues} from '../client/machine74-audio.mjs';

class Param {
  constructor(){this.values=[];}
  setValueAtTime(value,at){this.values.push({method:'set',value,at});}
  exponentialRampToValueAtTime(value,at){this.values.push({method:'ramp',value,at});}
  cancelScheduledValues(at){this.values.push({method:'cancel',at});}
  setTargetAtTime(value,at,time){this.values.push({method:'target',value,at,time});}
}
class Gain {
  constructor(){this.gain=new Param();this.connected=false;}
  connect(){this.connected=true;}
  disconnect(){this.connected=false;}
}
class Oscillator {
  constructor(){this.frequency=new Param();this.starts=[];this.stops=[];}
  connect(){}
  disconnect(){this.disconnected=true;}
  start(at){this.starts.push(at);}
  stop(at){this.stops.push(at);if(at===undefined)this.onended?.();}
}
class Context {
  static created=0;
  constructor(){Context.created++;this.state='suspended';this.currentTime=10;this.destination={};this.oscillators=[];}
  createGain(){return new Gain();}
  createOscillator(){const oscillator=new Oscillator();this.oscillators.push(oscillator);return oscillator;}
  async resume(){this.state='running';}
  async close(){this.state='closed';}
}

test('audio needs explicit unlock and remains silent while muted', async () => {
  Context.created=0;
  const audio=new MachineAudio({AudioContext:Context});
  assert.equal(Context.created,0);audio.cue('spin');assert.equal(Context.created,0);
  assert.equal(await audio.unlock(),true);assert.equal(Context.created,1);
  audio.cue('spin');audio.startSpin();assert.equal(audio.context.oscillators.length,0);assert.equal(audio.loop,null);
  audio.setMuted(false);audio.cue('reelStop');assert.equal(audio.context.oscillators.length,2);
  assert.ok(audio.context.oscillators.every(oscillator=>oscillator.starts.length===1&&oscillator.stops.length===1));
  audio.dispose();assert.equal(audio.context.state,'closed');
});

test('volume clamps and muting immediately stops loop and active voices', async () => {
  const audio=new MachineAudio({AudioContext:Context,muted:false});await audio.unlock();
  assert.equal(audio.setVolume(3),1);assert.equal(audio.setVolume(-5),0);assert.equal(audio.setVolume(.6),.6);
  assert.equal(audio.setVolume(NaN),.6);
  audio.startSpin();assert.notEqual(audio.loop,null);assert.ok(audio.voices.size>0);
  audio.setMuted(true);assert.equal(audio.loop,null);assert.equal(audio.voices.size,0);
  assert.equal(audio.master.gain.values.at(-1).value,0);
  audio.dispose();assert.equal(await audio.unlock(),false);
});

test('all required presentation cues exist and simultaneous synthesized voices are bounded', async () => {
  for(const cue of ['spin','reelStop','wheelTick','wheelStop','multiplier','smallWin','mediumWin','bigWin','megaWin','bonus','error'])assert.ok(machineAudioCues.includes(cue));
  const audio=new MachineAudio({AudioContext:Context,muted:false});await audio.unlock();
  for(let i=0;i<30;i++)audio.cue('megaWin');
  assert.equal(audio.voices.size,32);assert.equal(audio.context.oscillators.length,32);
  audio.stop();assert.equal(audio.voices.size,0);
  audio.cue('win');assert.equal(audio.voices.size,3);
  audio.dispose();audio.dispose();assert.equal(audio.loop,null);assert.equal(audio.voices.size,0);
});

test('unavailable browser audio fails gracefully without outcome or timer side effects', async () => {
  const audio=new MachineAudio();audio.Context=null;
  assert.equal(await audio.unlock(),false);audio.setMuted(false);audio.startSpin();audio.cue('error');
  assert.equal(audio.loop,null);assert.equal(audio.voices.size,0);audio.dispose();
});
