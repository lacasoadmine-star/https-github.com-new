import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

// Exercise the actual per-game NativeAudio implementation, not a replacement
// test double of the production logic. Only Audio and DOM event objects are faked.
const games=['multihot100','multihot5wild','multihot5deluxe','multihot5superwilds','multihotwildways'];

class FakeAudio {
 constructor(url){this.url=url;this.playing=false;this.playCount=0;this.pauseCount=0;this.currentTime=0;}
 play(){this.playCount++;this.playing=true;return Promise.resolve();}
 pause(){this.pauseCount++;this.playing=false;}
}

class Target extends EventTarget {
 constructor(){super();this.listeners=new Map();}
 addEventListener(type,fn,opt){super.addEventListener(type,fn,opt);this.listeners.set(type,(this.listeners.get(type)||0)+1);}
 removeEventListener(type,fn,opt){super.removeEventListener(type,fn,opt);this.listeners.set(type,(this.listeners.get(type)||0)-1);}
}

for(const game of games){
 test(game+' audio: blur immediately stops all loops/effects, focus restores opted-in music only',async()=>{
  const source=await readFile(new URL('./'+game+'/game.mjs',import.meta.url),'utf8');
  const begin=source.indexOf('class NativeAudio {');
  const end=source.indexOf('\n}\n',begin);
  assert.ok(begin>0&&end>begin,'real NativeAudio class present');
  const NativeAudio=runInNewContext('('+source.slice(begin,end+2)+')',{URL,Promise});
  const doc=new Target();doc.hidden=false;
  const win=new Target();
  const voices=[];
  const audio=new NativeAudio('https://example.invalid/sounds/',{'background':'bg.mp3','spin':'spin.mp3'},{
   createAudio:url=>{const a=new FakeAudio(url);voices.push(a);return a;},doc,win
  });
  assert.equal(audio.play('background',{loop:true,music:true,volume:.25}),true);
  assert.equal(audio.play('spin',{volume:.8}),true);
  await Promise.resolve();
  assert.equal(voices.length,2);
  assert.ok(voices.every(a=>a.playing));
  win.dispatchEvent(new Event('blur'));
  assert.equal(audio.focused,false);
  assert.ok(voices.every(a=>!a.playing),'no sound on blur');
  assert.equal(audio.play('spin'),false,'a blurred game cannot play a new effect');
  win.dispatchEvent(new Event('focus'));
  await Promise.resolve();
  assert.equal(audio.focused,true);
  assert.equal(voices.length,3,'only opted-in music restarts');
  assert.equal(voices[2].playing,true);
  assert.equal(voices[1].playing,false,'stale spin effect must not restart');
  doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(voices[2].playing,false);
  doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve();
  assert.equal(voices.length,4,'foreground music restores once');
  audio.setMusic(false);
  assert.equal(voices[3].playing,false);
  win.dispatchEvent(new Event('blur'));win.dispatchEvent(new Event('focus'));
  assert.equal(voices.length,4,'disabled music does not auto-restart');
  audio.destroy();
  for(const name of ['blur','focus','pagehide','pageshow'])assert.equal(win.listeners.get(name),0,name+' listener released');
  assert.equal(doc.listeners.get('visibilitychange'),0,'visibility listener released');
 });
}
