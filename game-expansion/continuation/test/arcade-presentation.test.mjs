import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createArcadeScene,coinCellAt} from '../presentation/arcade/arcade-renderer.mjs';
import {REVIEW_FIXTURES} from '../presentation/arcade/review-fixtures.mjs';
import {validateAssetURL,verifyBytes,MAX_TOTAL_BYTES,captureAssets} from '../scripts/fetch-arcade-reference-assets.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../presentation/arcade');
const readJSON=async file=>JSON.parse(await readFile(resolve(root,file),'utf8'));
const lock=await readJSON('assets.lock.json');
const manifests=Object.fromEntries(await Promise.all(Object.keys(REVIEW_FIXTURES).map(async id=>[id,await readJSON('manifests/'+id+'.json')])));
const clone=value=>structuredClone(value);
const commands=(scene,frame)=>scene.commands.filter(command=>command.type==='sprite'&&command.frame===frame);
const fixture=(id,index=1)=>clone(REVIEW_FIXTURES[id][index]);

test('only the three requested arcade games are present and all gates remain closed',()=>{
  assert.deepEqual(Object.keys(manifests),['towerx_native','towerrush_native','coinminer_native']);
  assert.equal(lock.productionLaunchEnabled,false);assert.equal(lock.providerJavaScriptIncluded,false);
  for(const m of Object.values(manifests)){
    assert.equal(m.productionLaunchEnabled,false);assert.equal(m.releaseReady,false);assert.equal(m.fullDemoParity,false);assert.equal(m.financialActions,false);
    assert.deepEqual(m.requiredArtMissing,[]);assert.ok(m.blockers.length>0);
  }
});

test('locked public assets stay below100MB and have no executable or session URLs',()=>{
  assert.ok(lock.assets.length>=90);assert.ok(lock.uniqueBytes<MAX_TOTAL_BYTES);
  assert.equal(lock.uniqueBytes,lock.assets.reduce((sum,item)=>sum+item.bytes,0));
  for(const item of lock.assets){assert.match(item.file,/^[a-f0-9]{64}\.(png|webp|jpg|json|atlas|txt|mp3|woff)$/);for(const url of item.urls)validateAssetURL(url);}
  for(const bad of ['http://static.ssg-public.com/cache/b45/XGames/Content/Images/TowerX/logo.png','https://cdn.galaxsys-games.com/fg-towerrush-api/Play','https://static.ssg-public.com/cache/b45/XGames/Content/Scripts/TowerX/canvas.js','https://curacao-mines-ui.gamingcorpscasino.com/games/coin-miner/assets/imgs/game_logo.min.png?token=secret','https://user:pass@cdn.galaxsys-games.com/fg-cdn/prd/root/images/towerrush/logo.webp'])assert.throws(()=>validateAssetURL(bad));
});

test('all captured bytes match their SHA-256 and size',async()=>{
  const cache=process.env.ZPLAY_ARCADE_ASSET_CACHE||'/tmp/zplay-arcade-assets';
  for(const item of lock.assets)verifyBytes(item,await readFile(resolve(cache,item.file)));
  const item=lock.assets[0],bytes=await readFile(resolve(cache,item.file)),corrupt=Buffer.from(bytes);corrupt[0]^=1;
  assert.throws(()=>verifyBytes(item,corrupt),/mismatch/);
});

test('a failed download records a precise blocker instead of fabricating an image',async()=>{
  const result=await captureAssets({sources:[],assets:[{gameId:'towerx_native',key:'unavailable',kind:'image',sourceRef:'test',url:'https://static.ssg-public.com/cache/b45/XGames/Content/Images/TowerX/absent.png'}]},{cacheDir:'/tmp/zplay-arcade-test-empty',downloadImpl:async()=>{throw new Error('HTTP404');}});
  assert.equal(result.assets.length,0);assert.equal(result.failures.length,1);assert.equal(result.failures[0].error,'HTTP404');
});

test('every review fixture renders deterministically from locked artwork without RNG or network',()=>{
  const savedRandom=Math.random,savedFetch=globalThis.fetch;Math.random=()=>{throw new Error('Unexpected RNG');};globalThis.fetch=()=>{throw new Error('Unexpected network');};
  try{for(const[id,fixtures]of Object.entries(REVIEW_FIXTURES))for(const f of fixtures){
    const before=clone(f),scene=createArcadeScene(manifests[id],f.snapshot,f.options);
    assert.deepEqual(scene,createArcadeScene(manifests[id],f.snapshot,f.options));assert.deepEqual(f,before);
    assert.equal(scene.productionLaunchEnabled,false);assert.equal(scene.financialActions,false);assert.ok(scene.controls.every(control=>control.enabled===false));
    assert.ok(scene.commands.filter(command=>command.type==='sprite').length>=5);
    for(const command of scene.commands){if(command.type==='sprite'){assert.ok(manifests[id].frames[command.frame]);assert.ok(manifests[id].files[manifests[id].frames[command.frame].file]);}if(command.box)for(const value of Object.values(command.box))assert.ok(Number.isFinite(value));}
  }}finally{Math.random=savedRandom;globalThis.fetch=savedFetch;}
});

test('unconfirmed and pending-only state cannot reveal outcomes',()=>{
  for(const[id,m]of Object.entries(manifests)){
    const f=fixture(id),scene=createArcadeScene(m,{...f.snapshot,confirmed:false,pending:true,canStart:true});
    assert.equal(scene.confirmedReceiptId,null);
    if(id==='coinminer_native')assert.equal(scene.revealedTileCount,0);else assert.equal(scene.totalFloorCount,0);
  }
});

test('mismatched game/version and malformed money receipts are rejected',()=>{
  const m=manifests.coinminer_native;
  for(const change of [{game_id:'towerx_native'},{model_version:'future-model'},{stakeMinor:1.25},{stakeMinor:'1000.0'},{payoutMinor:'99'}]){
    const f=fixture('coinminer_native');Object.assign(f.snapshot.round,change);assert.throws(()=>createArcadeScene(m,f.snapshot));
  }
  const f=fixture('coinminer_native');Object.assign(f.snapshot.round,{status:'settled',payoutMinor:null});assert.throws(()=>createArcadeScene(m,f.snapshot));
});

test('Coin94 uses the exact public portrait tile positions and row-major hit testing',()=>{
  const m=manifests.coinminer_native,scene=createArcadeScene(m,{confirmed:false});
  const tiles=scene.commands.filter(command=>command.type==='sprite'&&['tile1','tile2'].includes(command.frame));
  assert.equal(tiles.length,50);assert.equal(commands(scene,'tile1').length,25);assert.equal(commands(scene,'tile2').length,25);
  assert.deepEqual(tiles[0].box,{x:26,y:174,width:60,height:60});assert.deepEqual(tiles[49].box,{x:274,y:422,width:60,height:60});assert.deepEqual(tiles[0].box,tiles[1].box);
  assert.equal(coinCellAt(26,174,m),0);assert.equal(coinCellAt(333,481,m),24);assert.equal(coinCellAt(86,174,m),null);assert.equal(coinCellAt(87,174,m),null);assert.equal(coinCellAt(88,174,m),1);assert.equal(coinCellAt(25,174,m),null);assert.equal(coinCellAt(NaN,174,m),null);
});

test('Coin94 only reveals exact confirmed picks and marks actual rescued picks',()=>{
  const m=manifests.coinminer_native,f=fixture('coinminer_native'),scene=createArcadeScene(m,f.snapshot);
  assert.equal(commands(scene,'prize1').length,2);assert.equal(commands(scene,'bonus_label').length,1);assert.deepEqual(scene.boostedTileIndices,[6]);
  f.snapshot.round.hiddenBoard=Array(25).fill('mine');f.snapshot.round.futurePicks=[{index:24,safe:false}];f.snapshot.round.serverSeed='must-never-render';
  assert.deepEqual(createArcadeScene(m,f.snapshot),scene);
  const lost=fixture('coinminer_native',2),lossScene=createArcadeScene(m,lost.snapshot);assert.equal(commands(lossScene,'tile_explosion').length,1);assert.equal(commands(lossScene,'tile_mine').length,0);assert.equal(lossScene.revealedTileCount,3);
});

test('duplicate tiles and invalid boost/mine records cannot produce a misleading scene',()=>{
  const m=manifests.coinminer_native;
  for(const bad of [{index:0,safe:true},{index:25,safe:true},{index:8,safe:'true'},{index:8,safe:false,treasureBoost:true}]){const f=fixture('coinminer_native');f.snapshot.round.picks.push(bad);assert.throws(()=>createArcadeScene(m,f.snapshot));}
});

test('TowerX maps all five public building types and a frame prefix never displays later floors or final payout',()=>{
  const m=manifests.towerx_native,f=fixture('towerx_native'),scene=createArcadeScene(m,f.snapshot);
  for(let i=1;i<=5;i++)assert.equal(commands(scene,'building'+i).length,1);
  const prefix=createArcadeScene(m,f.snapshot,{frameIndex:1});assert.equal(prefix.visibleFloorCount,2);assert.equal(commands(prefix,'building3').length,0);assert.equal(prefix.settledResultShown,false);
  assert.ok(!prefix.commands.some(command=>command.type==='text'&&command.text==='50.60'));
  assert.throws(()=>createArcadeScene(m,f.snapshot,{frameIndex:0.5}));
});

test('TowerRush frozen, Temple and triple states use their distinct source artwork without inventing future floors',()=>{
  const m=manifests.towerrush_native;
  const frozen=fixture('towerrush_native'),scene=createArcadeScene(m,frozen.snapshot);
  assert.equal(commands(scene,'spine/Frozen_web/Frozen_webmain').length,1);assert.equal(commands(scene,'spine/Frozen_web/Frozen_web_38').length,1);
  assert.deepEqual(commands(scene,'spine/Frozen_web/Frozen_webmain')[0].box,commands(scene,'spine/Frozen_web/Frozen_web_38')[0].box);assert.equal(commands(scene,'cashoutBtnFrozen').length,1);assert.equal(scene.totalFloorCount,3);
  const temple=fixture('towerrush_native',2),templeScene=createArcadeScene(m,temple.snapshot,temple.options);assert.equal(templeScene.templeSection,3);assert.equal(commands(templeScene,'bonus-temple-wheel').length,1);
  const triple=fixture('towerrush_native',3),tripleScene=createArcadeScene(m,triple.snapshot);assert.equal(tripleScene.totalFloorCount,4);assert.equal(commands(tripleScene,'atlas/bonus-triple').length,1);
});

test('money display uses exact integer minor values even aboveNumber.MAX_SAFE_INTEGER',()=>{
  const f=fixture('coinminer_native');f.snapshot.round.currentCashoutMinor='900719925474099312';
  const scene=createArcadeScene(manifests.coinminer_native,f.snapshot);assert.ok(scene.commands.some(command=>command.text==='9007199254740993.12'));
});

test('all normalized frames remain inside verified atlas images, including Spine rotations',()=>{
  for(const m of Object.values(manifests))for(const frame of Object.values(m.frames)){
    const image=m.files[frame.file];assert.ok(frame.x>=0&&frame.y>=0);assert.ok(frame.x+frame.packedWidth<=image.width);assert.ok(frame.y+frame.packedHeight<=image.height);
    assert.equal(frame.textureSha256,image.sha256);
  }
  const spine=Object.values(manifests.towerrush_native.frames).filter(frame=>frame.name.startsWith('spine/')&&frame.rotated);assert.ok(spine.length>0);assert.ok(spine.every(frame=>frame.unrotateDegrees===90));
});
