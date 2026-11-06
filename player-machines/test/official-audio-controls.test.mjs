import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundEngine} from '../public/audio.mjs';
import {createGambleAudio} from '../public/official-gamble-audio.mjs';
import {createOfficialAudioControls} from '../public/official-audio-controls.mjs';

const parameter = () => ({value: 0, setTargetAtTime(value) { this.value = value; }, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime(value) { this.value = value; }, exponentialRampToValueAtTime(value) { this.value = value; }});
class AudioNode {
  constructor() { this.gain = parameter(); this.frequency = parameter(); this.threshold = parameter(); this.ratio = parameter(); }
  connect(target) { this.target = target; return target; }
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop() { this.stopped = true; this.onended?.(); }
}
class AudioContext {
  constructor() { this.state = 'running'; this.currentTime = 1; this.destination = new AudioNode(); }
  createGain() { return new AudioNode(); }
  createDynamicsCompressor() { return new AudioNode(); }
  createBufferSource() { return new AudioNode(); }
  createOscillator() { return new AudioNode(); }
  async decodeAudioData() { return {duration: 1}; }
  async close() { this.state = 'closed'; }
}
const memory = entries => { const values = new Map(Object.entries(entries || {})); return {values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)}; };
const prepare = async gameId => {
  const audio = new SoundEngine(261.63, gameId);
  // Decoding is separately covered in the engine tests; these tests exercise
  // the real playback graph and lifecycle with deterministic decoded buffers.
  audio.preload = async () => false; audio.preloadBackground = async () => false;
  await audio.unlock(); audio.samples.set('tap', {duration: 1});
  audio.backgroundBuffer = {duration: 20}; audio.backgroundGain = .3;
  return audio;
};

test('native music switch stops only the bed; Effects mutes all real playback nodes and restores both', async () => {
  const original = globalThis.AudioContext; globalThis.AudioContext = AudioContext;
  try {
    for (const gameId of ['multi_hot_5_video', 'hot_foxy_20']) {
      const audio = await prepare(gameId), storage = memory({'zplay:sound-choice': 'yes'});
      const controls = createOfficialAudioControls({gameId, audio, storage});
      audio.event('tap');
      const gamble = createGambleAudio(gameId, audio);
      assert.equal(await gamble.prepare(), true); assert.equal(await gamble.play('take'), true);
      const take = [...audio.nodes].find(node => node.group === 'gamble-take');
      assert.ok(take); assert.equal(take.gain.target, audio.master);
      const background = [...audio.nodes].find(node => node.group === 'background');
      const effect = [...audio.nodes].find(node => node.group === 'effect');
      assert.ok(background && effect); assert.equal(effect.gain.target, audio.master);
      await controls.setMusic(false);
      assert.equal(background.osc.stopped, true); assert.equal(audio.nodes.has(effect), true); assert.equal(audio.nodes.has(take), true);
      assert.equal(audio.muted, false); assert.equal(storage.getItem('zplay:sound-choice'), 'yes');
      await controls.setEffects(false);
      assert.equal(effect.osc.stopped, true); assert.equal(take.osc.stopped, true); assert.equal(audio.nodes.size, 0);
      audio.event('tap'); assert.equal(audio.nodes.size, 0);
      await controls.setMusic(true);
      assert.deepEqual(controls.getState(), {effectsEnabled: false, musicEnabled: true});
      assert.equal(audio.nodes.size, 0); assert.equal(audio.backgroundEnabled, false);
      assert.equal(storage.getItem('zplay:sound-choice'), 'no');
      await controls.setEffects(true);
      assert.deepEqual(controls.getState(), {effectsEnabled: true, musicEnabled: true});
      assert.ok([...audio.nodes].some(node => node.group === 'background'));
      audio.event('tap'); assert.ok([...audio.nodes].some(node => node.group === 'effect'));
      gamble.dispose(); controls.dispose(); await audio.dispose(); assert.equal(audio.nodes.size, 0);
    }
  } finally { globalThis.AudioContext = original; }
});

test('native music preference survives reload and local stop while old consent stays compatible', async () => {
  const original = globalThis.AudioContext; globalThis.AudioContext = AudioContext;
  try {
    const storage = memory({'zplay:sound-choice': 'yes'}), audio = await prepare('hot_foxy_20');
    const controls = createOfficialAudioControls({gameId: 'hot_foxy_20', audio, storage});
    await controls.setMusic(false); controls.dispose(); await audio.dispose();
    const next = await prepare('multi_hot_5_video');
    const restored = createOfficialAudioControls({gameId: 'multi_hot_5_video', audio: next, storage});
    assert.deepEqual(restored.getState(), {effectsEnabled: true, musicEnabled: false});
    next.event('tap'); assert.equal(next.nodes.size, 1);
    await restored.setMusic(true); next.context.currentTime += 3; next.stop();
    assert.equal(next.nodes.size, 0); restored.restore();
    assert.equal([...next.nodes].find(node => node.group === 'background').offset, 3);
    restored.dispose(); await next.dispose();
  } finally { globalThis.AudioContext = original; }
});

test('music needs explicit consent, honors master mute, tolerates denied storage and leaves other games unchanged', async () => {
  const original = globalThis.AudioContext; globalThis.AudioContext = AudioContext;
  try {
    for (const storage of [memory(), memory({'zplay:sound-choice': 'no'}), {getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); }}]) {
      const audio = await prepare('multi_hot_5_video');
      const controls = createOfficialAudioControls({gameId: 'multi_hot_5_video', audio, storage});
      assert.equal(audio.backgroundEnabled, false); assert.equal(audio.nodes.size, 0);
      const wasMuted = audio.muted; await controls.setMusic(true);
      assert.equal(audio.backgroundEnabled, !wasMuted);
      assert.equal(audio.nodes.size, wasMuted ? 0 : 1);
      assert.equal(audio.muted, wasMuted, 'music must never override the master switch');
      await controls.setEffects(true); assert.ok(audio.nodes.size > 0);
      controls.dispose(); await audio.dispose();
    }
    for (const gameId of ['multi_hot_100', 'wild_multi_stars']) {
      const audio = await prepare(gameId), storage = memory({'zplay:sound-choice': 'no'});
      assert.equal(createOfficialAudioControls({gameId, audio, storage}), null);
      assert.equal(audio.muted, false); assert.equal(storage.values.size, 1); await audio.dispose();
    }
  } finally { globalThis.AudioContext = original; }
});
