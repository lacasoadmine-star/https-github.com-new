const cache=new Map();
export async function image(url){
 if(!url.startsWith('/special-games/assets/'))throw new Error('Presentation media must be local');
 if(!cache.has(url))cache.set(url,new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Missing presentation media: '+url));i.src=url;}));
 return cache.get(url);
}
async function loadAtlas(path){
 const response=await fetch('/special-games/assets/'+path,{credentials:'same-origin'});
 if(!response.ok)throw new Error('Missing texture metadata');
 const data=await response.json(),base=path.slice(0,path.lastIndexOf('/')+1),sheet=await image('/special-games/assets/'+base+data.meta.image);
 return {data,sheet};
}
function unpack(entry,sheet){
 const frame=entry.frame,origin=entry.sourceSize,trim=entry.spriteSourceSize;
 const canvas=document.createElement('canvas');canvas.width=origin.w;canvas.height=origin.h;
 const context=canvas.getContext('2d');
 // Decode once on first use, preserving packed rotation, trim and transparent margins.
 if(entry.rotated){context.translate(trim.x,trim.y+trim.h);context.rotate(-Math.PI/2);context.drawImage(sheet,frame.x,frame.y,frame.h,frame.w,0,0,trim.h,trim.w);}
 else context.drawImage(sheet,frame.x,frame.y,frame.w,frame.h,trim.x,trim.y,trim.w,trim.h);
 return canvas;
}
export async function atlas(path){
 const {data,sheet}=await loadAtlas(path);
 return new Map(Object.entries(data.frames).map(([name,entry])=>[name,unpack(entry,sheet)]));
}

export class TextureBank{
 constructor(){this.frames=new Map();}
 async add(path){const {data,sheet}=await loadAtlas(path);for(const [name,entry]of Object.entries(data.frames))this.frames.set(name,{entry,sheet,canvas:null});}
 draw(ctx,name,x,y,w,h){const frame=this.frames.get(name);if(!frame)throw new Error('Unknown reference sprite '+name);frame.canvas??=unpack(frame.entry,frame.sheet);ctx.drawImage(frame.canvas,x,y,w,h);}
}
