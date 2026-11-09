import {ReferenceAssetStore} from '../machine-renderer.mjs';
import {SmartSoftSkeleton} from '../smartsoft-skeleton.mjs';

// New Tower X only. These are original inert Spine3.8 timelines and textures,
// interpreted by our existing new-title Canvas player. No provider script,
// RNG, outcome calculation, monetary action or storage is executed here.
export const TOWER_X_LANDING_DURATION_MS=900;
export const TOWER_X_NATIVE_REFERENCE=Object.freeze({
 skeletonSha256:'59ac03d60b58683fc70f3685cbafd01211594163cfa8d54a15f0735350e4c1f2',
 textureSha256:'57b9fdf7609d95731d25ffdde38513cefee8329b0b237ce30c5911289e7866f3',
 atlasSha256:'242a482de3877eaca734aa27430245d23ac681675a02ce65244a833f192fc80f',
 durationMs:TOWER_X_LANDING_DURATION_MS,
 source:'presentation/arcade/assets.lock.json',
});
const CLIPS=Object.freeze({suburb:'shenobis dacema 1',city:'shenobis dacema 2',green:'shenobis dacema 3',elite:'shenobis dacema 4',neon:'shenobis dacema 5'});
const MODELS=new Set(['superwin-towerx-2','superwin-towerx-2-etb1-40000-v1']);
const ART_KEY='@smartsoft/native-art';
const decoder=new TextDecoder('utf-8',{fatal:true});
const MONEY=/^(0|[1-9]\d{0,18})$/;
const frozen=value=>Object.freeze(value);
const finiteBox=b=>b&&[b.x,b.y,b.width,b.height].every(Number.isFinite)&&b.width>0&&b.height>0;
export function supportsTowerXNativeArt(manifest){
 const r=TOWER_X_NATIVE_REFERENCE;
 return manifest?.id==='towerx_native'&&MODELS.has(manifest.modelVersion)&&
  manifest.spines?.houses?.skeletonFile===r.skeletonSha256+'.json'&&
  manifest.spines?.houses?.atlasFile===r.atlasSha256+'.txt'&&
  manifest.files?.[r.skeletonSha256+'.json']?.sha256===r.skeletonSha256&&
  manifest.files?.[r.textureSha256+'.png']?.sha256===r.textureSha256&&
  Object.values(CLIPS).every((_,i)=>manifest.frames?.['houses/building'+(i+1)]?.textureSha256===r.textureSha256);
}

export class TowerXHouseArt{
 constructor(data,manifest,images){
  if(!supportsTowerXNativeArt(manifest))throw new TypeError('Unsupported Tower X native artwork');
  const regions=Object.fromEntries(Object.entries(manifest.frames).filter(([key])=>key.startsWith('houses/')).map(([key,frame])=>[key.slice(7),frame]));
  this.skeleton=new SmartSoftSkeleton(data,regions,images);this.bounds=new Map();this.disposed=false;
  for(const animation of Object.values(CLIPS)){
   if(this.skeleton.durations[animation]!==.9)throw new TypeError('Unexpected native landing duration');
   const building='building'+animation.at(-1),pose=this.skeleton.sample(animation,.9);
   // The final house body is the anchor. Smoke must neither move the camera
   // nor shrink the house while its authored mesh deformation is playing.
   const bounds=this.skeleton.bounds({...pose,layers:pose.layers.filter(layer=>layer.slot===building)});
   if(!bounds||bounds.width<=0||bounds.height<=0)throw new TypeError('Missing native house attachment');
   this.bounds.set(animation,bounds);
  }
 }
 draw(context,command){
  if(this.disposed||command.key!=='towerx-houses'||!Object.values(CLIPS).includes(command.animation)||!finiteBox(command.box)||!Number.isFinite(command.time)||command.time<0)return;
  const bounds=this.bounds.get(command.animation),b=command.box,factor=Math.min(b.width/bounds.width,b.height/bounds.height);
  const pose=this.skeleton.sample(command.animation,Math.min(.9,command.time),{loop:false});
  this.skeleton.draw(context,pose,{x:b.x+(b.width-bounds.width*factor)/2-bounds.x*factor,
   y:b.y+(b.height-bounds.height*factor)/2+(bounds.y+bounds.height)*factor,scale:factor});
 }
 dispose(){this.disposed=true;this.skeleton.dispose();this.bounds.clear();}
}

export class TowerXAssetStore extends ReferenceAssetStore{
 constructor(manifest,options){
  if(!supportsTowerXNativeArt(manifest))throw new TypeError('Native house data belongs to the new Tower X title');
  super(manifest,options);this.nativePromise=null;this.houseArt=null;
 }
 async prepareNative(){
  if(this.nativePromise)return this.nativePromise;
  const work=(async()=>{
   const file=TOWER_X_NATIVE_REFERENCE.skeletonSha256+'.json';
   const pages=[...new Set(Object.entries(this.manifest.frames).filter(([name])=>name.startsWith('houses/')).map(([,frame])=>frame.file))];
   const [bytes,loaded]=await Promise.all([this.loadBytes(file),Promise.all(pages.map(async page=>[page,await this.loadImage(page)]))]);
   if(this.disposed)throw new Error('Asset store disposed');
   const art=new TowerXHouseArt(JSON.parse(decoder.decode(bytes)),this.manifest,new Map(loaded));
   this.houseArt=art;return art;
  })();this.nativePromise=work;
  try{return await work;}catch(error){if(this.nativePromise===work)this.nativePromise=null;throw error;}
 }
 async prepare(scene){
  const [images,art]=await Promise.all([super.prepare(scene),this.prepareNative()]);
  if(this.disposed)throw new Error('Asset store disposed');
  images.set(ART_KEY,art);return images;
 }
 dispose(){this.houseArt?.dispose();this.houseArt=null;this.nativePromise=null;super.dispose();}
}

const identity=(round,manifest)=>round&&(round.game_id??round.gameId)===manifest.id&&
 (round.model_version??round.modelVersion)===manifest.modelVersion&&typeof round.round_id==='string'&&round.round_id.length>0&&
 Number.isSafeInteger(round.version)&&round.version>=0&&round.status==='settled'&&typeof round.stakeMinor==='string'&&MONEY.test(round.stakeMinor)&&typeof round.payoutMinor==='string'&&MONEY.test(round.payoutMinor);
const floorsValid=floors=>Array.isArray(floors)&&floors.length<=10000&&floors.every((floor,i)=>
 floor?.level===i+1&&Object.hasOwn(CLIPS,floor.type)&&Number.isSafeInteger(floor.multiplier)&&floor.multiplier>0);
const sameFloor=(a,b)=>a?.level===b?.level&&a?.type===b?.type&&a?.multiplier===b?.multiplier;
const sameFloors=(a,b)=>a.length===b.length&&a.every((floor,i)=>sameFloor(floor,b[i]));
const confirmed=(snapshot)=>snapshot?.confirmed===true&&snapshot.authenticated===true&&typeof snapshot.sessionId==='string'&&snapshot.sessionId.length>0;
const frameIndex=(snapshot)=>Number.isInteger(snapshot?.frameIndex)&&snapshot.frameIndex>=0?snapshot.frameIndex:null;

// Annotation only: a new settled receipt may play its first accepted building;
// subsequent frames are sequential prefixes of that SAME immutable receipt.
// A restoration or skipped/backward frame never starts a fresh landing.
export function prepareTowerXTransition(scene,manifest,previousSnapshot,nextSnapshot,priorTransition=null){
 if(!supportsTowerXNativeArt(manifest)||scene?.gameId!==manifest.id||!confirmed(nextSnapshot))return scene;
 const after=nextSnapshot.round;
 if(!identity(after,manifest)||!floorsValid(after.floors)||scene.confirmedReceiptId!==after.round_id)return scene;
 const end=frameIndex(nextSnapshot)===null?after.floors.length:frameIndex(nextSnapshot)+1;
 if(end<0||end>after.floors.length||scene.visibleFloorCount!==end)return scene;
 const visible=after.floors.slice(Math.max(0,end-5),end).map(({level,type,multiplier})=>frozen({level,type,multiplier}));
 const described={...scene,towerXNativeFloors:frozen(visible)};
 if(!confirmed(previousSnapshot)||previousSnapshot.sessionId!==nextSnapshot.sessionId)return described;
 const before=previousSnapshot.round,currentIndex=frameIndex(nextSnapshot),previousIndex=frameIndex(previousSnapshot);
 if(currentIndex===null||!after.floors[currentIndex])return described;
 const sameRound=identity(before,manifest)&&before.round_id===after.round_id&&before.version===after.version&&
  before.stakeMinor===after.stakeMinor&&before.payoutMinor===after.payoutMinor&&floorsValid(before.floors)&&sameFloors(before.floors,after.floors);
 if(sameRound&&currentIndex===previousIndex&&priorTransition?.kind==='towerx-native-landing'&&
  priorTransition.roundId===after.round_id&&priorTransition.receiptVersion===after.version&&
  priorTransition.modelVersion===manifest.modelVersion&&priorTransition.frameIndex===currentIndex){
  return {...described,arcadeTransition:priorTransition};
 }
 const firstNewRound=currentIndex===0&&(!before||identity(before,manifest)&&before.round_id!==after.round_id);
 const nextFrame=sameRound&&previousIndex!==null&&currentIndex===previousIndex+1;
 if(!firstNewRound&&!nextFrame)return described;
 return {...described,arcadeTransition:frozen({kind:'towerx-native-landing',roundId:after.round_id,
  receiptVersion:after.version,modelVersion:manifest.modelVersion,frameIndex:currentIndex,
  animation:CLIPS[after.floors[currentIndex].type],sourceSha256:TOWER_X_NATIVE_REFERENCE.skeletonSha256})};
}

export function animateTowerXScene(scene,manifest,elapsedMs){
 if(!supportsTowerXNativeArt(manifest)||scene?.gameId!==manifest.id||!Array.isArray(scene.towerXNativeFloors)||
  !Number.isFinite(elapsedMs)||elapsedMs<0)return scene;
 const transition=scene.arcadeTransition,active=transition?.kind==='towerx-native-landing'&&
  transition.roundId===scene.confirmedReceiptId&&transition.modelVersion===manifest.modelVersion&&
  transition.sourceSha256===TOWER_X_NATIVE_REFERENCE.skeletonSha256;
 let at=0;
 const commands=scene.commands.map(command=>{
  if(command.type!=='sprite'||!/^building[1-5]$/.test(command.frame))return command;
  const floor=scene.towerXNativeFloors[at++];
  if(!floor||manifest.controls.buildingMap[floor.type]!==command.frame||!finiteBox(command.box))return command;
  const landing=active&&transition.frameIndex===floor.level-1&&transition.animation===CLIPS[floor.type];
  return {...command,type:'native-animation',key:'towerx-houses',animation:CLIPS[floor.type],
   time:landing?Math.min(.9,elapsedMs/1000):.9,loop:false,role:'towerx-native-house',level:floor.level};
 });
 return {...scene,commands};
}
