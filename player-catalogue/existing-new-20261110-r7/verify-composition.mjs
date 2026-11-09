import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {installExistingNewWagerClient} from './existing-new-wager-client-worker-r1.mjs';
import {installExistingNewWagerClientAssets} from './existing-new-wager-client-library-r1.mjs';
import {installOlderNewZoomWorker} from './older-new-zoom-worker-r1.mjs';
import {installOfficialNewCoversWorker} from './official-new-covers-worker-r1.mjs';
import {installOfficialNewCoverAssets} from './official-new-covers-library-r1.mjs';
import {OFFICIAL_COVER_ASSETS} from './official-new-covers-assets-r1.mjs';
import {ASSETS} from './existing-new-wager-client-assets-r1.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),root=new URL('./',import.meta.url),origin='https://r7.offline.invalid';
const fixture=async n=>fs.readFile(new URL('../new-zoom-older3-followup/'+n,root),'utf8');
const pages={
 '/games/multihot40_native':await fixture('multihot40-verified-worker-body.html'),
 '/games/balloon_native':await fixture('balloon-verified-worker-body.html'),
 '/games/jetx_native':await fixture('jetx-source/index.html'),
 '/':'<!doctype html><html><head><script type="module" src="/native-library/expansion/r1/lobby.mjs"></script></head><body><div id="root"></div></body></html>'
};
const checks=[],seen=[],librarySeen=[],headers={'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'self'; script-src 'self'",'referrer-policy':'no-referrer','set-cookie':'existing=unchanged; HttpOnly; Secure; SameSite=Lax'};
const previous={scheduled(){return 'scheduled retained';},async fetch(request,env,ctx){
 const u=new URL(request.url);let response;
 if(u.pathname==='/games/jetx_native'&&!u.searchParams.has('mode'))response=new Response(null,{status:302,headers:{location:'/games/jetx_native?mode=account',...headers}});
 else response=new Response(pages[u.pathname]??'retained body:'+u.pathname,{status:pages[u.pathname]?200:202,headers});
 seen.push({request,env,ctx,response});return response;
}};
const libPrevious={fetch:async request=>new Response('retained library:'+new URL(request.url).pathname,{status:202}),scheduled:previous.scheduled};
const library=installOfficialNewCoverAssets(installExistingNewWagerClientAssets(libPrevious));
const player=installOfficialNewCoversWorker(installOlderNewZoomWorker(installExistingNewWagerClient(previous)));
const env={PORTAL:'player',EXPANSION100:{fetch:async request=>{librarySeen.push(request);return library.fetch(request,{},{});}}};
const request=(path,opts={})=>new Request(origin+path,opts);
assert.equal(player.scheduled,previous.scheduled);assert.equal(library.scheduled,previous.scheduled);
for(const path of ['/games/multihot40_native','/games/balloon_native','/games/jetx_native?mode=account']){
 const response=await player.fetch(request(path),env,{}),html=await response.text();assert.equal(response.status,200);
 assert.match(html,/20261110-older-new-zoom-r1/);assert.match(html,/maximum-scale=1/);
 if(!path.includes('jetx'))assert.match(html,/20261110-etb1-40000-r1/);
 assert.equal(response.headers.get('content-security-policy'),headers['content-security-policy']);assert.equal(response.headers.get('set-cookie'),headers['set-cookie']);assert.equal(response.headers.get('referrer-policy'),headers['referrer-policy']);
 checks.push('Current exact '+path+' composes wager/zoom with original security/session headers');
}
const redirect=await player.fetch(request('/games/jetx_native'),env,{});assert.equal(redirect,seen.at(-1).response);assert.equal(redirect.status,302);
const lobby=await player.fetch(request('/'),env,{}),lobbyHtml=await lobby.text();assert.match(lobbyHtml,/data-zplay-official-new-covers/);assert.equal((lobbyHtml.match(/id="root"/g)||[]).length,1);checks.push('One existing lobby shell gains cover script; JetX account redirect preserved');
for(const[name,asset]of Object.entries(OFFICIAL_COVER_ASSETS)){
 const path='/native-library/existing-new/20261110-official-covers-r1/'+name;
 const response=await player.fetch(request(path,{headers:{cookie:'private-cookie',authorization:'private-token','x-native-signature':'private-signature',accept:asset.type}}),env,{});
 const b=new Uint8Array(await response.arrayBuffer());assert.equal(response.status,200);assert.equal(b.length,asset.bytes);assert.equal(hash(b),asset.sha256);
 assert.deepEqual([...librarySeen.at(-1).headers],[['accept',asset.type]]);
 const head=await player.fetch(request(path,{method:'HEAD'}),env,{});assert.equal(await head.text(),'');assert.equal(head.headers.get('content-length'),String(asset.bytes));
 const cached=await player.fetch(request(path,{headers:{'if-none-match':'"'+asset.sha256+'"'}}),env,{});assert.equal(cached.status,304);
}
checks.push('All4 cover assets proxy exact bytes/GET/HEAD/304 without player credentials');
for(const[name,asset]of Object.entries(ASSETS)){
 const response=await player.fetch(request('/native-library/existing-new/20261110-etb1-40000-r1/'+name),env,{});const body=await response.text();assert.equal(response.status,200);assert.equal(hash(body),asset.sha256);
}
checks.push('All7 reviewed wager assets route through actual composed Library unchanged');
for(const path of ['/games/multi_hot_5_native','/games/foxy_hot_20_native','/demo/games/burningice10_native','/demo/games/burningice40_native','/api/config','/api/remaining20/state?game_id=burningice40_native','/api/remaining20/action','/api/machine-session']){
 const req=request(path,{method:path.endsWith('/action')?'POST':'GET'}),ctx={retained:true};const response=await player.fetch(req,env,ctx);assert.equal(response,seen.at(-1).response);assert.equal(seen.at(-1).request,req);assert.equal(seen.at(-1).ctx,ctx);
}
checks.push('Protected games, Ice r6, config and financial APIs pass through by object identity');
for(const path of ['/native-library/existing-new/20261110-official-covers-r1/unknown','/native-library/existing-new/20261110-official-covers-r1/covers.js'])assert.equal((await player.fetch(request(path),env,{})).status,404);
assert.equal((await player.fetch(request('/native-library/existing-new/20261110-official-covers-r1/covers.mjs',{method:'POST'}),env,{})).status,405);
const otherPortal=await player.fetch(request('/games/balloon_native'),{...env,PORTAL:'agent'},{});assert.equal(otherPortal,seen.at(-1).response);
checks.push('Unknown assets/methods reject; other portal remains untouched');
const report={passed:true,groups:checks.length,checks,realWagers:0,networkRequests:0,scope:'Actual reviewed composed wrappers and static assets with retained pre-r6 boundary fixtures'};
await fs.writeFile(new URL('composition-verification.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
