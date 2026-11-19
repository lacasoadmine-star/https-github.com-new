import test from 'node:test';
import assert from 'node:assert/strict';
import {createForegroundAudio} from './foreground-audio.mjs';

function emitter() {
  const handlers = new Map();
  return {
    hidden:false,
    hasFocus:()=>true,
    addEventListener(name,fn){if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(fn);},
    removeEventListener(name,fn){handlers.get(name)?.delete(fn);},
    fire(name){for(const fn of handlers.get(name)||[])fn();},
    count(name){return handlers.get(name)?.size||0}
  };
}

test('foreground sound cues stop during blur/hide/pagehide and resume with previous settings',()=>{
  const win=emitter(),doc=emitter(),played=[],states=[];
  const settings={effects:true,music:true};
  const gate=createForegroundAudio({win,doc,settings:()=>settings,
    onAudio:value=>states.push(value),onSoundCue:(name)=>played.push(name)});
  gate.cue('spin',{});assert.deepEqual(played,['spin']);
  win.fire('blur');gate.cue('reel-stop',{});assert.deepEqual(played,['spin']);
  assert.deepEqual(states.at(-1),{effects:false,music:false});
  win.fire('focus');gate.cue('win',{});assert.deepEqual(played,['spin','win']);
  doc.hidden=true;doc.fire('visibilitychange');gate.cue('spin',{});assert.deepEqual(played,['spin','win']);
  doc.hidden=false;doc.fire('visibilitychange');
  settings.effects=false;gate.settingsChanged();gate.cue('spin',{});
  assert.deepEqual(states.at(-1),{effects:false,music:true});
  assert.deepEqual(played,['spin','win']);
  win.fire('pagehide');assert.deepEqual(states.at(-1),{effects:false,music:false});
  win.fire('pageshow');assert.deepEqual(states.at(-1),{effects:false,music:true});
  gate.dispose();assert.deepEqual(states.at(-1),{effects:false,music:false});
  assert.equal(win.count('focus'),0);assert.equal(doc.count('visibilitychange'),0);
});
