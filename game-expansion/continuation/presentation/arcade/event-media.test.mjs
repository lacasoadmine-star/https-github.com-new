import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createArcadeScene} from './arcade-renderer.mjs';
import {arcadeSoundCue,animateArcadeScene,FROZEN_MOBILE_REFERENCE} from './event-media.mjs';
import {REVIEW_FIXTURES} from './review-fixtures.mjs';
import {createLegendsScene} from '../legends/renderer.mjs';
import {createRemainingScene,reviewFixture} from '../remaining-slots/renderer.mjs';

const manifest=async(id,family='arcade')=>JSON.parse(await readFile(new URL('../'+family+'/manifests/'+id+'.json',import.meta.url),'utf8'));
const texts=scene=>scene.commands.filter(command=>command.type==='text').map(command=>command.text);
const base={confirmed:true,authenticated:true,balance:'123.45',stake:'2.00',mines:5};

test('arcade host hit areas follow accepted-round actions and remove artwork-review labels',async()=>{
  for(const id of ['towerx_native','towerrush_native','coinminer_native']){
    const m=await manifest(id),idle=createArcadeScene(m,base,{interactive:true});
    assert.ok(idle.controlsGeometry.play);assert.ok(!idle.controlsGeometry.cashout);
    assert.ok(!texts(idle).some(value=>/REVIEW|disabled|confirmed reveals/.test(value)));
    assert.ok(texts(idle).some(value=>value.includes('123.45')));
    for(const b of Object.values(idle.controlsGeometry))assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=m.width&&b.y+b.height<=m.height);
    const supplied={...base,...structuredClone(REVIEW_FIXTURES[id][1].snapshot)};
    const active=createArcadeScene(m,supplied,{interactive:true});
    if(id!=='towerx_native'){
      assert.ok(active.controlsGeometry.cashout);assert.ok(!active.controlsGeometry.play);
      if(id==='towerrush_native')assert.ok(active.controlsGeometry.step);
    }
    assert.equal(active.financialActions,false);assert.equal(active.productionLaunchEnabled,false);
  }
});

test('arcade cue playback uses only the correct locked title and bounded TowerRush slices',async()=>{
  const tower=await manifest('towerx_native'),coin=await manifest('coinminer_native'),rush=await manifest('towerrush_native');
  assert.equal(arcadeSoundCue(tower,'music').key,'audio_MainTheme');
  assert.equal(arcadeSoundCue(coin,'music'),null);
  assert.equal(arcadeSoundCue(coin,'prize-reveal').key,'sound_prize_reveal');
  assert.deepEqual(arcadeSoundCue(rush,'freeze'),{key:'audio_effects',offsetSeconds:10,durationSeconds:2.2,loop:false});
  assert.deepEqual(arcadeSoundCue(rush,'win'),{key:'audio_effects',offsetSeconds:32,durationSeconds:2.6,loop:false});
  assert.equal(arcadeSoundCue(rush,'button'),null);
  assert.equal(arcadeSoundCue({id:'bookofmagic_native',audio:tower.audio},'music'),null);
});

test('Frozen mobile sequence uses the source38-frame timing and affects only the latest confirmed floor',async()=>{
  const m=await manifest('towerrush_native'),supplied={...base,...structuredClone(REVIEW_FIXTURES.towerrush_native[1].snapshot)};
  supplied.round.floors=supplied.round.floors.slice(0,2);supplied.round.level=2;
  const scene=createArcadeScene(m,supplied,{interactive:true});
  for(const[time,index]of [[0,0],[41.7,1],[1585,37],[1600,38],[5000,38]]){
    const frame=animateArcadeScene(scene,m,time).commands.find(command=>command.role==='frozen-overlay');
    assert.equal(frame.frame,'spine/Frozen_web/Frozen_web_'+index);
  }
  const cache=process.env.ZPLAY_ARCADE_ASSET_CACHE||'/tmp/zplay-arcade-assets';
  const source=JSON.parse(await readFile(cache+'/'+m.spines.frozen.skeletonFile,'utf8'));
  const sequence=source.animations.frozen_mob.attachments.default['Frozen_web/Frozen_web_2']['Frozen_web/Frozen_web_'].sequence;
  assert.equal(sequence[0].delay,FROZEN_MOBILE_REFERENCE.frameSeconds);
  assert.equal(source.animations.frozen_mob.slots['Frozen_web/Frozen_web_4'].attachment[0].time,FROZEN_MOBILE_REFERENCE.idleAtSeconds);
  const previous=createArcadeScene(m,{...base,...REVIEW_FIXTURES.towerrush_native[1].snapshot},{interactive:true});
  assert.equal(animateArcadeScene(previous,m,0).commands.find(command=>command.role==='frozen-overlay').frame,'spine/Frozen_web/Frozen_web_38');
  assert.equal(animateArcadeScene(scene,m,-1),scene);
});

test('Legends shows confirmed idle balance and selected stake without creating an outcome',async()=>{
  const m=await manifest('olympianlegends_native','legends'),scene=createLegendsScene(m,{...base,pending:true},{interactive:true});
  assert.ok(texts(scene).includes('123.45'));assert.ok(texts(scene).includes('2.00'));
  assert.ok(scene.commands.some(command=>command.file===m.images.stop.file));
  assert.equal(scene.commands.filter(command=>command.role==='symbol').length,0);
  assert.ok(!texts(createLegendsScene(m,{...base,authenticated:false},{interactive:true})).includes('123.45'));
});

test('Vegas uses source stop/mute frames and does not expose stale win highlights during spin',async()=>{
  const m=await manifest('vegasnights_native','remaining-slots');
  const scene=createRemainingScene(m,{...base,...reviewFixture(m.id),pending:true,soundEnabled:false,wins:[{cells:[[0,0]]}]},{interactive:true});
  assert.ok(scene.commands.some(command=>command.frame==='GUI_v11_desktop/s_Spin_Stop_Icon'));
  assert.ok(scene.commands.some(command=>command.frame==='GUI/s_SoundMute'));
  assert.equal(scene.commands.filter(command=>command.type==='outline').length,0);
  const signedOut=createRemainingScene(m,{...base,...reviewFixture(m.id),authenticated:false},{interactive:true});
  assert.equal(signedOut.commands.filter(command=>command.role==='symbol').length,0);
  assert.ok(!texts(signedOut).some(value=>value.includes('123.45')));
});
