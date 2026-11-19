import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

test('actual portrait native bottle and goat retain their static footprint and stay inside the top-row cabinet',()=>{
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
 execFileSync(process.execPath,['changes/habesha-r6/evidence/render-portrait.mjs'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000});
 const report=JSON.parse(readFileSync(resolve(root,'changes/habesha-r6/evidence/portrait-native-bounds.json'),'utf8'));
 const renderer=readFileSync(resolve(root,'changes/habesha-r6/assets/habesha-renderer.mjs'));
 assert.equal(report.rendererSha256,createHash('sha256').update(renderer).digest('hex'));
 assert.deepEqual(report.viewport,{width:420,height:900});assert.equal(report.checksPassed,2);
 assert.equal(report.samples.length,4);
 for(const symbol of ['symbol_1','symbol_7'])assert.deepEqual(report.samples.filter(sample=>sample.symbol===symbol).map(sample=>sample.timeSeconds),[0,.5]);
 // The child executes the original animation runtime and asserts measured
 // solid-pixel bounds, including the formerly clipped cap/horns at 0.5 s.
});
