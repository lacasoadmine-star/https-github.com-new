import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('./game.mjs',import.meta.url),'utf8');

test('Safari dedicated live renderer positions mobile TURBO away from SPIN and BET',()=>{
 assert.match(source,/spin:\[188,this\.height-297,160,160\]/);
 assert.match(source,/bet:\[364,this\.height-256,78,78\]/);
 assert.match(source,/speed:\[378,this\.height-315,28,39\]/);
 assert.doesNotMatch(source,/speed:\[345,this\.height-286,28,39\]/);
});
test('Safari mobile interaction regions exceed 44 real CSS pixels',()=>{
 assert.match(source,/u=e\?45\*this\.width\/innerWidth:0/);
 assert.match(source,/p=Math\.max\(o,u\),y=Math\.max\(l,u\)/);
});
test('Safari retains its own original game ID and Player session/ETB-backed routes',()=>{
 assert.match(source,/fresh_safarisimba/);
 assert.match(source,/\/api\/slots\/fresh-state/);
 assert.match(source,/\/api\/slots\/spin/);
 assert.match(source,/\bwheelMultiplier\b/);
 assert.doesNotMatch(source,/createDetachedWallet|mockUserBalance|fakePayout/i);
});
