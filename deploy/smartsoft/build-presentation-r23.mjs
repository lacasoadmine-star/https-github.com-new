import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build,transform} from 'esbuild';
import {GAME_GROUPS} from './presentation-service-r23.mjs';
const[baseline,output,release='r23',retainedManifest]=process.argv.slice(2);if(!baseline||!output||!/^r\d+[a-z]?$/.test(release))throw Error('EXPLICIT_BASELINES_AND_OUTPUT_REQUIRED');
const root=new URL('.',import.meta.url),hash=x=>createHash('sha256').update(x).digest('hex');
const rows=JSON.parse(await readFile(baseline+'/files.json','utf8')),resources={},evidence=[];
function resource(source,type){const bytes=Buffer.from(source);return {type,gzip:true,base64:gzipSync(bytes,{level:9}).toString('base64'),bytes:bytes.length,sha256:hash(bytes)};}
for(const group of new Set(Object.values(GAME_GROUPS))){
 const row=rows.find(row=>row.group===group);if(!row)throw Error('BASELINE_GROUP_MISSING');
 let source=await readFile(baseline+'/'+row.name,'utf8');if(hash(source)!==row.sha256)throw Error('RETAINED_APP_CHANGED');
 const legacy='/native-library/remaining20/20261110-rounds-r21/'+group+'/';
 const catalog=/new URL\(\s*(['"])\.\/games\.json\1\s*,\s*import\.meta\.url\s*\)/g;
 if([...source.matchAll(catalog)].length!==1)throw Error('RETAINED_CATALOG_CONTRACT_CHANGED');
 source=source.replace(catalog,'new URL('+JSON.stringify(legacy+'games.json')+',location.origin)');
 const result=await build({stdin:{contents:source,resolveDir:root.pathname,sourcefile:group+'/app.mjs'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none',write:false,
  plugins:[{name:'retained-presentation-dependencies',setup(b){b.onResolve({filter:/^\./},args=>({path:new URL(args.path,'https://retained'+legacy).pathname,external:true}));b.onResolve({filter:/^\//},args=>({path:args.path,external:true}));}}]});
 resources[group+'/app.mjs']=resource(result.outputFiles[0].text,'application/javascript; charset=utf-8');evidence.push(row);
}
resources['shell.css']=resource((await transform(await readFile(new URL('native-shell-r22.css',root),'utf8'),{loader:'css',minify:true})).code,'text/css; charset=utf-8');
resources['shell.mjs']=resource((await transform(await readFile(new URL('native-shell-r22.mjs',root),'utf8'),{format:'esm',target:'es2022',minify:true,legalComments:'none'})).code,'application/javascript; charset=utf-8');
const retained=retainedManifest?JSON.parse(await readFile(retainedManifest,'utf8')).releases:{};
if(retained[release]&&JSON.stringify(retained[release])!==JSON.stringify(resources))throw Error('IMMUTABLE_PRESENTATION_RELEASE_COLLISION');
const child="import {createPresentationService} from './presentation-service-r23.mjs';export default createPresentationService("+JSON.stringify({release,resources,retainedReleases:retained})+");";
const parent="import previous from './native-player-entry-r22.mjs';export * from './native-player-entry-r22.mjs';import {installPresentationPlayer} from './presentation-player-r23.mjs';export default installPresentationPlayer(previous);";
await mkdir(output,{recursive:true});
for(const[name,source,external]of [['presentation-service-entry-r23.mjs',child,[]],['presentation-player-entry-r23.mjs',parent,['./native-player-entry-r22.mjs','./reference-resources-r14.mjs']]]){
 const result=await build({stdin:{contents:source,resolveDir:root.pathname},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none',write:false,external});
 await writeFile(output+'/'+name,result.outputFiles[0].text);
}
await writeFile(output+'/presentation-sources-r23.mjs','export default '+JSON.stringify(resources)+';\n');
await writeFile(output+'/presentation-releases-r23.json',JSON.stringify({activeRelease:release,releases:{...retained,[release]:resources}})+'\n');
await writeFile(output+'/presentation-evidence-r23.json',JSON.stringify({release,retainedBaselines:evidence,resources:Object.fromEntries(Object.entries(resources).map(([name,{base64,...meta}])=>[name,meta])),financialModulesChanged:0},null,2)+'\n');
console.log(JSON.stringify({resources:Object.keys(resources).length,childBytes:(await readFile(output+'/presentation-service-entry-r23.mjs')).length,parentBytes:(await readFile(output+'/presentation-player-entry-r23.mjs')).length}));
