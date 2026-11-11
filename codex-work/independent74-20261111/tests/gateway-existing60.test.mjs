import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createGateway,hash,validateNativeAction} from '../gateway.mjs';
import {publicLibrary74Definitions} from '../server/existing-library74-adapter.mjs';
import {EXISTING_WALLET_ROUTES} from '../client/existing-wallet-routes.mjs';
const definitions=publicLibrary74Definitions(),ids=definitions.filter(game=>!Object.hasOwn(EXISTING_WALLET_ROUTES,game.id)).map(game=>game.id),id='ind74_official_multihot10';
const guard='c'.repeat(64),token='a'.repeat(64),origin='https://player.test',definition=definitions.find(game=>game.id===id);
const limits={minBetMinor:'100',maxBetMinor:'5000000',betStepMinor:'100',maxWinMinor:'10000000000'};
const live=game=>({...game,accepting:true,launchable:true,limits});
const identity={authenticated:true,currency:'ETB',sessionId:guard,balance:'40001.00'};
function fixture({catalog=definitions.filter(game=>ids.includes(game.id)).map(live),upstream=null}={}){
 const calls=[],legacy=[];
 const handler=createGateway({accountTransport:'existing-library60',accountGames:definitions,integratedAccountGameIds:ids,previous:{fetch(request){legacy.push(new URL(request.url).pathname);return Response.json(identity);}},fetchImpl:async(target,options)=>{calls.push({target:String(target),options});
  if(new URL(target).pathname.endsWith('/health'))return Response.json({games:catalog,new_rounds_enabled:true});
  if(upstream)return upstream(target,options);
  return Response.json({authenticated:true,currency:'ETB',balance:'40001.00',accepting:true,game:live(definition),round:null});
 }});
 const request=(path,body=null,sessionGuard=guard)=>handler(new Request(origin+'/independent74/account-api/'+path,{method:body?'POST':'GET',headers:{cookie:'sw_session='+token,...(body?{origin,'content-type':'application/json','x-independent74-session':sessionGuard}:{})},...(body?{body:JSON.stringify(body)}:{})}),{NATIVE_ENGINE_ORIGIN:'https://existing-native.test',NATIVE_ENGINE_SECRET:'isolated-transport-fixture-secret'},{});
 return {request,calls,legacy};
}
test('exact60 registry preserves the14 existing launch identities',()=>{
 assert.equal(ids.length,60);assert(ids.every(id=>!Object.hasOwn(EXISTING_WALLET_ROUTES,id)));
 assert.throws(()=>createGateway({previous:{fetch(){}},accountTransport:'existing-library60',accountGames:definitions,integratedAccountGameIds:ids.slice(1)}),/Exactly60/);
});
test('public readiness uses only same-version configured server definitions',async()=>{
 const f=fixture();const r=await f.request('catalog'),value=await r.json();assert.equal(r.status,200);assert.equal(value.games.length,72);assert.equal(value.games.filter(game=>game.launchable).length,60);assert(value.games.filter(game=>!ids.includes(game.id)).every(game=>game.launchable===false));
 assert.deepEqual(f.legacy,[]);assert.equal(f.calls.length,1);assert.equal(f.calls[0].options.headers.cookie,undefined);
 const altered=definitions.filter(game=>ids.includes(game.id)).map(live);altered.find(game=>game.id===id).version='unmatched-server-version';
 const stale=await(await fixture({catalog:altered}).request('catalog')).json();assert.equal(stale.games.find(game=>game.id===id).launchable,false);
});
test('unknown or malformed health registry cannot silently enable a new title',async()=>{
 const liveGames=definitions.filter(game=>ids.includes(game.id)).map(live);
 for(const catalog of [liveGames.slice(1),[...liveGames.slice(1),liveGames[1]],liveGames.map((game,index)=>index?game:{...game,id:'unknown'}),liveGames.map(game=>({...game,limits:{...limits,maxBetMinor:'1e9'}}))]){
  const value=await(await fixture({catalog}).request('catalog')).json();assert(value.games.every(game=>game.launchable===false));
 }
});
test('existing60 signs the retained account transport and preserves the original machine-session guard',async()=>{
 const f=fixture();const r=await f.request('state?game_id='+id),value=await r.json();assert.equal(r.status,200);assert.equal(value.sessionGuard,guard);assert.equal(value.balance,identity.balance);assert.equal(value.accepting,true);assert.deepEqual(f.legacy,['/api/machine-session']);
 assert.equal(f.calls[0].options.headers['x-native-user'],'@session:'+await hash(token));assert.equal(f.calls[0].options.headers.cookie,undefined);
 const body={request_id:randomUUID(),type:'start',game_id:id,model_version:definition.version,stake:'40001.00',options:{holdWin:true}};
 const denied=await f.request('action',body,'f'.repeat(64));assert.equal(denied.status,403);assert.equal(f.calls.length,1);
 const accepted=await f.request('action',body);assert.equal(accepted.status,200);assert.equal(f.calls.length,2);assert.deepEqual(JSON.parse(f.calls[1].options.body),body);
});
test('existing routes are not remapped and unregistered account aliases remain closed',async()=>{
 const f=fixture();const retained=definitions.find(game=>Object.hasOwn(EXISTING_WALLET_ROUTES,game.id));
 const value=await(await f.request('state?game_id='+retained.id)).json();assert.equal(value.existingWalletReadOnly,true);assert.equal(value.accepting,false);assert.equal(f.calls.length,0);
 const body={request_id:randomUUID(),type:'start',game_id:retained.id,model_version:retained.version,stake:'1.00',options:{}};
 assert.equal((await f.request('action',body)).status,503);assert.equal(f.calls.length,0);
});
test('an unavailable new namespace cannot mislabel a valid existing account as signed out',async()=>{
 const f=fixture({upstream:()=>Response.json({error:'AUTH_REQUIRED'},{status:401})});
 const response=await f.request('state?game_id='+id);assert.equal(response.status,503);assert.equal((await response.json()).error.code,'GAME_ACCOUNT_ROUTE_UNAVAILABLE');
});
test('Gates feature purchases submit one exact total debit and reject invented modes or award fields',()=>{
 const game=definitions.find(item=>item.id==='ind74_official_gatesofmerlyn'),body={request_id:randomUUID(),type:'start',game_id:game.id,model_version:game.version};
 for(const [mode,stake] of [['base','1.00'],['ante','3.00'],['buy100','100.00'],['buy500','500.00']])assert.equal(validateNativeAction({...body,stake,options:{mode}},new Set(ids)).stake,stake);
 for(const [stake,options] of [['1.00',{mode:'ante'}],['20.00',{mode:'buy100'}],['1.00',{mode:'free'}],['100.00',{mode:'buy100',baseBetMinor:'100'}],['100.00',{mode:'buy100',freeSpins:15}]])assert.throws(()=>validateNativeAction({...body,stake,options},new Set(ids)));
});
test('Charging accepts only title-supported total-cost choices and never accepts browser carry',()=>{
 const game=definitions.find(item=>item.id==='ind74_official_multifruitschargingwilds'),body={request_id:randomUUID(),type:'start',game_id:game.id,model_version:game.version};
 for(const [ante,stake] of [[1,'1.00'],[5,'5.00'],[10,'20.00'],[5,'40005.00']])assert.equal(validateNativeAction({...body,stake,options:{ante,holdWin:true}},new Set(ids)).stake,stake);
 for(const [stake,options] of [['1.00',{ante:5}],['5.00',{ante:'5'}],['20.00',{ante:2}],['5.00',{ante:5,priorCarry:{wilds:[]}}],['5.00',{ante:5,context:{}}],['5.00',{ante:5,baseBetMinor:'100'}]])assert.throws(()=>validateNativeAction({...body,stake,options},new Set(ids)));
 const gems=definitions.find(item=>item.id==='ind74_official_gemscrownchargingwilds');
 assert.throws(()=>validateNativeAction({...body,game_id:gems.id,model_version:gems.version,stake:'5.00',options:{ante:5}},new Set(ids)));
 assert.equal(validateNativeAction({...body,game_id:gems.id,model_version:gems.version,stake:'1.00',options:{ante:1}},new Set(ids)).stake,'1.00');
});
test('Genie and Atlantis purchase modes preserve exact total debit and title-specific choices',()=>{
 const cases=[['ind74_official_geniesbonanza',[['base','1.00'],['buy100','100.00'],['buy100','40100.00']],[['100.00',{mode:'ante'}],['100.00',{mode:'buy60'}],['20.00',{mode:'buy100'}],['100.00',{mode:'buy100',bonusRisk:true}]]],
  ['ind74_official_coinsofatlantis',[['base','1.00'],['ante','3.00'],['ante','40002.00'],['buy60','60.00'],['buy60','120.00']],[['1.00',{mode:'ante'}],['1.50',{mode:'ante'}],['20.00',{mode:'buy60'}],['100.00',{mode:'buy100'}],['60.00',{mode:'buy60',holdWin:true}]]]];
 for(const [gameId,accepted,rejected] of cases){
  const game=definitions.find(item=>item.id===gameId),body={request_id:randomUUID(),type:'start',game_id:game.id,model_version:game.version};
  for(const [mode,stake] of accepted)assert.equal(validateNativeAction({...body,stake,options:{mode}},new Set(ids)).stake,stake);
  for(const [stake,options] of rejected)assert.throws(()=>validateNativeAction({...body,stake,options},new Set(ids)));
  for(const injected of [{baseBetMinor:'100'},{winMinor:'999999'},{jackpot:'GRAND'},{freeSpins:10},{context:{}}])assert.throws(()=>validateNativeAction({...body,stake:'100.00',options:{mode:'base',...injected}},new Set(ids)));
 }
});
test('Mariachi does not accept an unverified purchase or client-authored collector state',()=>{
 const game=definitions.find(item=>item.id==='ind74_official_mariachicoins'),body={request_id:randomUUID(),type:'start',game_id:game.id,model_version:game.version,stake:'1.00'};
 assert.equal(validateNativeAction({...body,options:{holdWin:true}},new Set(ids)).stake,'1.00');
 for(const options of [{mode:'buy20'},{mode:'base'},{collectors:[]},{coinValues:[]},{bonusTriggered:true}])assert.throws(()=>validateNativeAction({...body,options},new Set(ids)));
});
