import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAudio } from './audio.mjs';
import { Presentation } from './presentation.mjs';
import { portraitGeometry } from './portrait.mjs';

test('Sign in to ZPLAY opens only the existing Player login, preserving the game return path', async () => {
 const app = await readFile(new URL('./app.mjs', import.meta.url), 'utf8');
 assert.match(app, /signin=document\.querySelector\('#signin'\)/);
 assert.ok(app.includes("signin.href='/?login=1&return=%2Fzplay74%2Fmulti-hot-10%2F'"));
 assert.ok(app.includes("signin.textContent='Sign in to ZPLAY'"));
 assert.match(app, /await session\.connect\(\)/);
 assert.doesNotMatch(app, /\b(?:demoWallet|fakeBalance|mockAccount)\b/i);
});

test('audio stops on window blur or document hide and only resumes opted-in music on focus', async () => {
 const originals = { Audio: globalThis.Audio, fetch: globalThis.fetch, window: globalThis.window, document: globalThis.document };
 const voices = [];
 class FakeAudio {
  constructor(path) { this.path = path; this.playCount = 0; this.pauseCount = 0; this.playing = false; this.currentTime = 0; voices.push(this); }
  play() { this.playCount++; this.playing = true; return Promise.resolve(); }
  pause() { this.pauseCount++; this.playing = false; }
 }
 const fakeWindow = new EventTarget(), fakeDocument = new EventTarget();
 fakeDocument.hidden = false;
 globalThis.Audio = FakeAudio;
 globalThis.fetch = async () => ({ json: async () => ({ 'Background.mp3': 'background.mp3', 'Spin.mp3': 'spin.mp3' }) });
 globalThis.window = fakeWindow;
 globalThis.document = fakeDocument;
 let sound;
 try {
  sound = await createAudio();
  assert.equal(voices[0].playCount, 0, 'music must never autoplay before opt-in');
  sound.set(true, true);
  sound.play('Spin.mp3');
  assert.equal(voices.length, 2);
  assert.ok(voices.every(v => v.playing));
  fakeWindow.dispatchEvent(new Event('blur'));
  assert.ok(voices.every(v => !v.playing));
  sound.play('Spin.mp3');
  assert.equal(voices.length, 2, 'blurred tab must not create a new sound');
  fakeWindow.dispatchEvent(new Event('focus'));
  assert.equal(voices[0].playing, true, 'only opted-in background music may resume');
  assert.equal(voices[1].playing, false, 'old reel sounds must not restart');
  fakeDocument.hidden = true;
  fakeDocument.dispatchEvent(new Event('visibilitychange'));
  assert.equal(voices[0].playing, false);
  fakeDocument.hidden = false;
  fakeDocument.dispatchEvent(new Event('visibilitychange'));
  assert.equal(voices[0].playing, true);
  sound.set(false, false);
  assert.equal(voices[0].playing, false, 'opting out must immediately stop music');
  sound.destroy();
 } finally {
  sound?.destroy?.();
  for (const [name,value] of Object.entries(originals)) {
   if (value === undefined) delete globalThis[name];
   else globalThis[name] = value;
  }
 }
});

test('Samsung canvas touch targets remain at least 44 CSS px without covering SPIN or BET', () => {
 const overlap=(a,b)=>{
  const w=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]));
  const h=Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));
  return w*h;
 };
 for(const cssWidth of [320,360,390,412,600]){
  const height=844-26;
  const geometry=portraitGeometry(cssWidth,height);
  const areas=Presentation.prototype.hitAreas.call({geometry,model:{win:'0.00',gambleAvailable:false}});
  const scale=geometry.scale;
  for(const name of ['menu','sound','turbo']){
   const [x,y,w,h]=areas[name],orig=geometry.controls[name];
   assert.ok(w*scale>=43.99&&h*scale>=43.99,`${name} @ ${cssWidth}: must reach 44 CSS pixels`);
   assert.ok(x>=0&&y>=0&&x+w<=390+0.001&&y+h<=geometry.height+0.001,`${name} @ ${cssWidth}: stays inside viewport`);
   assert.ok(orig[0]+orig[2]/2>=x&&orig[0]+orig[2]/2<=x+w,`${name} @ ${cssWidth}: original graphic center stays clickable`);
   assert.ok(orig[1]+orig[3]/2>=y&&orig[1]+orig[3]/2<=y+h,`${name} @ ${cssWidth}: original graphic center y stays clickable`);
  }
  assert.equal(overlap(areas.turbo,areas.spin),0,`TURBO must not overlap SPIN at ${cssWidth}`);
  assert.equal(overlap(areas.turbo,areas.bet),0,`TURBO must not overlap BET at ${cssWidth}`);
  assert.deepEqual(areas.spin,geometry.controls.spin,'Do not change the SPIN wager area');
  assert.deepEqual(areas.bet,geometry.controls.bet,'Do not change the BET area');
 }
});
test('canvas sprites retain official-size artwork while hit regions are expanded',async()=>{
 const file=await readFile(new URL('./presentation.mjs',import.meta.url),'utf8');
 assert.ok(file.includes("g.controls[name]:r"),'Original icon artwork must be drawn at its own original size');
 assert.match(file,/this\.geometry\.scale/,'minimum target size must respond to viewport scaling');
});
