/**
 * Reference-only validator for sprite manifests returned by the current
 * SmartSoft Multi Hot 5 Burn Wilds demo. Does not download, bundle or
 * redistribute artwork. A commercial player must use licensed asset sources.
 */
export const BURN_WILDS_OFFICIAL_ATLASES=Object.freeze([
  {index:0,frames:125,width:2048,height:2047},
  {index:1,frames:70,width:1957,height:2027},
  {index:2,frames:3,width:1080,height:1316},
  {index:3,frames:1,width:1079,height:1097},
  {index:4,frames:1,width:1079,height:1097}
].map(v=>Object.freeze(v)));
export const BURN_WILDS_DEMO_ATLAS_ROOT='https://static.ssg-public.com/cache/b1/SlotsDemo/Content/Images/MultiHot5BurnWilds/Images/Sprites/';
export const BURN_WILDS_REQUIRED_FRAMES=Object.freeze([
  ...Array.from({length:9},(_,n)=>'Box/'+n),
  'Buttons/Spin','Buttons/SpinStop','Buttons/AutoPlay',
  'Buttons/AutoPlayStop','Buttons/Bet','Buttons/Menu',
  'Buttons/SoundOn','Buttons/SoundOff','Buttons/QuickPlayTurbo',
  'Bets/Popup','Multiplier/Blur','Multiplier/Light','Multiplier/Numbers'
]);
const invalid=(code)=>{throw new TypeError('BURN_WILDS_REFERENCE_'+code);};
function checkFrame(data,{width,height}){
  const rect=data?.frame,source=data?.sourceSize;
  if(!rect||!source||!['x','y','w','h'].every(key=>Number.isSafeInteger(rect[key]))||
    !['w','h'].every(key=>Number.isSafeInteger(source[key]))||
    rect.x<0||rect.y<0||rect.w<=0||rect.h<=0||
    rect.x+rect.w>width||rect.y+rect.h>height||
    source.w<=0||source.h<=0||
    typeof data.rotated!=='boolean'||typeof data.trimmed!=='boolean')invalid('BAD_FRAME');
}
export function auditBurnWildsOfficialAtlas(manifests){
  if(!Array.isArray(manifests)||manifests.length!==BURN_WILDS_OFFICIAL_ATLASES.length)
    invalid('ATLAS_COUNT');
  const found=new Set(),indices=[];
  for(let index=0;index<manifests.length;index++){
    const manifest=manifests[index],reference=BURN_WILDS_OFFICIAL_ATLASES[index];
    if(!manifest||!manifest.frames||Array.isArray(manifest.frames)||
       typeof manifest.frames!=='object'||manifest.meta?.image!=='Images-'+index+'.png'||
       manifest.meta?.size?.w!==reference.width||manifest.meta?.size?.h!==reference.height)
       invalid('ATLAS_METADATA');
    const names=Object.keys(manifest.frames);
    if(names.length!==reference.frames)invalid('FRAME_COUNT');
    for(const name of names){
      if(found.has(name))invalid('DUPLICATE_FRAME');
      found.add(name);
      checkFrame(manifest.frames[name],reference);
    }
    indices.push(Object.freeze({index,frames:names.length,image:manifest.meta.image}));
  }
  for(const name of BURN_WILDS_REQUIRED_FRAMES)
    if(!found.has(name))invalid('MISSING_'+name.replace(/[^A-Za-z0-9]/g,'_').toUpperCase());
  return Object.freeze({gameId:'zplay72_multi_hot_5_burn_wilds_v1',
    atlasCount:indices.length,frameCount:found.size,
    verifiedFrameNames:Object.freeze([...BURN_WILDS_REQUIRED_FRAMES]),
    packs:Object.freeze(indices)});
}
export async function inspectCurrentBurnWildsOfficialAtlas(fetchManifest){
  if(typeof fetchManifest!=='function')invalid('FETCHER_REQUIRED');
  const manifests=[];
  for(const pack of BURN_WILDS_OFFICIAL_ATLASES){
    const name='Images-'+pack.index+'.json',url=BURN_WILDS_DEMO_ATLAS_ROOT+name;
    manifests.push(await fetchManifest(url));
  }
  return auditBurnWildsOfficialAtlas(manifests);
}

