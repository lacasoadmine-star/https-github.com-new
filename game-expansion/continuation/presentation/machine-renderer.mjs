import {drawAtlasFrame} from './atlas.mjs';

// This renderer consumes supplied state. It has no wager, wallet, RNG or outcome API.
const box = (x,y,width,height) => ({x,y,width,height});
const PALETTES = {
  habeshafortune5_native:{background:'#27190d',ink:'#ffdda1',panel:'#322310'},
  safarisimba_native:{background:'#24200f',ink:'#ffe6a3',panel:'#302711'},
  multihotwildways_native:{background:'#08251d',ink:'#ffe78f',panel:'#073421'},
  multihot5wild_native:{background:'#052b24',ink:'#f9df96',panel:'#053425'},
  multihot5superwilds_native:{background:'#052b24',ink:'#f7df8d',panel:'#063629'},
  multihot40_native:{background:'#032b20',ink:'#f5df8d',panel:'#06382b'},
  multihot100_native:{background:'#032b20',ink:'#f5df8d',panel:'#06382b'},
  multihotdeluxe_native:{background:'#1a1207',ink:'#ffdb79',panel:'#312607'},
  burningice_native:{background:'#041b30',ink:'#cef2ff',panel:'#08263e'},
  burningice10_native:{background:'#041b30',ink:'#cef2ff',panel:'#08263e'},
  burningice40_native:{background:'#041b30',ink:'#cef2ff',panel:'#08263e'},
};
const moneyString = value => typeof value === 'string' && /^(0|[1-9]\d*)(\.\d{1,2})?$/.test(value) ? value : '—';
export function minorMoney(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return '—';
  const amount=BigInt(value);return `${amount/100n}.${String(amount%100n).padStart(2,'0')}`;
}
export function multiplierAngle(value, manifest) {
  if (!manifest?.multiplier || !Number.isInteger(value) || !manifest.multiplier.values.includes(value)) return null;
  return Math.PI * manifest.multiplier.angleNumerators[value] / manifest.multiplier.angleDenominator;
}
export function validGrid(grid, manifest) {
  return Array.isArray(grid) && grid.length===manifest.grid.columns && grid.every(column=>Array.isArray(column)&&column.length===manifest.grid.rows&&column.every(id=>Object.hasOwn(manifest.symbols,String(id))));
}
export function fitViewport(width,height,{referenceWidth=420,referenceHeight=900}={}) {
  if (![width,height,referenceWidth,referenceHeight].every(v=>Number.isFinite(v)&&v>0)) throw new Error('Invalid viewport');
  const scale=Math.min(width/referenceWidth,height/referenceHeight);
  return {scale,x:(width-referenceWidth*scale)/2,y:(height-referenceHeight*scale)/2,width:referenceWidth*scale,height:referenceHeight*scale};
}

export function reelLayout(manifest){
  const descriptor=manifest.board||{type:'single',frame:'Box/Background'},frame=manifest.frames[descriptor.frame];
  const deluxe=manifest.id==='multihotdeluxe_native',maximum=manifest.grid.rows===4?box(3,249,414,339):box(14,240,392,355);
  if(deluxe){maximum.x=7;maximum.width=327;maximum.y=235;maximum.height=350;}
  if(!frame)throw new Error('Missing mapped reel board artwork');
  const ratio=descriptor.type==='columns'?frame.width*manifest.grid.columns/frame.height:frame.width/frame.height;
  const width=Math.min(maximum.width,maximum.height*ratio),height=width/ratio;
  const board=box(maximum.x+(maximum.width-width)/2,maximum.y+(maximum.height-height)/2,width,height);
  const sculpted=manifest.id==='habeshafortune5_native'||manifest.id==='safarisimba_native';
  const insetX=width*(sculpted?.085:.025),insetTop=height*(sculpted?.10:.035),insetBottom=height*(sculpted?.09:.035);
  return{board,grid:box(board.x+insetX,board.y+insetTop,width-2*insetX,height-insetTop-insetBottom),descriptor};
}

export function createPresentationScene(manifest,snapshot={},options={}) {
  const palette=PALETTES[manifest.id]||PALETTES.multihot40_native,commands=[];
  const sprite=(frame,target,extra={})=>{if(manifest.frames[frame])commands.push({type:'sprite',frame,box:target,...extra});};
  const text=(value,x,y,size=14,color=palette.ink,extra={})=>commands.push({type:'text',text:String(value),x,y,size,color,align:'center',...extra});
  const rect=(target,color,extra={})=>commands.push({type:'rect',box:target,color,...extra});
  const lines=reelLayout(manifest);
  rect(box(0,0,420,900),palette.background);
  if(manifest.background?.frame)sprite(manifest.background.frame,box(0,0,420,900),{fit:'cover'});
  else if(manifest.background?.file)commands.push({type:'image',file:manifest.background.file,box:box(0,0,420,900),fit:'cover'});
  rect(box(0,0,420,46),'#00130ebf');text(options.review?'PRESENTATION REVIEW':'ZPLAY',210,28,12,'#d9e8dc');
  if(manifest.logo?.layers){
    const target=box(70,78,280,94),bounds=manifest.logo.bounds,scale=Math.min(target.width/bounds.width,target.height/bounds.height),x=target.x+(target.width-bounds.width*scale)/2,y=target.y+(target.height-bounds.height*scale)/2;
    for(const layer of manifest.logo.layers)sprite(layer.frame,box(x+(layer.box.x-bounds.x)*scale,y+(layer.box.y-bounds.y)*scale,layer.box.width*scale,layer.box.height*scale),{fit:'stretch'});
  }else if(manifest.logo)sprite(manifest.logo.frame,manifest.featurePresentation?.type==='frozen-reels'?box(58,71,304,139):box(70,78,280,72));
  else text(manifest.name.toUpperCase(),210,115,25,palette.ink);

  if(manifest.multiplier) {
    const multiple=snapshot.round?.feature?.multiplier ?? snapshot.multiplier;
    const rotation=multiplierAngle(multiple,manifest) ?? multiplierAngle(1,manifest), origin={x:210,y:400}, scale=.4;
    const polygon=points=>Array.from({length:points.length/2},(_,i)=>({x:origin.x+(points[i*2]-660)*scale,y:origin.y+(points[i*2+1]-760)*scale}));
    const normalClip=polygon([202,367,305,269,417,198,516,161,581,367,738,367,801,161,918,204,1015,268,1124,368,1037,368,273,367]);
    const lightClip=polygon([543,170,657,145,773,170,720,358,592,358]);
    sprite(manifest.multiplier.background,box(origin.x-660*scale,origin.y-660*scale,1320*scale,1320*scale),{padding:true});
    const wheel=box(origin.x-582*scale,origin.y-642*scale,1164*scale,1164*scale),rotateAt={x:origin.x,y:origin.y-60*scale};
    sprite(manifest.multiplier.normal,wheel,{padding:true,rotation,rotateAt,clipPolygon:normalClip});
    sprite(manifest.multiplier.light,wheel,{padding:true,rotation,rotateAt,clipPolygon:lightClip});
  }
  const frozen=(snapshot.feature||snapshot.round?.feature)?.frozenReels;
  const frozenReels=new Set(Array.isArray(frozen)?frozen.filter(column=>Number.isInteger(column)&&column>=0&&column<manifest.grid.columns):[]);
  if(lines.descriptor.type==='columns'){
    for(let column=0;column<manifest.grid.columns;column++){
      const frame=frozenReels.has(column)&&lines.descriptor.activeFrame?lines.descriptor.activeFrame:lines.descriptor.frame;
      sprite(frame,box(lines.board.x+column*lines.board.width/manifest.grid.columns,lines.board.y,lines.board.width/manifest.grid.columns,lines.board.height));
    }
  }else sprite(lines.descriptor.frame,lines.board);
  if(manifest.featurePresentation?.type==='vertical-multipliers'){
    const target=box(343,lines.board.y+20,68,lines.board.height-40),value=(snapshot.feature||snapshot.round?.feature)?.multiplier;
    sprite('Multiplier/Background',target);
    const confirmed=Number.isInteger(value)&&value>=1&&value<=5;
    if(confirmed||options.review)for(let index=0;index<5;index++){
      const multiple=confirmed?(value-1+index-2+5)%5+1:index+1;
      sprite('Multiplier/'+multiple,box(target.x+8,target.y+8+index*(target.height-16)/5,target.width-16,(target.height-16)/5),{opacity:!confirmed||value===multiple?1:.4});
    }else text('—',target.x+target.width/2,target.y+target.height/2,18,'#ffffff');
  }
  const suppliedGrid=validGrid(snapshot.grid,manifest)?snapshot.grid:null;
  const cw=lines.grid.width/manifest.grid.columns,ch=lines.grid.height/manifest.grid.rows;
  for(let column=0;column<manifest.grid.columns;column++)for(let row=0;row<manifest.grid.rows;row++) {
    const cell=box(lines.grid.x+column*cw,lines.grid.y+row*ch,cw,ch);
    if(!suppliedGrid){text('—',cell.x+cw/2,cell.y+ch/2,18,'#b2b9a780');continue;}
    const id=String(suppliedGrid[column][row]),symbol=manifest.symbols[id];
    const frame=snapshot.pending&&symbol.blurFrame?symbol.blurFrame:symbol.frame,placement=manifest.symbolPlacement;
    if(placement){const scale=Math.min(cw/placement.cellWidth,ch/placement.cellHeight),source=manifest.frames[frame].original;sprite(frame,box(cell.x+cw/2+placement.offsetX*scale,cell.y+ch/2+placement.offsetY*scale,source.width*scale,source.height*scale),{clip:cell,padding:true});}
    else sprite(frame,box(cell.x+cw*.06,cell.y+ch*.055,cw*.88,ch*.89),{clip:cell});
  }
  if(suppliedGrid&&Array.isArray(snapshot.wins)) {
    // Only explicitly supplied visible-frame wins are shown; totals remain separate.
    for(const win of snapshot.wins)for(const cell of win.cells||[]) {
      const[c,r]=cell;if(!Number.isInteger(c)||!Number.isInteger(r)||c<0||c>=manifest.grid.columns||r<0||r>=manifest.grid.rows)continue;
      commands.push({type:'outline',box:box(lines.grid.x+c*cw+2,lines.grid.y+r*ch+2,cw-4,ch-4),color:'#ffe994',lineWidth:2});
    }
  }
  if(manifest.featurePresentation?.type==='frozen-reels')for(const column of frozenReels){
    const x=lines.board.x+column*lines.board.width/manifest.grid.columns;
    if(manifest.featurePresentation.holdFrame)sprite(manifest.featurePresentation.holdFrame,box(x+2,lines.board.y+lines.board.height-20,lines.board.width/manifest.grid.columns-4,27));
  }
  const winY=lines.board.y+lines.board.height+7;
  sprite('Start/FooterWin',box(126,winY,168,53));
  text('WIN',210,winY+17,10);text(minorMoney(snapshot.round?.payoutMinor)+(snapshot.round?.payoutMinor?' '+(snapshot.currency||'ETB'):''),210,winY+35,14,'#ffffff');
  const canStart=manifest.productionLaunchEnabled===true&&snapshot.canStart===true&&!options.review,spinFrame=canStart?manifest.controls.spin.idle:(manifest.controls.spin.disabled||manifest.controls.spin.idle);
  if(spinFrame)sprite(spinFrame,box(145,690,130,130));
  text(snapshot.pending?'WAIT':options.review||manifest.productionLaunchEnabled!==true?'PREVIEW':canStart?'SPIN':snapshot.authenticated?'PAUSED':'SIGN IN',210,755,15,'#ffffff');
  for(const[name,x]of[['autoPlay',63],['bet',307]]) {
    const states=manifest.controls[name]||{},frame=options.review?(states.disabled||states.idle):states.idle;
    if(frame)sprite(frame,box(x,726,50,54));
  }
  for(const[name,x]of[['menu',34],['sound',102],['turbo',326]]) {
    const frame=manifest.controls[name]?.idle;if(frame)sprite(frame,box(x,826,37,36));
  }
  rect(box(18,862,384,1),'#91ab7770');
  text('BALANCE',100,875,9);text(moneyString(snapshot.balance),100,891,12,'#ffffff');
  text('BET',316,875,9);text(moneyString(snapshot.stake),316,891,12,'#ffffff');
  if(options.review)text('Static artwork preview · no wallet connection',210,659,10,'#d1dccd');
  return {schemaVersion:1,gameId:manifest.id,width:420,height:900,financialActions:false,productionLaunchEnabled:false,commands};
}

const mimeFor=file=>file.endsWith('.webp')?'image/webp':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.png')?'image/png':file.endsWith('.mp3')?'audio/mpeg':'application/octet-stream';
export class ReferenceAssetStore {
  constructor(manifest,{baseURL,fetchImpl=globalThis.fetch}={}) {
    this.manifest=manifest;this.baseURL=baseURL||new URL('./assets/',import.meta.url).href;this.fetchImpl=fetchImpl;this.buffers=new Map();this.images=new Map();this.urls=[];this.fonts=[];
  }
  async loadBytes(file) {
    if(!/^[a-f0-9]{64}\.[a-z0-9]+$/.test(file))throw new Error('Invalid locked asset filename');
    if(this.buffers.has(file))return this.buffers.get(file);
    const entry=this.manifest.files[file];if(!entry)throw new Error('Asset is not in the locked manifest');
    const pending=(async()=>{
      const response=await this.fetchImpl(new URL(file,this.baseURL),{credentials:'omit',redirect:'error'});
      if(!response.ok)throw new Error('Asset request failed: '+response.status);
      const bytes=await response.arrayBuffer();if(bytes.byteLength!==entry.bytes)throw new Error('Asset size mismatch');
      const digest=await crypto.subtle.digest('SHA-256',bytes),actual=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
      if(actual!==entry.sha256)throw new Error('Asset hash mismatch');return bytes;
    })();this.buffers.set(file,pending);
    try{return await pending;}catch(error){this.buffers.delete(file);throw error;}
  }
  async loadImage(file) {
    if(this.images.has(file))return this.images.get(file);
    const pending=(async()=>{
      const bytes=await this.loadBytes(file),blob=new Blob([bytes],{type:mimeFor(file)});
      if(typeof createImageBitmap==='function')return createImageBitmap(blob);
      const url=URL.createObjectURL(blob);this.urls.push(url);
      return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Image decode failed'));image.src=url;});
    })();this.images.set(file,pending);
    try{return await pending;}catch(error){this.images.delete(file);throw error;}
  }
  async prepare(scene) {
    const files=new Set(scene.commands.flatMap(command=>command.type==='sprite'?[this.manifest.frames[command.frame].file]:command.type==='image'?[command.file]:[]));
    const loaded=await Promise.all([...files].map(async file=>[file,await this.loadImage(file)]));
    const font=this.manifest.fonts.find(item=>/Poppins-Bold/i.test(item.name));
    if(font&&typeof FontFace!=='undefined'&&!this.fonts.length){const face=new FontFace('ZplayReference',await this.loadBytes(font.file),{weight:'700'});await face.load();document.fonts.add(face);this.fonts.push(face);}
    return new Map(loaded);
  }
  async playSound(key,{volume=.35}={}) {
    const item=this.manifest.audio[key];if(!item)return false;
    const bytes=await this.loadBytes(item.file),url=URL.createObjectURL(new Blob([bytes],{type:mimeFor(item.file)}));this.urls.push(url);
    const audio=new Audio(url);audio.volume=Math.max(0,Math.min(1,volume));await audio.play();return audio;
  }
  dispose(){for(const value of this.images.values())Promise.resolve(value).then(image=>image.close?.()).catch(()=>{});for(const url of this.urls)URL.revokeObjectURL(url);for(const font of this.fonts)document.fonts.delete(font);this.urls=[];this.fonts=[];}
}

export function paintScene(context,scene,manifest,images,{width=scene.width,height=scene.height}={}) {
  const viewport=fitViewport(width,height,{referenceWidth:scene.width,referenceHeight:scene.height});
  context.save();context.clearRect(0,0,width,height);context.translate(viewport.x,viewport.y);context.scale(viewport.scale,viewport.scale);
  for(const command of scene.commands) {
    context.save();
    if(command.clip){context.beginPath();context.rect(command.clip.x,command.clip.y,command.clip.width,command.clip.height);context.clip();}
    if(command.clipPolygon){context.beginPath();command.clipPolygon.forEach((point,i)=>i?context.lineTo(point.x,point.y):context.moveTo(point.x,point.y));context.closePath();context.clip();}
    if(command.rotation){context.translate(command.rotateAt.x,command.rotateAt.y);context.rotate(command.rotation);context.translate(-command.rotateAt.x,-command.rotateAt.y);}
    if(command.type==='sprite')drawAtlasFrame(context,images.get(manifest.frames[command.frame].file),manifest.frames[command.frame],command.box,{padding:command.padding,fit:command.fit,opacity:command.opacity});
    else if(command.type==='image'){
      const image=images.get(command.file),b=command.box,scale=(command.fit==='cover'?Math.max:Math.min)(b.width/image.width,b.height/image.height);
      context.beginPath();context.rect(b.x,b.y,b.width,b.height);context.clip();context.drawImage(image,b.x+(b.width-image.width*scale)/2,b.y+(b.height-image.height*scale)/2,image.width*scale,image.height*scale);
    }else if(command.type==='rect'){context.fillStyle=command.color;context.fillRect(command.box.x,command.box.y,command.box.width,command.box.height);}
    else if(command.type==='outline'){context.strokeStyle=command.color;context.lineWidth=command.lineWidth;context.strokeRect(command.box.x,command.box.y,command.box.width,command.box.height);}
    else if(command.type==='text'){context.font=`700 ${command.size}px ZplayReference,Arial,sans-serif`;context.textAlign=command.align;context.textBaseline='middle';context.fillStyle=command.color;context.fillText(command.text,command.x,command.y);}
    context.restore();
  }
  context.restore();return viewport;
}
