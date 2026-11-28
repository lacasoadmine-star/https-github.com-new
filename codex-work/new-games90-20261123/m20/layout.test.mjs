import test from 'node:test';
import assert from 'node:assert/strict';
import { presentationLayout, MIN_PRESENTATION_HEIGHT } from './layout.mjs';
for (const width of [360,390,430,1280]) test(`all eight controls are reachable and nonoverlapping at ${width}`, () => {
  const layout=presentationLayout(width,844);const entries=Object.entries(layout.controls);assert.equal(entries.length,8);
  for(const[name,r]of entries){assert(r.width>=44&&r.height>=44,name);assert(r.x>=0&&r.y>=0,name);assert(r.x+r.width<=layout.width+.001,name);assert(r.y+r.height<=layout.height+.001,name);}
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){const[a,r]=entries[i],[b,s]=entries[j];const overlap=Math.min(r.x+r.width,s.x+s.width)-Math.max(r.x,s.x)>0&&Math.min(r.y+r.height,s.y+s.height)-Math.max(r.y,s.y)>0;assert.equal(overlap,false,`${a} overlaps ${b}`);}
});
test('all source scene cropping is inside the retained own native canvas',()=>{for(const width of[360,390,430,1280]){const c=presentationLayout(width,844).crop;assert(c.x>=0&&c.y>=0&&c.x+c.width<=1363&&c.y+c.height<=766);}});

// Regression: rotated phones and short embedded game windows must not clip
// sound or overlap AUTO/DOUBLE. The entire scene and controls must fit.
for(const [width,height] of [[240,144],[390,148],[1280,148],[240,240],[390,320],[430,350],[640,360],[700,400],[768,400],[844,390],[932,430],[1024,320],[1280,240],[1280,720]]) test(`compact viewport ${width}x${height} keeps all targets visible`,()=>{
 const layout=presentationLayout(width,height),entries=Object.entries(layout.controls);
 assert(layout.width<=width+.001,'stage width');assert(layout.height<=height+.001,'stage height');
 assert.equal(entries.length,8);
 for(const [name,r] of entries){assert(r.width>=44&&r.height>=44,name);assert(r.x>=0&&r.y>=0,name);assert(r.x+r.width<=layout.width+.001,`${name} horizontal bounds`);assert(r.y+r.height<=layout.height+.001,`${name} vertical bounds`);}
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const [a,r]=entries[i],[b,s]=entries[j];const overlap=Math.min(r.x+r.width,s.x+s.width)-Math.max(r.x,s.x)>.001&&Math.min(r.y+r.height,s.y+s.height)-Math.max(r.y,s.y)>.001;
  assert.equal(overlap,false,`${a} overlaps ${b}`);
 }
 assert(Math.abs(layout.scene.width/layout.scene.height-layout.crop.width/layout.crop.height)<1e-9,'scene aspect ratio');
});

test('hosts with less than the accessible row budget must scroll rather than shrink targets',()=>{
 assert.equal(MIN_PRESENTATION_HEIGHT,144);
 assert.throws(()=>presentationLayout(390,MIN_PRESENTATION_HEIGHT-1),/M20_VIEWPORT/);
});
for(const width of [360,390,430])test(`native phone ${width} keeps circular SPIN between AUTO/BET and all targets separate`,()=>{
 const p=presentationLayout(width,818,{nativePortrait:true}),{spin,auto,bet,menu,sound}=p.controls;
 assert.equal(p.nativePortrait,true);assert.equal(spin.width,spin.height);assert.equal(spin.x+spin.width/2,width/2);
 assert(auto.x+auto.width<spin.x);assert(bet.x+.001>=spin.x+spin.width);assert(menu.y>auto.y+auto.height);assert.equal(menu.y,sound.y);
 const rects=Object.values(p.controls);
 for(const r of rects){assert(r.width>=44&&r.height>=44);assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=p.height);}
 for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if([a,b].includes(p.controls.quick)&&[a,b].includes(spin)){assert(Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)>=a.width/2+b.width/2);continue;}assert(!(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.001&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>.001));}
});
