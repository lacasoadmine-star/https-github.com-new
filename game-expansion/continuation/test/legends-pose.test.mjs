import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {extractSetupPose,normalizeRegionName,SETUP_POSE_REFERENCES} from '../presentation/legends/static-pose.mjs';

const near=(actual,expected,tolerance=1e-9)=>{
  assert.equal(actual.length,expected.length);
  actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<=tolerance,`${index}: ${value} vs ${expected[index]}`));
};
const scene=(attachment={width:2,height:2},bone={name:'root'})=>({
  skeleton:{spine:'4.1.24'},bones:[bone],slots:[{name:'slot',bone:bone.name,attachment:'image'}],skins:[{name:'default',attachments:{slot:{image:attachment}}}],
});
const triangle=vertices=>({type:'mesh',uvs:[0,0,1,0,0,1],triangles:[0,1,2],vertices});

test('region own translation, rotation and nonuniform scale compose with its slot bone',()=>{
  const data=scene({width:4,height:2,x:3,y:4,rotation:90,scaleX:2,scaleY:3},{name:'root',x:10,y:20});
  const pose=extractSetupPose(data),layer=pose.layers[0];
  near(layer.worldVertices,[16,20,16,28,10,28,10,20]);
  assert.deepEqual(layer.uvs,[0,1,1,1,1,0,0,0]);assert.deepEqual(layer.triangles,[0,1,2,0,2,3]);
  assert.equal(pose.coordinateSystem,'spine-y-up');assert.equal(pose.uvSpace,'untrimmed-region');assert.equal(pose.complete,true);
});

test('normal parent rotation and nonuniform scale preserve a mirrored child mesh',()=>{
  const data=scene(triangle([1,2,0,0,-1,-2]));
  data.bones=[{name:'root',x:10,y:20,rotation:90,scaleX:2,scaleY:3},{name:'child',parent:'root',x:4,y:5,scaleX:-1}];data.slots[0].bone='child';
  near(extractSetupPose(data).layers[0].worldVertices,[-11,26,-5,28,1,30]);
});

test('bone shear changes the local axes before the parent affine transform',()=>{
  const root=Math.SQRT1_2;
  const pose=extractSetupPose(scene({width:2,height:2},{name:'root',shearX:45}));
  near(pose.layers[0].worldVertices,[-root,-root-1,root,root-1,root,root+1,-root,-root+1]);
});

test('noRotationOrReflection removes inherited rotation but preserves the scaled world basis and ordinary origin',()=>{
  const data=scene(triangle([1,0,0,1,0,0]));
  data.bones=[{name:'root',x:10,y:20,rotation:90,scaleX:2,scaleY:3},{name:'child',parent:'root',x:4,y:5,transform:'noRotationOrReflection'}];data.slots[0].bone='child';
  const pose=extractSetupPose(data);assert.equal(pose.complete,true);near(pose.layers[0].worldVertices,[-2,28,-5,30,-5,28]);
});

test('noRotationOrReflection removes parent reflection while retaining reflected parent translation',()=>{
  const data=scene(triangle([1,0,0,1,0,0]));
  data.bones=[{name:'root',x:10,y:20,scaleX:-2,scaleY:3},{name:'child',parent:'root',x:4,y:5,transform:'noRotationOrReflection'}];data.slots[0].bone='child';
  near(extractSetupPose(data).layers[0].worldVertices,[4,35,2,38,2,35]);
});

test('noRotationOrReflection retains its own rotation, scale and shear after removing a uniform parent rotation',()=>{
  const data=scene(triangle([1,0,0,1,0,0])),r=Math.PI/180;
  data.bones=[{name:'root',rotation:70,scaleX:3,scaleY:3},{name:'child',parent:'root',rotation:30,scaleX:-2,scaleY:.5,shearX:10,shearY:20,transform:'noRotationOrReflection'}];data.slots[0].bone='child';
  near(extractSetupPose(data).layers[0].worldVertices,[-6*Math.cos(40*r),-6*Math.sin(40*r),1.5*Math.cos(140*r),1.5*Math.sin(140*r),0,0]);
});

test('noRotationOrReflection uses the finite small-parent-axis fallback',()=>{
  const data=scene(triangle([1,0,0,1,0,0]));
  data.bones=[{name:'root',rotation:90,scaleX:0,scaleY:3},{name:'child',parent:'root',transform:'noRotationOrReflection'}];data.slots[0].bone='child';
  const layer=extractSetupPose(data).layers[0];near(layer.worldVertices,[3,0,0,0,0,0]);assert.ok(layer.worldVertices.every(Number.isFinite));
});

test('unweighted mesh vertices use the slot bone once and retain source UV/triangle order',()=>{
  const data=scene(triangle([1,2,3,4,-1,-2]),{name:'root',x:3,y:4}),layer=extractSetupPose(data).layers[0];
  assert.equal(layer.weighted,false);near(layer.worldVertices,[4,6,6,8,2,2]);assert.deepEqual(layer.uvs,[0,0,1,0,0,1]);assert.deepEqual(layer.triangles,[0,1,2]);
});

test('weighted mesh groups transform each influence by its indexed world bone without reapplying the slot bone',()=>{
  const data=scene(triangle([2,0,2,3,.25,1,4,1,.75, 1,1,0,0,1, 1,0,0,0,1]));
  data.bones=[{name:'root',x:10,y:20},{name:'child',parent:'root',x:5,rotation:90}];data.slots[0].bone='child';
  const layer=extractSetupPose(data).layers[0];assert.equal(layer.weighted,true);near(layer.worldVertices,[13.5,23.75,15,20,10,20]);
});

test('weighted export coefficients are preserved without hidden renormalization',()=>{
  const group=[2,0,0,0,.5,1,0,0,.49],data=scene(triangle([...group,...group,...group]));
  data.bones=[{name:'root'},{name:'other',parent:'root',x:10}];
  near(extractSetupPose(data).layers[0].worldVertices,[4.9,0,4.9,0,4.9,0]);
});

test('slot and attachment RGBA multiply while the explicit blend mode is preserved',()=>{
  const data=scene({width:2,height:2,color:'4080ff80'});Object.assign(data.slots[0],{color:'80402080',blend:'additive'});
  const layer=extractSetupPose(data).layers[0];near(layer.tint,[128*64/65025,64*128/65025,32/255]);assert.equal(layer.opacity,(128/255)**2);assert.equal(layer.blend,'additive');
});

test('setup draw order is retained and inactive or alpha-zero effects are not invented',()=>{
  const data=scene();data.slots=[{name:'unset',bone:'root'},{name:'zero',bone:'root',attachment:'unknown',color:'ffffff00'},{name:'attachmentzero',bone:'root',attachment:'hidden'},{name:'slot',bone:'root',attachment:'image'}];
  data.skins[0].attachments.attachmentzero={hidden:{type:'unsupported-effect',color:'ffffff00'}};
  const pose=extractSetupPose(data);assert.deepEqual(pose.layers.map(layer=>layer.slot),['slot']);assert.deepEqual(pose.skipped.map(item=>item.reason),['attachment-unset','alpha-zero','alpha-zero']);assert.deepEqual(pose.unsupported,[]);
});

test('atlas region path normalization preserves case and spaces without resolving traversal',()=>{
  assert.equal(normalizeRegionName('./Symbols\\Gold Coin'),'Symbols/Gold Coin');assert.equal(normalizeRegionName('a//b.png'),'a/b.png');
  assert.throws(()=>normalizeRegionName('../private'));assert.throws(()=>normalizeRegionName(''));
  const data=scene({width:2,height:2,path:'.\\Symbols\\Gold Coin'});assert.equal(extractSetupPose(data).layers[0].regionName,'Symbols/Gold Coin');
});

test('editor bounds are not runtime root offsets and animations are never applied',()=>{
  const data=scene();Object.assign(data.skeleton,{x:500,y:600,width:1000,height:1000});data.animations={idle:{bones:{root:{translate:[{x:900,y:900}]}}}};
  const pose=extractSetupPose(data);near(pose.layers[0].worldVertices,[-1,-1,1,-1,1,1,-1,1]);assert.equal(pose.animationsApplied,false);near([pose.bounds.minX,pose.bounds.minY,pose.bounds.width,pose.bounds.height],[-1,-1,2,2]);
});

test('all unsupported top-level constraint kinds suppress the pose with exact diagnostics',()=>{
  for(const kind of ['ik','transform','path','physics']){
    const data=scene();data[kind]=[{name:'constraint',bones:['root']}];const pose=extractSetupPose(data);
    assert.equal(pose.complete,false);assert.equal(pose.layers.length,0);assert.equal(pose.unsupported.length,1);assert.equal(pose.unsupported[0].code,'CONSTRAINT_UNSUPPORTED');assert.equal(pose.unsupported[0].path,kind);assert.equal(pose.unsupported[0].detail.count,1);assert.deepEqual(pose.unsupported[0].detail.names,['constraint']);assert.equal(pose.skipped[0].reason,'unsupported-skeleton');
  }
});

const translationConstraint=(overrides={})=>({name:'shift',bones:['subject'],target:'target',mixRotate:0,mixX:-1,mixScaleX:0,mixShearY:0,...overrides});
const constrainedScene=()=>{
  const data=scene(triangle([0,0,1,0,0,1]));
  data.bones=[{name:'root'},{name:'subject',parent:'root',x:2,y:3},{name:'target',parent:'root',x:10,y:20},{name:'descendant',parent:'subject'}];data.slots[0].bone='subject';data.transform=[translationConstraint()];return data;
};

test('negative world translation mixes are applied and inherited by descendants, with mixY defaulting to mixX',()=>{
  const data=constrainedScene();data.bones=[{name:'root',x:10,y:20,rotation:90,scaleX:2,scaleY:3},{name:'subject',parent:'root',x:1,y:2},{name:'target',parent:'root',x:5,y:6,transform:'noRotationOrReflection'},{name:'descendant',parent:'subject',x:3,y:4}];data.slots[0].bone='descendant';
  const before=structuredClone(data),pose=extractSetupPose(data),applied=pose.appliedConstraints[0];
  assert.equal(pose.complete,true);near(pose.layers[0].worldVertices,[4,20,4,22,1,20]);assert.equal(applied.mixX,-1);assert.equal(applied.mixY,-1);assert.equal(applied.targetBasisUsed,false);near(applied.before,[4,22]);near(applied.targetPoint,[-8,30]);near(applied.after,[16,14]);assert.deepEqual(data,before);
});

test('translation offsets use the target world basis and explicit axis mixes remain independent',()=>{
  const data=constrainedScene();Object.assign(data.bones[2],{rotation:90,scaleX:2,scaleY:3});data.transform=[translationConstraint({x:2,y:1,mixX:.25,mixY:-.5})];
  const pose=extractSetupPose(data);near(pose.layers[0].worldVertices,[3.25,-7.5,4.25,-7.5,3.25,-6.5]);assert.equal(pose.appliedConstraints[0].targetBasisUsed,true);near(pose.appliedConstraints[0].targetPoint,[7,24]);
});

test('a computed zero translation delta is recorded as an evaluated constraint, not assumed inactive',()=>{
  const data=constrainedScene();Object.assign(data.bones[2],{x:2,y:3,transform:'noRotationOrReflection'});
  const pose=extractSetupPose(data);assert.equal(pose.complete,true);assert.equal(pose.appliedConstraints.length,1);near(pose.appliedConstraints[0].before,[2,3]);near(pose.appliedConstraints[0].after,[2,3]);assert.equal(pose.appliedConstraints[0].mixY,-1);
});

test('unsupported transform modes, ordering, dependencies and mixed constraints keep the entire pose suppressed',()=>{
  const variants=[{local:true},{relative:true},{skin:true},{order:1},{mixRotate:.1},{mixScaleY:.1},{mixShearY:.1},{bones:['subject','descendant']},{target:'subject'},{target:'descendant'}];
  for(const variant of variants){const data=constrainedScene();Object.assign(data.transform[0],variant);const pose=extractSetupPose(data);assert.equal(pose.complete,false);assert.equal(pose.layers.length,0);assert.equal(pose.appliedConstraints.length,0);assert.ok(pose.unsupported.some(item=>item.code==='CONSTRAINT_UNSUPPORTED'));}
  const multiple=constrainedScene();multiple.transform.push(translationConstraint({name:'second'}));assert.equal(extractSetupPose(multiple).layers.length,0);
  const targetBasis=constrainedScene();Object.assign(targetBasis.bones[2],{transform:'noScale'});targetBasis.transform[0].x=1;const pose=extractSetupPose(targetBasis);assert.equal(pose.layers.length,0);assert.ok(pose.unsupported.some(item=>item.code==='BONE_TRANSFORM_UNSUPPORTED'));
  const laterVersion=constrainedScene();laterVersion.skeleton.spine='4.2.0';assert.equal(extractSetupPose(laterVersion).layers.length,0);
});

test('non-normal inheritance blocks the affected subtree without fabricating transforms',()=>{
  const data=scene();data.bones.push({name:'bad',parent:'root',transform:'noScale'},{name:'descendant',parent:'bad'});
  data.slots.push({name:'badslot',bone:'bad',attachment:'image'},{name:'childslot',bone:'descendant',attachment:'image'});data.skins[0].attachments.badslot={image:{width:2,height:2}};data.skins[0].attachments.childslot={image:{width:2,height:2}};
  const pose=extractSetupPose(data);assert.equal(pose.complete,false);assert.deepEqual(pose.layers.map(item=>item.slot),['slot']);assert.deepEqual(pose.unsupported,[{code:'BONE_TRANSFORM_UNSUPPORTED',path:'bones[1].transform',detail:'noScale'}]);assert.deepEqual(pose.skipped.map(item=>item.reason),['unsupported-bone','unsupported-bone']);
});

test('active clipping suppresses all otherwise computable layers',()=>{
  const data=scene();data.slots.unshift({name:'clip',bone:'root',attachment:'shape'});data.skins[0].attachments.clip={shape:{type:'clipping',end:'slot'}};
  const pose=extractSetupPose(data);assert.equal(pose.layers.length,0);assert.equal(pose.bounds,null);assert.equal(pose.complete,false);assert.equal(pose.unsupported[0].code,'CLIPPING_UNSUPPORTED');assert.ok(pose.skipped.some(item=>item.reason==='pose-suppressed-by-clipping'));
});

test('linked meshes, unknown blends and region shear are explicit blockers',()=>{
  for(const[attachment,slot,code]of [[{type:'linkedmesh',parent:'image'},null,'LINKED_MESH_UNSUPPORTED'],[{width:2,height:2},{blend:'unknown'},'BLEND_UNSUPPORTED'],[{width:2,height:2,shearY:30},null,'REGION_SHEAR_UNSUPPORTED']]){
    const data=scene(attachment);Object.assign(data.slots[0],slot);const pose=extractSetupPose(data);assert.equal(pose.complete,false);assert.equal(pose.layers.length,0);assert.equal(pose.unsupported[0].code,code);
  }
});

test('Spine4.1 sequence setup uses the JSON start=1 default and ignores animation timelines',()=>{
  const data=scene({width:2,height:2,path:'frames/image_',sequence:{count:10}});data.animations={idle:{slots:{slot:{sequence:[{time:0,mode:'loop',index:8,delay:.03}]}}}};
  const pose=extractSetupPose(data),layer=pose.layers[0];assert.equal(pose.complete,true);assert.equal(layer.regionName,'frames/image_1');assert.deepEqual(layer.sequence,{count:10,start:1,digits:0,setupIndex:0,resolvedIndex:0,frameNumber:1,animated:false});near(layer.worldVertices,[-1,-1,1,-1,1,1,-1,1]);
});

test('Spine4.1 sequence setup resolves zero start, padding, explicit setup and upper-index clamping',()=>{
  for(const[sequence,path,expected,resolved]of [[{count:26,start:0,digits:2},'wild - coin light_','wild - coin light_00',0],[{count:8,start:0,digits:2,setup:3},'scatter_lightningIdle_','scatter_lightningIdle_03',3],[{count:4,start:7,digits:3,setup:99},'nested/','nested/010',3]]){
    const pose=extractSetupPose(scene({width:2,height:2,path,sequence}));assert.equal(pose.complete,true);assert.equal(pose.layers[0].regionName,expected);assert.equal(pose.layers[0].sequence.resolvedIndex,resolved);
  }
});

test('mesh sequences retain mesh geometry and untrimmed UVs while resolving only the atlas frame',()=>{
  const mesh={...triangle([0,0,1,0,0,1]),path:'mesh_',sequence:{count:3,start:0,digits:2,setup:1}},pose=extractSetupPose(scene(mesh));
  assert.equal(pose.layers[0].regionName,'mesh_01');assert.equal(pose.layers[0].kind,'mesh');assert.deepEqual(pose.layers[0].uvs,[0,0,1,0,0,1]);near(pose.layers[0].worldVertices,[0,0,1,0,0,1]);
  assert.equal(extractSetupPose(scene({width:2,height:2,sequence:null})).layers[0].regionName,'image');
});

test('invalid sequence paths and numbers fail explicitly; unverified Spine versions remain blocked',()=>{
  for(const sequence of [{},{count:0},{count:2.5},{count:3,start:-1},{count:3,setup:-1},{count:3,digits:129},{count:3,digits:Infinity},{count:2,start:Number.MAX_SAFE_INTEGER,setup:1}])assert.throws(()=>extractSetupPose(scene({width:2,height:2,sequence})),/Invalid Spine setup pose/);
  const data=scene({width:2,height:2,sequence:{count:3}});data.skeleton.spine='4.2.0';const pose=extractSetupPose(data);assert.equal(pose.complete,false);assert.equal(pose.layers.length,0);assert.equal(pose.unsupported[0].code,'SEQUENCE_UNSUPPORTED');
  assert.equal(SETUP_POSE_REFERENCES.length,6);assert.ok(SETUP_POSE_REFERENCES.every(item=>/^https:\/\/raw\.githubusercontent\.com\/EsotericSoftware\/spine-runtimes\/4\.1\//.test(item.url)&&/^[a-f\d]{64}$/.test(item.sha256)));
});

test('triangle indices, UV pairs and weighted group boundaries are validated',()=>{
  for(const attachment of [
    {...triangle([0,0,1,0,0,1]),triangles:[0,1,3]},
    {...triangle([0,0,1,0,0,1]),triangles:[0,1,1.5]},
    {...triangle([0,0,1,0,0,1]),uvs:[0,0,1,0,0]},
    triangle([2,0,0,0,1]),
    triangle([1,99,0,0,1,1,0,0,0,1,1,0,0,0,1]),
    triangle([1,0,0,0,2,1,0,0,0,1,1,0,0,0,1]),
    triangle([1,0,0,0,1,1,0,0,0,1,1,0,0,0,1,99]),
  ])assert.throws(()=>extractSetupPose(scene(attachment)),/Invalid Spine setup pose/);
});

test('non-finite coordinates, overflow and invalid bone hierarchies fail rather than render',()=>{
  for(const data of [scene({width:Infinity,height:2}),scene(triangle([0,0,1,NaN,0,1])),scene({width:2,height:2},{name:'root',rotation:Infinity}),scene({width:2,height:2},{name:'root',scaleX:1e308})])assert.throws(()=>extractSetupPose(data),/finite|overflow/);
  const cyclic=scene();cyclic.bones[0].parent='child';cyclic.bones.push({name:'child',parent:'root'});assert.throws(()=>extractSetupPose(cyclic),/cyclic/);
  const missing=scene();missing.slots[0].bone='absent';assert.throws(()=>extractSetupPose(missing),/missing slot bone/);
});

test('input remains unchanged and no network or RNG is used',()=>{
  const data=scene(),before=structuredClone(data),originalRandom=Math.random,originalFetch=globalThis.fetch;
  Math.random=()=>{throw new Error('RNG forbidden');};globalThis.fetch=()=>{throw new Error('network forbidden');};
  try{const pose=extractSetupPose(data);pose.layers[0].uvs[0]=42;pose.layers[0].triangles[0]=42;assert.deepEqual(data,before);}finally{Math.random=originalRandom;globalThis.fetch=originalFetch;}
});

// Optional public-cache integration checks. Pure geometry regressions above run
// without any external files or network. Explicit env paths support a relocated
// verified asset cache; absence is reported as a skip, never a false pass.
const egyptFile=process.env.ZPLAY_EGYPT_SYMBOL2_JSON||'/tmp/zplay-egypt-symbol2.json';
test('cached Egyptian symbol2 preserves its three visible setup layers and screen blend',{skip:!existsSync(egyptFile)},async()=>{
  const data=JSON.parse(await readFile(egyptFile,'utf8')),pose=extractSetupPose(data);
  assert.equal(pose.complete,true);assert.deepEqual(pose.unsupported,[]);assert.deepEqual(pose.layers.map(layer=>layer.regionName),['icon 8Sh','ic8_icon','00icSh']);assert.equal(pose.layers[1].weighted,false);assert.equal(pose.layers[1].worldVertices.length,8);assert.equal(pose.layers[2].blend,'screen');assert.equal(pose.skipped.length,8);assert.ok(pose.skipped.every(item=>item.reason==='attachment-unset'));
  near(pose.layers[1].worldVertices.slice(0,2),[31.885644,-44.176998],1e-7);
});
const olympFile=process.env.ZPLAY_OLYMP_SYMBOL2_JSON||'/tmp/zplay-olymp-symbol2.json';
test('cached Olympian symbol2 extracts its97-vertex weighted mesh and skips nine transparent effects',{skip:!existsSync(olympFile)},async()=>{
  const data=JSON.parse(await readFile(olympFile,'utf8')),pose=extractSetupPose(data),mesh=pose.layers[2];
  assert.equal(pose.complete,true);assert.deepEqual(pose.unsupported,[]);assert.deepEqual(pose.layers.map(layer=>layer.regionName),['major_yellow Bg','major_yellow Botwing','major_yellow Symbol']);assert.equal(mesh.weighted,true);assert.equal(mesh.worldVertices.length,194);assert.equal(mesh.triangles.length,420);assert.ok(mesh.worldVertices.every(Number.isFinite));assert.ok(mesh.triangles.every(index=>Number.isInteger(index)&&index>=0&&index<97));assert.equal(pose.skipped.length,9);assert.ok(pose.skipped.every(item=>item.reason==='alpha-zero'));
  near(mesh.worldVertices.slice(0,2),[6.78259332947057,44.44266947255075],1e-9);
});

const legendCache=process.env.ZPLAY_LEGENDS_ASSET_CACHE||'/tmp/zplay-legends-assets';
for(const[symbol,hash,layerCount]of [
  [6,'7d8101dc1a63415b17ff16a4acbd9a9c40bd7a2f19a670894b657e0011f44a41',4],
  [7,'33a206a95b726790a0bb1cfe9b06c93412ba2d14d54979d1d203835d0cb2e93b',4],
  [8,'453e4894beec0d9369894ba8e145459e216e85f9309993c186bb819dc95079df',4],
  [9,'a6d2aaa16031394bbdab35be52c5887e2b3f8a796b20244dc0d46128a0ea5c8e',3],
]){
  const file=legendCache+'/'+hash+'.json';
  test(`verified Egyptian gem${symbol} computes its actual negative translation constraint and visible setup layers`,{skip:!existsSync(file)},async()=>{
    const bytes=await readFile(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);const pose=extractSetupPose(JSON.parse(bytes));
    assert.equal(pose.complete,true);assert.deepEqual(pose.unsupported,[]);assert.equal(pose.layers.length,layerCount);assert.equal(pose.appliedConstraints.length,1);assert.equal(pose.appliedConstraints[0].name,'Master2');assert.equal(pose.appliedConstraints[0].mixX,-1);assert.equal(pose.appliedConstraints[0].mixY,-1);near(pose.appliedConstraints[0].before,pose.appliedConstraints[0].after);assert.ok(pose.layers.every(layer=>layer.worldVertices.every(Number.isFinite)));
  });
}
for(const[label,hash,region,count,layerCount]of [
  ['wild','db841cadf8e56b2ff66f7e2378eee62c94b4319ac0e178c6dc41da889519139a','wild - coin light_00',26,11],
  ['scatter','6d1336a9fe91e486a86ee5217a7ed79895183e56cf733b4abff364e0ea496ea5','scatter_lightningIdle_00',8,9],
]){
  const file=legendCache+'/'+hash+'.json';
  test(`verified Olympian ${label} resolves its actual sequence setup frame without running animation`,{skip:!existsSync(file)},async()=>{
    const bytes=await readFile(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);const pose=extractSetupPose(JSON.parse(bytes));
    assert.equal(pose.complete,true);assert.equal(pose.layers.length,layerCount);const sequences=pose.layers.filter(layer=>layer.sequence);assert.equal(sequences.length,1);assert.equal(sequences[0].regionName,region);assert.equal(sequences[0].sequence.count,count);assert.equal(sequences[0].sequence.resolvedIndex,0);assert.equal(pose.animationsApplied,false);
  });
}
