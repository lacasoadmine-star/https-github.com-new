import {bundledResource,fail} from './reference-resources-r14.mjs';
export const PRESENTATION_PREFIX='/native-ui/';
export const GAME_GROUPS=Object.freeze({
 multihot100_native:'5fddea498e1f0d39',habeshafortune5_native:'7161514f85b0565e',
 multihotwildways_native:'b930310f3d5338cd',multihot5wild_native:'b930310f3d5338cd',
 multihot5superwilds_native:'3d420e4fe5830b46',multihotdeluxe_native:'fe6fe5c2996189a2',
 burningice_native:'3d420e4fe5830b46',burningice10_native:'cc0f22635df0e9c7',burningice40_native:'cc0f22635df0e9c7',
});
export function createPresentationService({release,resources,retainedReleases={}}){
 if(!/^r\d+[a-z]?$/.test(release)||!resources||Object.values(GAME_GROUPS).some(group=>!resources[group+'/app.mjs'])||!resources['shell.css']||!resources['shell.mjs'])throw Error('INVALID_PRESENTATION_RELEASE');
 const versionPrefix=PRESENTATION_PREFIX+'releases/'+release+'/';
 const releases={...retainedReleases,[release]:resources};
 if(Object.keys(releases).some(version=>!/^r\d+[a-z]?$/.test(version)))throw Error('INVALID_RETAINED_PRESENTATION_RELEASE');
 const pointer=(body,type,method)=>new Response(method==='HEAD'?null:body,{headers:{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','x-superwin-presentation-release':release}});
 return {async fetch(request){
  const path=new URL(request.url).pathname;
  if(!path.startsWith(PRESENTATION_PREFIX))return fail('NOT_FOUND',404);
  if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
  if(path===PRESENTATION_PREFIX+'status')return pointer(JSON.stringify({service:'superwin-native-presentation',release,games:Object.keys(GAME_GROUPS),resources:Object.keys(resources).length,retainedReleases:Object.keys(releases),financialActions:false}),'application/json; charset=utf-8',request.method);
  const match=path.match(/^\/native-ui\/entry\/([a-z0-9_]+)\.mjs$/);
  if(match&&Object.hasOwn(GAME_GROUPS,match[1]))return pointer('import '+JSON.stringify(versionPrefix+GAME_GROUPS[match[1]]+'/app.mjs')+';\n','application/javascript; charset=utf-8',request.method);
  if(path===PRESENTATION_PREFIX+'shell.mjs')return pointer('import '+JSON.stringify(versionPrefix+'shell.mjs')+';\n','application/javascript; charset=utf-8',request.method);
  if(path===PRESENTATION_PREFIX+'shell.css')return pointer('@import url('+JSON.stringify(versionPrefix+'shell.css')+');\n','text/css; charset=utf-8',request.method);
  const versioned=path.match(/^\/native-ui\/releases\/(r\d+[a-z]?)\/(.+)$/);
  if(!versioned||!Object.hasOwn(releases,versioned[1])||!Object.hasOwn(releases[versioned[1]],versioned[2]))return fail('NOT_FOUND',404);
  const response=await bundledResource(releases[versioned[1]][versioned[2]],request.method);
  response.headers.set('x-superwin-presentation-release',versioned[1]);return response;
 }};
}
