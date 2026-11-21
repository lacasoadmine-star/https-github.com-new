import test from 'node:test';
import assert from 'node:assert/strict';
import {transport as m20} from './multihot20/session.mjs';
import {transport as burn} from './multihot5burnwilds/session.mjs';

for(const [game,transport] of [['M20',m20],['Burn',burn]]){
  test(game+' preserves the deployed Railway detail code for exact missing-round recovery',async()=>{
    const request=transport(async()=>Response.json({detail:'ROUND_NOT_FOUND_FOR_REPLAY'},{status:404}));
    await assert.rejects(request('/api/slots/spin',{replayOnly:true}),e=>e.code==='ROUND_NOT_FOUND_FOR_REPLAY'&&e.status===404);
  });
  test(game+' keeps session cookies, JSON POST and no redirects on the actual wire',async()=>{
    let observed;
    const request=transport(async(path,options)=>{observed={path,options};return Response.json({ok:true})});
    assert.deepEqual(await request('/api/slots/spin',{roundToken:'same-saved-token'}),{ok:true});
    assert.equal(observed.options.credentials,'same-origin');assert.equal(observed.options.redirect,'error');
    assert.equal(observed.options.method,'POST');assert.deepEqual(JSON.parse(observed.options.body),{roundToken:'same-saved-token'});
    assert.equal(observed.options.headers['content-type'],'application/json');
  });
  test(game+' never treats a non-JSON success body as a settled receipt',async()=>{
    const request=transport(async()=>new Response('<html>proxy error</html>',{status:200}));
    await assert.rejects(request('/api/slots/spin',{}),e=>e.code==='INVALID_SERVER_RESPONSE');
  });
}
