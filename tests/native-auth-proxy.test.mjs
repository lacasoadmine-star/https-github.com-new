import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {signedHeaders,verifySignature,limitedBody} from '../apps/native-engine/auth.mjs';
import {nativeSignature,proxyNativeFamily} from '../deploy/cloudflare/native-family-proxy.mjs';
const secret=randomBytes(48).toString('hex'),origin='https://player.test';
test('Worker and backend signatures agree and bind user, URL, body, method and timestamp',async()=>{
 const now=Date.now(),body='{"stake":"1.00"}',path='/v1/action?game_id=jetx';
 const proof=await nativeSignature(secret,'player-a','POST',path,body,now);
 assert.deepEqual(proof,signedHeaders(secret,'player-a','POST',path,body,now));
 const request=new Request('https://engine.test'+path,{method:'POST',headers:proof,body});
 assert.equal(verifySignature(request,body,secret,now),'player-a');
 assert.equal(verifySignature(request,body+' ',secret,now),null);
 assert.equal(verifySignature(request,body,secret,now+31000),null);
 assert.equal(verifySignature(new Request('https://engine.test/v1/action',{method:'POST',headers:proof}),body,secret,now),null);
 const altered=new Headers(proof);altered.set('x-native-user','owner');
 assert.equal(verifySignature(new Request(request,{headers:altered}),body,secret,now),null);
});
test('streaming body limit rejects both oversized declared and actual bodies',async()=>{
 await assert.rejects(limitedBody(new Request(origin,{method:'POST',body:'x'.repeat(16385)})),/BODY_TOO_LARGE/);
 await assert.rejects(limitedBody(new Request(origin,{method:'POST',headers:{'content-length':'20000'},body:'x'})),/BODY_TOO_LARGE/);
});
test('proxy rejects forged accounts, foreign origins and methods before contacting the engine',async()=>{
 const env={NATIVE_ENGINE_ORIGIN:'https://engine.test',NATIVE_ENGINE_SECRET:secret};
 const options={legacy:async()=>Response.json({id:'owner',role:'owner'}),sessionHeaders:h=>h};
 assert.equal((await proxyNativeFamily(new Request(origin+'/native/jetx'),env,options)).status,403);
 assert.equal((await proxyNativeFamily(new Request(origin+'/api/native-families/action',{method:'POST',headers:{origin:'https://other.test','content-type':'application/json'},body:'{}'}),env,options)).status,403);
 assert.equal((await proxyNativeFamily(new Request(origin+'/api/native-families/action'),env,options)).status,405);
 assert.equal((await proxyNativeFamily(new Request(origin+'/native/unknown'),env,options)).status,404);
 const denied={...options,legacy:async()=>Response.json({error:'Please log in'},{status:401})};
 assert.equal((await proxyNativeFamily(new Request(origin+'/native/jetx'),env,denied)).status,401);
});
