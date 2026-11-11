() => {
 const primitive=value=>value===null||['number','string','boolean'].includes(typeof value);
 let stage=null;
 try{if(typeof slot!=='undefined')stage=slot.canvas?.canvas?.stage;}catch{}
 try{if(!stage&&typeof game!=='undefined')stage=game.app?.stage||game.application?.stage||game.stage;}catch{}
 if(!stage){
  const candidates=[];
  try{if(typeof gameClass!=='undefined')candidates.push(gameClass);}catch{}
  try{if(typeof gameInfo!=='undefined')candidates.push(gameInfo);}catch{}
  try{if(typeof app!=='undefined')candidates.push(app);}catch{}
  for(let i=0;i<candidates.length&&i<30&&!stage;i++){
   const object=candidates[i];if(!object||typeof object!=='object')continue;
   if(object.stage?.children){stage=object.stage;break;}
   for(const key of ['app','application','canvas','engine','pixi'])if(object[key]&&typeof object[key]==='object'&&!candidates.includes(object[key]))candidates.push(object[key]);
  }
 }
 const nodes=[];
 const visit=(node,parent)=>{
  if(!node||nodes.length>=1000)return;
  const id=nodes.length,rect=node.texture?.frame,base=node.texture?.baseTexture;
  const row={id,parent,type:node.constructor?.name,name:node.name||null,x:node.x,y:node.y,rotation:node.rotation,alpha:node.alpha,visible:node.visible,worldVisible:node.worldVisible,zIndex:node.zIndex,scale:{x:node.scale?.x,y:node.scale?.y},pivot:{x:node.pivot?.x,y:node.pivot?.y},anchor:{x:node.anchor?.x,y:node.anchor?.y},interactive:node.interactive,eventMode:node.eventMode};
  if(node.filters)row.filters=node.filters.map(f=>({type:f.constructor?.name,parameters:Object.fromEntries(Object.entries(f).filter(([k,v])=>primitive(v)))}));
  if(node.mask)row.mask={type:node.mask.constructor?.name,x:node.mask.x,y:node.mask.y,width:node.mask.width,height:node.mask.height,worldTransform:node.mask.worldTransform?Object.fromEntries(['a','b','c','d','tx','ty'].map(k=>[k,node.mask.worldTransform[k]])):null};
  if(node.worldTransform)row.worldTransform=Object.fromEntries(['a','b','c','d','tx','ty'].map(k=>[k,node.worldTransform[k]]));
  if(rect)row.texture={ids:node.texture.textureCacheIds||[],baseIds:base?.textureCacheIds||[],frame:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},source:base?.resource?.url||base?.resource?.src||null};
  if(Array.isArray(node.textures))row.animatedSprite={animationSpeed:node.animationSpeed,loop:node.loop,playing:node.playing,currentFrame:node.currentFrame,frames:node.textures.map(t=>({ids:t.textureCacheIds||[],source:t.baseTexture?.resource?.url||null,frame:t.frame?{x:t.frame.x,y:t.frame.y,width:t.frame.width,height:t.frame.height}:null}))};
  if(node.geometry?.graphicsData)row.graphics=node.geometry.graphicsData.map(g=>({type:g.type,shape:g.shape?{type:g.shape.type,x:g.shape.x,y:g.shape.y,width:g.shape.width,height:g.shape.height,radius:g.shape.radius,points:g.shape.points?.slice(0,500)}:null,fill:g.fillStyle?{color:g.fillStyle.color,alpha:g.fillStyle.alpha}:null,line:g.lineStyle?{color:g.lineStyle.color,alpha:g.lineStyle.alpha,width:g.lineStyle.width}:null}));
  if(node.skeleton){row.spine={skin:node.skeleton.skin?.name,animations:node.skeleton.data?.animations?.map(a=>({name:a.name,duration:a.duration})),tracks:node.state?.tracks?.filter(Boolean).map(t=>({animation:t.animation?.name,loop:t.loop,trackTime:t.trackTime,timeScale:t.timeScale}))};}
  if(typeof node.text==='string')row.text=node.text;
  if(node.style)row.style=Object.fromEntries(Object.entries(node.style).filter(([k,v])=>primitive(v)));
  nodes.push(row);for(const child of node.children||[])visit(child,id);
 };
 visit(stage,null);
 return {capturedAt:new Date().toISOString(),viewport:{width:innerWidth,height:innerHeight},stageFound:!!stage,truncated:nodes.length>=1000,nodes};
}
