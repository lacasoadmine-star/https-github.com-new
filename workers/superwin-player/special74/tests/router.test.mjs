import test from 'node:test';
import assert from 'node:assert/strict';
import {completeRelease,routeSpecial74,addSpecial74ToPage,ADDITIVE_DISPOSITION} from '../router.mjs';
const release=()=>({ready:true,legacyDisposition:ADDITIVE_DISPOSITION,version:'fixture-only',storagePrefix:'fixture-only/',entries:Array.from({length:74},(_,i)=>({id:'fixture-'+i,title:'Fixture '+i,ready:true,gamePath:'/special-games/play/fixture-'+i,cover:'/special-games/assets/fixture-'+i+'.webp'})),assets:{}});
test('unfinished catalogue never intercepts or modifies the existing website',async()=>{
 const r=release();r.entries[73].ready=false;
 const request=new Request('https://player.test/'),legacy=new Response('<main>Existing games</main>',{headers:{'content-type':'text/html'}});
 assert.equal(completeRelease(r),false);assert.equal(await routeSpecial74(request,{},r),null);assert.equal(addSpecial74ToPage(request,legacy,r),legacy);
 for(const path of ['/new74','/new74/001-multi-hot-5','/games/burningice10_native'])assert.equal(await routeSpecial74(new Request('https://player.test'+path),{},r),null);
});
test('wallet, authentication, account APIs and unverified routes remain with the retained handler',async()=>{
 for(const path of ['/games','/games/','/wallet','/login','/games/hot-777','/api/remaining20/action','/api/slots/games','/api/auth/login','/api/player/wallet'])assert.equal(await routeSpecial74(new Request('https://player.test'+path),{},release()),null);
 assert.equal(await routeSpecial74(new Request('https://player.test/api/remaining20/action',{method:'POST'}),{},release()),null);
});
test('all existing launch routes and methods remain with the retained handler after activation',async()=>{
 for(const path of ['/new74','/new74/','/new74/001-multi-hot-5','/games/burningice10_native','/games/burningice10_native/','/games/safari-simba','/independent74/fresh74.html']){
  for(const method of ['GET','HEAD','POST'])assert.equal(await routeSpecial74(new Request('https://player.test'+path,{method}),{},release()),null);
 }
});
test('stale replacement or malformed release never removes existing games',async()=>{
 for(const mutate of [r=>delete r.legacyDisposition,r=>r.legacyDisposition='replace-existing-game-presentations-after-complete-74-release',r=>r.entries[73]=null,r=>r.entries[73].gamePath=r.entries[0].gamePath]){
  const r=release();mutate(r);assert.equal(completeRelease(r),false);
  assert.equal(await routeSpecial74(new Request('https://player.test/new74/'),{},r),null);
 }
});
test('new catalogue requires 74 distinct new launch identities',async()=>{
 const r=release();r.entries[73].id=r.entries[0].id;assert.equal(completeRelease(r),false);
 const good=release(),response=await routeSpecial74(new Request('https://player.test/special-games/catalog.json'),{},good);
 const catalog=await response.json();assert.equal(catalog.entries.length,74);assert.equal(catalog.legacyDisposition,ADDITIVE_DISPOSITION);
});
test('new asset delivery cannot proxy a demo or accept a client financial action',async()=>{
 const r=release(),env={SSG_OFFICIAL_REFERENCES:{get(){throw Error('Unexpected storage read');}}};
 assert.equal((await routeSpecial74(new Request('https://player.test/special-games/https://eu-server.ssgportal.com'),env,r)).status,404);
 assert.equal((await routeSpecial74(new Request('https://player.test/special-games/catalog.json',{method:'POST'}),env,r)).status,405);
});
test('game documents restrict network access to the retained same origin and revalidate updates',async()=>{
 const r=release();r.assets['/special-games/play/fixture-0']={key:'document.html',contentType:'text/html; charset=utf-8',sha256:'a'.repeat(64)};
 let reads=0;const env={SSG_OFFICIAL_REFERENCES:{async get(){reads++;return new TextEncoder().encode('<html></html>').buffer;}}};
 const response=await routeSpecial74(new Request('https://player.test/special-games/play/fixture-0'),env,r);
 assert.match(response.headers.get('content-security-policy'),/connect-src 'self'/);
 assert.match(response.headers.get('content-security-policy'),/frame-src 'none'/);
 assert.match(response.headers.get('cache-control'),/must-revalidate/);
 const cached=await routeSpecial74(new Request('https://player.test/special-games/play/fixture-0',{headers:{'if-none-match':response.headers.get('etag')}}),env,r);
 assert.equal(cached.status,304);assert.equal(reads,1);
});

test('media byte ranges support seeking, suffixes and open ends with exact lengths',async()=>{
 const r=release(),path='/special-games/assets/movie.mp4';r.assets[path]={key:'movie.mp4',contentType:'video/mp4',sha256:'a'.repeat(64)};
 const bytes=Uint8Array.from({length:10},(_,i)=>i),env={SSG_OFFICIAL_REFERENCES:{async get(){return bytes.buffer;}}};
 for(const [range,expected,span]of [['bytes=2-4',[2,3,4],'2-4'],['bytes=8-',[8,9],'8-9'],['bytes=-3',[7,8,9],'7-9'],['bytes=8-99',[8,9],'8-9']]){
  const response=await routeSpecial74(new Request('https://player.test'+path,{headers:{range}}),env,r);
  assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes ${span}/10`);assert.equal(response.headers.get('content-length'),String(expected.length));assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],expected);
 }
 for(const range of ['bytes=10-','bytes=4-2','bytes=-0','bytes=0-1,3-4','bytes=-','bytes=9007199254740993-'])assert.equal((await routeSpecial74(new Request('https://player.test'+path,{headers:{range}}),env,r)).status,416);
 const head=await routeSpecial74(new Request('https://player.test'+path,{method:'HEAD',headers:{range:'bytes=2-4'}}),env,r);assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');
 const stale=await routeSpecial74(new Request('https://player.test'+path,{headers:{range:'bytes=2-4','if-range':'"old"'}}),env,r);assert.equal(stale.status,200);assert.equal((await stale.arrayBuffer()).byteLength,10);
});
