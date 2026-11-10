import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {build,transform} from 'esbuild';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const output=process.argv[2];if(!output)throw Error('EXPLICIT_OUTPUT_REQUIRED');
const root=new URL('.',import.meta.url);
function resource(source,type){const bytes=Buffer.from(source);return {type,gzip:true,base64:gzipSync(bytes,{level:9}).toString('base64'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}
const css=resource((await transform(await readFile(new URL('native-shell-r22.css',root),'utf8'),{loader:'css',minify:true})).code,'text/css; charset=utf-8');
const script=resource((await transform(await readFile(new URL('native-shell-r22.mjs',root),'utf8'),{format:'esm',target:'es2022',minify:true,legalComments:'none'})).code,'application/javascript; charset=utf-8');
const source="import previous from './runtime-player-entry-r21.mjs';export * from './runtime-player-entry-r21.mjs';import {installNativePlayer} from './native-player-r22.mjs';export default installNativePlayer(previous,"+JSON.stringify({css,script})+");";
const result=await build({stdin:{contents:source,resolveDir:root.pathname},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none',write:false,external:['./runtime-player-entry-r21.mjs','./reference-resources-r14.mjs']});
await mkdir(output,{recursive:true});await writeFile(output+'/native-player-entry-r22.mjs',result.outputFiles[0].text);
console.log(JSON.stringify({entryBytes:result.outputFiles[0].contents.length}));
