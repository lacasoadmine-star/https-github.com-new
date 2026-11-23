import {bundledResource,fail} from './reference-resources-r14.mjs';
export const ACCOUNT_PREFIX='/v2/remaining20/construction-r15/auth-r18/';
export function installAccountLibrary(previous,resources){
 return {...previous,async fetch(request,env,ctx){
  const path=new URL(request.url).pathname;
  if(!path.startsWith(ACCOUNT_PREFIX))return previous.fetch(request,env,ctx);
  if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
  const name=path.slice(ACCOUNT_PREFIX.length);
  if(!['entry.mjs','sign-in.mjs'].includes(name)||!Object.hasOwn(resources,name))return fail('NOT_FOUND',404);
  return bundledResource(resources[name],request.method);
 }};
}
