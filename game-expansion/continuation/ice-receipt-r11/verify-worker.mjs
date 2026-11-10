import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ASSETS} from './remaining20-ice-receipt-assets-r11.mjs';
import {PREFIX} from './remaining20-ice-receipt-index-r11.mjs';
import {installIceReceipt} from './remaining20-ice-receipt-worker-r11.mjs';
import {installIceReceiptLibrary} from './remaining20-ice-receipt-library-r11.mjs';
const old={demo:'/native-library/remaining20/20261110-ice-audio-r10/',cash:'/native-library/remaining20/20261110-ice-audio-r9/cash/'};
const ids=['burningice10_native','burningice40_native'];let checks=0,forwarded;
const previous={scheduled(){return 'unchanged';},async fetch(request){
 const p=new URL(request.url).pathname,mode=p.startsWith('/demo/')?'demo':'cash';
 if(ids.some(id=>p==='/games/'+id||p==='/demo/games/'+id))return new Response('<script src="'+old[mode]+'app.mjs"></script>',{headers:{'content-type':'text/html','set-cookie':'unchanged=1','content-security-policy':"default-src 'self'"}});
 return Response.json({url:request.url,method:request.method,headers:Object.fromEntries(request.headers),body:request.method==='POST'?await request.text():null});
}};
const library=installIceReceiptLibrary(previous),worker=installIceReceipt(previous),env={PORTAL:'player',EXPANSION100:{fetch:request=>{forwarded=request;return library.fetch(request,{},{});}}};
for(const mode of ['cash','demo']){
 for(const[name,a]of Object.entries(ASSETS)){
  const url='https://player.test'+PREFIX+mode+'/'+name.slice(7),r=await worker.fetch(new Request(url+'?private=drop',{headers:{authorization:'private',cookie:'private'}}),env,{});
  assert.equal(r.status,200);const bytes=new Uint8Array(await r.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);assert.equal(bytes.length,a.bytes);
  assert.equal(forwarded.headers.has('authorization'),false);assert.equal(forwarded.headers.has('cookie'),false);assert.equal(new URL(forwarded.url).search,'');
  assert.equal((await worker.fetch(new Request(url,{method:'HEAD'}),env,{})).body,null);
  assert.equal((await worker.fetch(new Request(url,{headers:{'if-none-match':'"'+a.sha256+'"'}}),env,{})).status,304);
  assert.equal((await worker.fetch(new Request(url,{method:'POST',body:'x'}),env,{})).status,405);checks++;
 }
 for(const id of ids){const r=await worker.fetch(new Request('https://player.test'+(mode==='demo'?'/demo':'')+'/games/'+id),env,{});assert.ok((await r.text()).includes(PREFIX+mode+'/app.mjs'));assert.equal(r.headers.get('set-cookie'),'unchanged=1');checks++;}
 for(const name of ['app.mjs','games.json','demo-games.json','session.mjs']){
  const r=await worker.fetch(new Request('https://player.test'+PREFIX+mode+'/'+name,{headers:{cookie:'private'}}),env,{}),v=await r.json();assert.equal(v.url,'https://player.test'+old[mode]+name);assert.equal(v.headers.cookie,undefined);checks++;
 }
}
for(const path of ['/','/games/multihot5_native','/games/foxyhot20_native','/demo/games/multihot100_native','/api/remaining20/action','/api/remaining20/demo/action']){
 const action=path.startsWith('/api/'),request=new Request('https://player.test'+path,{method:action?'POST':'GET',headers:{authorization:'retained'},...(action?{body:'{"action":"collect","request_id":"same"}'}:{})});
 const got=await(await worker.fetch(request,env,{})).json();assert.equal(got.url,request.url);assert.equal(got.headers.authorization,'retained');if(action)assert.equal(got.body,'{"action":"collect","request_id":"same"}');checks++;
}
assert.equal(worker.scheduled(),'unchanged');
console.log(JSON.stringify({checks,financialRequestsUnchanged:true,oldGamesUnchanged:true,oldAssetsUnchanged:true}));
