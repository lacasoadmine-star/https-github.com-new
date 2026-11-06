import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';

const mimeTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.gif':'image/gif','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.ogg':'audio/ogg','.woff2':'font/woff2','.otf':'font/otf'};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const moduleType='application/javascript+module';

// Browser source remains byte-identical. Worker data modules expose ArrayBuffer
// values rather than parsing the complete frontend as quoted JavaScript strings.
export async function packWorkerAssets({publicDirectory,workerDirectory,release}){
 if(!/^zplay-machines-[\w-]+$/.test(release))throw Error('Invalid machine release');
 await mkdir(workerDirectory,{recursive:true});
 const dataDirectory=join(workerDirectory,'machine-data');await mkdir(dataDirectory,{recursive:true});
 const imports=[],entries=[],assets=[],modules=[],wanted=new Set();let htmlTemplate;
 for(const entry of (await readdir(publicDirectory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  if(!entry.isFile())throw Error('Expected a flat public asset directory: '+entry.name);
  const name=entry.name;if(!/^[\w.-]+$/.test(name))throw Error('Invalid public asset filename: '+name);
  const body=await readFile(join(publicDirectory,name)),extension=name.slice(name.lastIndexOf('.')),type=mimeTypes[extension]||'application/octet-stream';
  if(/^(text\/|application\/(javascript|json)|image\/svg)/.test(type)){
   for(const match of body.toString('utf8').matchAll(/\/zplay-machines-[\w-]+\//g))if(match[0]!=='/'+release+'/')throw Error('Stale asset release path in '+name+': '+match[0]);
  }
  const asset={name,type,bytes:body.length,sha256:hash(body)};
  if(name==='index.html'){
   htmlTemplate=body.toString('utf8');
   if(Buffer.from(htmlTemplate).compare(body)!==0)throw Error('Invalid UTF-8 HTML template');
   if((htmlTemplate.match(/\{\{GAME\}\}/g)||[]).length!==1||!htmlTemplate.includes('</body>'))throw Error('HTML template markers changed');
   assets.push({...asset,storage:'html-template'});continue;
  }
  const moduleName='machine-data/'+name+'.bin',identifier='data'+imports.length,file=join(dataDirectory,name+'.bin');wanted.add(name+'.bin');
  await writeFile(file,body);imports.push('import '+identifier+' from '+JSON.stringify('./'+moduleName)+';');
  entries.push(JSON.stringify(name)+':{type:'+JSON.stringify(type)+',size:'+body.length+',body:'+identifier+'}');
  modules.push({name:moduleName,file:'worker/'+moduleName,type:'application/octet-stream',bytes:body.length,sha256:asset.sha256,source:'public/'+name});
  assets.push({...asset,module:moduleName,storage:'array-buffer'});
 }
 if(htmlTemplate===undefined)throw Error('Missing index.html');
 for(const name of await readdir(dataDirectory))if(name.endsWith('.bin')&&!wanted.has(name))await rm(join(dataDirectory,name));
 const name='machine-assets-20261106.mjs',source='// Generated: frontend bytes are typed data modules, never eager JS strings.\n'+imports.join('\n')+'\nexport const release='+JSON.stringify(release)+';\nexport const htmlTemplate='+JSON.stringify(htmlTemplate)+';\nexport const assets=Object.freeze(Object.assign(Object.create(null),{'+entries.join(',')+'}));\n';
 await writeFile(join(workerDirectory,name),source);
 modules.unshift({name,file:'worker/'+name,type:moduleType,bytes:Buffer.byteLength(source),sha256:hash(source)});
 const manifest={schemaVersion:1,release,packaging:'typed-binary-modules',entryModule:name,htmlTemplateBytes:Buffer.byteLength(htmlTemplate),frontendBytes:assets.reduce((sum,a)=>sum+a.bytes,0),workerJavaScriptBytes:Buffer.byteLength(source),binaryBytes:modules.slice(1).reduce((sum,m)=>sum+m.bytes,0),assets,modules};
 await writeFile(join(workerDirectory,'machine-assets-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
