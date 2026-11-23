import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveDemoLauncher} from '../deploy/cloudflare/demo-launcher.mjs';
const game={id:'pp-example',provider_key:'pragmatic',source_url:'https://www.pragmaticplay.com/en/games/example/',launch_url:null};
const launcher='https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=vs20fruitsw&jurisdiction=99';
const response=html=>new Response(html,{headers:{'content-type':'text/html'}});
test('provider-owned HTML resolves a public demo URL and no wallet input is accepted',async()=>{
 const calls=[];const result=await resolveDemoLauncher(game,{cache:null,fetcher:async(url,options)=>{calls.push({url,method:options.method,redirect:options.redirect});return response('<iframe data-game-src="'+launcher.replaceAll('&','&amp;')+'"></iframe>');}});
 assert.equal(result,launcher);assert.deepEqual(calls,[{url:game.source_url,method:undefined,redirect:'manual'}]);
});
test('verified catalog launchers require no provider fetch',async()=>{assert.equal(await resolveDemoLauncher({...game,launch_url:launcher},{fetcher:()=>assert.fail('unexpected fetch')}),launcher);});
test('source or redirect spoofing is rejected before following another host',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://evil.test/demo'}});};
 await assert.rejects(resolveDemoLauncher({...game,source_url:'https://evil.test/'},{fetcher,cache:null}));assert.equal(calls,0);
 await assert.rejects(resolveDemoLauncher(game,{fetcher,cache:null}),/REDIRECT_REJECTED/);assert.equal(calls,1);
});
test('a provider page cannot inject a script URL or unapproved iframe',async()=>{
 for(const url of ['javascript:alert(1)','https://evil.test/gs2c/openGame.do?gameSymbol=x'])await assert.rejects(resolveDemoLauncher(game,{cache:null,fetcher:async()=>response('<iframe data-game-src="'+url+'"></iframe>')}),/UNAVAILABLE/);
});
test('oversized and failed provider pages fail without a launcher',async()=>{
 await assert.rejects(resolveDemoLauncher(game,{cache:null,fetcher:async()=>response('x'.repeat(1048577))}),/TOO_LARGE/);
 await assert.rejects(resolveDemoLauncher(game,{cache:null,fetcher:async()=>new Response('',{status:503})}),/UNAVAILABLE/);
});
test('public demo cache is keyed by catalog identity and never contains player data',async()=>{
 let stored;const cache={match:async()=>null,put:async(key,value)=>{assert.match(key.url,/pp-example$/);stored=await value.text();}};
 await resolveDemoLauncher(game,{cache,fetcher:async()=>response('<iframe data-game-src="'+launcher+'"></iframe>')});assert.equal(stored,launcher);
 assert.equal(await resolveDemoLauncher(game,{cache:{match:async()=>new Response(stored)},fetcher:()=>assert.fail('cached result refetched')}),launcher);
});
