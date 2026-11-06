import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assets} from '../public/official-startup-assets.mjs';
import {createOfficialStartup,startupTiming} from '../public/official-startup.mjs';

test('startup preserves every captured GIF, PNG and font byte',async()=>{
 const evidence=JSON.parse(await readFile(new URL('../evidence/r13/official-startup-assets.json',import.meta.url)));
 assert.equal(Object.keys(assets).length,6);
 for(const record of evidence.assets){
  const prefix='data:'+record.mime+';base64,';assert.ok(assets[record.name].startsWith(prefix));
  const bytes=Buffer.from(assets[record.name].slice(prefix.length),'base64');
  assert.equal(bytes.length,record.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);
  assert.equal(record.originalBytes,true);assert.equal(record.identicalInBothGames,true);
 }
});

test('opening is the original looping 300 by169 SmartSoft GIF',()=>{
 const bytes=Buffer.from(assets.logo.split(',')[1],'base64');
 assert.equal(bytes.subarray(0,6).toString(),'GIF89a');
 assert.equal(bytes.readUInt16LE(6),300);assert.equal(bytes.readUInt16LE(8),169);
 assert.ok(bytes.includes(Buffer.from('NETSCAPE2.0')));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'4d5662742ebb6a6c564a9c225040c034062c1fdc7d4e12e0b1f227350ad26c99');
});

test('first-paint standalone GIF is byte-identical to the original animation',async()=>{
 const file=await readFile(new URL('../public/official-startup-logo.gif',import.meta.url));
 assert.deepEqual(file,Buffer.from(assets.logo.split(',')[1],'base64'));
});

test('startup is limited to the two selected games and uses original completion timing',()=>{
 assert.equal(createOfficialStartup({gameId:'multi_hot_100'}),null);
 assert.equal(createOfficialStartup({gameId:'wild_multi_stars'}),null);
 assert.deepEqual(startupTiming.multi_hot_5_video,{readyDelay:150,fade:100});
 assert.deepEqual(startupTiming.hot_foxy_20,{readyDelay:200,fade:0});
});
