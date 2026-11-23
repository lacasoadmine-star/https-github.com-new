import {fail,bundledResource,verifiedAsset} from './reference-resources-r14.mjs';
export const LIBRARY_PREFIX='/v2/remaining20/reference-mobile-r14/';
// Extend the existing asset service, preserving its retained DO export and
// every old route. Only public presentation resources use this new prefix.
export function installReferenceLibrary(previous,sources){
 if(typeof previous?.fetch!=='function'||!sources?.resources||!sources?.assets)throw Error('EXISTING_LIBRARY_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  const path=new URL(request.url).pathname;
  if(!path.startsWith(LIBRARY_PREFIX))return previous.fetch(request,env,ctx);
  if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
  const name=path.slice(LIBRARY_PREFIX.length);
  try{
   if(Object.hasOwn(sources.resources,name))return await bundledResource(sources.resources[name],request.method);
   const asset=name.match(/^assets\/([a-f0-9]{64}\.[a-z0-9]+)$/);
   if(asset&&Object.hasOwn(sources.assets,asset[1]))return await verifiedAsset(request,sources.assets[asset[1]],{ctx});
   return fail('NOT_FOUND',404);
  }catch{return fail('REFERENCE_ASSET_UNAVAILABLE');}
 }};
}
