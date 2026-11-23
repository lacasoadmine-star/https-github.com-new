import {bundledResource,fail} from './reference-resources-r14.mjs';
export const RUNTIME_PREFIX='/v2/remaining20/construction-r15/runtime-r17/';
export function installRuntimeLibrary(previous,sources){
 if(typeof previous?.fetch!=='function'||!sources||Object.keys(sources).some(name=>! /^(?:[a-f0-9]{16}\/(?:app|smartsoft-startup)\.mjs|entry\.mjs|mobile-runtime-r17\.mjs|autoplay-visual-r17\.mjs)$/.test(name)))throw Error('INVALID_RUNTIME_SOURCE_PACKAGE');
 return {...previous,async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(!url.pathname.startsWith(RUNTIME_PREFIX))return previous.fetch(request,env,ctx);
  if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
  const name=url.pathname.slice(RUNTIME_PREFIX.length);
  return Object.hasOwn(sources,name)?bundledResource(sources[name],request.method):fail('RUNTIME_SOURCE_NOT_FOUND',404);
 }};
}
