import test from 'node:test';
import assert from 'node:assert/strict';
import {Particles} from '../public/motion.mjs';

const context=()=>({globalAlpha:1,save(){},restore(){},translate(){},rotate(){},fillRect(){}});
test('win particles follow the same trajectory at 30, 60 and 120 frames per second',()=>{
 const runs=[30,60,120].map(fps=>{const particles=new Particles();particles.burst(4);for(let i=0;i<fps/2;i++)particles.draw(context(),1000/fps);return particles.items;});
 for(const run of runs.slice(1))for(let i=0;i<run.length;i++)for(const key of ['x','y','vy','age'])assert.ok(Math.abs(run[i][key]-runs[0][i][key])<1e-8,key+' depends on frame rate');
});
test('win particle rendering ignores invalid frame deltas and expires cleanly',()=>{
 const particles=new Particles();particles.burst(1);const initial=structuredClone(particles.items),c=context();for(const delta of [-1,NaN,Infinity])particles.draw(c,delta);assert.deepEqual(particles.items,initial);particles.draw(c,10000);assert.equal(c.globalAlpha,1);particles.draw(c,16);assert.equal(particles.items.length,0);
});
