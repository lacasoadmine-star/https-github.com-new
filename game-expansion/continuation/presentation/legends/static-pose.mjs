// Authored Spine4 setup-pose geometry only. No provider runtime, animation,
// texture request, RNG, wallet, canvas or financial operation is executed.
// Primary Spine 4.1 semantics were read as source, never executed or bundled.
// These hashes pin the inspected public files despite the moving branch URL.
const SOURCE_BASE='https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.1/spine-ts/spine-core/src/';
export const SETUP_POSE_REFERENCES=Object.freeze([
  ['attachments/Sequence.ts','67debcc43027fd8b2a4875b7975a50d752bfd0ea110cc25ff0477e899c003ab9'],
  ['SkeletonJson.ts','d58489fc5506e72654c14339e9bf2a8b6db5652f792d3b9859926f5be691c50e'],
  ['TransformConstraint.ts','4961eb8345e6ff802feec7c6659c67f83aedaf98428f55bc62cdc0d8ffbe8a71'],
  ['Bone.ts','22917129d9eb2bf465952231ac9320d9719c303b31fea71c5614d02ede6334b2'],
  ['Slot.ts','e552be84ceeb0408094350332b3e9c56affed437de61c8918f191b6b5697bdb8'],
  ['Skeleton.ts','745763b9e63010e65d75d1bca08ebee93d4c71fa46789777271028290122b9b3'],
].map(([file,sha256])=>Object.freeze({url:SOURCE_BASE+file,sha256})));
const DEG=Math.PI/180;
const BLENDS=new Set(['normal','additive','multiply','screen']);
const NON_RENDERING=new Set(['boundingbox','path','point']);
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const fail=message=>{throw new TypeError('Invalid Spine setup pose: '+message);};
const number=(value,fallback,label)=>{const result=value===undefined?fallback:value;if(typeof result!=='number'||!Number.isFinite(result))fail(label+' must be finite');return result;};
const name=(value,label)=>{if(typeof value!=='string'||!value.length)fail(label+' must be a nonempty string');return value;};

export function normalizeRegionName(value){
  const parts=name(value,'atlas region name').replace(/\\/g,'/').split('/').filter(part=>part!==''&&part!=='.');
  if(!parts.length||parts.some(part=>part==='..'))fail('invalid atlas region path');
  // Preserve case, spaces and extensions: these can be part of an atlas key.
  return parts.join('/');
}

function color(value,label){
  if(value===undefined)return[1,1,1,1];
  if(typeof value!=='string'||!/^([a-f\d]{6}|[a-f\d]{8})$/i.test(value))fail(label+' must be RGB or RGBA hex');
  const rgba=value.length===6?value+'ff':value;
  return Array.from({length:4},(_,i)=>parseInt(rgba.slice(i*2,i*2+2),16)/255);
}

function affine(data,label){
  const rotation=number(data.rotation,0,label+'.rotation');
  const rx=(rotation+number(data.shearX,0,label+'.shearX'))*DEG;
  const ry=(rotation+90+number(data.shearY,0,label+'.shearY'))*DEG;
  const sx=number(data.scaleX,1,label+'.scaleX'),sy=number(data.scaleY,1,label+'.scaleY');
  return checked({a:Math.cos(rx)*sx,b:Math.cos(ry)*sy,c:Math.sin(rx)*sx,d:Math.sin(ry)*sy,x:number(data.x,0,label+'.x'),y:number(data.y,0,label+'.y')},label);
}

function checked(matrix,label){
  if(Object.values(matrix).some(value=>!Number.isFinite(value)))fail(label+' transform overflow');
  return matrix;
}

function compose(parent,local,label){
  // Row-major affine convention: X=a*x+b*y+tx; Y=c*x+d*y+ty.
  return checked({
    a:parent.a*local.a+parent.b*local.c,b:parent.a*local.b+parent.b*local.d,
    c:parent.c*local.a+parent.d*local.c,d:parent.c*local.b+parent.d*local.d,
    x:parent.a*local.x+parent.b*local.y+parent.x,y:parent.c*local.x+parent.d*local.y+parent.y,
  },label);
}

function point(matrix,x,y,label){
  const result=[matrix.a*x+matrix.b*y+matrix.x,matrix.c*x+matrix.d*y+matrix.y];
  if(!result.every(Number.isFinite))fail(label+' world coordinate overflow');
  return result;
}

function noRotationOrReflection(parent,data,label){
  // Spine 4.1's static transform mode, at Skeleton scale (1,1). This removes
  // inherited rotation/reflection from the basis, but retains parent scaling
  // and uses the ordinary parent transform for the bone's origin.
  const axisLengthSquared=parent.a**2+parent.c**2;
  let ax=parent.a,ay=parent.c,bx=parent.b,by=parent.d,removedAngle;
  if(axisLengthSquared>0.0001){
    const ratio=Math.abs(parent.a*parent.d-parent.b*parent.c)/axisLengthSquared;
    bx=parent.c*ratio;by=parent.a*ratio;removedAngle=Math.atan2(parent.c,parent.a);
  }else{ax=0;ay=0;removedAngle=Math.PI/2-Math.atan2(parent.d,parent.b);}
  const rotation=number(data.rotation,0,label+'.rotation')*DEG;
  const xAngle=rotation+number(data.shearX,0,label+'.shearX')*DEG-removedAngle;
  const yAngle=rotation+(90+number(data.shearY,0,label+'.shearY'))*DEG-removedAngle;
  const sx=number(data.scaleX,1,label+'.scaleX'),sy=number(data.scaleY,1,label+'.scaleY');
  const [x,y]=point(parent,number(data.x,0,label+'.x'),number(data.y,0,label+'.y'),label);
  return checked({a:(ax*Math.cos(xAngle)-bx*Math.sin(xAngle))*sx,b:(ax*Math.cos(yAngle)-bx*Math.sin(yAngle))*sy,c:(ay*Math.cos(xAngle)+by*Math.sin(xAngle))*sx,d:(ay*Math.cos(yAngle)+by*Math.sin(yAngle))*sy,x,y},label);
}

function array(value,label){if(!Array.isArray(value))fail(label+' must be an array');return value;}
function numericArray(value,label){return array(value,label).map((item,index)=>number(item,undefined,label+'['+index+']'));}

function setupSequence(data,basePath,label){
  if(!object(data))fail(label+' must be an object');
  const integer=(value,fallback,key,min=0)=>{const result=number(value,fallback,label+'.'+key);if(!Number.isSafeInteger(result)||result<min)fail(label+'.'+key+' must be a safe integer >= '+min);return result;};
  const count=integer(data.count,0,'count',1),start=integer(data.start,1,'start'),digits=integer(data.digits,0,'digits'),setupIndex=integer(data.setup,0,'setup');
  // Bound string allocation; exported public sequences use two digits. Invalid
  // or absurd inputs fail explicitly instead of guessing an atlas region.
  if(digits>128)fail(label+'.digits exceeds the supported path width');
  const resolvedIndex=Math.min(setupIndex,count-1),frameNumber=start+resolvedIndex;
  if(!Number.isSafeInteger(frameNumber))fail(label+' frame number overflow');
  return{
    regionName:normalizeRegionName(name(basePath,label+'.path')+String(frameNumber).padStart(digits,'0')),
    sequence:{count,start,digits,setupIndex,resolvedIndex,frameNumber,animated:false},
  };
}

/**
 * Extract the active default-skin SETUP pose. Coordinate convention is Spine
 * y-up, with no global Skeleton instance position/scale. skeleton.x/y metadata
 * describe editor bounds and are deliberately not applied as translations.
 *
 * UVs address each region's untrimmed original image. Restore atlas trimming and
 * packing rotation before sampling those UVs. The caller maps y-up to its view.
 * Unsupported effects are reported; they are never approximated. Top-level
 * unsupported constraints and active clipping suppress all layers. The only
 * supported constraint is one Spine 4.1 absolute-world translation-only
 * transform with one constrained bone, no skin dependency and order zero.
 * The Spine 4.1 noRotationOrReflection bone mode is supported, including the
 * small-parent-axis fallback. Other non-normal modes suppress the bone and
 * dependent layers. A zero constraint offset needs only its target origin.
 * Spine 4.1 sequences select their setup frame only; no timeline is evaluated.
 * Other unsupported attachments are omitted individually. complete=false must
 * not be presented as full parity, and complete=true describes setup only.
 */
export function extractSetupPose(skeleton){
  if(!object(skeleton))fail('skeleton must be an object');
  const bones=array(skeleton.bones,'bones'),slots=array(skeleton.slots,'slots');
  const layers=[],skipped=[],unsupported=[],appliedConstraints=[],issues=new Set();
  const spineVersion=skeleton.skeleton?.spine??null;
  const report=(code,path,detail)=>{const key=code+'|'+path;if(!issues.has(key)){issues.add(key);unsupported.push({code,path,detail});}};
  let globalBlock=false,clipping=false;
  if(typeof spineVersion!=='string'||!/^4\./.test(spineVersion)){report('SPINE_VERSION_UNSUPPORTED','skeleton.spine',spineVersion);globalBlock=true;}
  for(const kind of ['ik','path','physics'])if(skeleton[kind]!==undefined){
    const constraints=array(skeleton[kind],kind);
    if(constraints.length){report('CONSTRAINT_UNSUPPORTED',kind,{count:constraints.length,names:constraints.map(item=>item?.name??null)});globalBlock=true;}
  }
  const transformConstraints=skeleton.transform===undefined?[]:array(skeleton.transform,'transform');
  const skins=array(skeleton.skins,'skins'),skin=skins.find(item=>item?.name==='default');
  if(!skin||!object(skin.attachments)){report('DEFAULT_SKIN_UNAVAILABLE','skins','A default skin with attachment maps is required');globalBlock=true;}
  const skinBones=new Set(Array.isArray(skin?.bones)?skin.bones:[]);
  const boneIndices=new Map();
  bones.forEach((bone,index)=>{if(!object(bone))fail('bone must be an object');const key=name(bone.name,'bone.name');if(boneIndices.has(key))fail('duplicate bone '+key);boneIndices.set(key,index);});
  const slotNames=new Set();
  slots.forEach(slot=>{if(!object(slot))fail('slot must be an object');const key=name(slot.name,'slot.name');if(slotNames.has(key))fail('duplicate slot '+key);slotNames.add(key);name(slot.bone,'slot.bone');});
  const worlds=new Map(),visiting=new Set(),inactive=new Set();

  function world(index){
    if(!Number.isInteger(index)||index<0||index>=bones.length)fail('mesh bone index is out of range');
    if(worlds.has(index))return worlds.get(index);
    if(visiting.has(index))fail('cyclic bone hierarchy');
    const data=bones[index],label='bones['+index+']';visiting.add(index);
    try{
      if(data.skin===true&&!skinBones.has(data.name)){inactive.add(index);worlds.set(index,null);return null;}
      for(const property of ['transform','inherit'])if(data[property]!==undefined&&data[property]!=='normal'&&!(property==='transform'&&data.transform==='noRotationOrReflection'&&/^4\.1(?:\.|$)/.test(spineVersion))){
        report('BONE_TRANSFORM_UNSUPPORTED',label+'.'+property,data[property]);worlds.set(index,null);return null;
      }
      const local=affine(data,label);let result=local;
      if(data.parent!==undefined){
        const parentName=name(data.parent,label+'.parent'),parentIndex=boneIndices.get(parentName);
        if(parentIndex===undefined)fail('missing parent bone '+parentName);
        const parent=world(parentIndex);
        if(!parent){if(inactive.has(parentIndex))inactive.add(index);worlds.set(index,null);return null;}
        result=data.transform==='noRotationOrReflection'?noRotationOrReflection(parent,data,label):compose(parent,local,label);
      }
      worlds.set(index,result);return result;
    }finally{visiting.delete(index);}
  }

  function descendsFrom(index,ancestor){
    const seen=new Set();
    while(index!==undefined){
      if(index===ancestor)return true;
      if(seen.has(index))fail('cyclic bone hierarchy');seen.add(index);
      const parent=bones[index].parent;if(parent===undefined)return false;
      index=boneIndices.get(name(parent,'bone.parent'));
      if(index===undefined)fail('missing parent bone '+parent);
    }
    return false;
  }

  function targetOrigin(index){
    const data=bones[index],label='bones['+index+']';
    if(data.skin===true&&!skinBones.has(data.name)){inactive.add(index);return null;}
    // Bone.updateWorldTransformWith computes worldX/worldY from the parent
    // before its transform-mode switch. No target basis is needed at offset 0.
    if((data.transform!==undefined&&!['normal','noRotationOrReflection'].includes(data.transform))||(data.inherit!==undefined&&data.inherit!=='normal'))return null;
    const x=number(data.x,0,label+'.x'),y=number(data.y,0,label+'.y');
    if(data.parent===undefined)return[x,y];
    const parentIndex=boneIndices.get(name(data.parent,label+'.parent'));
    if(parentIndex===undefined)fail('missing parent bone '+data.parent);
    const parent=world(parentIndex);return parent?point(parent,x,y,label):null;
  }

  function applyTranslationConstraint(){
    if(!transformConstraints.length)return;
    const block=reason=>{report('CONSTRAINT_UNSUPPORTED','transform',{count:transformConstraints.length,names:transformConstraints.map(item=>item?.name??null),reason});globalBlock=true;};
    if(globalBlock)return block('Another skeleton-wide blocker prevents constraint evaluation');
    if(!/^4\.1(?:\.|$)/.test(spineVersion)||transformConstraints.length!==1)return block('Only one Spine 4.1 transform constraint is supported');
    const data=transformConstraints[0];
    if(!object(data)||!Array.isArray(data.bones)||data.bones.length!==1||typeof data.target!=='string')return block('One constrained bone and a named target are required');
    if((data.local??false)!==false||(data.relative??false)!==false||(data.skin??false)!==false||(data.order??0)!==0)return block('Local, relative, skin-required or nonzero-order transforms are unsupported');
    const mixRotate=number(data.mixRotate,1,'transform.mixRotate'),mixX=number(data.mixX,1,'transform.mixX'),mixY=number(data.mixY,mixX,'transform.mixY');
    const mixScaleX=number(data.mixScaleX,1,'transform.mixScaleX'),mixScaleY=number(data.mixScaleY,mixScaleX,'transform.mixScaleY'),mixShearY=number(data.mixShearY,1,'transform.mixShearY');
    if(mixRotate!==0||mixScaleX!==0||mixScaleY!==0||mixShearY!==0)return block('Only translation mixes may be nonzero');
    const boneIndex=boneIndices.get(name(data.bones[0],'transform.bones[0]')),targetIndex=boneIndices.get(name(data.target,'transform.target'));
    if(boneIndex===undefined||targetIndex===undefined)fail('missing transform constraint bone or target');
    if(descendsFrom(targetIndex,boneIndex))return block('Self-target and descendant-target constraint dependencies are unsupported');
    const offsetX=number(data.x,0,'transform.x'),offsetY=number(data.y,0,'transform.y'),targetBasisUsed=offsetX!==0||offsetY!==0;
    const source=world(boneIndex);
    let target;
    if(targetBasisUsed){const matrix=world(targetIndex);target=matrix?point(matrix,offsetX,offsetY,'transform.target'):null;}
    else target=targetOrigin(targetIndex);
    if(!source||!target)return block('A required constrained bone, target origin or target basis is unsupported or inactive');
    // Negative mixes remain active. mixY defaults to mixX in SkeletonJson.
    const result=checked({...source,x:source.x+(target[0]-source.x)*mixX,y:source.y+(target[1]-source.y)*mixY},'transform');
    worlds.set(boneIndex,result);
    // Spine's update cache resets children after the transform constraint.
    // Recompute descendants from the changed parent, retaining setup locals.
    for(const index of worlds.keys())if(index!==boneIndex&&descendsFrom(index,boneIndex))worlds.delete(index);
    appliedConstraints.push({name:data.name??null,mode:'absolute-world-translation',bone:bones[boneIndex].name,target:bones[targetIndex].name,mixX,mixY,offset:[offsetX,offsetY],targetBasisUsed,targetPoint:target.slice(),before:[source.x,source.y],after:[result.x,result.y]});
  }
  applyTranslationConstraint();

  function meshGeometry(attachment,slotBone,label){
    const uvs=numericArray(attachment.uvs,label+'.uvs');
    if(uvs.length<6||uvs.length%2)fail(label+' needs at least three UV pairs');
    const count=uvs.length/2,triangles=array(attachment.triangles,label+'.triangles').slice();
    if(triangles.length<3||triangles.length%3||triangles.some(index=>!Number.isInteger(index)||index<0||index>=count))fail(label+' has invalid triangle indices');
    const vertices=numericArray(attachment.vertices,label+'.vertices'),weighted=vertices.length!==uvs.length,worldVertices=[];
    if(!weighted){
      const matrix=world(slotBone);if(!matrix)return null;
      for(let index=0;index<vertices.length;index+=2)worldVertices.push(...point(matrix,vertices[index],vertices[index+1],label));
    }else{
      let cursor=0;
      for(let vertex=0;vertex<count;vertex++){
        const influences=vertices[cursor++];
        if(!Number.isInteger(influences)||influences<1||cursor+influences*4>vertices.length)fail(label+' has malformed weighted vertex groups');
        let x=0,y=0;
        for(let influence=0;influence<influences;influence++){
          const index=vertices[cursor++],localX=vertices[cursor++],localY=vertices[cursor++],weight=vertices[cursor++];
          if(weight<0||weight>1)fail(label+' has an invalid bone weight');
          const matrix=world(index);if(!matrix)return null;
          const transformed=point(matrix,localX,localY,label);x+=transformed[0]*weight;y+=transformed[1]*weight;
        }
        if(!Number.isFinite(x)||!Number.isFinite(y))fail(label+' weighted world coordinate overflow');
        worldVertices.push(x,y);
      }
      if(cursor!==vertices.length)fail(label+' has trailing weighted vertex data');
    }
    return{worldVertices,uvs,triangles,weighted};
  }

  for(const[slotIndex,slot]of slots.entries()){
    const attachmentName=slot.attachment,identity={slotIndex,slot:slot.name,attachment:attachmentName??null};
    const skip=reason=>skipped.push({...identity,reason});
    if(attachmentName===undefined||attachmentName===null||attachmentName===''){skip('attachment-unset');continue;}
    name(attachmentName,'slot.attachment');
    const slotColor=color(slot.color,'slot.color');
    if(slotColor[3]===0){skip('alpha-zero');continue;}
    if(globalBlock){skip('unsupported-skeleton');continue;}
    const attachments=skin.attachments[slot.name];
    if(!object(attachments)||!own(attachments,attachmentName)){report('ATTACHMENT_UNAVAILABLE','slots['+slotIndex+']',attachmentName);skip('attachment-unavailable');continue;}
    const attachment=attachments[attachmentName];if(!object(attachment))fail('attachment must be an object');
    const attachmentColor=color(attachment.color,'attachment.color'),opacity=slotColor[3]*attachmentColor[3];
    if(opacity===0){skip('alpha-zero');continue;}
    const label='skins.default.'+slot.name+'.'+attachmentName,kind=attachment.type??'region';
    if(NON_RENDERING.has(kind)){skip('non-rendering-'+kind);continue;}
    if(kind==='clipping'){report('CLIPPING_UNSUPPORTED',label,attachment.end??null);clipping=true;skip('clipping-unsupported');continue;}
    if(kind==='linkedmesh'||attachment.parent!==undefined){report('LINKED_MESH_UNSUPPORTED',label,attachment.parent??null);skip('linked-mesh-unsupported');continue;}
    if(kind!=='region'&&kind!=='mesh'){report('ATTACHMENT_TYPE_UNSUPPORTED',label,kind);skip('attachment-type-unsupported');continue;}
    let resolvedSequence=null;
    if(attachment.sequence!==undefined&&attachment.sequence!==null){
      if(!/^4\.1(?:\.|$)/.test(spineVersion)){report('SEQUENCE_UNSUPPORTED',label,'Setup sequence resolution is verified for Spine 4.1 only');skip('sequence-unsupported');continue;}
      resolvedSequence=setupSequence(attachment.sequence,attachment.path??attachmentName,label+'.sequence');
    }
    if(slot.dark!==undefined){report('TWO_COLOR_TINT_UNSUPPORTED','slots['+slotIndex+'].dark',slot.dark);skip('two-color-tint-unsupported');continue;}
    const blend=slot.blend??'normal';
    if(!BLENDS.has(blend)){report('BLEND_UNSUPPORTED','slots['+slotIndex+'].blend',blend);skip('blend-unsupported');continue;}
    const slotBone=boneIndices.get(slot.bone);if(slotBone===undefined)fail('missing slot bone '+slot.bone);
    const matrix=world(slotBone);
    if(!matrix){skip(inactive.has(slotBone)?'inactive-skin-bone':'unsupported-bone');continue;}
    let geometry;
    if(kind==='mesh')geometry=meshGeometry(attachment,slotBone,label);
    else{
      if((attachment.shearX!==undefined&&attachment.shearX!==0)||(attachment.shearY!==undefined&&attachment.shearY!==0)){report('REGION_SHEAR_UNSUPPORTED',label,'Region attachments do not define bone shear behavior');skip('region-shear-unsupported');continue;}
      if(attachment.width===undefined||attachment.height===undefined){report('REGION_DIMENSIONS_UNAVAILABLE',label,'Explicit untrimmed width and height are required');skip('region-dimensions-unavailable');continue;}
      const width=number(attachment.width,undefined,label+'.width'),height=number(attachment.height,undefined,label+'.height');
      if(width<=0||height<=0)fail(label+' region dimensions must be positive');
      const local=affine({x:attachment.x,y:attachment.y,rotation:attachment.rotation,scaleX:attachment.scaleX,scaleY:attachment.scaleY},label),transform=compose(matrix,local,label);
      const worldVertices=[[-width/2,-height/2],[width/2,-height/2],[width/2,height/2],[-width/2,height/2]].flatMap(([x,y])=>point(transform,x,y,label));
      geometry={worldVertices,uvs:[0,1,1,1,1,0,0,0],triangles:[0,1,2,0,2,3],weighted:false};
    }
    if(!geometry){skip('unsupported-or-inactive-weighted-bone');continue;}
    const regionName=resolvedSequence?.regionName??normalizeRegionName(attachment.path??attachmentName);
    layers.push({...identity,regionName,kind,...geometry,opacity,blend,tint:[0,1,2].map(i=>slotColor[i]*attachmentColor[i]),...(resolvedSequence?{sequence:resolvedSequence.sequence}:{})});
  }
  if(clipping){for(const layer of layers)skipped.push({slotIndex:layer.slotIndex,slot:layer.slot,attachment:layer.attachment,reason:'pose-suppressed-by-clipping'});layers.length=0;}
  let bounds=null;
  if(layers.length){
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const layer of layers)for(let i=0;i<layer.worldVertices.length;i+=2){const x=layer.worldVertices[i],y=layer.worldVertices[i+1];minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    bounds={minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};
    if(!Object.values(bounds).every(Number.isFinite))fail('aggregate bounds overflow');
  }
  return{schemaVersion:1,spineVersion,skin:'default',coordinateSystem:'spine-y-up',uvSpace:'untrimmed-region',drawOrder:'setup-slot-order',animationsApplied:false,complete:unsupported.length===0,layers,skipped,unsupported,appliedConstraints,bounds};
}
