import test from 'node:test';
import assert from 'node:assert/strict';
import {isTargetNativeCss, patchNativeTouchCss, NATIVE_TOUCH_HOTFIX_CSS} from './native-touch-hotfix-r1.mjs';

const root='https://superwin-player.apdiy61.workers.dev';
const seven=['037-safari-simba','multi-hot-5-super-wilds','multi-hot-5-deluxe',
  'multi-hot-100','habesha-fortune-5','multi-hot-wild-ways','multi-hot-5-wild'];
const css='#hit-controls button{pointer-events:auto}#account-status{position:absolute}';
const res=(text=css)=>new Response(text,{headers:{'content-type':'text/css','etag':'"unchanged"','content-length':String(text.length)}});

for(const name of seven) test('native touch: '+name,async()=>{
 const req=new Request(root+'/new74/'+name+'/style.css');
 const result=await patchNativeTouchCss(req,res());
 assert.equal(result.headers.get('x-zplay-native-touch'),'r1');
 assert.equal(result.headers.get('etag'),null);
 const body=await result.text();
 assert.match(body,/#hit-controls button:disabled,[\s\S]*?pointer-events: none !important/);
 assert.match(body,/#account-status a, #account-status button \{ pointer-events: auto/);
});
test('Multi Hot 10 uses scoped, real Canvas control layer',async()=>{
 const req=new Request(root+'/new74/002-multi-hot-10/style.css');
 const result=await patchNativeTouchCss(req,res('#controls button{pointer-events:auto}#status{position:absolute}'));
 const body=await result.text();
 assert.match(body,/#controls button:disabled/);
 assert.match(body,/#controls button.speed \{ left: 93%; top: 29%; width: 7%; height: 11%/);
 assert.match(body,/#status \{ pointer-events: none;/);
});
test('protected pair and wallet routes untouched',async()=>{
 for(const [method,path] of [
  ['GET','/games/multi_hot_5_native'],['GET','/games/foxy_hot_20_native'],
  ['POST','/api/slots/spin'],['GET','/api/player/balance'],['GET','/agent/']]){
  const req=new Request(root+path,{method}),r=res();
  assert.equal(await patchNativeTouchCss(req,r),r);
 }
});
test('only known, full GET CSS responses are modified',async()=>{
 for(const [method,path] of [
 ['GET','/new74/unlisted/style.css'],['HEAD','/new74/multi-hot-100/style.css'],
 ['POST','/new74/multi-hot-100/style.css'],['GET','/new74/multi-hot-100/game.bundle.mjs']]){
  const req=new Request(root+path,{method}),r=res();
  assert.equal(await patchNativeTouchCss(req,r),r);
 }
 const requested=new Request(root+'/new74/multi-hot-100/style.css');
 const unknown=res('body{display:block}');
 assert.equal(await patchNativeTouchCss(requested,unknown),unknown);
 const ranged=new Request(root+'/new74/multi-hot-100/style.css',{headers:{range:'bytes=0-8'}});
 const unchanged=res();
 assert.equal(await patchNativeTouchCss(ranged,unchanged),unchanged);
});
test('patch is idempotent and syntax is balanced',async()=>{
 assert.equal((NATIVE_TOUCH_HOTFIX_CSS.match(/\{/g)||[]).length,
   (NATIVE_TOUCH_HOTFIX_CSS.match(/\}/g)||[]).length);
 const req=new Request(root+'/new74/multi-hot-100/style.css');
 const once=await patchNativeTouchCss(req,res());
 const twice=await patchNativeTouchCss(req,once);
 assert.equal((await twice.text()).split('Native touch r1:').length,2);
});
