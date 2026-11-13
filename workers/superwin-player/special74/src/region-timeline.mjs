import {image} from './textures.mjs';
function ease(t,frame){
 if(t<=0)return 0;if(t>=1)return 1;
 if(frame.curve==='stepped')return 0;
 if(typeof frame.curve!=='number')return t;
 const [x1,y1,x2,y2]=[frame.curve,frame.c2??0,frame.c3??1,frame.c4??1];
 const curve=(u,a,b)=>3*(1-u)**2*u*a+3*(1-u)*u*u*b+u**3;
 let lo=0,hi=1;for(let i=0;i<20;i++){const u=(lo+hi)/2;if(curve(u,x1,x2)<t)lo=u;else hi=u;}
 return curve((lo+hi)/2,y1,y2);
}
export function sampleTrack(track,time){
 let selected=track.timeline[0];for(const key of track.timeline){if((key.time??0)>time)break;selected=key;}
 let alpha=1;
 for(let i=0;i<track.alpha.length;i++){
  const key=track.alpha[i],start=key.time??0;if(time<start)break;
  const from=parseInt(key.color.slice(6,8),16)/255,next=track.alpha[i+1];alpha=from;
  if(next&&time<next.time){const to=parseInt(next.color.slice(6,8),16)/255;alpha=from+(to-from)*ease((time-start)/(next.time-start),key);break;}
 }
 return {name:selected.name,alpha};
}
export async function loadRegionTimeline(metadataPath,sheetPath){
 if(!metadataPath.startsWith('/special-games/'))throw Error('LOCAL_ANIMATION_REQUIRED');
 const response=await fetch(metadataPath);if(!response.ok)throw Error('ANIMATION_METADATA_UNAVAILABLE');
 const data=await response.json(),sheet=await image(sheetPath);
 return {draw(ctx,seconds,x,y,scale){
  const time=seconds%data.duration;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  for(const track of data.tracks){const {name,alpha}=sampleTrack(track,time),attachment=track.attachments[name],frame=data.frames[name],b=track.translation;
   ctx.globalAlpha=alpha;ctx.globalCompositeOperation=track.blend==='additive'?'lighter':'source-over';
   ctx.save();ctx.translate((b.x??0)+(attachment.x??0)-attachment.width/2,-((b.y??0)+(attachment.y??0))-attachment.height/2);ctx.scale(attachment.width/frame.orig[0],attachment.height/frame.orig[1]);
   const [w,h]=frame.size,[left,bottom]=frame.offset,top=frame.orig[1]-bottom-h;
   if(frame.rotated){ctx.translate(left,top+h);ctx.rotate(-Math.PI/2);ctx.drawImage(sheet,...frame.xy,h,w,0,0,h,w);}
   else ctx.drawImage(sheet,...frame.xy,w,h,left,top,w,h);
   ctx.restore();
  }ctx.restore();
 }};
}
