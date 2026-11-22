import test from 'node:test';
import assert from 'node:assert/strict';
import { presentationLayout } from './layout.mjs';
for (const width of [360,390,430,1280]) test(`all eight controls are reachable and nonoverlapping at ${width}`, () => {
  const layout=presentationLayout(width,844);const entries=Object.entries(layout.controls);assert.equal(entries.length,8);
  for(const[name,r]of entries){assert(r.width>=44&&r.height>=44,name);assert(r.x>=0&&r.y>=0,name);assert(r.x+r.width<=layout.width+.001,name);assert(r.y+r.height<=layout.height+.001,name);}
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){const[a,r]=entries[i],[b,s]=entries[j];const overlap=Math.min(r.x+r.width,s.x+s.width)-Math.max(r.x,s.x)>0&&Math.min(r.y+r.height,s.y+s.height)-Math.max(r.y,s.y)>0;assert.equal(overlap,false,`${a} overlaps ${b}`);}
});
test('all source scene cropping is inside the retained own native canvas',()=>{for(const width of[360,390,430,1280]){const c=presentationLayout(width,844).crop;assert(c.x>=0&&c.y>=0&&c.x+c.width<=1363&&c.y+c.height<=766);}});
