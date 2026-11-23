import test from 'node:test';
import assert from 'node:assert/strict';
import {BURN_WILDS_OFFICIAL_ATLASES,BURN_WILDS_REQUIRED_FRAMES,
 BURN_WILDS_DEMO_ATLAS_ROOT,auditBurnWildsOfficialAtlas,
 inspectCurrentBurnWildsOfficialAtlas} from './official-atlas-audit.mjs';
function makePacks(){
  const frames=BURN_WILDS_OFFICIAL_ATLASES.map(()=>({}));
  BURN_WILDS_REQUIRED_FRAMES.forEach((name,i)=>{frames[i%5][name]={
    frame:{x:0,y:0,w:16,h:16},sourceSize:{w:16,h:16},
    rotated:false,trimmed:false};});
  return BURN_WILDS_OFFICIAL_ATLASES.map((pack,index)=>{
    while(Object.keys(frames[index]).length<pack.frames){
      const key='Other/'+index+'/'+Object.keys(frames[index]).length;
      frames[index][key]={frame:{x:1,y:1,w:8,h:8},
        sourceSize:{w:8,h:8},rotated:false,trimmed:false};
    }
    return {meta:{image:'Images-'+index+'.png',size:{w:pack.width,h:pack.height}},
      frames:frames[index]};
  });
}
test('exact five official manifest packs and observed control sprites',()=>{
  const data=auditBurnWildsOfficialAtlas(makePacks());
  assert.equal(data.atlasCount,5);
  assert.equal(data.frameCount,200);
  for(const name of BURN_WILDS_REQUIRED_FRAMES)assert.ok(data.verifiedFrameNames.includes(name));
});
test('reference rejects invented missing assets, corrupted bounds or mismatched packs',()=>{
  const noSpin=makePacks();
  for(const m of noSpin)delete m.frames['Buttons/Spin'];
  assert.throws(()=>auditBurnWildsOfficialAtlas(noSpin),/FRAME_COUNT/);
  const bad=makePacks();bad[0].frames[Object.keys(bad[0].frames)[0]].frame.w=9999;
  assert.throws(()=>auditBurnWildsOfficialAtlas(bad),/BAD_FRAME/);
  const dimensions=makePacks();dimensions[2].meta.size.w=30;
  assert.throws(()=>auditBurnWildsOfficialAtlas(dimensions),/ATLAS_METADATA/);
});
test('observed public URLs are inspectable, never bundled as commercial game assets',async()=>{
  const packs=makePacks(),urls=[];
  const result=await inspectCurrentBurnWildsOfficialAtlas(async url=>{
    urls.push(url);
    return packs[Number(url.match(/Images-(\d+)\.json$/)[1])];
  });
  assert.equal(result.frameCount,200);
  assert.deepEqual(urls,BURN_WILDS_OFFICIAL_ATLASES.map(p=>BURN_WILDS_DEMO_ATLAS_ROOT+'Images-'+p.index+'.json'));
});

