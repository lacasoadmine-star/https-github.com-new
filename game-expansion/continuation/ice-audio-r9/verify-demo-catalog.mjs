import assert from 'node:assert/strict';
import {ASSETS} from './remaining20-ice-audio-assets-r9.mjs';
import {installIceAudio} from './remaining20-ice-audio-worker-r9.mjs';
import {installIceAudioDemo} from './remaining20-ice-audio-demo-r10.mjs';
import {installIceAudioLibrary} from './remaining20-ice-audio-library-r9.mjs';
import {createDemoMode} from './test-support/demo-mode.mjs';
const origin='https://player.test',prefix='/native-library/remaining20/20261110-ice-audio-r10/';
const before={async fetch(r){return new Response('<script src="/native-library/remaining20/20261110-new-release-r8/ice/app.mjs"></script>',{headers:{'content-type':'text/html'}});}};
const library=installIceAudioLibrary(before),env={PORTAL:'player',EXPANSION100:{fetch:r=>library.fetch(r,{}, {})}},app=installIceAudioDemo(installIceAudio(before));
for(const id of ['burningice10_native','burningice40_native']){
 const html=await (await app.fetch(new Request(origin+'/demo/games/'+id),env,{})).text();assert.ok(html.includes(prefix+'app.mjs'));
 const mode=createDemoMode({location:{origin,pathname:'/demo/games/'+id},fetchImpl:(url,init)=>app.fetch(new Request(url,init),env,{})});
 const r=await mode.fetch(origin+prefix+'games.json'),catalog=await r.json(),g=catalog.find(g=>g.id===id);
 assert.equal(g.referencePresentation.manifestSha256,ASSETS['shared/presentation/manifests/'+id+'.json'].sha256);
 assert.ok(g.referencePresentation.manifestURL.includes('ice-audio-r9/demo/'));
 console.log(id,'canonical createDemoMode resolves new pinned audio manifest');
}
