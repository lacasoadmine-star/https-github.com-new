// Read-only presentation observer. Run inside the public demo frame with Playwright.
// No cookies, account identifiers, request tokens, or executable provider code are exported.
export function hookPresentation() {
  const P=window.PIXI;
  if(!P) throw new Error('The reference renderer has not loaded');
  window.__special74Views=[];
  for(const Type of [P.WebGLRenderer,P.CanvasRenderer,P.Renderer]){
    if(!Type?.prototype?.render||Type.prototype.render.__special74Observed)continue;
    const original=Type.prototype.render;
    function render(stage,...args){
      const target=args[0],offscreen=target&&(target.baseTexture||target.renderTexture);
      if(stage&&this.view&&!offscreen){
       const clear=typeof args[1]==='boolean'?args[1]:target?.clear!==false;
       if(clear)window.__special74Views=window.__special74Views.filter(v=>v.renderer!==this);
       if(!window.__special74Views.some(v=>v.renderer===this&&v.stage===stage))window.__special74Views.push({renderer:this,stage});
      }
      return original.call(this,stage,...args);
    }
    render.__special74Observed=true;
    Type.prototype.render=render;
  }
  return {version:P.VERSION};
}

export function readPresentation(){
  function rect(r){return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null;}
  function mediaURL(raw){
    if(typeof raw!=='string')return null;
    try{const u=new URL(raw,location.href);return /^https?:$/.test(u.protocol)?u.origin+u.pathname:null;}catch{return null;}
  }
  function textureName(raw){
    if(typeof raw!=='string')return null;
    // Cache identifiers can be frame names or URL aliases. Keep the former
    // useful for control matching without exporting query/session material.
    return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(raw)?mediaURL(raw):raw.split(/[?#]/,1)[0];
  }
  function node(n,path){
    if(!n||n.destroyed||n._destroyed||!n.visible||n.worldAlpha===0||!n.scale||typeof n.getBounds!=='function')return null;
    const t=n.texture;
    const data={path,type:n.constructor.name,name:n.name||null,x:n.x,y:n.y,scale:{x:n.scale.x,y:n.scale.y},rotation:n.rotation,alpha:n.alpha,world: n.worldTransform?{a:n.worldTransform.a,b:n.worldTransform.b,c:n.worldTransform.c,d:n.worldTransform.d,tx:n.worldTransform.tx,ty:n.worldTransform.ty}:null,bounds:rect(n.getBounds(true)),interactive:Boolean(n.interactive),blendMode:n.blendMode};
    if(n.anchor)data.anchor={x:n.anchor.x,y:n.anchor.y};
    if(n.mask)data.mask=rect(n.mask.getBounds(true));
    if(t)data.texture={names:Array.isArray(t.textureCacheIds)?t.textureCacheIds.map(textureName).filter(Boolean):[],source:mediaURL(t.baseTexture?.imageUrl||t.baseTexture?.resource?.url),frame:rect(t.frame),orig:rect(t.orig),trim:rect(t.trim),rotate:t.rotate};
    if(typeof n.text==='string'){data.text=n.text;data.style=n.style?{fontFamily:n.style.fontFamily,fontSize:n.style.fontSize,fontWeight:n.style.fontWeight,fill:n.style.fill,align:n.style.align,stroke:n.style.stroke,strokeThickness:n.style.strokeThickness}:null;}
    data.children=(n.children||[]).map((child,index)=>node(child,path+'.'+index)).filter(Boolean);
    return data;
  }
  const canvases=[],snapshotErrors=[];
  for(const [index,{renderer,stage}]of(window.__special74Views||[]).entries()){
    // Provider loaders may destroy their renderer after the game starts. One
    // stale loader must not discard presentation evidence from the active game.
    const view=renderer?.view;
    if(!view||view.isConnected===false||typeof view.getBoundingClientRect!=='function'||!stage||stage.destroyed||stage._destroyed)continue;
    try{const scene=node(stage,String(index));if(scene)canvases.push({canvas:rect(view.getBoundingClientRect()),width:renderer.width,height:renderer.height,resolution:renderer.resolution,scene});}
    catch{snapshotErrors.push({viewIndex:index,reason:'presentation-view-unreadable'});}
  }
  return {viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},canvases,snapshotErrors};
}
