// Install into the retained native app, using its exact signature verifier,
// body reader, session resolver and initialized LibraryService instance.
// This module does not create infrastructure, a wallet, SQL tables or timers.
import {installExistingLibrary74} from './existing-library74-service.mjs';

const PREFIX='/v2/independent74/';
const SESSION=/^@session:[a-f0-9]{64}$/;
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{code,status});};
const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
export function installExistingLibrary74Http(previous,{service,facade:providedFacade,verifyNative,readNativeBody,engineSecret,resolveSessionUser,...options}={}){
  if(typeof previous?.fetch!=='function'||typeof verifyNative!=='function'||typeof readNativeBody!=='function'||typeof resolveSessionUser!=='function')throw new TypeError('Retained app and authentication dependencies are required.');
  const facade=providedFacade||installExistingLibrary74({service,...options});
  if(facade.service!==service)throw new TypeError('The facade must use the retained service instance.');
  return {...previous,async fetch(request,...rest){
    const url=new URL(request.url),path=url.pathname;
    if(!path.startsWith(PREFIX))return previous.fetch(request,...rest);
    const action=path.slice(PREFIX.length);
    if(!['health','state','action','history'].includes(action))return reply({error:{code:'NOT_FOUND',message:'Endpoint not found.'}},404);
    if(request.method!==(action==='action'?'POST':'GET'))return reply({error:{code:'METHOD_NOT_ALLOWED',message:'Unsupported method.'}},405);
    if(action==='health'){
      if(url.search)return reply({error:{code:'INVALID_QUERY',message:'Unsupported query.'}},400);
      const games=facade.definitions();
      return reply({ready:service.ready===true,accepting:service.accepting===true&&games.some(g=>g.accepting),games,
        wallet:'existing-shared-library',providerPrivateMathVerified:false,completeReferenceParityVerified:false},service.ready?200:503);
    }
    if(!service.ready)return reply({error:{code:'ACCOUNT_SERVICE_UNAVAILABLE',message:'The existing account service is unavailable.'}},503);
    try{
      if(action==='action'&&url.search)fail('INVALID_QUERY');
      if(action!=='action'){
        for(const key of url.searchParams.keys())if(key!=='game_id'||url.searchParams.getAll(key).length!==1)fail('INVALID_QUERY');
        if(!url.searchParams.get('game_id'))fail('UNKNOWN_GAME');
      }
      const raw=await readNativeBody(request,8192);
      const subject=await verifyNative(request,raw,engineSecret);
      if(typeof subject!=='string'||!SESSION.test(subject))fail('UNAUTHORIZED',401);
      const user=await resolveSessionUser(service.shared,subject);
      if(action==='state')return reply(await facade.state(user,url.searchParams.get('game_id')));
      if(action==='history')return reply(await facade.history(user,url.searchParams.get('game_id')));
      if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))fail('JSON_REQUIRED',415);
      let input;try{input=JSON.parse(raw);}catch{fail('INVALID_JSON');}
      return reply(await facade.action(user,input));
    }catch(error){
      const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<600?error.status:503;
      const code=status<500?(error.code||error.message||'INVALID_REQUEST'):'ACTION_UNCONFIRMED';
      return reply({error:{code,message:status<500?code:'The existing account service did not confirm this request.'},retryable:status>=500},status);
    }
  }};
}
