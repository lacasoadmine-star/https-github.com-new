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
  if(item.spineRotated){context.translate(tx+t.w,ty);context.rotate(Math.PI/2);context.drawImage(image,f.x,f.y,f.h,f.w,0,0,t.h,t.w);}
  else if(item.rotated){context.translate(tx,ty+t.h);context.rotate(-Math.PI/2);context.drawImage(image,f.x,f.y,f.h,f.w,0,0,t.h,t.w);}
  else context.drawImage(image,f.x,f.y,f.w,f.h,tx,ty,t.w,t.h);
  context.restore();
 }
 canvas(element,name){const box=element.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,2);element.width=Math.max(1,Math.round(box.width*ratio));element.height=Math.max(1,Math.round(box.height*ratio));this.draw(element.getContext('2d'),name,0,0,element.width,element.height);}
 composition(context,motion,x,y,width,height,frame=0){
  const [left,bottom,right,top]=motion.bounds,scale=Math.min(width/(right-left),height/(top-bottom));context.save();context.translate(x+(width-(right-left)*scale)/2,y+(height-(top-bottom)*scale)/2);context.scale(scale,-scale);context.translate(-left,-top);
  for(const command of motion.frames[frame%motion.frames.length]){const[rx,ry,rw,rh]=command.rect;context.save();context.transform(...command.matrix);context.globalAlpha*=command.alpha;if(command.additive)context.globalCompositeOperation='lighter';context.translate(rx,ry+rh);context.scale(1,-1);this.draw(context,command.sprite,0,0,rw,rh);context.restore();}context.restore();
 }
}
