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
 ,play: /^(?:Buttons\/?|Button\/)?(?:Play|PlayNow|StartGame|Continue)(?:Vertical|Horizontal|Normal)?$/i
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
function newPanelHeading(kind,before,after){
 const patterns={rules:/\b(?:game rules|pay\s?table|how to play|payouts)\b/i,
  information:/\b(?:game information|about (?:this )?game|return to player|RTP)\b/i,
  history:/\b(?:bet history|my bets|transaction history)\b/i,
  settings:/\b(?:settings|music volume|sound volume)\b/i,
  autoplay:/\b(?:autoplay settings|number of spins|stop on (?:win|loss)|loss limit)\b/i};
 const pattern=patterns[kind];
 return Boolean(pattern&&typeof before==='string'&&typeof after==='string'&&!pattern.test(before)&&pattern.test(after));
}
async function touchObservedDOM(control,frame){
 if(!control.selector||!Number.isInteger(control.index))throw Error('Missing observed identity');
 const data=await frame.evaluate(c=>{
  const all=[...document.querySelectorAll(c.selector)];
  const text=el=>(el.innerText||el.value||'').trim().slice(0,100);
  const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>3&&r.height>3&&s.display!=='none'&&s.visibility!=='hidden';};
  const candidates=c.exactText?all.filter(el=>visible(el)&&text(el).toLowerCase()===c.text.toLowerCase()):[all[c.index]].filter(Boolean);
  if(candidates.length!==1)throw Error('Observed identity is missing or ambiguous');
  const el=candidates[0],r=el.getBoundingClientRect();
  if(c.tag&&el.tagName!==c.tag||text(el).toLowerCase()!==c.text.toLowerCase())throw Error('Observed control changed before touch');
  const x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
  if(!visible(el)||!(hit===el||el.contains(hit)))throw Error('Observed control is covered');
  return{x,y};
 },control);
 let current=frame;
 while(current.parentFrame()){
  const handle=await current.frameElement();
  const offset=await handle.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+el.clientLeft,y:r.y+el.clientTop};});
  data.x+=offset.x;data.y+=offset.y;await handle.dispose();current=current.parentFrame();
 }
 const size=frame.page().viewportSize();
 if(data.x<0||data.y<0||data.x>=size.width||data.y>=size.height)throw Error('Observed control outside viewport');
 await frame.page().touchscreen.tap(data.x,data.y);
 return{mode:'touch',source:'fresh-dom-measurement',...data};
}
const domPatterns={
 'bet-plus':/^(?:increase bet|bet increase|bet plus|plus bet|bet\+|bet-plus)$/i,
 'bet-minus':/^(?:decrease bet|bet decrease|bet minus|minus bet|bet-|bet-minus)$/i,
 bet:/^(?:choose bet|bet amount|change bet)$/i,tutorial:/^(?:OK|Got it|Let's play)$/i,
 spin:/^spin$/i,play:/^(?:play|play now|start game|continue)$/i,'bet-submit':/^(?:place bet|bet|bet now|start)$/i,cashout:/^(?:cashout|cash out|take win)$/i,menu:/^(?:menu|open menu|menu-open)$/i,
 take:/^(?:take win|collect|collect win)$/i,exit:/^exit$/i,close:/^(?:close|close menu|back to game)$/i,
 autoplay:/^(?:autoplay|auto play)$/i,settings:/^settings$/i,history:/^(?:history|bet history)$/i,
 rules:/^(?:rules|paytable|pay table|game rules|help)$/i,information:/^(?:about|about game|game info|game information|information|info)$/i,'sound-on':/^(?:sound on|enable sound|unmute)$/i,'sound-off':/^(?:sound off|disable sound|mute)$/i
};
function domMatches(c,kind){
 if(c.disabled||!c.hittable||!c.bounds||c.bounds.w<4||c.bounds.h<4)return false;
 const art=(c.background||'')+' '+(c.src||'');
 const pictures={menu:/\/(?:Menu|mobile-menu-open-icon|menu-icon)\.(?:png|webp)/i,close:/\/(?:close|close-button|CloseButton)\.(?:png|webp)/i,'bet-plus':/\/(?:bet-plus|plus)\.(?:png|webp)/i,'bet-minus':/\/(?:bet-minus|minus)\.(?:png|webp)/i,tutorial:/\/(?:OkButton|ok)\.(?:png|webp)/i};
 if(pictures[kind]?.test(art)&&c.bounds.w<600&&c.bounds.h<180)return true;
 const labelled=c.tag==='DIV'&&c.background&&c.background!=='none'&&c.bounds.w<600&&c.bounds.h<180;
 return Boolean((c.clickable||labelled)&&[c.text,c.aria,c.title,c.id].filter(Boolean).some(v=>domPatterns[kind]?.test(v)));
}
module.exports={sceneControls,allowedDemo,publicURL,betChangedInDirection,touchObservedDOM,newPanelHeading,domMatches};
