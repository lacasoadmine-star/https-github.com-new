import test from 'node:test';
import assert from 'node:assert/strict';
import {BurnWildsNativeAudio} from './native-audio.mjs';
const origin='https://superwin-player.apdiy61.workers.dev/';
const sources={
  spin:origin+'new-games90/media/burn-wilds/spin.ogg',
  win:origin+'new-games90/media/burn-wilds/win.mp3'
};
function instance(){
  const clips=[];
  const makeAudio=url=>{
    const clip={url,volume:0,currentTime:0,playing:false,
      pause(){this.playing=false;},
      async play(){this.playing=true;},
      addEventListener(){},removeEventListener(){}};
    clips.push(clip);return clip;
  };
  const audio=new BurnWildsNativeAudio({sources,origin,makeAudio,volume:.5});
  return {audio,clips};
}
test('accepts only licensed same-origin game-specific sound path',()=>{
  assert.throws(()=>new BurnWildsNativeAudio({sources:{spin:'https://example.com/spin.mp3'},origin,makeAudio:()=>({})}),/BURN_AUDIO_MANIFEST_INVALID/);
  assert.throws(()=>new BurnWildsNativeAudio({sources,origin:'http://insecure/',makeAudio:()=>({})}),/BURN_AUDIO_ORIGIN_INVALID/);
});
test('starts muted, and refuses to play without a user sound opt-in',async()=>{
  const {audio,clips}=instance();
  assert.equal(await audio.play('spin','round-1'),false);
  assert.equal(clips.length,0);
});
test('each reel/win event plays once per round token, never double',async()=>{
  const {audio,clips}=instance();audio.setMuted(false);
  assert.equal(await audio.play('spin','round-1'),true);
  assert.equal(await audio.play('spin','round-1'),false);
  assert.equal(await audio.play('spin','round-2'),true);
  assert.equal(clips.length,2);assert.equal(clips[0].volume,.5);
});
test('an unknown or unlicensed sound name is silent',async()=>{
  const {audio,clips}=instance();audio.setMuted(false);
  assert.equal(await audio.play('provider-inferred-bonus','round-1'),false);
  assert.equal(clips.length,0);
});
test('mute pauses active sound and volume changes are bounded',async()=>{
  const {audio,clips}=instance();audio.setMuted(false);
  await audio.play('win','round-3');
  audio.setVolume(.2);assert.equal(clips[0].volume,.2);
  audio.setMuted(true);assert.equal(clips[0].playing,false);
  assert.throws(()=>audio.setVolume(2),/BURN_AUDIO_VOLUME_INVALID/);
});
test('disposed audio releases sources, stops live playback and refuses restart',async()=>{
  const {audio,clips}=instance();audio.setMuted(false);
  await audio.play('win','round-4');audio.dispose();
  assert.equal(clips[0].playing,false);
  assert.equal(await audio.play('win','round-4'),false);
  assert.throws(()=>audio.setMuted(false),/BURN_AUDIO_DISPOSED/);
});
