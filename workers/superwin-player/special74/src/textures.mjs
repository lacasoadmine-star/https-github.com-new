const cache=new Map();
export async function image(url){
 if(!url.startsWith('/special-games/assets/'))throw new Error('Presentation media must be local');
 if(!cache.has(url))cache.set(url,new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Missing presentation media: '+url));i.src=url;}));
 return cache.get(url);
}
export async function atlas(path){
 const response=await fetch('/special-games/assets/'+path,{credentials:'same-origin'});
 if(!response.ok)throw new Error('Missing texture metadata');
 const data=await response.json(),base=path.slice(0,path.lastIndexOf('/')+1),sheet=await image('/special-games/assets/'+base+data.meta.image);
 const textures=new Map();
 for(const [name,entry] of Object.entries(data.frames)){
  const frame=entry.frame,origin=entry.sourceSize,trim=entry.spriteSourceSize;
  const canvas=document.createElement('canvas');canvas.width=origin.w;canvas.height=origin.h;
  const context=canvas.getContext('2d');
  // Provider TexturePacker JSON stores logical extents; packed extents swap.
  if(entry.rotated){context.translate(trim.x,trim.y+trim.h);context.rotate(-Math.PI/2);context.drawImage(sheet,frame.x,frame.y,frame.h,frame.w,0,0,trim.h,trim.w);}
  else context.drawImage(sheet,frame.x,frame.y,frame.w,frame.h,trim.x,trim.y,trim.w,trim.h);
  textures.set(name,canvas);
 }
 return textures;
}

export class TextureBank{
 constructor(){this.frames=new Map();}
 async add(path){for(const [name,texture]of await atlas(path))this.frames.set(name,texture);}
 draw(ctx,name,x,y,w,h){const frame=this.frames.get(name);if(!frame)throw new Error('Unknown reference sprite '+name);ctx.drawImage(frame,x,y,w,h);}
}
