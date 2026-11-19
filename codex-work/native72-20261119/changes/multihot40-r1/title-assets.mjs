// Adapter for the title's *existing* content-addressed official asset store.
// Requires the already deployed, hash-validating openTitleAssets and drawSprite
// from the original native74 title package. No screenshot/video scenes.
const ROOT='https://static.ssg-public.com/cache/b1/SlotsDemo/Content/Images/MultiHot40/';
export async function loadMultiHot40Art({store,drawSprite,document=globalThis.document}={}){
 if(!store?.manifest ||store.manifest.titleId!=='multi-hot-40')throw Error('MH40_WRONG_OFFICIAL_MANIFEST');
 if(typeof store.loadSpriteGroup!=='function'||typeof store.loadImage!=='function'||typeof drawSprite!=='function')throw Error('MH40_ASSET_RUNTIME_MISSING');
 const atlas=store.manifest.spriteAtlases.find(a=>a.sourceURL===ROOT+'Mobile/Images/Sprites/Images-0.json');
 const background=store.manifest.assets.find(a=>a.kind==='image'&&a.sources?.some(s=>s.url===ROOT+'Images/background.png'));
 if(!atlas||!background)throw Error('MH40_OFFICIAL_ASSETS_NOT_ACQUIRED');
 const [group,bg]=await Promise.all([store.loadSpriteGroup(atlas.id),store.loadImage(background.id)]);
 function crop(name){
  if(!Object.hasOwn(group.frameAtlases,name))throw Error('MH40_MISSING_FRAME:'+name);
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('MH40_CANVAS_UNAVAILABLE');
  drawSprite(ctx,group,name,{x:0,y:0,width:128,height:128});
  return canvas;
 }
 // Distinct official source frames; no external network beyond existing asset store.
 const symbols=Array.from({length:8},(_,i)=>crop('Box/'+i));
 const blur=Array.from({length:8},(_,i)=>crop('Box/Blur/'+i));
 return {background:bg,symbols,blur,manifestBundleId:store.manifest.bundleId,dispose(){/* store remains owned by the title entry */}};
}
