// Pure identification of observed presentation controls; no guessed coordinates.
const kinds={
 'bet-plus': /^(?:Buttons\/?)?(?:BetPlus|Plus)(?:Vertical|Horizontal|Normal)?$/i,
 'bet-minus': /^(?:Buttons\/?)?(?:BetMinus|Minus)(?:Vertical|Horizontal|Normal)?$/i,
 spin: /^(?:Buttons\/?)?Spin(?:Vertical|Horizontal|Normal)?$/i,
 menu: /^(?:Buttons\/?)?(?:Menu|MenuOpen|OpenMenu)(?:Vertical|Horizontal|Normal)?$/i,
 take: /^(?:Buttons\/?)?(?:Take|TakeWin|Collect)(?:Vertical|Horizontal|Normal)?$/i,
 autoplay: /^(?:Vertical\/|Horizontal\/)?(?:Buttons\/?|Button\/)?AutoPlay(?:Vertical|Horizontal|Normal)?$/i,
 'sound-on': /^(?:Vertical\/|Horizontal\/)?(?:Buttons\/?|Button\/)?SoundOn(?:Vertical|Horizontal|Normal)?$/i,
 'sound-off': /^(?:Vertical\/|Horizontal\/)?(?:Buttons\/?|Button\/)?SoundOff(?:Vertical|Horizontal|Normal)?$/i,
 rules: /^(?:Buttons\/?|Button\/)?(?:Help|Rules|PayTable)(?:Vertical|Horizontal|Normal)?$/i,
 settings: /^(?:Buttons\/?|Button\/)?Settings(?:Vertical|Horizontal|Normal)?$/i,
 history: /^(?:Buttons\/?|Button\/)?(?:History|BetHistory)(?:Vertical|Horizontal|Normal)?$/i,
 information: /^(?:Buttons\/?|Button\/)?(?:Info|Information|About)(?:Vertical|Horizontal|Normal)?$/i,
 close: /^(?:Buttons\/?|Button\/)?(?:Close|CloseMenu|MenuClose|Back)(?:Vertical|Horizontal|Normal)?$/i,
 gamble: /^(?:Buttons\/?|Button\/)?(?:Gamble|Double)(?:Vertical|Horizontal|Normal)?$/i
};
function intersect(a,b){
 const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),right=Math.min(a.x+a.w,b.x+b.w),bottom=Math.min(a.y+a.h,b.y+b.h);
 return {x,y,w:Math.max(0,right-x),h:Math.max(0,bottom-y)};
}
function sceneControls(presentation,frameOffset={x:0,y:0},viewport={width:412,height:839}){
 const controls=[],texts=[];
 for(const canvas of presentation?.canvases||[]){
  const css=canvas.canvas,scaleX=css.w/(canvas.width/canvas.resolution),scaleY=css.h/(canvas.height/canvas.resolution);
  const view={x:0,y:0,w:viewport.width,h:viewport.height};
  function visit(node,clip,interactiveAncestor=null,ancestorDistance=0){
   if(!node||node.alpha===0)return;
   if(node.mask)clip=intersect(clip,node.mask);
   const b=node.bounds;if(!b)return;
   const visible=intersect(b,clip);
   const screen=intersect({x:frameOffset.x+css.x+visible.x*scaleX,y:frameOffset.y+css.y+visible.y*scaleY,w:visible.w*scaleX,h:visible.h*scaleY},view);
   const onScreen=screen.w>=4&&screen.h>=4;
   if(onScreen&&typeof node.text==='string'&&node.text.trim())texts.push({path:node.path,text:node.text,bounds:screen});
   // Some provider versions bind input on an unnamed button Container and put
   // the named visible image on a non-interactive child Sprite. Its exact image
   // bounds remain the click target; never use a whole stage/container center.
   const inheritedInput=interactiveAncestor&&ancestorDistance<=3&&
    interactiveAncestor.bounds.w<=b.w*2&&interactiveAncestor.bounds.h<=b.h*2;
   const inputNode=node.interactive?node:inheritedInput?interactiveAncestor:null;
   if(onScreen&&inputNode&&screen.w>=12&&screen.h>=12){
    const labels=[node.name,...(node.texture?.names||[])].filter(Boolean);
    for(const [kind,pattern] of Object.entries(kinds))if(labels.some(label=>pattern.test(label)))controls.push({kind,source:'pixi',path:node.path,interactivePath:inputNode.path,labels,bounds:screen,x:screen.x+screen.w/2,y:screen.y+screen.h/2});
   }
   for(const child of node.children||[])visit(child,clip,node.interactive?node:interactiveAncestor,node.interactive?1:ancestorDistance+1);
  }
  visit(canvas.scene,{x:0,y:0,w:canvas.width/canvas.resolution,h:canvas.height/canvas.resolution});
 }
 const spin=controls.find(x=>x.kind==='spin');
 const parent=spin?.path.slice(0,spin.path.lastIndexOf('.'));
 const bet=parent?texts.find(t=>t.path.startsWith(parent+'.')&&/^\d+(?:[.,]\d+)?$/.test(t.text))?.text:null;
 return {controls,texts,bet:bet||null};
}
function allowedDemo(raw){const u=new URL(raw);if(!['https:','http:'].includes(u.protocol)||!(u.hostname==='ssgportal.com'||u.hostname.endsWith('.ssgportal.com'))||!/^DEMO(?:_EXH)?$/.test(u.searchParams.get('Token')||''))throw Error('An official explicit free-demo URL is required');if(u.protocol==='http:')u.protocol='https:';return u.href;}
function publicURL(raw){try{const u=new URL(raw);return /^https?:$/.test(u.protocol)?u.origin+u.pathname:null;}catch{return null;}}
function betChangedInDirection(kind,before,after){
 if(!['bet-plus','bet-minus'].includes(kind)||typeof before!=='string'||typeof after!=='string')return false;
 const numeric=/^\d+(?:[.,]\d+)?$/;
 if(!numeric.test(before)||!numeric.test(after))return false;
 const a=Number(before.replace(',','.')),b=Number(after.replace(',','.'));
 return Number.isFinite(a)&&Number.isFinite(b)&&(kind==='bet-plus'?b>a:b<a);
}
async function touchObservedDOM(control,frame){
 // Native locators remeasure nested iframe geometry and wait for moving loaders.
 // Preserve the exact observed element; never force a click through an overlay.
 if(!Number.isInteger(control.index)||!control.selector)throw Error('Observed DOM identity is missing');
 const target=control.exactText
  ? frame.locator(control.selector).filter({hasText:new RegExp('^\\s*'+control.text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*$','i')}).filter({visible:true})
  : frame.locator(control.selector).nth(control.index);
 const identity=await target.evaluate(el=>({tag:el.tagName,text:(el.innerText||el.value||'').trim().slice(0,100)}));
 if(control.tag&&identity.tag!==control.tag||identity.text.toLowerCase()!==control.text.toLowerCase())throw Error('Observed DOM control changed before touch');
 await target.tap({timeout:3000});
 return {mode:'touch',source:'observed-dom-locator',selector:control.selector,index:control.index};
}
module.exports={sceneControls,allowedDemo,publicURL,betChangedInDirection,touchObservedDOM};
