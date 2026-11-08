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
const runtimeGameIds=['multihot40_native'];
const modelModules=['smartsoft-slots.mjs','smartsoft-slots.data.json','multihot40-rules.mjs'];
for(const name of modelModules){if(Object.hasOwn(files,name))throw Error('BASELINE_NAME_COLLISION:'+name);files[name]=await readFile(resolve(root,'models',name),'utf8');}
// The source checkout retains every unfinished machine. A function release
// ships only its registered native adapters and their exact public data.
const models=JSON.parse(files['smartsoft-slots.data.json']).filter(model=>runtimeGameIds.includes(model.id));
if(models.length!==runtimeGameIds.length)throw Error('RELEASE_MODEL_DATA_MISSING');
files['smartsoft-slots.data.json']=JSON.stringify(models);
files['expansion-entry.mjs']=await readFile(resolve(root,'expansion-entry.mjs'),'utf8');
files['expansion-history.mjs']=await readFile(resolve(root,'expansion-history.mjs'),'utf8');
files['release-policy.mjs']=await readFile(resolve(root,'release-policy.mjs'),'utf8');
files['release-readiness.json']=await readFile(resolve(root,'release-readiness.json'),'utf8');
// A function upload contains the full frozen baseline and only additive model
// modules. No stale staged Railway patch, variable or schema reset is applied.
const bytes=Buffer.from(JSON.stringify(files)),digest=hash(bytes),encoded=gzipSync(bytes,{level:9}).toString('base64');
const preservation=JSON.stringify(baselineManifest);
const loader=`// Additive owner-authorized release. All9modules from the currently deployed Balloon/JetX/native-family service are retained byte-for-byte. The previous library registry contained Balloon only; MultiHot40 is the sole added game.
import {gunzipSync} from 'node:zlib';\nimport {createHash} from 'node:crypto';\nconst bytes=gunzipSync(Buffer.from('${encoded}','base64'));\nif(createHash('sha256').update(bytes).digest('hex')!=='${digest}')throw Error('RELEASE_HASH_MISMATCH');\nconst files=JSON.parse(bytes);\nconst preserved=${preservation};\nfor(const [name,digest]of Object.entries(preserved))if(typeof files[name]!=='string'||createHash('sha256').update(files[name]).digest('hex')!==digest)throw Error('EXISTING_MODULE_CHANGED:'+name);\nfor(const [name,code]of Object.entries(files))await Bun.write(new URL('./'+name,import.meta.url),code);\nconst app=await import(new URL('./expansion-entry.mjs',import.meta.url).href);\nexport default app.default;\n`;
if(Buffer.byteLength(loader)>90000)throw Error('SINGLE_FUNCTION_SOURCE_BUDGET_EXCEEDED');
await mkdir(resolve(root,'deployment'),{recursive:true});await writeFile(resolve(root,'deployment/expansion-backend.tsx'),loader);
const manifest={generatedAt:new Date().toISOString(),runtimeGameIds,bundleSha256:digest,sourceSha256:hash(loader),baselineUnchanged:Object.keys(baselineManifest),modules:Object.fromEntries(Object.entries(files).map(([name,content])=>[name,{bytes:Buffer.byteLength(content),sha256:hash(content)}]))};
await writeFile(resolve(root,'evidence/backend-candidate.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({baselineModulesPreserved:Object.keys(baselineManifest).length,modules:Object.keys(files).length,bundleSha256:digest,loaderBytes:Buffer.byteLength(loader)}));
