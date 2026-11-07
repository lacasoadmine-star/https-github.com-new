import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const here=new URL('./',import.meta.url),out=new URL('/workspace/work/jetx-sequential/backend/','file:');
await mkdir(out,{recursive:true});
const original=await readFile(new URL('baseline/native-family-20261104.mjs',here),'utf8');
const files={
 'native-family-preserved.mjs':original+'\nexport {S as sharedWallet,fe as engineSecret,ce as verifyNative,de as readNativeBody,B as engineEnabled,y as engineReady,K as acceptingRounds};\n',
 'jetx-rules.mjs':await readFile(new URL('rules.mjs',here),'utf8'),
 'jetx-auth.mjs':(await readFile(new URL('auth.mjs',here),'utf8')).replace("'./rules.mjs'","'./jetx-rules.mjs'"),
 'jetx-service.mjs':(await readFile(new URL('service.mjs',here),'utf8')).replace("'./rules.mjs'","'./jetx-rules.mjs'"),
 'jetx-railway-entry.mjs':await readFile(new URL('railway-entry.mjs',here),'utf8')
};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [name,code]of Object.entries(files))await writeFile(new URL(name,out),code);
const payload=gzipSync(Buffer.from(JSON.stringify(files)),{level:9});
const wrapper=`import {gunzipSync} from 'node:zlib';\nconst bytes=gunzipSync(Buffer.from('${payload.toString('base64')}','base64'));\nconst files=JSON.parse(bytes.toString('utf8'));\nfor(const [name,code]of Object.entries(files))await Bun.write(new URL('./'+name,import.meta.url),code);\nconst app=await import(new URL('./jetx-railway-entry.mjs',import.meta.url).href);\nexport default app.default;\n`;
await writeFile(new URL('function-wrapper.mjs',out),wrapper);
const command='./run.sh '+Buffer.from(wrapper).toString('base64');
if(Buffer.byteLength(command)>120000)throw new Error('RAILWAY_ARGUMENT_LIMIT');
await writeFile(new URL('start-command.txt',out),command);
const manifest={preservedSourceSha256:hash(original),files:Object.entries(files).map(([name,code])=>({name,bytes:Buffer.byteLength(code),sha256:hash(code)})),wrapper:{bytes:Buffer.byteLength(wrapper),sha256:hash(wrapper),startCommandBytes:Buffer.byteLength(command)}};
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({preservedSourceSha256:manifest.preservedSourceSha256,wrapper:manifest.wrapper}));
