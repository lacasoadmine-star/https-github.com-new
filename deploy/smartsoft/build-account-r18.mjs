import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {transform,build} from 'esbuild';
import {patchSignInReturn,ACCOUNT_GAME_IDS,ORIGINAL_SIGN_IN_SHA256} from './sign-in-return-r18.mjs';
const[baseline,output]=process.argv.slice(2);
if(!baseline||!output)throw Error('EXPLICIT_RETAINED_SIGN_IN_AND_OUTPUT_REQUIRED');
const root=new URL('.',import.meta.url),original=await readFile(baseline,'utf8');
const sha=x=>createHash('sha256').update(x).digest('hex');
if(sha(original)!==ORIGINAL_SIGN_IN_SHA256)throw Error('RETAINED_SIGN_IN_SOURCE_CHANGED');
const entry=(await readFile(new URL('account-entry-r18.mjs',root),'utf8')).replace('__RELEASED_ACCOUNT_IDS__',JSON.stringify(ACCOUNT_GAME_IDS));
const resources={};
for(const[name,source]of [['entry.mjs',entry],['sign-in.mjs',patchSignInReturn(original)]]){
 const text=(await transform(source,{format:'esm',target:'es2022',minify:true,legalComments:'none'})).code;
 const bytes=Buffer.from(text);resources[name]={type:'application/javascript; charset=utf-8',gzip:true,base64:gzipSync(bytes,{level:9}).toString('base64'),bytes:bytes.length,sha256:sha(bytes)};
}
await mkdir(output,{recursive:true});
const evidence={originalSignIn:{bytes:Buffer.byteLength(original),sha256:sha(original)},resources:Object.fromEntries(Object.entries(resources).map(([key,{base64,...v}])=>[key,v])),financialModulesChanged:0};
const source="import previous from './runtime-library-entry-r17.mjs';export * from './runtime-library-entry-r17.mjs';import {installAccountLibrary} from './account-library-r18.mjs';export default installAccountLibrary(previous,"+JSON.stringify(resources)+');';
const result=await build({stdin:{contents:source,resolveDir:new URL('.',root).pathname,sourcefile:'auth-library-entry-r18.mjs'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none',write:false,external:['./runtime-library-entry-r17.mjs','./reference-resources-r14.mjs']});
await writeFile(output+'/auth-library-entry-r18.mjs',result.outputFiles[0].text);
await writeFile(new URL('account-evidence-r18.json',root),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({entryBytes:Buffer.byteLength(result.outputFiles[0].text),...evidence}));
