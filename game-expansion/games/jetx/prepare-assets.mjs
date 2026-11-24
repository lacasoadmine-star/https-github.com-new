import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('./public/',import.meta.url)),prefix='/native-library/jetx/r1/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.gif':'image/gif','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf','.mp3':'audio/mpeg','.mp4':'video/mp4','.atlas':'text/plain'};
const manifest={},files={};
async function walk(relative=''){
 for(const entry of await readdir(join(root,relative),{withFileTypes:true})){
  const name=join(relative,entry.name);if(entry.isDirectory()){await walk(name);continue;}
  const body=await readFile(join(root,name)),extension=extname(name).slice(1),hash=createHash('sha256').update(body.toString('base64')+extension).digest('hex').slice(0,32);
  if(body.length>25*1024*1024)throw new Error('STATIC_ASSET_TOO_LARGE');
  manifest[prefix+name.replaceAll('\\','/')]={hash,size:body.length};
  files[hash]={filename:join(root,name),type:types[extname(name)]||'application/octet-stream',sha256:createHash('sha256').update(body).digest('hex')};
 }
}
await walk();
await mkdir('/workspace/work/jetx-sequential/deploy',{recursive:true});
await writeFile('/workspace/work/jetx-sequential/deploy/assets.json',JSON.stringify({manifest,files},null,2));
console.log(JSON.stringify({assets:Object.keys(manifest).length,uniqueFiles:Object.keys(files).length,bytes:Object.values(manifest).reduce((n,f)=>n+f.size,0)}));
