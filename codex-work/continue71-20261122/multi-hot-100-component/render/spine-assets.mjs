/** Minimal region decoder for own current M100 Spine resources. Not a provider runtime. */
export function parseSpineAtlas(text) {
  const pages=[],regions=new Map();let page=null,region=null;
  for(const raw of text.split(/\r?\n/)){
    const line=raw.trim();if(!line){region=null;continue;}
    if(!raw.startsWith(' ')&&!line.includes(':')){
      if(/\.png$/i.test(line)){page=line;pages.push(page);region=null;}
      else {if(!page||regions.has(line))throw new Error('M100_SPINE_ATLAS_REGION');region={name:line,page};regions.set(line,region);}
      continue;
    }
    if(!region)continue;
    const colon=line.indexOf(':');if(colon<0)throw new Error('M100_SPINE_ATLAS_FIELD');
    const key=line.slice(0,colon),value=line.slice(colon+1).trim();
    if(key==='rotate')region.rotate=value==='true'?90:value==='false'?0:Number(value);
    else if(['xy','size','orig','offset'].includes(key))region[key]=value.split(',').map(x=>Number(x.trim()));
  }
  for(const region of regions.values()){
    if(![0,90].includes(region.rotate)||['xy','size','orig','offset'].some(k=>!Array.isArray(region[k])||region[k].length!==2||region[k].some(n=>!Number.isSafeInteger(n)||n<0)))throw new Error('M100_SPINE_ATLAS_BOUNDS');
    if(region.size[0]<1||region.size[1]<1||region.offset[0]+region.size[0]>region.orig[0]||region.offset[1]+region.size[1]>region.orig[1])throw new Error('M100_SPINE_ATLAS_TRIM');
  }
  return {pages:Object.freeze(pages),regions};
}

export function decodeSpineRegion(region,texture,canvasFactory){
  const [x,y]=region.xy,[w,h]=region.size,[ow,oh]=region.orig,[ox,oy]=region.offset;
  const sw=region.rotate?h:w,sh=region.rotate?w:h;
  if(x+sw>texture.width||y+sh>texture.height)throw new Error('M100_SPINE_TEXTURE_BOUNDS');
  const c=canvasFactory(ow,oh),ctx=c.getContext('2d'),top=oh-oy-h;
  ctx.imageSmoothingEnabled=false;ctx.save();
  if(region.rotate){ctx.translate(ox+w,top);ctx.rotate(Math.PI/2);ctx.drawImage(texture,x,y,sw,sh,0,0,sw,sh);}
  else ctx.drawImage(texture,x,y,w,h,ox,top,w,h);
  ctx.restore();return c;
}

export function createM100SpineRegions({atlasText,pages,canvasFactory}){
  const atlas=parseSpineAtlas(atlasText),cache=new Map();
  for(const page of atlas.pages)if(!pages[page])throw new Error('M100_SPINE_PAGE_MISSING');
  return Object.freeze({names:Object.freeze([...atlas.regions.keys()]),get(name){
    const region=atlas.regions.get(name);if(!region)throw new Error('M100_SPINE_REGION_MISSING');
    if(!cache.has(name))cache.set(name,decodeSpineRegion(region,pages[region.page],canvasFactory));return cache.get(name);
  }});
}

export function createM100Logo({skeleton,regions,canvasFactory}){
  if(skeleton.skeleton?.spine!=='3.8.99'||skeleton.slots?.[0]?.attachment!=='Layer 1'||!skeleton.animations?.animation)throw new Error('M100_LOGO_SOURCE_UNSUPPORTED');
  const layer=skeleton.skins[0].attachments['Layer 1']['Layer 1'];
  const sequence=skeleton.animations.animation.slots['multi hot'].attachment;
  const move=skeleton.animations.animation.bones['Multi Hot'].translate;
  if(move.length!==1||layer.width!==690||layer.height!==167)throw new Error('M100_LOGO_SOURCE_TRANSFORM');
  const c=canvasFactory(690,167),ctx=c.getContext('2d');
  return Object.freeze({
    imageAt(timeSeconds=0){
      if(!Number.isFinite(timeSeconds)||timeSeconds<0)throw new RangeError('M100_LOGO_TIME');
      const t=timeSeconds%2.8333;ctx.clearRect(0,0,690,167);ctx.drawImage(regions.get('Layer 1'),0,0);
      let key=sequence[0];for(const k of sequence)if((k.time??0)<=t)key=k;
      if(key?.name){
        const attachment=skeleton.skins[0].attachments['multi hot'][key.name];const x=move[0].x+(attachment.x??0)-attachment.width/2+1;
        const y=-(move[0].y+(attachment.y??0))-attachment.height/2+1;
        // Exact attachment sequence; source fade curve is kept separate until a complete Spine runtime is validated.
        // At its fade portion use only the base layer, avoiding an invented easing curve.
        if(t<2.3333){ctx.save();ctx.globalCompositeOperation='lighter';ctx.drawImage(regions.get(key.name),x,y,attachment.width,attachment.height);ctx.restore();}
      }
      return c;
    },
    animationAttachmentSequenceVerified:true,fullSpineAnimationVerified:false,sourceFrameCount:sequence.length,
  });
}
