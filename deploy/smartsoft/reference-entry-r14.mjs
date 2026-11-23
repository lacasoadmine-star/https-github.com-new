// Presentation extension of the existing Player. Financial endpoints fall
// through unchanged to the retained authenticated transport and ledger.
import {fail,bounded,reply,verifiedAsset,bundledResource} from './reference-resources-r14.mjs';
export {verifiedAsset} from './reference-resources-r14.mjs';
import {GAME_GROUPS as ACCOUNT_GROUPS, PREFIX as ACCOUNT_PREFIX, PREVIOUS_PREFIX} from './account-entry-r13.mjs';
export const PREFIX='/native-library/remaining20/20261110-reference-mobile-r14/';
export const FRAME_GROUPS=Object.freeze({...ACCOUNT_GROUPS,burningice10_native:'cc0f22635df0e9c7',burningice40_native:'cc0f22635df0e9c7'});
const GROUPS=new Set([...Object.values(FRAME_GROUPS),'b38851a17f300bbc']);
const READ=new Set(['GET','HEAD']);
async function sourceText(response,limit){
 let bytes=await bounded(response.body,limit);
 if(response.headers.get('content-encoding')==='gzip'&&bytes[0]===31&&bytes[1]===139)bytes=await bounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),limit);
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
function publicRequest(request,path){const url=new URL(request.url);url.pathname=path;url.search='';return new Request(url,{method:'GET',headers:{accept:'*/*'},redirect:'manual',signal:request.signal});}
function sourceBase(group){return (Object.values(ACCOUNT_GROUPS).includes(group)?ACCOUNT_PREFIX:PREVIOUS_PREFIX)+group+'/';}
async function serviceResource(request,name,env,ctx,sources){
 if(typeof env.EXPANSION100?.fetch!=='function')return fail('EXISTING_ASSET_SERVICE_UNAVAILABLE');
 const response=await env.EXPANSION100.fetch(new Request(publicRequest(request,sources.libraryPrefix+name),{method:request.method}));
 return reply(response,response.body,request.method,response.headers.get('content-type')||'application/octet-stream',response.status===200);
}
export function patchPresentation(source){
 const bind=' if(family===\'smartsoft\')scene=bindSmartSoftWideScene(scene,manifest,{...snapshot,roundActions:round?.actions},viewport);';
 if(source.split(bind).length!==2||source.split('smartSoftWideScene(').length!==3)throw Error('REFERENCE_HOST_CHANGED');
 return "import {bindMobileScene,projectMobileScene} from '"+PREFIX+"smartsoft-mobile.mjs';\n"+
  source.replace(bind,bind+'\n scene=bindMobileScene(scene,manifest,snapshot,viewport);')
   .replaceAll('smartSoftWideScene(','projectFrameScene(')+
  '\nfunction projectFrameScene(scene,manifest){return projectMobileScene(smartSoftWideScene(scene,manifest),manifest);}\n';
}
export function patchConfig(config,sources){
 if(!Array.isArray(config))throw Error('INVALID_GAME_CONFIG');
 return config.map(game=>{
  const binding=sources.bindings[game?.id];if(!binding)return game;
  if(game.referencePresentation?.manifestSha256!==binding.previousManifestSha256||game.referencePresentation?.assetBaseURL!==binding.previousAssetBaseURL)throw Error('REFERENCE_DESCRIPTOR_CHANGED');
  return {...game,referencePresentation:{...game.referencePresentation,manifestURL:PREFIX+'manifests/'+game.id+'.json',manifestSha256:binding.manifestSha256,retainedManifestSha256:binding.previousManifestSha256,assetBaseURL:PREFIX+'assets/'+game.id+'/'}};
 });
}
export function installReferenceFrame(previous,sources){
 if(typeof previous?.fetch!=='function'||!sources?.bindings||!sources?.resources)throw Error('REFERENCE_DEPENDENCIES_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const path=new URL(request.url).pathname;
  if(path.startsWith(PREFIX)){
   if(!READ.has(request.method))return fail('METHOD_NOT_ALLOWED',405);
   const name=path.slice(PREFIX.length);
   if(sources.remoteResources?.includes(name))return serviceResource(request,name,env,ctx,sources);
   if(Object.hasOwn(sources.resources,name)){
    return bundledResource(sources.resources[name],request.method);
   }
   const asset=name.match(/^assets\/([a-z0-9_]+)\/([a-f0-9]{64}\.[a-z0-9]+)$/);
   if(asset&&Object.hasOwn(sources.bindings,asset[1])){
    const binding=sources.bindings[asset[1]],remote=sources.assets[asset[2]];
    if(sources.remoteAssets?.includes(asset[2]))return serviceResource(request,'assets/'+asset[2],env,ctx,sources);
    if(remote){try{return await verifiedAsset(request,remote,{ctx});}catch{return fail('REFERENCE_ASSET_UNAVAILABLE');}}
    const response=await previous.fetch(publicRequest(request,binding.previousAssetBaseURL+asset[2]),env,ctx);
    return reply(response,response.body,request.method,response.headers.get('content-type')||'application/octet-stream',response.status===200);
   }
   const match=name.match(/^([a-f0-9]{16})\/([a-zA-Z0-9_./-]+)$/);
   if(!match||!GROUPS.has(match[1])||match[2].includes('..'))return fail('NOT_FOUND',404);
   const [,group,file]=match,base=sourceBase(group);
   const response=await previous.fetch(publicRequest(request,base+file),env,ctx);
   if(response.status!==200)return response;
   if(!file.endsWith('.mjs')&&!['games.json','demo-games.json'].includes(file))return reply(response,response.body,request.method,response.headers.get('content-type')||'application/octet-stream');
   try{
    let source=await sourceText(response,2097152);
    if(file.endsWith('.mjs')){
     source=source.replaceAll(base,PREFIX+group+'/');
     if(file==='reference-presentation.mjs')source=patchPresentation(source);
     if(file==='session.mjs'){
      const merge='...data.game.publicConfig,...data.game,math:';
      if(source.split(merge).length!==2)throw Error('RETAINED_SESSION_CHANGED');
      source="import {mergeReferenceGame} from '"+PREFIX+"reference-state.mjs';\n"+source.replace(merge,'...data.game.publicConfig,...mergeReferenceGame(this.catalogGame,data.game),math:');
     }
     // The source typeface is already locked in each of these manifests.
     if(file==='presentation/machine-renderer.mjs')source=source.replace("['multihot100_native','habeshafortune5_native'].includes(this.manifest.id)","['multihot100_native','habeshafortune5_native','burningice_native','burningice10_native','burningice40_native'].includes(this.manifest.id)");
     return reply(response,source,request.method,'application/javascript; charset=utf-8');
    }
    return reply(response,JSON.stringify(patchConfig(JSON.parse(source),sources)),request.method,'application/json; charset=utf-8');
   }catch{return fail('REFERENCE_RESOURCE_CHANGED');}
  }
  const match=path.match(/^\/(demo\/)?games\/([a-z0-9_]+)$/),id=match?.[2];
  if(match?.[1])return previous.fetch(request,env,ctx);
  if(!Object.hasOwn(FRAME_GROUPS,id))return previous.fetch(request,env,ctx);
  if(!READ.has(request.method))return fail('METHOD_NOT_ALLOWED',405);
  const response=await previous.fetch(new Request(request,{method:'GET'}),env,ctx);
  if(response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  try{
   let html=await sourceText(response,131072);
   const group=match[1]&&id.startsWith('burningice')&&id!=='burningice_native'?'b38851a17f300bbc':FRAME_GROUPS[id];
   // Match the one app namespace already present, never an arbitrary link.
   const namespace=[ACCOUNT_PREFIX+group+'/',PREVIOUS_PREFIX+group+'/'].find(base=>html.includes(base+'app.mjs'));
   if(!namespace||!html.includes('</head>')||!html.includes('<html '))return fail('REFERENCE_SHELL_CHANGED');
   html=html.replaceAll(namespace,PREFIX+group+'/').replace('<html ','<html data-reference-frame="r14" ')
    .replace('</head>','<link rel="stylesheet" href="'+PREFIX+'frame.css"><script type="module" src="'+PREFIX+'frame.mjs"></script></head>');
   return reply(response,html,request.method,'text/html; charset=utf-8');
  }catch{return fail('REFERENCE_SHELL_UNAVAILABLE');}
 }};
}
