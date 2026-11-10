// The existing Player is at Cloudflare's size boundary. Bundle the additive
// wrapper and minify only these three previously owned modules. Every original
// binary, ledger transport, binding and named export remains in the package.
import {build,transform} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
const output=process.argv[2];
if(!output)throw Error('EXPLICIT_BUILD_DIRECTORY_REQUIRED');
const root=fileURLToPath(new URL('.',import.meta.url));
await mkdir(output,{recursive:true});
const bundled=await build({entryPoints:[join(root,'construction-player-entry-r15.mjs')],bundle:true,
 format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none',write:false,
 external:['./reference-player-entry-r14.mjs','./reference-resources-r14.mjs']});
await writeFile(resolve(output,'construction-player-entry-r15.mjs'),bundled.outputFiles[0].text);
const replaced={};
for(const name of ['account-entry-r13.mjs','reference-resources-r14.mjs','account-lobby-source-r13.mjs']){
 const previous=await readFile(join(root,name),'utf8');
 let input=previous;
 if(name==='account-lobby-source-r13.mjs'){
  const {LOBBY_SOURCE}=await import(pathToFileURL(join(root,name)));
  const browser=await transform(LOBBY_SOURCE,{format:'esm',target:'es2022',minify:true,legalComments:'none'});
  input='export const LOBBY_SOURCE='+JSON.stringify(browser.code)+';';
 }
 const built=await transform(input,{format:'esm',target:'es2022',minify:true,legalComments:'none'});
 await writeFile(resolve(output,name),built.code);
 replaced[name]={sha256:createHash('sha256').update(previous).digest('hex'),previousBytes:Buffer.byteLength(previous),bytes:Buffer.byteLength(built.code)};
}
await writeFile(resolve(output,'package.json'),JSON.stringify({mainModule:'construction-player-entry-r15.mjs',replaced},null,2)+'\n');
console.log(JSON.stringify({entryBytes:Buffer.byteLength(bundled.outputFiles[0].text),replaced}));
