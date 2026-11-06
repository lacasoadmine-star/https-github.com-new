import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {mimeTypes} from './pack-worker-assets.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const moduleType='application/javascript+module';
export async function packNativeWorkerAssets({publicDirectory,workerDirectory,baselineDirectory=workerDirectory,release}){
 if(!/^zplay-native-machines-[\w-]+$/.test(release))throw Error('Invalid native release');
 const baseline=JSON.parse(await readFile(join(baselineDirectory,'machine-assets-manifest.json'),'utf8'));
 if(baseline.release!=='zplay-machines-20261106-r12'||baseline.packaging!=='typed-binary-modules')throw Error('Restore verified308 baseline assets before building native machines');
 const shared=new Map();
 for(const asset of baseline.assets){
  if(asset.storage!=='array-buffer')continue;
  if(!/^machine-data\/[\w.-]+\.bin$/.test(asset.module))throw Error('Invalid baseline Data module path');
  const bytes=await readFile(join(baselineDirectory,asset.module));
  if(bytes.length!==asset.bytes||hash(bytes)!==asset.sha256)throw Error('Baseline Data module changed: '+asset.module);
  shared.set(asset.sha256+':'+asset.bytes,asset.module);
 }
 await mkdir(workerDirectory,{recursive:true});
 const dataDirectory=join(workerDirectory,'native-machine-data');await mkdir(dataDirectory,{recursive:true});
 const imports=[],entries=[],assets=[],modules=[],wanted=new Set(),identifiers=new Map();let htmlTemplate;
 for(const entry of (await readdir(publicDirectory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  if(!entry.isFile()||!/^\w[\w.-]*$/.test(entry.name))throw Error('Expected a flat native public directory: '+entry.name);
  const name=entry.name,body=await readFile(join(publicDirectory,name)),type=mimeTypes[name.slice(name.lastIndexOf('.'))]||'application/octet-stream';
  if(/^(text\/|application\/(javascript|json)|image\/svg)/.test(type))for(const match of body.toString('utf8').matchAll(/\/zplay-(?:native-)?machines-[\w-]+\//g))if(match[0]!=='/'+release+'/')throw Error('Stale native release path in '+name+': '+match[0]);
  const asset={name,type,bytes:body.length,sha256:hash(body)};
  if(name==='index.html'){
   htmlTemplate=body.toString('utf8');
   if(Buffer.from(htmlTemplate).compare(body)!==0||(htmlTemplate.match(/\{\{GAME\}\}/g)||[]).length!==1||(htmlTemplate.match(/\{\{PRESENTATION_GAME\}\}/g)||[]).length!==1||!htmlTemplate.includes('</body>'))throw Error('Native HTML identity markers changed');
   assets.push({...asset,storage:'html-template'});continue;
  }
  const reused=shared.get(asset.sha256+':'+asset.bytes),moduleName=reused||'native-machine-data/'+name+'.bin';
  if(!reused){await writeFile(join(dataDirectory,name+'.bin'),body);wanted.add(name+'.bin');modules.push({name:moduleName,file:'worker/'+moduleName,type:'application/octet-stream',bytes:body.length,sha256:asset.sha256,source:'public/'+name});}
  let identifier=identifiers.get(moduleName);
  if(!identifier){identifier='data'+identifiers.size;identifiers.set(moduleName,identifier);imports.push('import '+identifier+' from '+JSON.stringify('./'+moduleName)+';');}
  entries.push(JSON.stringify(name)+':{type:'+JSON.stringify(type)+',size:'+body.length+',body:'+identifier+'}');
  assets.push({...asset,module:moduleName,storage:'array-buffer',reusedBaseline:!!reused});
 }
 if(htmlTemplate===undefined)throw Error('Missing native index.html');
 for(const name of await readdir(dataDirectory))if(name.endsWith('.bin')&&!wanted.has(name))await rm(join(dataDirectory,name));
 const name='native-machine-assets.mjs',source='// Generated additive native assets; existing baseline Data modules are shared by exact byte hash.\n'+imports.join('\n')+'\nexport const release='+JSON.stringify(release)+';\nexport const htmlTemplate='+JSON.stringify(htmlTemplate)+';\nexport const assets=Object.freeze(Object.assign(Object.create(null),{'+entries.join(',')+'}));\n';
 await writeFile(join(workerDirectory,name),source);modules.unshift({name,file:'worker/'+name,type:moduleType,bytes:Buffer.byteLength(source),sha256:hash(source)});
 const manifest={schemaVersion:1,release,packaging:'additive-typed-binary-modules',entryModule:name,baselineRelease:baseline.release,htmlTemplateBytes:Buffer.byteLength(htmlTemplate),frontendBytes:assets.reduce((n,a)=>n+a.bytes,0),workerJavaScriptBytes:Buffer.byteLength(source),binaryBytes:assets.filter(a=>a.storage==='array-buffer').reduce((n,a)=>n+a.bytes,0),addedBinaryBytes:modules.filter(m=>m.type==='application/octet-stream').reduce((n,m)=>n+m.bytes,0),reusedBaselineModules:[...new Set(assets.filter(a=>a.reusedBaseline).map(a=>a.module))].sort(),assets,modules};
 await writeFile(join(workerDirectory,'native-machine-assets-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
