import {readFile,writeFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

export const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
export const require=createRequire(import.meta.url);
export function extractFunction(source,name){
 const found=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(source);
 if(!found)throw Error('FUNCTION_NOT_FOUND:'+name);
 const start=found.index,body=source.indexOf('{',start);let depth=0,quote='',lineComment=false,blockComment=false;
 for(let i=body;i<source.length;i++){
  const c=source[i],n=source[i+1];
  if(lineComment){if(c==='\n')lineComment=false;continue;}
  if(blockComment){if(c==='*'&&n==='/'){blockComment=false;i++;}continue;}
  if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
  if(c==='/'&&n==='/'){lineComment=true;i++;continue;}if(c==='/'&&n==='*'){blockComment=true;i++;continue;}
  if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
  if(c==='{')depth++;else if(c==='}'&&--depth===0)return source.slice(start,i+1);
 }
 throw Error('FUNCTION_BODY_NOT_CLOSED:'+name);
}
export const sha=value=>createHash('sha256').update(value).digest('hex');
export async function frontendSnapshot(name='qa-frontend-snapshot'){
 const target=path.join(root,'railway-recovery',name);await mkdir(target,{recursive:true});
 const directories=['railway-recovery/fixture-assets','live-frontend/zplay-native-machines-20261119-habesha-r4','changes/habesha-r5','changes/habesha-r5/assets'];
 const provenance={};
 const manifest=JSON.parse(await readFile(path.join(root,'native-manifest-r4.json'),'utf8'));
 // A source checkpoint omits recovered provider runtimes. Explicit contract
 // dependencies are copied below; full recovery may additionally use its index.
 const assetIndexPath=path.join(root,'current-worker/modules/native72/native-machine-assets.mjs');
 const assetIndex=existsSync(assetIndexPath)?await readFile(assetIndexPath,'utf8'):'';
 const imports=Object.fromEntries([...assetIndex.matchAll(/import (\w+) from ['"]([^'"]+)['"]/g)].map(m=>[m[1],path.resolve(root,'current-worker/modules/native72',m[2])]));
 const baseline=Object.fromEntries([...assetIndex.matchAll(/"([^"\n]+)":\{type:"[^"]+",size:\d+,body:(\w+)\}/g)].map(m=>[m[1],imports[m[2]]]));
 for(const [name,metadata]of Object.entries(manifest.assets))if(/[.](?:mjs|js|json|css)$/.test(name)&&metadata.baselineName&&baseline[metadata.baselineName]){
  const source=baseline[metadata.baselineName];await copyFile(source,path.join(target,name));provenance[name]={source,sha256:sha(await readFile(source))};
 }
 for(const directory of directories){const full=path.join(root,directory);if(!existsSync(full))continue;
  for(const file of await readdir(full,{withFileTypes:true})){
   if(!file.isFile()||!/[.](?:mjs|js|json|css)$/.test(file.name))continue;
   const source=path.join(full,file.name),dest=path.join(target,file.name);await copyFile(source,dest);provenance[file.name]={source,sha256:sha(await readFile(source))};
  }
 }
 await writeFile(path.join(target,'qa-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
 return {target,provenance,load:name=>import(pathToFileURL(path.join(target,name)).href)};
}
