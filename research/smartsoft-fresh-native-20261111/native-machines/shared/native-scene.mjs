// Presentation from freshly observed native geometry and original texture data.
// No screenshot/video surface, local outcome RNG or provider account is used.
export class NativeScene {
 constructor(pack,host,{values={},onAction=()=>{}}={}){this.pack=pack;this.host=host;this.values={balance:'—',stake:'—',win:'0.00',currency:'ETB',...values};this.onAction=onAction;this.nodes=new Map();this.spineData=new Map();this.baseTextures=new Map();this.pose=null;this.hits=new Map();this.epoch=0;this.activeReels=[];this.stopped=false;this.received=false;}
 asset(name){return this.pack.assetBase+name;}
 async json(name){const r=await fetch(this.asset(name));if(!r.ok)throw Error('NATIVE_ASSET_UNAVAILABLE');return r.json();}
 async image(name){if(this.baseTextures.has(name))return this.baseTextures.get(name);const image=new Image();image.src=this.asset(name);await image.decode();const base=PIXI.BaseTexture.from(image);this.baseTextures.set(name,base);return base;}
 async load(){
  // The observed renderer vendor had a page-specific rotation hook. Our own
  // canvas uses an unrotated CSS rectangle, so map actual pointer coordinates
  // directly without depending on the provider's surrounding page/jQuery.
  if(PIXI.InteractionManager)PIXI.InteractionManager.prototype.mapPositionToPoint=function(point,x,y){const rect=this.interactionDOMElement.getBoundingClientRect(),resolution=1/this.resolution;point.x=(x-rect.left)*(this.interactionDOMElement.width/rect.width)*resolution;point.y=(y-rect.top)*(this.interactionDOMElement.height/rect.height)*resolution;};
  this.app=new PIXI.Application({width:1,height:1,backgroundAlpha:0,antialias:true,autoDensity:true,resolution:1});this.host.replaceChildren(this.app.view);this.app.view.setAttribute('aria-label',this.pack.name);
  await Promise.all(this.pack.sheets.map(async sheet=>{const [base,data]=await Promise.all([this.image(sheet.image),this.json(sheet.json)]);const atlas=new PIXI.Spritesheet(base,data);await new Promise(resolve=>atlas.parse(resolve));}));
  this.choosePose();
  const rawTextures=new Set(this.pose.nodes.map(n=>n.texture?.source&&this.pack.images[decodeURI(n.texture.source).split('?')[0]]).filter(Boolean));
  await Promise.all([...rawTextures].map(name=>this.image(name)));
  const required=new Set(this.pose.nodes.filter(n=>n.spine).map(n=>this.spineDefinition(n).json));
  for(const name of required)await this.loadSpine(this.pack.spines.find(s=>s.json===name));
  await document.fonts.ready;this.build();this.resize();
  this.resizeHandler=()=>{clearTimeout(this.resizeTimer);this.resizeTimer=setTimeout(()=>this.refreshPose(),100);};addEventListener('resize',this.resizeHandler);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stopMotion();});
  return this;
 }
 choosePose(){const ratio=this.host.clientWidth/Math.max(1,this.host.clientHeight);this.pose=Object.values(this.pack.poses).filter(p=>p.nodes?.length&&Object.keys(p.bindings??{}).length).sort((a,b)=>Math.abs(Math.log(ratio/((a.canvas?.css?.width??a.viewport.width)/(a.canvas?.css?.height??a.viewport.height))))-Math.abs(Math.log(ratio/((b.canvas?.css?.width??b.viewport.width)/(b.canvas?.css?.height??b.viewport.height)))))[0];if(!this.pose)throw Error('NATIVE_SCENE_UNAVAILABLE');}
 spineDefinition(node){
  if(node.spine.sourceKey){const direct=this.pack.spines.find(s=>s.aliases.includes(node.spine.sourceKey));if(direct)return direct;}
  const animationNames=node.spine.animations.map(x=>x.name).sort().join('|');const descendants=this.pose.nodes.filter(n=>{let p=n;while(p?.parent!==null&&p?.parent!==undefined){if(p.parent===node.id)return true;p=this.pose.nodes[p.parent];}return false;});
  const pages=new Set(descendants.map(n=>n.texture?.source&&this.pack.images[decodeURI(n.texture.source).split('?')[0]]).filter(Boolean));
  const scored=this.pack.spines.map(s=>({s,score:(s.animations.slice().sort().join('|')===animationNames?10:0)+Object.values(s.pages).filter(p=>pages.has(p)).length*100})).sort((a,b)=>b.score-a.score);
  if(!scored[0]||scored[0].score<10||scored[1]?.score===scored[0].score)throw Error('UNRESOLVED_NATIVE_ANIMATION');return scored[0].s;
 }
 async loadSpine(def){
  if(this.spineData.has(def.json))return;
  const atlas=await (await fetch(this.asset(def.atlas))).text(),images={};
  for(const[name,file]of Object.entries(def.pages))images[name]=await this.image(file);
  const loader=new PIXI.Loader();loader.add('component',this.asset(def.json),{metadata:{atlasRawData:atlas,images}});
  const data=await new Promise((resolve,reject)=>{loader.onError.add(e=>reject(Error(String(e))));loader.load((_,r)=>r.component?.spineData?resolve(r.component.spineData):reject(Error('INVALID_NATIVE_SKELETON')));});
  this.spineData.set(def.json,data);
 }
 texture(record){
  for(const id of record.ids??[])if(PIXI.utils.TextureCache[id])return PIXI.utils.TextureCache[id];
  const file=record.source&&this.pack.images[decodeURI(record.source).split('?')[0]],base=this.baseTextures.get(file);
  if(!base)return PIXI.Texture.EMPTY;
  const rect=value=>value?new PIXI.Rectangle(value.x??0,value.y??0,value.width,value.height):undefined;
  return new PIXI.Texture(base,rect(record.frame),rect(record.orig),rect(record.trim),record.rotate??0);
 }
 style(raw={}){const out={};for(const[key,value]of Object.entries(raw)){const k=key.startsWith('_')?key.slice(1):key;if(['styleID','valign','tagStyle'].includes(k))continue;if(value!==undefined&&value!==null)out[k]=value;}out.fill??='#e7a310';return out;}
 formatText(node){let text=String(node.text??'').replaceAll('DMO',this.values.currency);const bindings=this.pose.bindings??{};
  if(node.id===bindings['common.balance'])text=`BALANCE\n<text1>${this.values.balance}</text1> <text2>${this.values.currency}</text2>`;
  if(node.id===bindings['common.bet'])text=`BET\n<text1>${this.values.stake}</text1> <text2>${this.values.currency}</text2>`;
  if(node.id===bindings['common.win'])text=this.pack.officialId==='safari-simba-2'?`<text1>${this.values.win}</text1>\n<text2>${this.values.currency}</text2>`:`WIN\n<text1>${this.values.win}</text1> <text2>${this.values.currency}</text2>`;
  // Raw provider amounts are never displayed when a binding was unavailable.
  if(!Object.values(bindings).includes(node.id)&&/20[,.]?000/.test(text))text=text.replace(/20[,.]?000(?:\.00)?/g,'—');return text;
 }
 build(){
  this.clearRoundEffects();for(const child of this.app.stage.removeChildren())child.destroy({children:true,texture:false,baseTexture:false});this.nodes.clear();this.rawNodes=new Map(this.pose.nodes.map(n=>[n.id,n]));const skipped=new Set();
  for(const raw of this.pose.nodes){if(skipped.has(raw.parent)){skipped.add(raw.id);continue;}
   let item;
   if(raw.spine){const def=this.spineDefinition(raw);item=new PIXI.spine.Spine(this.spineData.get(def.json));for(const track of raw.spine.tracks??[]){const t=item.state.setAnimation(0,track.animation,track.loop);t.trackTime=track.trackTime??0;t.timeScale=track.timeScale??1;}if(raw.spine.skin&&item.skeleton.data.findSkin(raw.spine.skin))item.skeleton.setSkinByName(raw.spine.skin);item.skeleton.setSlotsToSetupPose();item.update(0);skipped.add(raw.id);}
   else if(raw.text!==undefined){const style=this.style(raw.style);item=raw.type==='o'&&(globalThis.MultiStyleText||PIXI.MultiStyleText)?new (globalThis.MultiStyleText||PIXI.MultiStyleText)(this.formatText(raw),raw.textStyles??{default:style,text1:{...style,fill:'#ffffff'},text2:{...style,fontSize:(style.fontSize??24)*.75,fill:'#ffffff'}}):new PIXI.Text(this.formatText(raw).replace(/<[^>]*>/g,''),style);}
   else if(raw.graphics){item=new PIXI.Graphics();for(const g of raw.graphics){if(!g.shape)continue;const s=g.shape;item.lineStyle(g.line?.width??0,g.line?.color??0,g.line?.alpha??1);item.beginFill(g.fill?.color??0xffffff,g.fill?.alpha??1);if(s.points)item.drawPolygon(s.points);else if(s.type===2)item.drawCircle(s.x,s.y,s.radius);else if(s.type===4)item.drawRoundedRect(s.x,s.y,s.width,s.height,s.radius);else if(Number.isFinite(s.width)&&Number.isFinite(s.height))item.drawRect(s.x,s.y,s.width,s.height);item.endFill();}}
   else if(raw.texture)item=new PIXI.Sprite(this.texture(raw.texture));
   else item=new PIXI.Container();
   item.position.set(raw.x??0,raw.y??0);item.scale.set(raw.scale?.x??1,raw.scale?.y??1);item.pivot.set(raw.pivot?.x??0,raw.pivot?.y??0);if(item.anchor)item.anchor.set(raw.anchor?.x??0,raw.anchor?.y??0);if(raw.tint!==undefined&&'tint'in item)item.tint=raw.tint;item.rotation=raw.rotation??0;item.alpha=raw.alpha??1;item.visible=raw.visible!==false;item.renderable=raw.renderable!==false;item.zIndex=raw.zIndex??0;this.nodes.set(raw.id,item);
   const parent=this.nodes.get(raw.parent);if(parent)parent.addChild(item);else if(raw.parent===null)this.app.stage.addChild(item);
  }
  // Assign masks after their original graphics have been reconstructed.
  for(const raw of this.pose.nodes){const item=this.nodes.get(raw.id);if(!item||!raw.mask)continue;const mask=this.pose.nodes.find(n=>n.type===raw.mask.type&&n.x===raw.mask.x&&n.y===raw.mask.y&&n.worldTransform?.tx===raw.mask.worldTransform?.tx&&n.worldTransform?.ty===raw.mask.worldTransform?.ty&&n.graphics&&this.maskBoundsMatch(n,raw.mask));if(mask&&this.nodes.has(mask.id))item.mask=this.nodes.get(mask.id);}
  this.bindControls();this.bindReels();this.refreshHits();
 }
 maskBoundsMatch(node,mask){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const g of node.graphics??[]){const s=g.shape;if(!s)continue;let xs,ys;if(s.points){xs=s.points.filter((_,i)=>i%2===0);ys=s.points.filter((_,i)=>i%2===1);}else{xs=[s.x??0,(s.x??0)+(s.width??0)];ys=[s.y??0,(s.y??0)+(s.height??0)];}minX=Math.min(minX,...xs);maxX=Math.max(maxX,...xs);minY=Math.min(minY,...ys);maxY=Math.max(maxY,...ys);}return Math.abs((maxX-minX)*Math.abs(node.scale?.x??1)-mask.width)<.2&&Math.abs((maxY-minY)*Math.abs(node.scale?.y??1)-mask.height)<.2;}
 bindHit(path,callback,label=path,geometryPath=path){
  if(!this.hitLayer){this.hitLayer=document.createElement('div');this.hitLayer.className='native-hit-layer';Object.assign(this.hitLayer.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'2'});this.host.after(this.hitLayer);}
  let hit=this.hits.get(path);if(!hit){const button=document.createElement('button');button.type='button';button.dataset.nativeHit=path;button.setAttribute('aria-label',label);Object.assign(button.style,{position:'absolute',margin:'0',padding:'0',background:'transparent',border:'0',color:'transparent',cursor:'pointer',pointerEvents:'auto'});button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();this.hits.get(path)?.callback();});this.hitLayer.append(button);hit={button};this.hits.set(path,hit);}
  Object.assign(hit,{callback,geometryPath});this.refreshHits();
 }
 refreshHits(){if(!this.app)return;this.app.stage.getBounds();const canvas=this.app.view.getBoundingClientRect(),sx=canvas.width/this.app.renderer.width,sy=canvas.height/this.app.renderer.height;
  const panels=['bets','autoPlay','double'].filter(name=>this.bound(name+'.container')?.visible);
  for(const[path,hit]of this.hits){const node=this.bound(path),geometry=this.bound(hit.geometryPath)??node;const visible=node&&geometry&&node.worldVisible&&node.worldAlpha>.005&&node.interactive!==false&&(!panels.length||panels.some(p=>path.startsWith(p+'.')));hit.button.hidden=!visible;if(!visible)continue;const b=geometry.getBounds();Object.assign(hit.button.style,{left:canvas.x+b.x*sx+'px',top:canvas.y+b.y*sy+'px',width:Math.max(0,b.width*sx)+'px',height:Math.max(0,b.height*sy)+'px'});}
 }
 bound(path){return this.nodes.get(this.pose.bindings?.[path]);}
 bindControls(){this.controls={};for(const name of ['spin','autoPlay','bet','double','doubleTake','menu','soundOn','soundOff','quickPlay','lobby']){const item=this.bound('buttons.buttons.'+name+'.container');if(!item)continue;this.controls[name]=item;item.interactive=true;item.buttonMode=true;let cfg=this.pack.nativeSlot.buttons?.[name];if(this.pose.viewport.width<this.pose.viewport.height)cfg=cfg?.mobile?.vertical??cfg?.mobile??cfg;else if(this.pose.viewport.width<1000)cfg=cfg?.mobile??cfg;const hit=cfg?.hitAreaPolygon;if(hit)item.hitArea=new PIXI.Polygon(hit);item.on('pointertap',()=>this.onAction(name,this));this.bindHit('buttons.buttons.'+name+'.container',()=>this.onAction(name,this),name,'buttons.buttons.'+name+'.image');}}
 async refreshPose(){const previous=this.pose;this.choosePose();if(previous!==this.pose){this.stopMotion();for(const raw of this.pose.nodes)if(raw.spine)await this.loadSpine(this.spineDefinition(raw));this.build();if(this.lastGrid)this.landGrid(this.lastGrid);if(this.lastMultiplier)this.showMultiplier(this.lastMultiplier);this.onRebuild?.();}this.resize();}
 bindReels(){this.reels=[];const config=this.pack.nativeSlot.boxes;for(let col=0;col<config.column;col++){const container=this.bound('box.columns.'+col+'.container');if(container)this.reels.push({container,y:container.y,column:col});}}
 setValues(values){Object.assign(this.values,values);for(const raw of this.pose.nodes)if(raw.text!==undefined){const item=this.nodes.get(raw.id);if(item&&'text'in item)item.text=this.formatText(raw).replace(item instanceof PIXI.Text&&!item.textStyles?/<[^>]*>/g:/$^/g,'');}}
 resize(){const source=this.pose.canvas??{width:this.pose.viewport.width,height:this.pose.viewport.height};this.app.renderer.resize(source.width,source.height);const ratio=Math.min(this.host.clientWidth/source.width,this.host.clientHeight/source.height);this.app.view.style.width=Math.floor(source.width*ratio)+'px';this.app.view.style.height=Math.floor(source.height*ratio)+'px';
 const appearance=this.pose.canvas?.appearance;
 let background=appearance?.backgroundImage?.match(/url\(["']?([^"')]+)/)?.[1];background=background?this.pack.images[decodeURI(background).split('?')[0]]:this.pack.backgrounds?.[source.width<source.height?'portrait':'landscape'];
 if(background){this.app.view.style.backgroundImage=`url("${this.asset(background)}")`;this.app.view.style.backgroundRepeat='no-repeat';this.app.view.style.backgroundPosition=appearance?.backgroundPosition??'center center';this.app.view.style.backgroundSize=appearance?.backgroundSize??'cover';
 if(this.pack.officialId==='safari-simba-2'&&!appearance)this.app.view.style.backgroundSize=(source.width<source.height?620:1320)*ratio+'px '+(source.width<source.height?1300:598)*ratio+'px';}this.refreshHits();
 }
 showMultiplier(value){
  if(!Number.isInteger(value)||value<1||value>5)return;this.lastMultiplier=value;
  if(this.pack.officialId==='safari-simba-2'){const plain=this.bound('multiplier.itemsContainer'),win=this.bound('multiplier.winItemsContainer');if(plain)plain.y=0;if(win)win.y=0;for(let i=0;i<12;i++){const item=this.bound(`multiplier.items.${i}.item`),light=this.bound(`multiplier.items.${i}.lightItem`),glow=this.bound(`multiplier.items.${i}.itemWin`);const number=i===1?value:((value+i+1)%5)+1;const alias=this.pack.imageAliases['Multiplier'+number],active=this.pack.imageAliases['MultiplierActive'+number];if(item){item.visible=i!==1;item.texture=PIXI.utils.TextureCache[alias]??item.texture;}if(light){light.visible=i===1;light.texture=PIXI.utils.TextureCache[active]??light.texture;}if(glow)glow.visible=false;}return;}
  const angles=[0,3*Math.PI/7,5*Math.PI/7,2*Math.PI/7,4*Math.PI/7,Math.PI/7];
  for(const raw of this.pose.nodes)if(raw.texture?.ids?.some(id=>id==='Multiplier/Numbers'||id==='Multiplier/Light')){const node=this.nodes.get(raw.parent);if(node)node.rotation=angles[value];}
 }
 clearRoundEffects(){this.effectEpoch=(this.effectEpoch??0)+1;for(const item of this.roundEffects??[])item.destroy({children:true});this.roundEffects=[];}
 async presentRound(round){
  if(this.pack.officialId!=='safari-simba-2')return;this.clearRoundEffects();const epoch=this.effectEpoch;
  for(const column of round.feature?.expandedColumns??[]){const symbol=Number(this.lastGrid?.[column]?.[0]);if(![4,5,6].includes(symbol)||!this.lastGrid[column].every(s=>Number(s)===symbol))continue;
   const def=this.pack.spines.find(s=>s.aliases.includes('Spine-Full-'+symbol));if(!def)continue;
   await this.loadSpine(def);if(epoch!==this.effectEpoch)return;const parent=this.reels[column]?.container;if(!parent)continue;
   const animation=new PIXI.spine.Spine(this.spineData.get(def.json));animation.state.setAnimation(0,'animation',true);animation.update(0);const b=animation.getLocalBounds();
   const points=[];for(let row=0;row<3;row++){const image=this.bound(`box.boxes.${column}.${row}.normal`),rect=image.getBounds();points.push(parent.toLocal(new PIXI.Point(rect.x,rect.y)),parent.toLocal(new PIXI.Point(rect.x+rect.width,rect.y+rect.height)));}
   const minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxX=Math.max(...points.map(p=>p.x)),maxY=Math.max(...points.map(p=>p.y)),scale=Math.min((maxX-minX)/b.width,(maxY-minY)/b.height);
   animation.scale.set(scale);animation.position.set((minX+maxX)/2-(b.x+b.width/2)*scale,(minY+maxY)/2-(b.y+b.height/2)*scale);parent.addChild(animation);this.roundEffects.push(animation);for(let row=0;row<3;row++)this.bound(`box.boxes.${column}.${row}.normal`).visible=false;
  }
 }
 beginMotion(){if(!this.reels.length)return;this.clearRoundEffects();this.stopped=false;this.received=false;const epoch=++this.epoch,start=performance.now(),height=this.pack.nativeSlot.boxes.height;const tick=()=>{if(epoch!==this.epoch||this.stopped)return;const time=performance.now()-start;for(const reel of this.reels)reel.container.y=reel.y+(time*.8+reel.column*height)%height;const plain=this.bound('multiplier.itemsContainer'),win=this.bound('multiplier.winItemsContainer');if(plain)plain.y=(time*2.55)%1020;if(win)win.y=(time*2.55)%1020;requestAnimationFrame(tick);};requestAnimationFrame(tick);}
 stopMotion(){this.stopped=true;this.epoch++;}
 landGrid(grid){this.lastGrid=grid.map(c=>c.slice());const config=this.pack.nativeSlot.boxes;if(!Array.isArray(grid)||grid.length!==config.column)throw Error('INVALID_NATIVE_GRID');this.stopMotion();for(const reel of this.reels)reel.container.y=reel.y;for(let column=0;column<config.column;column++)for(let row=0;row<config.row;row++){const symbol=Number(grid[column]?.[row]);const presentation=config.settings[symbol]?.normal;if(!presentation)throw Error('UNKNOWN_NATIVE_SYMBOL');const alias=this.pack.imageAliases[presentation.name];const image=this.bound(`box.boxes.${column}.${config.row-1-row}.normal`);if(image&&alias&&PIXI.utils.TextureCache[alias]){image.texture=PIXI.utils.TextureCache[alias];image.visible=true;const blur=this.bound(`box.boxes.${column}.${config.row-1-row}.blur`);if(blur)blur.visible=false;}}this.received=true;}
 destroy(){this.stopMotion();removeEventListener('resize',this.resizeHandler);this.hitLayer?.remove();this.app.destroy(true,{children:true,texture:false,baseTexture:false});}
}
