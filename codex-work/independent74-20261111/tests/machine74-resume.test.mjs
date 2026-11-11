import test from 'node:test';
import assert from 'node:assert/strict';
import {RESUME_KEY,readResume,saveResume,validSignInMessage,validMachineMessage,resumeFromUrl} from '../client/machine74-resume.mjs';
const id='ind74_official_multihot10',ids=new Set([id]);
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
test('a signed-out player retains only the exact selected machine and bounded navigation intent',()=>{
 const storage=memory();saveResume(storage,id,ids,1000);assert.deepEqual(readResume(storage,ids,2000),{version:1,gameId:id,createdAt:1000});
 assert.equal(saveResume(storage,'unknown',ids,2000),null);
 assert.equal(readResume(storage,ids,1801000),null);assert.equal(storage.getItem(RESUME_KEY),null);
 for(const value of [{version:1,gameId:id,createdAt:3000},{version:1,gameId:'unknown',createdAt:1000},{version:2,gameId:id,createdAt:1000}]){storage.setItem(RESUME_KEY,JSON.stringify(value));assert.equal(readResume(storage,ids,2000),null);}
});
test('login messages require the current same-origin machine window and exact title',()=>{
 const frameWindow={},context={origin:'https://player.test',frameWindow,gameId:id};
 const event={origin:context.origin,source:frameWindow,data:{type:'independent74:sign-in',gameId:id}};
 assert.equal(validSignInMessage(event,context),true);
 for(const change of [{origin:'https://other.test'},{source:{}},{data:{type:'independent74:sign-in',gameId:'unknown'}},{data:{type:'other',gameId:id}}])assert.equal(validSignInMessage({...event,...change},context),false);
 assert.equal(validSignInMessage({...event,source:null},{...context,frameWindow:null}),false);
});
test('direct machine sign-in preserves original dashboard query and never accepts a redirect URL',()=>{
 assert.deepEqual(resumeFromUrl('https://player.test/?ind74='+id+'&tab=games#x',ids),{gameId:id,cleanUrl:'/?tab=games#x'});
 for(const href of ['https://player.test/?ind74=https://other.test','https://player.test/?ind74='+id+'&ind74='+id,'https://player.test/agent?ind74='+id,'https://player.test/?ind74=unknown'])assert.equal(resumeFromUrl(href,ids),null);
});
test('blocked storage does not prevent the existing login handoff',()=>{
 const storage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
 assert.equal(readResume(storage,ids),null);assert.equal(saveResume(storage,id,ids).gameId,id);
});
test('wallet refresh requests cannot be injected by another tab, origin or machine',()=>{
 const frameWindow={},context={origin:'https://player.test',frameWindow,gameId:id,type:'independent74:wallet-changed'};
 const event={origin:context.origin,source:frameWindow,data:{type:context.type,gameId:id}};
 assert.equal(validMachineMessage(event,context),true);
 for(const change of [{origin:'https://provider.test'},{source:{}},{data:{type:context.type,gameId:'ind74_official_rollx'}}])assert.equal(validMachineMessage({...event,...change},context),false);
});
