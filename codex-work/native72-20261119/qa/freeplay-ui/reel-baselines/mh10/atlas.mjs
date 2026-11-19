// Existing project art only. This loader does not import the previous engine.
export async function loadAtlas(){
 const base=new URL('/zplay74/multi-hot-10/assets/',location.href);
 const atlas=await fetch(new URL('atlas.json',base)).then(r=>r.json()),images=new Map();
 await Promise.all(Object.values(atlas.files).filter(f=>f.endsWith('.png')).map(async file=>{const image=new Image();image.src=new URL(file,base);await image.decode();images.set(file,image)}));
 const font=new FontFace('MH10Intro',`url(${new URL(atlas.files['Intro-Regular.otf'],base)})`);await font.load();document.fonts.add(font);
 function sprite(ctx,key,x,y,w,h){const m=atlas.frames[key];if(!m)throw Error('Unknown sprite '+key);const f=m.frame,im=images.get(m.image);ctx.save();ctx.translate(x,y);if(m.rotated){ctx.translate(0,h);ctx.rotate(-Math.PI/2);ctx.drawImage(im,f.x,f.y,f.h,f.w,0,0,h,w)}else ctx.drawImage(im,f.x,f.y,f.w,f.h,0,0,w,h);ctx.restore()}
 return{atlas,images,sprite,image:(key)=>images.get(atlas.files[key])};
}
