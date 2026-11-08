import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sha256} from '../scripts/fetch-reference-assets.mjs';
import {staticURL,verify,atlasPages,atlasRegions} from '../presentation/legends/assets.mjs';
import {confirmedView,createLegendsScene,legendsGridLayout} from '../presentation/legends/renderer.mjs';
import {fitViewport} from '../presentation/machine-renderer.mjs';

const load=async path=>JSON.parse(await readFile(new URL('../presentation/legends/'+path,import.meta.url),'utf8'));
const ids=['egyptianlegends_native','olympianlegends_native'];
const manifest=id=>load('manifests/'+id+'.json');
const grid=id=>Array.from({length:6},()=>Array.from({length:5},()=>id));
const stateFor=(id,symbol,round={})=>({confirmed:true,authenticated:true,balance:'123.45',currency:'ETB',round:{gameId:id,grid:grid(symbol),wins:[],stakeMinor:'100',payoutMinor:'250',...round}});
const textOf=scene=>scene.commands.filter(command=>command.type==='text').map(command=>command.text);

test('Legends source URLs allow only public static files without session material',()=>{
 const valid='https://cdn.galaxsys-games.com/gsl-cdn/prd/egyptianlegends/images/mobile/logo.webp';
 assert.equal(staticURL(valid),valid);
 for(const value of [valid+'?token=x',valid+'#session',valid.replace('https:','http:'),valid.replace('cdn.galaxsys-games.com','other.test'),valid.replace('/gsl-cdn/prd/','/private/'),valid.replace('logo.webp','runtime.js'),valid.replace('https://','https://user:password@')])assert.throws(()=>staticURL(value));
});

test('both declared byte size and SHA-256 are enforced before static asset use',()=>{
 const body=Buffer.from('exact-source'),entry={file:'fixture.webp',bytes:body.length,sha256:sha256(body)};
 assert.equal(verify(entry,body),true);
 assert.throws(()=>verify(entry,Buffer.from('wrong-source')),/hash\/size mismatch/);
 assert.throws(()=>verify({...entry,bytes:body.length+1},body),/hash\/size mismatch/);
});

test('modern unindented Spine atlas preserves page boundaries, rotation and bottom trim',()=>{
 const source='page.png\nsize:64,64\nfilter:Linear,Linear\nregion\nbounds:2,4,12,8\noffsets:1,2,16,14\nrotate:90\n\npage2.png\nsize:32,32\nsecond\nbounds:0,0,10,10\n';
 assert.deepEqual(atlasPages(source).map(page=>page.name),['page.png','page2.png']);
 const frames=atlasRegions(source,{'page.png':{file:'one.png',sha256:'a'},'page2.png':{file:'two.png',sha256:'b'}});
 assert.equal(frames.region.file,'one.png');assert.equal(frames.second.file,'two.png');
 assert.equal(frames.region.unrotateDegrees,90);assert.equal(frames.region.packedWidth,8);assert.equal(frames.region.packedHeight,12);
 assert.deepEqual(frames.region.trim,{x:1,y:4,width:12,height:8});
});

test('captured reference receipts cover all declared public source records',async()=>{
 const lock=await load('assets.lock.json'),receipt=await load('verification.json');
 assert.equal(receipt.complete,true);assert.deepEqual(receipt.failures,[]);
 assert.equal(receipt.verifiedAssets,lock.assets.length);assert.equal(receipt.verifiedBytes,lock.assets.reduce((sum,item)=>sum+item.bytes,0));
 assert.equal(lock.productionLaunchEnabled,false);
 for(const asset of lock.assets){assert.equal(staticURL(asset.url),asset.url);assert.match(asset.sha256,/^[a-f0-9]{64}$/);assert.ok(asset.file.startsWith(asset.sha256+'.'));assert.ok(asset.bytes>0);}
});

test('manifests retain separate original artwork, verified stages and explicit incomplete capabilities',async()=>{
 const games=await Promise.all(ids.map(manifest));
 for(const game of games){
  assert.deepEqual(game.grid,{columns:6,rows:5});assert.deepEqual(game.progress.thresholds,[20,40,60,85,110]);
  assert.equal(game.productionLaunchEnabled,false);assert.equal(game.capabilities.financialActions,false);assert.equal(game.capabilities.animationPlayback,false);
  assert.ok(game.images.background&&game.images.bonusBackground&&game.images.logo&&game.images.board&&game.images.progress);
  assert.ok(game.fonts.some(font=>/RubikBold/.test(font.name)));assert.equal(Object.keys(game.audio).length,2);
  assert.match(game.layout.provenance,/not verified/);
  for(const [id,symbol] of Object.entries(game.symbols))assert.equal(symbol.providerId,game.expectedSymbols.find(expected=>expected.id===id).providerId);
 }
 assert.notEqual(games[0].images.logo.sha256,games[1].images.logo.sha256);
 assert.deepEqual(Object.keys(games[0].symbols).sort(),['ankh','eyeOfHorus','book','papyrus','redGem','purpleGem','blueGem','greenGem'].sort());
 assert.deepEqual(games[0].missingSymbols.map(item=>item.id),['wild','scatter','multiplier']);
 assert.equal(games[0].missingSymbols.find(item=>item.id==='wild').setupLayers,0);
 assert.ok(games[0].missingSymbols.find(item=>item.id==='scatter').unsupported.some(item=>item.code==='CLIPPING_UNSUPPORTED'));
 assert.equal(Object.keys(games[1].symbols).length,10);assert.deepEqual(games[1].missingSymbols,[]);
});

test('derived symbol frames retain source hashes and fit only measured visible alpha bounds',async()=>{
 const derived=await load('derived-symbols.json');
 for(const id of ids){const game=await manifest(id);
  for(const [symbol,item] of Object.entries(derived.games[id])){
   const frame=game.frames[game.symbols[symbol].frame],bounds=item.alphaBounds;
   assert.equal(game.files[item.file].kind,'derived-static-spine-setup-pose');assert.ok(item.skeletonSource.url&&item.skeletonSource.sha256&&item.atlasSourceHashes.length);
   assert.deepEqual([frame.x,frame.y,frame.width,frame.height],[bounds.x,bounds.y,bounds.width,bounds.height]);
   assert.ok(frame.x>=0&&frame.y>=0&&frame.x+frame.width<=item.width&&frame.y+frame.height<=item.height);
  }
 }
});

test('unconfirmed, signed-out and foreign-game state never exposes wallet or results',async()=>{
 const game=await manifest(ids[0]),state=stateFor(game.id,'ankh');
 for(const supplied of [{...state,confirmed:false},{...state,authenticated:false},{...state,round:{...state.round,gameId:ids[1]}}]){
  const view=confirmedView(game,supplied),scene=createLegendsScene(game,supplied);
  assert.equal(view.confirmed,false);assert.equal(view.grid,null);assert.deepEqual(view.wins,[]);
  assert.ok(!textOf(scene).includes('123.45'));assert.ok(!textOf(scene).includes('2.50 ETB'));assert.equal(scene.commands.filter(command=>command.type==='sprite').length,0);
 }
});

test('review artwork always leaves financial actions and all controls closed',async()=>{
 for(const id of ids){const game=await manifest(id),scene=createLegendsScene(game,{canStart:true,balance:'99.00'},{review:true});
  assert.equal(scene.financialActions,false);assert.equal(scene.productionLaunchEnabled,false);assert.deepEqual(scene.controls,{spin:false,buyBonus:false,autoplay:false});
  assert.ok(textOf(scene).includes('PREVIEW'));assert.ok(textOf(scene).includes('Static artwork only · no wallet connection'));
  assert.ok(!textOf(scene).includes('99.00'));assert.ok(!textOf(scene).includes('0.00'));
 }
});

test('selected frame highlights and feature progress cannot fall back to later round data',async()=>{
 const game=await manifest(ids[0]),first=grid('ankh'),last=grid('book');
 const state={...stateFor(game.id,'book',{progress:110,feature:'Horus',wins:[{cells:[[5,4]]}],frames:[{grid:first,wins:[{cells:[[0,0]]}]},{grid:last,wins:[{cells:[[5,4]]}],progress:110,god:'Horus'}]}),frameIndex:0};
 const view=confirmedView(game,state),scene=createLegendsScene(game,state);
 assert.equal(view.grid,first);assert.deepEqual(view.wins,[{cells:[[0,0]]}]);assert.equal(view.progress,null);assert.equal(view.feature,null);
 assert.ok(textOf(scene).includes('PROGRESS —'));assert.ok(!textOf(scene).some(text=>text.startsWith('Horus')));
 assert.equal(scene.commands.filter(command=>command.type==='outline').length,1);
 const next=confirmedView(game,{...state,frameIndex:1});assert.equal(next.progress,110);assert.equal(next.feature,'Horus');
});

test('invalid frame selection and malformed confirmed grid cannot display a sample outcome',async()=>{
 const game=await manifest(ids[1]),state=stateFor(game.id,'majorYellow',{frames:[{grid:grid('simpleBlue'),wins:[]}],progress:40});
 for(const frameIndex of [-1,1,'0',Infinity]){
  const selected={...state,frameIndex},view=confirmedView(game,selected),scene=createLegendsScene(game,selected,{review:true});
  assert.equal(view.grid,null);assert.equal(view.progress,null);assert.deepEqual(view.wins,[]);
  assert.equal(scene.commands.filter(command=>command.type==='sprite').length,0);
 }
 const malformed={...state,round:{...state.round,grid:[['wild']]}};
 assert.equal(createLegendsScene(game,malformed,{review:true}).commands.filter(command=>command.type==='sprite').length,0);
});

test('confirmed money labels preserve server values and round total stays separate from frame payout',async()=>{
 const game=await manifest(ids[0]),state={...stateFor(game.id,'ankh',{stakeMinor:'900719925474099301',payoutMinor:'900719925474099399',frames:[{grid:grid('ankh'),wins:[],payoutMinor:'1'}]}),frameIndex:0};
 const texts=textOf(createLegendsScene(game,state));
 assert.ok(texts.includes('9007199254740993.99 ETB'));assert.ok(texts.includes('9007199254740993.01'));assert.ok(texts.includes('123.45'));
 assert.ok(!texts.includes('0.01 ETB'));
});

test('unknown special artwork stays absent and invalid win cells cannot highlight outside the board',async()=>{
 const game=await manifest(ids[0]),state=stateFor(game.id,'wild',{wins:[null,{cells:[null,[0,0],[-1,0],[6,0],[0,5],['1',1]]},{cells:'invalid'}]});
 const scene=createLegendsScene(game,state);
 assert.equal(scene.commands.filter(command=>command.type==='sprite').length,0);
 assert.equal(scene.commands.filter(command=>command.type==='outline').length,1);
});

test('original board dimensions contain every symbol cell at 360, 390, 430 and desktop',async()=>{
 for(const id of ids){const game=await manifest(id),{board,grid:area}=legendsGridLayout(game),scene=createLegendsScene(game,{}, {review:true});
  assert.ok(area.x>=board.x&&area.y>=board.y&&area.x+area.width<=board.x+board.width+1e-8&&area.y+area.height<=board.y+board.height+1e-8);
  const symbols=scene.commands.filter(command=>command.type==='sprite');assert.equal(symbols.length,30);
  for(const symbol of symbols){const cell=symbol.clip;assert.ok(cell.x>=area.x&&cell.y>=area.y&&cell.x+cell.width<=area.x+area.width+1e-8&&cell.y+cell.height<=area.y+area.height+1e-8);}
  for(const [width,height] of [[360,772],[390,836],[430,922],[1366,900]]){
   const fitted=fitViewport(width,height);assert.ok(fitted.x>=0&&fitted.y>=0&&fitted.x+fitted.width<=width+1e-8&&fitted.y+fitted.height<=height+1e-8);
  }
 }
});

test('every image and sprite command resolves to a declared hashed asset',async()=>{
 for(const id of ids){const game=await manifest(id);
  for(const bonus of [false,true]){
   const scene=createLegendsScene(game,{}, {review:true,bonus});
   for(const command of scene.commands){
    const file=command.type==='sprite'?game.frames[command.frame]?.file:command.type==='image'?command.file:null;
    if(!['sprite','image'].includes(command.type))continue;
    assert.ok(file&&game.files[file],id+': '+file);assert.match(game.files[file].sha256,/^[a-f0-9]{64}$/);assert.ok(game.files[file].bytes>0);
   }
  }
 }
});
