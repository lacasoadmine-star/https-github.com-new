export class Art {
 constructor(frames){this.frames=frames;this.images=new Map();}
 async load(){
  await Promise.all([...new Set(Object.values(this.frames).map(f=>f.image))].map(async url=>{
   const image=new Image();image.src=url;await image.decode();this.images.set(url,image);
  }));
 }
 draw(context,name,x,y,width,height,{tight=false,alpha=1,fit='stretch'}={}){
  const item=this.frames[name];if(!item)return;
  const image=this.images.get(item.image);if(!image)return;
  const f=item.frame,t=item.spriteSourceSize||{x:0,y:0,w:f.w,h:f.h},source=item.sourceSize||t;
  const sw=tight?t.w:source.w,sh=tight?t.h:source.h;
  if(!(sw>0&&sh>0&&width>0&&height>0))return;
  if(fit==='contain'){
   const scale=Math.min(width/sw,height/sh),dw=sw*scale,dh=sh*scale;
   x+=(width-dw)/2;y+=(height-dh)/2;width=dw;height=dh;
  }
  context.save();context.globalAlpha*=alpha;
  context.translate(x,y);context.scale(width/sw,height/sh);
  const tx=tight?0:t.x,ty=tight?0:t.y;
  if(item.rotated){context.translate(tx,ty+t.h);context.rotate(-Math.PI/2);context.drawImage(image,f.x,f.y,f.h,f.w,0,0,t.h,t.w);}
  else context.drawImage(image,f.x,f.y,f.w,f.h,tx,ty,t.w,t.h);
  context.restore();
 }
 canvas(element,name){
  const bounds=element.getBoundingClientRect(),box={width:element.clientWidth||bounds.width,height:element.clientHeight||bounds.height},ratio=Math.max(1,Math.min(devicePixelRatio||1,2));
  element.width=Math.max(1,Math.round(box.width*ratio));element.height=Math.max(1,Math.round(box.height*ratio));
  const context=element.getContext('2d');context.clearRect(0,0,element.width,element.height);
  this.draw(context,name,0,0,element.width,element.height,{fit:'contain'});
 }
}
