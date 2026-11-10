import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build,transform} from 'esbuild';
import {UI_SOURCE} from './operator-ui-source-r16.mjs';
import {patchLobbyUI} from './lobby-ui-r19.mjs';
import {patchLobbySheet} from './lobby-sheet-r21.mjs';
import {REFERENCE_SOURCES} from './reference-sources-r14.mjs';
import {patchAutoplayApp} from './autoplay-app-r17.mjs';
import {patchSpinFinalizer} from './session-runtime-r20.mjs';
import {patchCollectSpin} from './collect-spin-r21.mjs';
const output=process.argv[2];if(!output)throw Error('EXPLICIT_OUTPUT_REQUIRED');
const root=new URL('.',import.meta.url),sources={},sha=value=>createHash('sha256').update(value).digest('hex');
const add=(name,bytes,type)=>{sources[name]={type,bytes:bytes.length,sha256:sha(bytes),gzip:true,base64:gzipSync(bytes,{level:9}).toString('base64')};};
const lobby=await build({stdin:{contents:patchLobbySheet(patchLobbyUI(UI_SOURCE)),resolveDir:root.pathname},bundle:true,write:false,format:'esm',target:'es2022',minify:true,legalComments:'none'});
add('lobby.mjs',lobby.outputFiles[0].contents,'application/javascript; charset=utf-8');
for(const name of await readdir(new URL('assets-r21/',root))){
 const spec=REFERENCE_SOURCES.assets[name];if(!spec)throw Error('UNKNOWN_REFERENCE_ASSET');
 const bytes=await readFile(new URL('assets-r21/'+name,root));if(bytes.length!==spec.bytes||sha(bytes)!==spec.sha256)throw Error('REFERENCE_ASSET_CHANGED:'+name);
 add('assets/'+name,bytes,spec.type);
}
add('rounds.css',await readFile(new URL('rounds-r21.css',root)),'text/css; charset=utf-8');
add('smartsoft-mobile.mjs',await readFile(new URL('mobile-rounds-r21.mjs',root)),'application/javascript; charset=utf-8');
const frame=(await readFile(new URL('reference-frame-r14.mjs',root),'utf8'))
 .replace('Choose a stake\\.|','Choose (?:a stake|your stake and play)\\.|Your round is active\\.|')
 .replace("const integrated=document.body", "root.dataset.referenceNotice=ordinary?'routine':'attention';\n  const panel=document.querySelector('.control-panel'),play=document.querySelector('[data-control=play]');\n  if(panel&&play){const bottom=ordinary&&innerHeight>innerWidth?Math.max(8,innerHeight-play.getBoundingClientRect().top+8)+'px':'0px';if(panel.style.bottom!==bottom)panel.style.bottom=bottom;}\n  const integrated=document.body");
add('frame.mjs',Buffer.from("import './mobile-background.mjs';\n"+frame),'application/javascript; charset=utf-8');
const baseline=JSON.parse(await readFile(new URL('runtime-evidence-r20.json',root),'utf8'));
for(const row of baseline.originalModules.filter(row=>row.name==='app.mjs')){
 const source=await readFile(new URL('baselines-r21/'+row.sha256+'.mjs',root),'utf8');
 if(sha(source)!==row.sha256)throw Error('RETAINED_APP_CHANGED');
 const patched=patchCollectSpin(patchSpinFinalizer(patchAutoplayApp(source)))
  .replaceAll('/20261110-construction-r16b/','/20261110-rounds-r21/')
  .replaceAll('/20261110-construction-r17/','/20261110-rounds-r21/');
 add(row.group+'/app.mjs',Buffer.from((await transform(patched,{format:'esm',target:'es2022',minify:true,legalComments:'none'})).code),'application/javascript; charset=utf-8');
}
await mkdir(output,{recursive:true});
await writeFile(output+'/runtime-sources-r21.mjs','export default '+JSON.stringify(sources)+';\n');
const library="import previous from './runtime-library-entry-r20.mjs';export * from './runtime-library-entry-r20.mjs';import {bundledResource,fail} from './reference-resources-r14.mjs';const sources="+JSON.stringify(sources)+";export default {...previous,async fetch(request,env,ctx){const path=new URL(request.url).pathname,prefix='/v2/remaining20/rounds-r21/';if(!path.startsWith(prefix))return previous.fetch(request,env,ctx);if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);const name=path.slice(prefix.length);return Object.hasOwn(sources,name)?bundledResource(sources[name],request.method):fail('NOT_FOUND',404);}};";
await writeFile(output+'/runtime-library-entry-r21.mjs',(await transform(library,{format:'esm',target:'es2022',minify:true,legalComments:'none'})).code);
const player="import previous from './construction-player-entry-r15.mjs';export * from './construction-player-entry-r15.mjs';import {installRoundsPlayer} from './runtime-player-r21.mjs';export default installRoundsPlayer(previous,"+JSON.stringify(Object.keys(sources))+');';
const built=await build({stdin:{contents:player,resolveDir:root.pathname},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none',external:['./construction-player-entry-r15.mjs','./reference-resources-r14.mjs']});
await writeFile(output+'/runtime-player-entry-r21.mjs',built.outputFiles[0].text);
await writeFile(output+'/runtime-evidence-r21.json',JSON.stringify({resources:Object.fromEntries(Object.entries(sources).map(([name,{base64,...spec}])=>[name,spec])),financialModulesChanged:0},null,2)+'\n');
console.log(JSON.stringify({resources:Object.keys(sources).length,playerBytes:built.outputFiles[0].contents.length}));
