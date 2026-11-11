import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {withIndependentRoutes} from '../server/existing-backend-extension.mjs';

test('latest brief has exactly two protected entries and 72 new entries without completion claims',async()=>{
 const scope=JSON.parse(await readFile(new URL('../scope/requested74.json',import.meta.url)));
 assert.equal(scope.entries.length,74);
 assert.deepEqual(scope.entries.filter(x=>x.protected).map(x=>x.name),['MultiHot 5','Foxy Hot 20']);
 assert.equal(scope.entries.filter(x=>!x.protected).length,72);
 assert.equal(scope.newInfrastructureCreationAllowed,false);
 assert.equal(scope.useExistingBackendOnly,true);
 assert(scope.entries.every(x=>x.deployed===false&&x.productionWalletVerified===false));
 for(const entry of scope.entries.filter(x=>!x.protected))assert.deepEqual(entry.requestedBetLimits,{currency:'ETB',minMinor:'100',maxMinor:null,testPresetsMinor:Array.from({length:20},(_,i)=>String((i+1)*100)),policy:'server-game-policy-and-retained-account-house-reserve'});
});

test('existing backend extension forwards old requests and context without starting or replacing servers',async()=>{
 const calls=[],context={original:true};
 const old=function(...args){calls.push({self:this,args});return 'old'};
 const fresh=function(...args){calls.push({self:this,args});return 'new'};
 const handler=withIndependentRoutes(old,fresh);
 const request=new Request('https://backend.test/v1/legacy/action',{method:'POST',body:'unchanged'});
 assert.equal(handler.call(context,request,'server'),'old');
 assert.equal(calls[0].args[0],request);assert.equal(calls[0].self,context);assert.equal(calls[0].args[1],'server');
 assert.equal(handler.call(context,new Request('https://backend.test/v1/independent74/state'),'server'),'new');
});
