import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildAssetLock,selectAssets,verifyAssetBytes,fetchLockedAssets,sha256,validateSourceURL} from '../scripts/fetch-reference-assets.mjs';
import {normalizeTextureAtlas,normalizeSpineRegions,framePlacement,drawAtlasFrame} from '../presentation/atlas.mjs';
import {createPresentationScene,fitViewport,multiplierAngle,minorMoney,ReferenceAssetStore,reelLayout} from '../presentation/machine-renderer.mjs';
import {supplementalCatalog,pngDimensions} from '../presentation/capture-supplemental-assets.mjs';

const source=(data,url='https://static.ssg-public.com/cache/b1/SlotsDemo/Content/Images/MultiHot40/Images/background.png')=>({url,bytes:data.length,sha256:sha256(data),type:'image/png'});
const inventory=(id,asset)=>({machineId:id,officialGameName:'MultiHot40',grid:{reels:5,rows:4,symbolCount:8},reference:{},presentationAssets:[asset]});
const manifest=async id=>JSON.parse(await readFile(new URL('../presentation/manifests/'+id+'.json',import.meta.url),'utf8'));

test('asset inventory deduplicates exact bytes but retains per-game source URLs',()=>{
  const body=Buffer.from('reference'),a=source(body),b=source(body,a.url.replace('MultiHot40','MultiHot100'));
  const lock=buildAssetLock([inventory('forty',a),inventory('hundred',b)]);
  assert.equal(lock.assets.length,1);assert.equal(lock.uniqueBytes,body.length);
  assert.deepEqual(lock.assets[0].references.map(item=>item.games),[['hundred'],['forty']]);
});

test('executable provider assets are excluded and static URLs cannot carry sessions',()=>{
  const body=Buffer.from('x'),asset=source(body),entry=inventory('forty',asset);
  entry.presentationAssets.push(source(body,asset.url.replace('background.png','runtime.js')));
  const lock=buildAssetLock([entry]);assert.equal(lock.assets.length,1);assert.equal(lock.games.forty.excludedCodeAssets,1);
  for(const url of ['http://static.ssg-public.com/cache/x.png','https://other.example/cache/x.png','https://static.ssg-public.com/cache/x.png?token=demo','https://user@static.ssg-public.com/cache/x.png'])assert.throws(()=>validateSourceURL(url));
});

test('asset hash and byte count are both enforced',()=>{
  const bytes=Buffer.from('exact-art'),entry={...source(bytes),file:'art.png'};
  assert.equal(verifyAssetBytes(entry,bytes),true);
  assert.throws(()=>verifyAssetBytes(entry,Buffer.from('other-art')),/SHA-256/);
  assert.throws(()=>verifyAssetBytes(entry,Buffer.from('short')),/Size mismatch/);
});

test('a bad download cannot enter the cache',async()=>{
  const cache=await mkdtemp(join(tmpdir(),'zplay-art-test-'));
  try{
    const lock=buildAssetLock([inventory('forty',source(Buffer.from('abc')))]);
    const result=await fetchLockedAssets(lock,{gameIds:['forty'],cacheDir:cache,fetchImpl:async()=>new Response('bad')});
    assert.equal(result.complete,false);assert.equal(result.verifiedAssets,0);assert.equal(result.failures.length,1);assert.deepEqual(await readdir(cache),[]);
  }finally{await rm(cache,{recursive:true,force:true});}
});

test('a verified cache hit performs no network call',async()=>{
  const cache=await mkdtemp(join(tmpdir(),'zplay-art-test-'));
  try{
    const body=Buffer.from('abc'),lock=buildAssetLock([inventory('forty',source(body))]);let calls=0;
    const options={gameIds:['forty'],cacheDir:cache,fetchImpl:async()=>{calls++;return new Response(body);}};
    assert.equal((await fetchLockedAssets(lock,options)).complete,true);
    assert.equal((await fetchLockedAssets(lock,options)).receipts[0].status,'verified-cache');assert.equal(calls,1);
  }finally{await rm(cache,{recursive:true,force:true});}
});

test('aggregate selection cannot exceed200MB',()=>{
  const lock={games:{a:{}},assets:Array.from({length:13},(_,i)=>({games:['a'],bytes:16_000_000,sha256:String(i)}))};
  assert.throws(()=>selectAssets(lock,['a']),/200 MB/);
});

test('TexturePacker packed rotation and original trim positions are reconstructed',()=>{
  const data={meta:{size:{w:100,h:100}},frames:{seven:{frame:{x:70,y:10,w:10,h:20},rotated:true,spriteSourceSize:{x:2,y:3,w:10,h:20},sourceSize:{w:20,h:30}}}};
  const frame=normalizeTextureAtlas(data,{file:'sheet.png',sha256:'source'}).seven;
  assert.equal(frame.packedWidth,20);assert.equal(frame.packedHeight,10);assert.equal(frame.unrotateDegrees,-90);
  assert.deepEqual(framePlacement(frame,{x:0,y:0,width:40,height:60},{padding:true}),{x:4,y:6,width:20,height:40});
  const calls=[],context={save(){},restore(){},translate(...args){calls.push(['translate',...args]);},rotate(value){calls.push(['rotate',value]);},drawImage(...args){calls.push(['draw',...args]);}};
  drawAtlasFrame(context,'image',frame,{x:0,y:0,width:10,height:20});
  assert.deepEqual(calls[0],['translate',0,20]);assert.equal(calls[1][1],-Math.PI/2);assert.deepEqual(calls[2].slice(2,6),[70,10,20,10]);
});

test('Spine atlas rotation has the opposite direction and bottom offsets convert correctly',()=>{
  const text='\nlogo.png\nsize:100,100\nformat:RGBA8888\nfilter:Linear,Linear\nrepeat:none\nlogo\n  rotate:true\n  xy:2,4\n  size:30,10\n  orig:40,20\n  offset:5,4\n  index:-1\n';
  const frame=normalizeSpineRegions(text,{'logo.png':{file:'logo.png',sha256:'source'}}).logo;
  assert.equal(frame.unrotateDegrees,90);assert.equal(frame.trim.y,6);assert.equal(frame.packedWidth,10);assert.equal(frame.packedHeight,30);
});

test('out-of-bounds atlas pixels are rejected; transparent placeholders do not discard useful art',()=>{
  const usable={frame:{x:0,y:0,w:10,h:10},sourceSize:{w:10,h:10},spriteSourceSize:{x:0,y:0,w:10,h:10}};
  const placeholder={frame:{x:12,y:0,w:3,h:3},sourceSize:{w:1,h:1},spriteSourceSize:{x:0,y:0,w:3,h:3}};
  const frames=normalizeTextureAtlas({meta:{size:{w:20,h:20}},frames:{usable,placeholder}},{file:'x',sha256:'x'});assert.deepEqual(Object.keys(frames),['usable']);
  assert.throws(()=>normalizeTextureAtlas({meta:{size:{w:5,h:5}},frames:{usable}},{file:'x',sha256:'x'}),/outside image/);
});

test('both Multi Hot manifests contain exact separate titles,8symbols,controls,fonts and audio',async()=>{
  const forty=await manifest('multihot40_native'),hundred=await manifest('multihot100_native');
  for(const item of[forty,hundred]){
    assert.deepEqual(item.grid,{columns:5,rows:4});assert.equal(Object.keys(item.symbols).length,8);assert.equal(item.missing.length,0);
    assert.ok(item.background.file);assert.ok(item.controls.spin.disabled);assert.ok(item.fonts.length);assert.ok(Object.keys(item.audio).length);
    assert.equal(item.productionLaunchEnabled,false);
  }
  assert.notEqual(forty.frames[forty.logo.frame].textureSha256,hundred.frames[hundred.logo.frame].textureSha256);
  assert.equal(forty.frames[forty.logo.frame].unrotateDegrees,90);assert.equal(hundred.frames[hundred.logo.frame].unrotateDegrees,0);
});

test('closed presentation gate disables spin even when a caller supplies canStart',async()=>{
  const game=await manifest('multihot40_native'),scene=createPresentationScene(game,{canStart:true,balance:null,stake:null});
  assert.ok(scene.commands.some(item=>item.type==='sprite'&&item.frame===game.controls.spin.disabled));
  assert.ok(scene.commands.some(item=>item.text==='PREVIEW'));assert.equal(scene.financialActions,false);
  assert.equal(scene.commands.filter(item=>item.type==='text'&&item.text==='0.00').length,0);
});

test('money labels preserve integer precision and wheel angles cannot select new outcomes',async()=>{
  assert.equal(minorMoney('900719925474099301'),'9007199254740993.01');assert.equal(minorMoney(null),'—');
  const game=await manifest('multihot100_native');assert.equal(multiplierAngle(5,game),Math.PI/7);assert.equal(multiplierAngle(6,game),null);assert.equal(multiplierAngle('5',game),null);
});

test('360,390,430and desktop views keep the full reference layout within bounds',()=>{
  for(const[width,height]of[[360,772],[390,836],[430,922],[1366,900]]){
    const fitted=fitViewport(width,height);assert.ok(fitted.x>=0&&fitted.y>=0);assert.ok(fitted.x+fitted.width<=width+1e-9);assert.ok(fitted.y+fitted.height<=height+1e-9);
  }
});

test('Wild Ways, Wild5 and Super Wilds cells stay inside the visible source frame',async()=>{
  for(const id of['multihotwildways_native','multihot5wild_native','multihot5superwilds_native']){
    const game=await manifest(id),layout=reelLayout(game),visible=framePlacement(game.frames['Box/Background'],layout.board);
    assert.ok(layout.grid.x>=visible.x&&layout.grid.y>=visible.y,id);
    assert.ok(layout.grid.x+layout.grid.width<=visible.x+visible.width+1e-8,id);
    assert.ok(layout.grid.y+layout.grid.height<=visible.y+visible.height+1e-8,id);
    const ids=Object.keys(game.symbols),grid=Array.from({length:game.grid.columns},()=>Array.from({length:game.grid.rows},()=>ids[0]));
    const scene=createPresentationScene(game,{grid},{review:true});
    const symbols=scene.commands.filter(command=>command.frame===game.symbols[ids[0]].frame);
    assert.equal(symbols.length,game.grid.columns*game.grid.rows);
    for(const symbol of symbols){assert.ok(symbol.clip.y>=visible.y);assert.ok(symbol.clip.y+symbol.clip.height<=visible.y+visible.height+1e-8);}
  }
});

test('supplemental declarations preserve the shared Burning Ice base and40-line symbol override',()=>{
  const variants=supplementalCatalog.filter(item=>item.machineId.startsWith('burningice'));
  assert.equal(variants.length,3);assert.ok(variants.every(item=>item.assetBaseName==='BlazingHot'));
  const forty=variants.find(item=>item.machineId==='burningice40_native');
  assert.equal(forty.grid.rows,4);assert.deepEqual(forty.presentation.symbolOverrides['9'],{frame:'@Image/Box/10',blurFrame:'@Image/BlurBox/10'});
  assert.ok(forty.imagePaths.includes('Images/Start/Column-40.png'));assert.ok(forty.imagePaths.includes('Images/Start/Logo-40.png'));
  assert.equal(pngDimensions(Buffer.from('not an image')),null);
});

test('all eleven mapped machines use their own symbol identities with no missing frame dependency',async()=>{
  for(const id of['multihot40_native','multihot100_native','multihot5superwilds_native','multihot5wild_native','multihotwildways_native','safarisimba_native','habeshafortune5_native','multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native']){
    const game=await manifest(id),ids=Object.keys(game.symbols),grid=Array.from({length:game.grid.columns},(_,c)=>Array.from({length:game.grid.rows},(_,r)=>ids[(c+r)%ids.length]));
    const scene=createPresentationScene(game,{grid},{review:true});
    assert.ok(ids.length>=8,id);assert.equal(game.missing.length,0,id);
    assert.equal(game.status,'asset-backed-presentation-review');assert.equal(game.productionLaunchEnabled,false);assert.ok(game.logo&&game.background);assert.ok(game.fonts.length);assert.ok(Object.keys(game.audio).length);
    for(const command of scene.commands.filter(command=>command.type==='sprite'))assert.ok(game.frames[command.frame]&&game.files[game.frames[command.frame].file],id+':'+command.frame);
  }
});

test('Deluxe composes both actual title parts and preserves the500px symbol canvas scale',async()=>{
  const game=await manifest('multihotdeluxe_native'),id=Object.keys(game.symbols)[0];
  assert.deepEqual(game.logo.layers.map(item=>item.frame),['@Logo/5X','@Logo/Layer 1']);
  assert.equal(game.symbolPlacement.cellWidth,230);assert.equal(game.symbolPlacement.cellHeight,217);assert.equal(game.symbolPlacement.offsetX,-238);
  const scene=createPresentationScene(game,{grid:Array.from({length:3},()=>[id,id,id]),feature:{multiplier:5}},{review:true});
  const symbol=scene.commands.find(command=>command.frame===game.symbols[id].frame);
  assert.equal(symbol.padding,true);assert.ok(symbol.box.width>symbol.clip.width*2);
  const values=scene.commands.filter(command=>/^Multiplier\/[1-5]$/.test(command.frame||''));
  assert.deepEqual(values.map(item=>item.frame),['Multiplier/3','Multiplier/4','Multiplier/5','Multiplier/1','Multiplier/2']);
  assert.equal(values[2].opacity,1);assert.equal(values[0].opacity,.4);
  for(const stop of[1,2,3])assert.ok(game.audio['Start/ReelStop'+stop+'.mp3']);
});

test('Burning Ice variants retain distinct title art and40-line symbol9 is the observed override',async()=>{
  const games=await Promise.all(['burningice_native','burningice10_native','burningice40_native'].map(manifest));
  const hashes=games.map(game=>game.frames[game.logo.frame].textureSha256);assert.equal(new Set(hashes).size,3);
  const forty=games[2];assert.deepEqual(forty.grid,{columns:5,rows:4});assert.equal(forty.symbols['9'].frame,'@Image/Box/10');
  assert.ok(forty.files[forty.frames[forty.symbols['9'].frame].file].urls.some(url=>url.endsWith('/BlazingHot/Images/Box/10.png')));
  assert.equal(forty.board.frame,'@Image/Start/Column-40');
});

test('Burning Ice highlights only confirmed valid frozen columns',async()=>{
  const game=await manifest('burningice10_native'),scene=createPresentationScene(game,{feature:{frozenReels:[-1,1,1,5,'2']}},{review:true});
  assert.equal(scene.commands.filter(command=>command.frame===game.board.activeFrame).length,1);
  assert.equal(scene.commands.filter(command=>command.frame===game.featurePresentation.holdFrame).length,1);
  assert.equal(scene.financialActions,false);
});

test('browser asset loader verifies bytes before returning them and blocks arbitrary file paths',async()=>{
  const bytes=Buffer.from('abc'),hash=sha256(bytes),file=hash+'.png';
  const store=new ReferenceAssetStore({files:{[file]:{bytes:3,sha256:hash}}},{baseURL:'https://example.test/assets/',fetchImpl:async()=>new Response('bad')});
  await assert.rejects(store.loadBytes(file),/hash mismatch/);await assert.rejects(store.loadBytes('../wallet'),/Invalid locked/);
});
