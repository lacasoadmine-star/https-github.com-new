import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAudio } from './audio.mjs';

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
