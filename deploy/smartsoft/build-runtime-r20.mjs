import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build,transform} from 'esbuild';
import {patchAutoplayApp} from './autoplay-app-r17.mjs';
import {patchSessionRuntime,patchSpinFinalizer} from './session-runtime-r20.mjs';
import {patchPendingIceMotion} from './motion-runtime-r20.mjs';
const[apps,sessions,output]=process.argv.slice(2);if(!apps||!sessions||!output)throw Error('EXPLICIT_BASELINES_AND_OUTPUT_REQUIRED');
const root=new URL('.',import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex');
const resources={},originalModules=[];
async function add(name,source){
 source=source.replaceAll('/20261110-construction-r16b/','/20261110-construction-r20/').replaceAll('/20261110-construction-r17/','/20261110-construction-r20/');
 const code=(await transform(source,{format:'esm',target:'es2022',minify:true,legalComments:'none'})).code,bytes=Buffer.from(code);
 resources[name]={type:'application/javascript; charset=utf-8',gzip:true,base64:gzipSync(bytes,{level:9}).toString('base64'),bytes:bytes.length,sha256:sha(bytes)};
}
for(const row of JSON.parse(await readFile(apps+'/files.json','utf8')).filter(x=>x.name==='app.mjs')){
 const original=await readFile(apps+'/'+row.group+'/'+row.name,'utf8');if(sha(original)!==row.sha256)throw Error('RETAINED_APP_CHANGED');
 await add(row.group+'/app.mjs',patchSpinFinalizer(patchAutoplayApp(original)));originalModules.push(row);
}
for(const row of JSON.parse(await readFile(sessions+'/files.json','utf8'))){
 const original=await readFile(sessions+'/'+row.group+'/'+row.name,'utf8');if(sha(original)!==row.sha256)throw Error('RETAINED_SESSION_CHANGED');
 await add(row.group+'/session.mjs',patchSessionRuntime(original));originalModules.push(row);
}
const motionHashes={'3d420e4fe5830b46':'fcda5af63b00088c56e59837b2b4fbeeff470b263bb5dd1943eb6b6ce2d40bf0','cc0f22635df0e9c7':'7eab134ebddf3de8f30be53ff11e3ab31ab0eff1037659ed3bfb0c893eddc45d'};
for(const[group,hash]of Object.entries(motionHashes)){
 const motion=await readFile(sessions+'/'+group+'/smartsoft-motion.mjs','utf8');if(sha(motion)!==hash)throw Error('RETAINED_MOTION_CHANGED');
 await add(group+'/presentation/smartsoft-motion.mjs',patchPendingIceMotion(motion));
}
// Keep the existing account/entry modules' immutable imports unchanged.
const entry=(await transform(await readFile(new URL('entry-recovery-r20.mjs',root),'utf8'),{format:'esm',target:'es2022',minify:true,legalComments:'none'})).code;
const entryBytes=Buffer.from(entry);resources['entry.mjs']={type:'application/javascript; charset=utf-8',gzip:true,base64:gzipSync(entryBytes,{level:9}).toString('base64'),bytes:entryBytes.length,sha256:sha(entryBytes)};
const source="import previous from './lobby-library-entry-r19.mjs';export * from './lobby-library-entry-r19.mjs';import {bundledResource,fail} from './reference-resources-r14.mjs';const sources="+JSON.stringify(resources)+";const prefix='/v2/remaining20/construction-r15/runtime-r20/';export default {...previous,async fetch(request,env,ctx){const path=new URL(request.url).pathname;if(!path.startsWith(prefix))return previous.fetch(request,env,ctx);if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);const name=path.slice(prefix.length);return Object.hasOwn(sources,name)?bundledResource(sources[name],request.method):fail('NOT_FOUND',404);}};";
const bundled=await build({stdin:{contents:source,resolveDir:root.pathname},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none',write:false,external:['./lobby-library-entry-r19.mjs','./reference-resources-r14.mjs']});
await mkdir(output,{recursive:true});await writeFile(output+'/runtime-library-entry-r20.mjs',bundled.outputFiles[0].text);
await writeFile(new URL('runtime-sources-r20.mjs',root),'export default '+JSON.stringify(resources)+';\n');
await writeFile(new URL('runtime-evidence-r20.json',root),JSON.stringify({originalModules,originalMotionHashes:motionHashes,resources:Object.fromEntries(Object.entries(resources).map(([name,{base64,...v}])=>[name,v])),financialModulesChanged:0},null,2)+'\n');
console.log(JSON.stringify({resources:Object.keys(resources).length,sourceBytes:Buffer.byteLength(bundled.outputFiles[0].text)}));
