import test from 'node:test';
import assert from 'node:assert/strict';
import {completeRelease,routeSpecial74,addSpecial74ToPage,REPLACEMENT_DISPOSITION} from '../router.mjs';
const release=()=>({ready:true,legacyDisposition:REPLACEMENT_DISPOSITION,version:'fixture-only',storagePrefix:'fixture-only/',entries:Array.from({length:74},(_,i)=>({id:'fixture-'+i,title:'Fixture '+i,ready:true,gamePath:'/special-games/play/fixture-'+i,cover:'/special-games/assets/fixture-'+i+'.webp'})),assets:{}});
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
test('known old launch routes redirect only when the full replacement is ready',async()=>{
 for(const path of ['/new74','/new74/','/new74/001-multi-hot-5','/games/burningice10_native','/games/burningice10_native/','/games/safari-simba','/independent74/fresh74.html']){
  const response=await routeSpecial74(new Request('https://player.test'+path),{},release());
  assert.equal(response.status,302);assert.equal(response.headers.get('location'),'https://player.test/games');assert.equal(response.headers.get('cache-control'),'no-store');
 }
 assert.equal((await routeSpecial74(new Request('https://player.test/new74/',{method:'POST'}),{},release())).status,405);
});
test('stale additive or malformed release never removes existing games',async()=>{
 for(const mutate of [r=>delete r.legacyDisposition,r=>r.legacyDisposition='retain-existing-games-and-add-independent-special-games',r=>r.entries[73]=null,r=>r.entries[73].gamePath=r.entries[0].gamePath]){
  const r=release();mutate(r);assert.equal(completeRelease(r),false);
  assert.equal(await routeSpecial74(new Request('https://player.test/new74/'),{},r),null);
 }
});
test('new catalogue requires 74 distinct new launch identities',async()=>{
 const r=release();r.entries[73].id=r.entries[0].id;assert.equal(completeRelease(r),false);
 const good=release(),response=await routeSpecial74(new Request('https://player.test/special-games/catalog.json'),{},good);
 const catalog=await response.json();assert.equal(catalog.entries.length,74);assert.equal(catalog.legacyDisposition,REPLACEMENT_DISPOSITION);
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
