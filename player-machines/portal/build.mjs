import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url)),assets={};
for(const name of ['portal.css','surfaces.css','portal.mjs','cover-art.mjs']){
 const body=await readFile(join(root,name),'utf8'),hash=createHash('sha256').update(body).digest('hex');
 assets[name]={body,type:name.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8',etag:'"'+hash+'"'};
}
await writeFile(join(root,'portal-assets-r9.mjs'),'// Generated from portal/ source by build.mjs.\nexport const assets='+JSON.stringify(assets)+';\n');
console.log(JSON.stringify({release:'player-portal-20261106-r9',assets:Object.fromEntries(Object.entries(assets).map(([name,value])=>[name,{bytes:Buffer.byteLength(value.body),etag:value.etag}]))}));
