import test from 'node:test';
import assert from 'node:assert/strict';
import { RollXAudio, SOUND_EVENTS } from '../audio.mjs';

function audioEnvironment() {
  const created = [], gains = [];
  const parameter = () => ({ values: [], setValueAtTime(...value) { this.values.push(value); },
    exponentialRampToValueAtTime(...value) { this.values.push(value); } });
  const context = {
    state: 'suspended', currentTime: 4, destination: {}, resumes: 0, suspends: 0, closes: 0,
    async resume() { this.resumes++; this.state = 'running'; },
    async suspend() { this.suspends++; this.state = 'suspended'; },
    async close() { this.closes++; this.state = 'closed'; },
    createOscillator() {
      const node = { frequency: parameter(), connections: [], stops: [], disconnects: 0,
        connect(to) { this.connections.push(to); }, disconnect() { this.disconnects++; },
        start(at) { this.started = at; }, stop(at) { this.stops.push(at); } };
      created.push(node); return node;
    },
    createGain() {
      const node = { gain: parameter(), disconnects: 0, connect() {}, disconnect() { this.disconnects++; } };
      gains.push(node); return node;
    },
  };
  let factoryCalls = 0;
  const audio = new RollXAudio({ contextFactory: () => { factoryCalls++; return context; } });
  return { audio, context, created, gains, factoryCalls: () => factoryCalls };
}

test('audio requires gesture unlock and maps each named event to bounded procedural cues', async () => {
  const env = audioEnvironment();
  assert.equal(env.audio.emit('spin'), false); assert.equal(env.factoryCalls(), 0);
  assert.equal(await env.audio.unlock(), true); assert.equal(env.context.resumes, 1);
  for (const [event, cues] of Object.entries(SOUND_EVENTS)) {
    const before = env.created.length;
    assert.equal(env.audio.emit(event), true);
    assert.equal(env.created.length - before, cues.length);
  }
  assert.equal(env.audio.emit('invented-bonus'), false);
  assert(env.created.every(node => Number.isFinite(node.started) && node.stops[0] > node.started && node.stops[0] - node.started < 1));
  env.audio.dispose();
});

test('mute cuts all active and scheduled tones without creating overlapping replacement music', async () => {
  const env = audioEnvironment(); await env.audio.unlock(); env.audio.emit('win');
  assert.equal(env.audio.nodes.size, 3);
  env.audio.setMuted(true);
  assert.equal(env.audio.nodes.size, 0);
  assert(env.created.every(node => node.stops.length === 2 && node.disconnects === 1 && node.onended === null));
  assert(env.gains.every(node => node.disconnects === 1));
  assert.equal(env.audio.emit('win'), false);
  env.audio.setMuted(false); assert.equal(env.audio.emit('button'), true);
  env.audio.dispose();
});

test('tab hide suspends sound and resume waits for a new user gesture', async () => {
  const env = audioEnvironment(); await env.audio.unlock(); env.audio.emit('spin');
  env.audio.setHidden(true);
  assert.equal(env.context.suspends, 1); assert.equal(env.audio.nodes.size, 0);
  assert.equal(await env.audio.unlock(), false);
  env.audio.setHidden(false);
  assert.equal(env.audio.emit('button'), false);
  assert.equal(env.context.resumes, 1);
  await env.audio.unlock(); assert.equal(env.context.resumes, 2);
  assert.equal(env.audio.emit('button'), true);
  env.audio.dispose();
});

test('ended nodes detach themselves and repeated disposal closes the owned context once', async () => {
  const env = audioEnvironment(); await env.audio.unlock(); env.audio.emit('button');
  env.created[0].onended();
  assert.equal(env.audio.nodes.size, 0); assert.equal(env.created[0].disconnects, 1);
  env.audio.emit('win'); env.audio.dispose(); env.audio.dispose();
  assert.equal(env.context.closes, 1); assert.equal(env.audio.context, null);
  assert.equal(env.audio.nodes.size, 0); assert.equal(env.audio.emit('button'), false);
  assert.equal(await env.audio.unlock(), false); assert.equal(env.factoryCalls(), 1);
});

test('unavailable audio remains a silent presentation failure, without new objects or timer loops', async () => {
  const audio = new RollXAudio({ contextFactory: () => null });
  assert.equal(await audio.unlock(), false); assert.equal(audio.emit('win'), false);
  audio.setHidden(true); audio.setMuted(true); audio.dispose();
  assert.equal(audio.nodes.size, 0);
});
