// Render-only spin cadence corrections on 8 new ZPLAY games.
// Never alter transport, outcome, round tokens or wallet settlement.
export const SPIN_PATCHES = Object.freeze({
  'habesha-fortune-5/game.bundle.mjs': [['minimum:this.turbo?180:900,spacing:this.turbo?40:170','minimum:this.turbo?150:520,spacing:this.turbo?35:95']],
  'multi-hot-100/game.bundle.mjs': [['minimum:this.turbo?180:750,spacing:this.turbo?35:120','minimum:this.turbo?150:500,spacing:this.turbo?30:80']],
  'multi-hot-5-deluxe/game.bundle.mjs': [['minimum:this.turbo?180:900,spacing:this.turbo?40:170','minimum:this.turbo?150:520,spacing:this.turbo?35:95']],
  'multi-hot-5-wild/game.bundle.mjs': [['minimum:this.turbo?180:850,spacing:this.turbo?45:170','minimum:this.turbo?150:520,spacing:this.turbo?35:95']],
  'multi-hot-wild-ways/game.bundle.mjs': [['minimum:this.turbo?180:850,spacing:this.turbo?45:170','minimum:this.turbo?150:520,spacing:this.turbo?35:95']],
  'multi-hot-5-super-wilds/game.bundle.mjs': [['minimum:this.turbo?180:900,spacing:this.turbo?40:160','minimum:this.turbo?150:520,spacing:this.turbo?35:95']],
  '037-safari-simba/game.bundle.mjs': [['this.quick?300:900','this.quick?180:520'],['this.quick?70:160','this.quick?40:90']],
  '002-multi-hot-10/game.mjs': [['const minimum=quick?180:450','const minimum=quick?150:320'],['i*(quick?42:90)','i*(quick?35:75)']],
});
export function patchSource(source,rules) {
  if(typeof source!=='string'||source.length>250000||!Array.isArray(rules))return null;
  let result=source;
  for(const [before,after] of rules) {
    const at=result.indexOf(before);
    if(at<0||result.indexOf(before,at+before.length)>=0||before===after)return null;
    result=result.replace(before,after);
  }
  return result;
}
export async function patchSpinResponse(request,response) {
  if(request.method!=='GET'||request.headers.has('range')||response?.status!==200)return response;
  const m=/^\/new74\/([a-z0-9-]+\/(?:game\.bundle|game)\.mjs)$/.exec(new URL(request.url).pathname);
  const rules=m&&SPIN_PATCHES[m[1]];
  if(!rules||!/(?:javascript|ecmascript)/i.test(response.headers.get('content-type')||''))return response;
  const old=await response.clone().text(),updated=patchSource(old,rules);
  if(!updated||updated===old)return response;
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag','last-modified','accept-ranges'])headers.delete(name);
  headers.set('cache-control','no-store');
  headers.set('x-zplay-spin-motion','r1');
  headers.set('x-content-type-options','nosniff');
  return new Response(updated,{status:200,headers});
}
