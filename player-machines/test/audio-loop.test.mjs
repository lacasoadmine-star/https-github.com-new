import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {overlapLoop,seamlessBuffer} from '../public/audio-loop.mjs';
import {audioSamples} from '../public/audio-samples.mjs';
import {sampleRate,mp3Sha256,pcmBase64} from './reel-loop-pcm.mjs';

const pcmBytes=Buffer.from(pcmBase64,'base64'),pcm=new Float32Array(pcmBytes.buffer.slice(pcmBytes.byteOffset,pcmBytes.byteOffset+pcmBytes.byteLength));
const rms=values=>Math.sqrt(values.reduce((sum,value)=>sum+value*value,0)/values.length);
function minimumSeamRms(data){const radius=Math.round(sampleRate*.03),width=Math.round(sampleRate*.005),seam=Float32Array.from([...data.slice(-radius),...data.slice(0,radius)]);let minimum=Infinity;for(let i=0;i<=seam.length-width;i++)minimum=Math.min(minimum,rms(seam.subarray(i,i+width)));return minimum;}
test('actual cabinet sample loops without its recurring fade-to-silence trough',()=>{
 assert.equal(createHash('sha256').update(Buffer.from(audioSamples['reel-loop'],'base64')).digest('hex'),mp3Sha256);
 const before=Float32Array.from(pcm),[loop]=overlapLoop([pcm],sampleRate),oldMinimum=minimumSeamRms(pcm),newMinimum=minimumSeamRms(loop);
 assert.ok(newMinimum>oldMinimum*5,'the wrapped 5 ms volume trough should improve at least fivefold');assert.ok(rms(loop)/rms(pcm)>.9&&rms(loop)/rms(pcm)<1.1,'keep the original clip level');assert.deepEqual(pcm,before,'preserve the source samples');
 const overlap=Math.round(sampleRate*.035);assert.equal(loop.length,pcm.length-overlap);assert.equal(loop[0],pcm[overlap]);assert.ok(Math.abs(loop.at(-1)-pcm[overlap-1])<1e-7,'seam follows adjacent original PCM samples');
 for(let i=0;i<pcm.length-overlap*2;i++)assert.equal(loop[i],pcm[i+overlap],'retain the middle of the recorded clip exactly');
});
test('both channels keep their own recorded data and native sample rate',()=>{
 const left=Float32Array.from({length:1000},(_,i)=>Math.sin(i*.3)),right=Float32Array.from(left,value=>value*.3),input={length:1000,numberOfChannels:2,sampleRate:8000,getChannelData:i=>[left,right][i]};let result;
 const context={createBuffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));return result={numberOfChannels:channels,length,sampleRate:rate,getChannelData:i=>data[i]};}};
 assert.equal(seamlessBuffer(context,input),result);assert.equal(result.sampleRate,8000);assert.equal(result.numberOfChannels,2);for(let i=0;i<result.length;i++)assert.ok(Math.abs(result.getChannelData(0)[i]*.3-result.getChannelData(1)[i])<1e-7);
});
test('buffers too short to crossfade remain valid',()=>{
 const source=new Float32Array([.1,.2,.3]);assert.deepEqual(overlapLoop([source],8000)[0],source);assert.equal(seamlessBuffer({},{}).constructor,Object);
});
