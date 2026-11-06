// Plays native decorative timelines against already validated receipts.
// No provider networking, wager selection, reel strips or settlement code.
const foxySymbols = ['fox','cherry','lemon','orange','watermelon','winged_bell','777','big_star'];
// Native presentation offsets and scales, independent of the current animation's invisible meshes.
const foxySymbolTransforms = [[-133,-128,.75],[-439,-306,1.11],[-105,333,1.13],[-106,-79,1.05],[-86,309,.95],[-95,331,1.1],[-75,-72,1],[-2,22,.97]];
// Alpha-visible decorative reference poses at native time1.5s, measured from original source art.
const winReferenceBounds = {
 'multi_hot_5_video:1':{x:314,y:-1040,width:678,height:696},
 'multi_hot_5_video:2':{x:352,y:-964,width:586,height:598},
 'multi_hot_5_video:3':{x:352,y:-964,width:586,height:598},
 'hot_foxy_20:nice':{x:172,y:330,width:766,height:534},
 'hot_foxy_20:big':{x:172,y:324,width:766,height:540},
 'hot_foxy_20:super':{x:160,y:320,width:812,height:544},
 'hot_foxy_20:fantastic':{x:160,y:212,width:812,height:654},
};
const loadImage = src => new Promise(resolve => {const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=src;});
export async function createNativePresentation(game) {
 if (!['multi_hot_5_video','hot_foxy_20'].includes(game.id)) return null;
 const [assets,runtime] = await Promise.all([
  game.id==='hot_foxy_20'?import('./native-animation-foxy-assets.mjs'):import('./native-animation-mh5-assets.mjs'),
  import('./native-animation-runtime.mjs')
 ]);
 const instances=Object.fromEntries(await Promise.all(Object.entries(assets.bundles).map(async([key,bundle])=>[key,await runtime.createNativeAnimation(bundle)])));
 return new NativePresentation(game,assets,instances,runtime);
}
class NativePresentation {
 constructor(game,assets,instances,runtime) {
  this.game=game;this.assets=assets;this.instances=instances;this.runtime=runtime;this.commands=[];this.pages=new Map();this.groups=new Map();this.poseBounds=new Map();this.disposed=false;this.drawCount=0;
  for(const[name,sheet]of Object.entries(assets.spriteSheets||{}))for(const[key,meta]of Object.entries(sheet.data.frames)){
   const slash=key.lastIndexOf('/'),group=key.slice(0,slash),index=Number(key.slice(slash+1));
   if(!this.groups.has(group))this.groups.set(group,[]);this.groups.get(group).push({page:name,index,meta});
  }
  for(const frames of this.groups.values())frames.sort((a,b)=>a.index-b.index);
  if(game.id==='multi_hot_5_video')this.warmGroup('Logo');
 }
 warmGroup(group) {for(const frame of this.groups.get(group)||[])this.page(frame.page);}
 page(name) {
  if(!this.pages.has(name)){this.pages.set(name,null);void loadImage(this.assets.spriteSheets[name].image).then(image=>{if(!this.disposed){this.pages.set(name,image);this.onReady?.();}});}
  return this.pages.get(name);
 }
 frame(c,group,seconds,{x,y,w,h,fps=24,loop=false}={}) {
  const frames=this.groups.get(group);if(!frames?.length)return false;
  const index=Math.floor(Math.max(0,seconds)*fps);if(!loop&&index>=frames.length)return false;
  const selected=frames[index%frames.length],image=this.page(selected.page);if(!image)return false;
  const {frame:f,spriteSourceSize:s,sourceSize:source,rotated}=selected.meta;
  c.save();c.translate(x,y);c.scale(w/source.w,h/source.h);c.translate(s.x,s.y);
  // TexturePacker stores rotated frames clockwise; frame.w/h remain the unrotated dimensions.
  if(rotated){c.translate(0,f.h);c.rotate(-Math.PI/2);c.drawImage(image,f.x,f.y,f.h,f.w,0,0,f.h,f.w);}
  else c.drawImage(image,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
  c.restore();this.drawCount++;return true;
 }
 begin(){this.commands=[];}
 queue(name,options){const instance=this.instances[name];if(!instance)return false;this.commands.push({instance,...options});return true;}
 decorations(c,seconds,reducedMotion=false) {
  if(this.game.id==='multi_hot_5_video')return this.frame(c,'Logo',reducedMotion?0:seconds,{x:61,y:73,w:304,h:82.26,loop:true});
  const time=reducedMotion?0:seconds;
  const still='uchiteboT romelic 3 jer meordeba Chitebian animaciamde',bird='chitebiT';
  this.queue('startLogo',{animation:reducedMotion?still:bird,timeSeconds:time,loop:true,x:(251-224)*.75,y:-25*.75,scale:.12*.75});
  const v=this.game.visual;
  for(const[animation,x,y,scale]of [['mrgvali zeda',0,65,.4],['marcxena',196,350,.75],['marjvena',-1070,440,.75]])
   this.queue('forest',{animation,timeSeconds:time,loop:true,x:(x-224)*.75,y:y*.75,scale:scale*.75,exclude:{x:v.x-6,y:v.y-6,width:v.w+12,height:v.h+12}});
  return true;
 }
 symbol(c,name,{x,y,w,h,seconds,reducedMotion=false}) {
  if(this.game.id!=='hot_foxy_20')return false;const index=foxySymbols.indexOf(name);if(index<0)return false;
  const [offsetX,offsetY,scale]=foxySymbolTransforms[index],sx=w/215,sy=h/230,v=this.game.visual;
  return this.queue('box'+index,{animation:'animation',timeSeconds:reducedMotion?.25:seconds,loop:true,
   x:x+offsetX*sx,y:y+(-9+offsetY)*sy,scaleX:sx*scale,scaleY:sy*scale,
   clip:{x:v.x,y:v.y,width:v.w,height:v.h}});
 }
 wheelWin(age,reducedMotion=false) {
  if(this.game.id!=='hot_foxy_20')return false;
  const seconds=Math.max(0,age)/1000,enter=seconds<1&&!reducedMotion;
  return this.queue('fire',{animation:enter?'start':'loop',timeSeconds:reducedMotion?.5:enter?seconds:seconds-1,loop:!enter,
   x:(-254-224)*.75,y:-46*.75,scaleX:.5*.75,scaleY:.49*.75});
 }
 multiHighlights(c,result,age,reducedMotion=false) {
  if(this.game.id!=='multi_hot_5_video'||!result.winLines?.length||reducedMotion)return false;
  const v=this.game.visual,cw=v.w/this.game.reels,ch=v.h/this.game.rows,line=result.winLines[Math.floor(age/2100)%result.winLines.length],seconds=(age%2100)/1000;
  this.warmGroup('BoxWin');this.warmGroup('X'+result.wheelMultiplier);
  for(const[row,col]of line.positions)this.frame(c,'BoxWin',seconds,{x:v.x+col*cw-cw*.14,y:v.y+row*ch-ch*.28,w:cw*1.28,h:ch*1.56});
  this.frame(c,'X'+result.wheelMultiplier,seconds,{x:-3,y:v.y+ch-7,w:84,h:98});
  for(let i=1;i<line.positions.length;i++){
   const [row,col]=line.positions[i-1],[nextRow,nextCol]=line.positions[i],group=nextRow===row?'Line1':nextRow>row?'Line2':'Line3';this.warmGroup(group);
   this.frame(c,group,Math.max(0,seconds-(i-1)*.05),{x:v.x+col*cw,y:v.y+Math.min(row,nextRow)*ch,w:(nextCol-col+1)*cw,h:ch*(Math.abs(nextRow-row)+1),fps:15});
  }
  return true;
 }
 winTier(ratio){return this.game.id==='multi_hot_5_video'?(ratio>25?'1':ratio>5?'2':ratio>0?'3':null):(ratio>100?'fantastic':ratio>50?'super':ratio>30?'big':ratio>15?'nice':null);}
 win(c,{amount,bet,age,reducedMotion=false}) {
  const tier=this.winTier(amount/Math.max(.01,bet));if(!tier)return null;
  const instance=this.instances.wins,foxy=this.game.id==='hot_foxy_20';if(!instance)return null;
  const speed=foxy?1:.88,delay=foxy?1500:0,elapsed=Math.max(0,age-delay);
  if(age<delay||elapsed>instance.duration(tier)/speed*1000)return null;
  const bounds=winReferenceBounds[this.game.id+':'+tier],box=foxy?{x:56,y:170,width:308,height:260}:{x:110,y:194,width:202,height:208};
  const seconds=reducedMotion?1.5:elapsed/1000*speed;
  this.queue('wins',{animation:tier,timeSeconds:seconds,loop:false,box,referenceBounds:bounds});
  const scale=Math.min(box.width/bounds.width,box.height/bounds.height),originX=box.x+(box.width-bounds.width*scale)/2-bounds.x*scale,
   originY=box.y+(box.height-bounds.height*scale)/2-bounds.y*scale;
  // Native amount containers share the popup's coordinate system. Actual value comes from the receipt.
  const point=foxy?[550,523]:[656,tier==='1'?-538:tier==='2'?-640:-700];
  // Provider text nodes use a top anchor; the caller paints with Canvas's middle baseline.
  const size=foxy?70*scale:Math.max(18,48*scale),x=originX+point[0]*scale;
  return {tier,box,amount,progress:reducedMotion?1:Math.min(1,elapsed/(foxy?11700:3000/.88)),
   x,y:originY+point[1]*scale+size/2,size,fill:foxy?'#066449':tier==='3'?'#00ff9c':'#fff669',stroke:foxy?null:'#61310f',
   opacity:foxy&&!reducedMotion&&elapsed<1000?0:1,
   currency:foxy?{x,y:originY+(588+24)*scale,size:48*scale,fill:'#066449'}:null};
 }
 flush(c){if(!this.commands.length)return;this.runtime.renderNativeBatch(c,this.commands,{maxDimension:1200});this.drawCount++;}
 diagnostics(){return {ready:true,instances:Object.keys(this.instances).length,groups:[...this.groups.keys()],decodedPages:[...this.pages.values()].filter(Boolean).length,draws:this.drawCount};}
 destroy(){this.disposed=true;for(const instance of Object.values(this.instances))instance.destroy();this.pages.clear();this.commands=[];}
}
