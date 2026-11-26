import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sampleTrack} from '../src/region-timeline.mjs';
const data=JSON.parse(await readFile(new URL('../src/multihot10-logo.json',import.meta.url)));
test('captured logo attachments and fade use original frame times including skipped frames',()=>{
 const track=data.tracks[1];assert.equal(sampleTrack(track,0).name,'multi hot 10/multi hot 10 logo_00000');
 assert.equal(sampleTrack(track,.19).name,'multi hot 10/multi hot 10 logo_00004');
 assert.equal(sampleTrack(track,.2).name,'multi hot 10/multi hot 10 logo_00006');
 assert.equal(sampleTrack(track,2.3333).alpha,1);assert.equal(sampleTrack(track,2.8333).alpha,0);
 assert.ok(Math.abs(sampleTrack(track,2.5833).alpha-.5)<.00001);
 for(const track of data.tracks)for(const event of track.timeline){assert.ok(data.frames[event.name]);assert.ok(track.attachments[event.name]);}
});
