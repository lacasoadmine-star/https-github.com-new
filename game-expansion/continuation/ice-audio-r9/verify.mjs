import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ASSETS} from './remaining20-ice-audio-assets-r9.mjs';
import {installIceAudio} from './remaining20-ice-audio-worker-r9.mjs';
import {installIceAudioLibrary} from './remaining20-ice-audio-library-r9.mjs';
import {PREFIX} from './remaining20-ice-audio-index-r9.mjs';
import {IceReelAudioClock} from './client/presentation/ice-reel-audio.mjs';
const old={demo:'/native-library/remaining20/20261110-new-release-r8/ice/',cash:'/native-library/remaining20/20261110-ice-wallet-entry-r8/'};
const ids=['burningice10_native','burningice40_native'];let checked=0;
const previous={scheduled(){return 'retained';},async fetch(request){
 const p=new URL(request.url).pathname,mode=p.startsWith('/demo/')?'demo':'cash';
 if(ids.some(id=>p==='/games/'+id||p==='/demo/games/'+id))return new Response('<html><script src="'+old[mode]+'app.mjs"></script></html>',{headers:{'content-type':'text/html','set-cookie':'preserved=1','content-security-policy':"default-src 'self'"}});
 return Response.json({url:request.url,method:request.method,body:request.method==='POST'?await request.text():null,headers:Object.fromEntries(request.headers)});
}};
const library=installIceAudioLibrary(previous);let received;
const env={PORTAL:'player',EXPANSION100:{fetch:request=>{received=request;return library.fetch(request,{},{});}}},worker=installIceAudio(previous);
for(const[name,a]of Object.entries(ASSETS)){
 const paths=name.startsWith('shared/')?['demo/','cash/'].map(mode=>mode+name.slice(7)):[name];
 for(const path of paths){
  const r=await worker.fetch(new Request('https://player.test'+PREFIX+path+'?private=drop',{headers:{authorization:'Bearer do-not-forward',cookie:'session=do-not-forward'}}),env,{});
  const data=new Uint8Array(await r.arrayBuffer());assert.equal(r.status,200);assert.equal(data.length,a.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),a.sha256);
  assert.equal(received.headers.has('cookie'),false);assert.equal(received.headers.has('authorization'),false);assert.equal(new URL(received.url).search,'');checked++;
 }
}
for(const mode of ['demo','cash'])for(const id of ids){
 const r=await worker.fetch(new Request('https://player.test'+(mode==='demo'?'/demo':'')+'/games/'+id),env,{});
 assert.ok((await r.text()).includes(PREFIX+mode+'/app.mjs'));assert.equal(r.headers.get('set-cookie'),'preserved=1');assert.equal(r.headers.get('content-security-policy'),"default-src 'self'");checked++;
 const catalog=JSON.parse(ASSETS[mode+'/games.json'].body),game=catalog.find(g=>g.id===id),name='presentation/manifests/'+id+'.json';
 assert.equal(game.referencePresentation.manifestSha256,ASSETS['shared/'+name].sha256);
 const manifest=JSON.parse(ASSETS['shared/'+name].body);assert.equal(manifest.productionLaunchEnabled,false);
 if(mode==='cash'){assert.equal(game.published,false);assert.equal(game.launchable,false);assert.equal(game.currency,'ETB');}
 checked++;
}
for(const path of ['/','/games/multi_hot_5_native','/games/foxyhot20_native','/demo/games/multihot100_native','/api/remaining20/action','/api/remaining20/demo/action']){
 const body=path.startsWith('/api/')?'{"game_id":"burningice40_native","action":"start","request_id":"retained","stake":"40000.00"}':null;
 const r=await worker.fetch(new Request('https://player.test'+path,{method:body?'POST':'GET',...(body?{body}:{}),headers:{authorization:'retained'}}),env,{});
 const result=await r.json();assert.equal(result.url,'https://player.test'+path);assert.equal(result.body,body);assert.equal(result.headers.authorization,'retained');checked++;
}
const staticURL='https://player.test'+PREFIX+'cash/reference-audio.mjs';
assert.equal((await worker.fetch(new Request(staticURL,{method:'POST',body:'x'}),env,{})).status,405);checked++;
assert.equal((await worker.fetch(new Request(staticURL,{method:'HEAD'}),env,{})).body,null);checked++;
const etag='"'+ASSETS['shared/reference-audio.mjs'].sha256+'"';
assert.equal((await worker.fetch(new Request(staticURL,{headers:{'if-none-match':etag}}),env,{})).status,304);checked++;
const fallback=await worker.fetch(new Request('https://player.test'+PREFIX+'cash/session.mjs',{headers:{cookie:'private'}}),env,{});
const fb=await fallback.json();assert.equal(fb.url,'https://player.test'+old.cash+'session.mjs');assert.equal(fb.headers.cookie,undefined);checked++;
assert.equal(worker.scheduled(),'retained');checked++;
const clock=new IceReelAudioClock(),calls=[],play=(cue,opts)=>calls.push({cue,...opts});
clock.handle({id:ids[0],event:{type:'reel-move',sequence:1},play});
clock.handle({id:ids[0],event:{type:'reel-move',sequence:1},play});assert.equal(calls.length,1);assert.equal(calls[0].isCurrent(),true);
clock.handle({id:ids[0],event:{type:'reel-stop',column:0},play});assert.equal(calls[0].signal.aborted,false);
clock.handle({id:ids[0],event:{type:'reel-stop',column:4},play});assert.equal(calls[0].signal.aborted,true);assert.equal(calls[0].isCurrent(),false);checked++;
clock.handle({id:ids[1],event:{type:'reel-move',sequence:2},play});clock.handle({id:ids[1],event:{type:'animation-complete'},play});assert.equal(calls[1].signal.aborted,true);checked++;
clock.handle({id:'multihot5_native',event:{type:'reel-move',sequence:3},play});assert.equal(calls.length,2);checked++;
clock.handle({id:ids[0],event:{type:'reel-move',sequence:4},play});clock.handle({id:ids[0],event:{type:'spin-start'},play});assert.equal(calls[2].signal.aborted,true);checked++;
console.log(JSON.stringify({checked,assets:Object.keys(ASSETS).length,oldRoutesPreserved:true,authNotLeaked:true,cashGatesUnchanged:true}));
