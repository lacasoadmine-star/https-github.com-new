import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {HABESHA_LANDSCAPE,HABESHA_PORTRAIT} from '../assets/habesha-layout.mjs';
import {HABESHA_PORTRAIT as previousPortrait} from '../../habesha-r5/assets/habesha-layout.mjs';

const data=async name=>JSON.parse(await readFile(new URL('../evidence/'+name,import.meta.url),'utf8'));
const near=(actual,expected,tolerance,label)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} versus measured ${expected}`);

test('landscape dimensions agree with independently fitted reference artwork within two screen pixels',async()=>{
 const layout=HABESHA_LANDSCAPE,scale=1363/1366,top=26;
 const board=(await data('board-fit.json')).find(item=>item.capture==='reference-wide');
 for(const key of ['x','y','width','height'])near(layout.board[key]*scale+(key==='y'?top:0),board[key],1,'board '+key);
 const symbols=await data('combined-symbol-fit.json');
 near(layout.reels.x*scale,symbols.screenOriginX,.5,'symbol source origin x');
 near(layout.reels.y*scale+top,symbols.screenOriginY,.5,'symbol source origin y');
 near(layout.reels.columnStep*scale,symbols.columnStep,.5,'column pitch');
 near(layout.reels.rowStep*scale,symbols.rowStep,.5,'row pitch');
 near(layout.reels.width*scale,500*symbols.scaleX,.5,'500 px symbol width');
 const multiplier=(await data('multiplier-background-fit.json')).find(item=>item.capture==='reference-wide');
 for(const key of ['x','y','width','height'])near(layout.multiplier[key]*scale+(key==='y'?top:0),multiplier[key],1,'multiplier '+key);
 // The measured logo template was rendered in box (200,100,302,87).
 // Its visible mask is (241,101)-(473,182); native fitting uses height.
 const logo=(await data('logo-fit.json')).find(item=>item.path.endsWith('/reference-wide.jpg')).bestMatches[0];
 const logoScale=layout.logo.height/87;
 const predicted=[(layout.logo.x+41*logoScale)*scale,(layout.logo.y+logoScale)*scale+top,232*logoScale*scale,81*logoScale*scale];
 predicted.forEach((value,index)=>near(value,logo[index+2],2,'visible logo '+index));
});

test('desktop symbols retain original 500 px canvases and every inherited art reference',async()=>{
 const current=JSON.parse(await readFile(new URL('../assets/habesha-landscape-art.json',import.meta.url),'utf8'));
 const previous=JSON.parse(await readFile(new URL('../../habesha-r5/assets/habesha-landscape-art.json',import.meta.url),'utf8'));
 assert.deepEqual(current.background,previous.background);assert.deepEqual(current.provenance,previous.provenance);
 for(const [name,entry]of Object.entries(previous.sprites))assert.deepEqual(current.sprites[name],entry,name+' must be preserved');
 const added=await data('original-symbol-crops.json');assert.equal(added.length,18);
 for(const entry of added){
  const bytes=await readFile(new URL('../assets/'+entry.path,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
  assert.equal(bytes.length,entry.size);assert.equal(bytes.readUInt32BE(16),500);assert.equal(bytes.readUInt32BE(20),500);
  assert.equal(current.sprites[entry.name].path,entry.path);
 }
 const animations=await data('animation-bounds.json');
 for(const entry of animations)assert.deepEqual(current.sprites['Box/'+entry.symbol].animationReferenceBounds,entry.referenceBounds);
 for(const symbol of [1,7]){
  const entry=animations.find(item=>item.symbol===symbol);
  assert.ok(entry.bounds.width>entry.referenceBounds.width*4,'invisible effect bounds must not shrink the visible win symbol');
 }
});

test('portrait board, logo and reels geometry stays equal to the frozen release',()=>{
 assert.deepEqual(HABESHA_PORTRAIT,previousPortrait);
});

test('the shared stylesheet only adds a Habesha root canvas black background',async()=>{
 const current=await readFile(new URL('../assets/style.css',import.meta.url),'utf8');
 const previous=await readFile(new URL('../../habesha-r5/assets/style.css',import.meta.url),'utf8');
 const newRule='html:has(body[data-machine="habesha_fortune_5_native"]),body[data-machine="habesha_fortune_5_native"]{background:#000}';
 assert.ok(current.includes(newRule));
 assert.equal(current.replace(newRule,'body[data-machine="habesha_fortune_5_native"]{background:#000}'),previous);
});
