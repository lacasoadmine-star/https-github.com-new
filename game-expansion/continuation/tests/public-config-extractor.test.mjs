import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicConfig} from '../reference-tools/public-config-extractor.mjs';

test('declarations and assignments retain public literal values',()=>{
 const result=extractPublicConfig('const gameInfo={lines:20,win:{duration:3000}}; Win.limit=9.99;');
 assert.deepEqual(result.fields.map(f=>[f.path,f.value]),[['gameInfo',{lines:20,win:{duration:3000}}],['Win.limit',9.99]]);
});
test('conditional branches stay distinct and labelled',()=>{
 const result=extractPublicConfig('if(mobile){Win.duration=100;}else{Win.duration=200;}');
 assert.equal(result.fields.length,2);
 assert.deepEqual(result.fields.map(f=>f.conditions),[['mobile'],['!(mobile)']]);
 assert.ok(result.fields.every(f=>f.conditional));
});
test('runtime and private player data cannot become public configuration',()=>{
 const result=extractPublicConfig('const player={key:"secret",availableAmount:10}; function run(){Win.limit=1;} for(let i=0;i<5;i++){Win.limit=2;} switch(x){case 1:Win.limit=3;} try{Win.limit=4;}catch(e){}');
 assert.equal(result.fields.length,0);
 assert.equal(result.dynamicAssignmentsNotEvaluated,3);
});
test('dynamic values are not executed or guessed',()=>{
 const result=extractPublicConfig('const gameInfo={lines:20,coefficient:readServer()}; gameSounds.win=fetch("example");');
 assert.deepEqual(result.fields.map(f=>[f.path,f.value]),[['gameInfo.lines',20]]);
 assert.equal(result.dynamicAssignmentsNotEvaluated,2);
});
