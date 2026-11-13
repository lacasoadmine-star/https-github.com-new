export class Art {
 constructor(frames){this.frames=frames;this.images=new Map();}
 async load(){await Promise.all([...new Set(Object.values(this.frames).map(f=>f.image))].map(async url=>{const image=new Image();image.src=url;await image.decode();this.images.set(url,image);}));}
 draw(context,name,x,y,width,height,{tight=false,alpha=1}={}){
  const item=this.frames[name];if(!item)return;
  const image=this.images.get(item.image);if(!image)return;
  const f=item.frame,t=item.spriteSourceSize||{x:0,y:0,w:f.w,h:f.h},source=item.sourceSize||t;
  context.save();context.globalAlpha*=alpha;
  context.translate(x,y);context.scale(width/(tight?t.w:source.w),height/(tight?t.h:source.h));
  const tx=tight?0:t.x,ty=tight?0:t.y;
  if(item.rotated){context.translate(tx,ty+t.h);context.rotate(-Math.PI/2);context.drawImage(image,f.x,f.y,f.h,f.w,0,0,t.h,t.w);}
  else context.drawImage(image,f.x,f.y,f.w,f.h,tx,ty,t.w,t.h);
  context.restore();
 }
 canvas(element,name){const box=element.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,2);element.width=Math.max(1,Math.round(box.width*ratio));element.height=Math.max(1,Math.round(box.height*ratio));this.draw(element.getContext('2d'),name,0,0,element.width,element.height);}
}
