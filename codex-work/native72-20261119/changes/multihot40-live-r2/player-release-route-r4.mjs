// Additive presentation-only routes in the existing Player Worker. All account,
// wallet, settlement and other game requests retain the original handler.
const prefix='/native-library/existing-new/20261110-etb1-40000-r1/multihot40/';
const routes=Object.freeze({
 '/zplay-fixes/mh40-20261117/multihot40-app.mjs':'multihot40-app.mjs',
 [prefix+'multihot40-app.mjs']:'multihot40-app.mjs',
 [prefix+'multihot40-presentation.mjs']:'multihot40-presentation.mjs',
 [prefix+'presentation/multihot40-motion.mjs']:'multihot40-motion.mjs',
 '/native-library/reference-art/r1/smartsoft/assets/78c1090bbcdb90e0714e4ad43bc06a1a9030d17ee9b1f39490a880a11a681fbe.mp3':'nice-win.mp3',
});
export function installMultiHot40Release(previous,pins){
 if(typeof previous?.fetch!=='function'||pins?.gameId!=='multihot40_native')throw Error('MH40_RELEASE_INVALID');
 for(const file of new Set(Object.values(routes))){
  const p=pins.files?.[file];
  if(!p||!/^[a-f0-9]{64}$/.test(p.sha256)||!Number.isSafeInteger(p.size)||p.size<1||typeof p.kvKey!=='string')throw Error('MH40_PIN_INVALID');
 }
 return {...previous,async fetch(request,env,ctx){
  const file=routes[new URL(request.url).pathname];
  if(env?.PORTAL!=='player'||!file||!['GET','HEAD'].includes(request.method))return previous.fetch(request,env,ctx);
  const pin=pins.files[file];let bytes;
  const headers={'content-type':pin.type??'application/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-zplay-release':pins.release};
  try{
   bytes=await env.SSG_OFFICIAL_REFERENCES.get(pin.kvKey,'arrayBuffer');
   if(!(bytes instanceof ArrayBuffer)||bytes.byteLength!==pin.size)throw Error('MH40_ASSET_UNAVAILABLE');
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
   if(hash!==pin.sha256)throw Error('MH40_ASSET_UNVERIFIED');
  }catch{return new Response('Game resources unavailable. Retry loading.',{status:503,headers:{...headers,'content-type':'text/plain; charset=utf-8'}});}
  return new Response(request.method==='HEAD'?null:bytes,{headers});
 }};
}
