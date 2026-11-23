import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {transform} from 'esbuild';
import {patchAutoplayApp} from './autoplay-app-r17.mjs';
const root=new URL('.',import.meta.url),baseline=process.argv[2];
if(!baseline)throw Error('EXPLICIT_RETAINED_BASELINE_REQUIRED');
const inventory=JSON.parse(await readFile(baseline+'/files.json','utf8'));
const sha=source=>createHash('sha256').update(source).digest('hex');
const resources={},evidence=[];
async function add(name,source){
 const output=(await transform(source,{format:'esm',target:'es2022',minify:true,legalComments:'none'})).code;
 const bytes=Buffer.from(output);resources[name]={type:'application/javascript; charset=utf-8',base64:gzipSync(bytes,{level:9}).toString('base64'),gzip:true,bytes:bytes.length,sha256:sha(bytes)};
}
for(const record of inventory.filter(row=>row.name==='app.mjs')){
 const original=await readFile(baseline+'/'+record.group+'/'+record.name,'utf8');
 if(sha(original)!==record.sha256)throw Error('RETAINED_CLIENT_SOURCE_CHANGED');
 let updated=patchAutoplayApp(original);
 updated=updated.replaceAll('/native-library/remaining20/20261110-construction-r16b/','/native-library/remaining20/20261110-construction-r17/');
 await add(record.group+'/'+record.name,updated);evidence.push({...record,publicName:record.group+'/'+record.name});
}
for(const[name,file]of [['entry.mjs','entry-startup-r17.mjs'],['mobile-runtime-r17.mjs','mobile-runtime-r17.mjs'],['autoplay-visual-r17.mjs','autoplay-visual-r17.mjs']])await add(name,await readFile(new URL(file,root),'utf8'));
await writeFile(new URL('runtime-sources-r17.mjs',root),'// Exact-source guarded public client fixes; no backend or wallet module.\nexport default '+JSON.stringify(resources)+';\n');
await writeFile(new URL('runtime-evidence-r17.json',root),JSON.stringify({schemaVersion:1,originalModules:evidence,changedFinancialModules:0,resources:Object.fromEntries(Object.entries(resources).map(([name,{base64,...record}])=>[name,record]))},null,2)+'\n');
console.log(JSON.stringify({resources:Object.keys(resources).length,originalFiles:evidence.length,changedFinancialModules:0}));
