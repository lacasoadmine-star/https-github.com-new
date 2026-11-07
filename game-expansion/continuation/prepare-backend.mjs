import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const root=dirname(fileURLToPath(import.meta.url)),hash=value=>createHash('sha256').update(value).digest('hex');
const baselineManifest=JSON.parse(await readFile(resolve(root,'evidence/backend-baseline-manifest.json'),'utf8'));
const files={};
for(const [name,expected] of Object.entries(baselineManifest)){
 const source=await readFile(resolve(root,'backend-baseline',name),'utf8');if(hash(source)!==expected)throw Error('BASELINE_CHANGED:'+name);files[name]=source;
}
const modelModules=['smartsoft-slots.mjs','smartsoft-slots.data.json','remaining-games.mjs','remaining-engine.mjs','remaining-reference-data.mjs'];
for(const name of modelModules){if(Object.hasOwn(files,name))throw Error('BASELINE_NAME_COLLISION:'+name);files[name]=await readFile(resolve(root,'models',name),'utf8');}
files['expansion-entry.mjs']=await readFile(resolve(root,'expansion-entry.mjs'),'utf8');
files['release-policy.mjs']=await readFile(resolve(root,'release-policy.mjs'),'utf8');
files['release-readiness.json']=await readFile(resolve(root,'release-readiness.json'),'utf8');
// A function upload contains the full frozen baseline and only additive model
// modules. No stale staged Railway patch, variable or schema reset is applied.
const bytes=Buffer.from(JSON.stringify(files)),digest=hash(bytes),encoded=gzipSync(bytes,{level:9}).toString('base64');
const loader=`import {gunzipSync} from 'node:zlib';\nimport {createHash} from 'node:crypto';\nconst bytes=gunzipSync(Buffer.from('${encoded}','base64'));\nif(createHash('sha256').update(bytes).digest('hex')!=='${digest}')throw Error('RELEASE_HASH_MISMATCH');\nfor(const [name,code]of Object.entries(JSON.parse(bytes)))await Bun.write(new URL('./'+name,import.meta.url),code);\nconst app=await import(new URL('./expansion-entry.mjs',import.meta.url).href);\nexport default app.default;\n`;
await mkdir(resolve(root,'deployment'),{recursive:true});await writeFile(resolve(root,'deployment/expansion-backend.tsx'),loader);
const manifest={generatedAt:new Date().toISOString(),bundleSha256:digest,sourceSha256:hash(loader),baselineUnchanged:Object.keys(baselineManifest),modules:Object.fromEntries(Object.entries(files).map(([name,content])=>[name,{bytes:Buffer.byteLength(content),sha256:hash(content)}]))};
await writeFile(resolve(root,'evidence/backend-candidate.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({baselineModulesPreserved:Object.keys(baselineManifest).length,modules:Object.keys(files).length,bundleSha256:digest,loaderBytes:Buffer.byteLength(loader)}));
