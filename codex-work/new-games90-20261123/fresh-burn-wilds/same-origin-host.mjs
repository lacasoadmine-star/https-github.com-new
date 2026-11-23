/**
 * Game #1 player/ledger/dashboard bridge, without assumptions about existing
 * deployed API route names. Endpoints must be mapped from the *current*
 * authorized runtime and kept on the same origin, never a detached wallet.
 */
import {GAME_ID} from './contract.mjs';
const fail = code => {throw Object.assign(new Error(code),{code});};
const REQUIRED = Object.freeze(['session','spin','recover','wallet','history','dashboard']);
const isPath = p => typeof p==='string' && /^\/[a-zA-Z0-9/_-]+\/?$/.test(p) && !p.includes('//');
const goodObject = value => value && typeof value==='object' && !Array.isArray(value);

export function createBurnSameOriginHost({origin,paths,request=globalThis.fetch,csrfToken=null}) {
  let base;
  try{base=new URL(origin);}catch{fail('BURN_HOST_ORIGIN_INVALID');}
  if(base.protocol!=='https:' || base.pathname!=='/'||base.search||base.hash||base.username||base.password ||
    typeof request!=='function' || !goodObject(paths) ||
    !REQUIRED.every(k=>isPath(paths[k])) ||
    new Set(REQUIRED.map(k=>paths[k])).size!==REQUIRED.length ||
    (csrfToken!==null && (typeof csrfToken!=='string'||!csrfToken.trim())))fail('BURN_HOST_CONFIGURATION_INVALID');
  const urlFor = key => new URL(paths[key],base).href;
  async function call(kind,action=null) {
    const method=['session','wallet','history','dashboard'].includes(kind)?'GET':'POST';
    const url=urlFor(kind);
    const headers={'Accept':'application/json','Cache-Control':'no-store'};
    if(method==='POST'){
      headers['Content-Type']='application/json';
      if(csrfToken!==null)headers['X-CSRF-Token']=csrfToken;
      if(!goodObject(action)||action.gameId!==GAME_ID ||
          !Number.isSafeInteger(action.betMinor)||action.betMinor<=0 ||
          typeof action.requestKey!=='string'||!action.requestKey ||
          typeof action.subject!=='string'||!action.subject ||
          typeof action.modelVersion!=='string'||!action.modelVersion)
        fail('BURN_HOST_ACTION_INVALID');
    }
    let response;
    try{
      response=await request(url,{method,headers,credentials:'same-origin',
        redirect:'error',cache:'no-store',
        ...(method==='POST'?{body:JSON.stringify({
          gameId:GAME_ID,requestKey:action.requestKey,betMinor:action.betMinor,
          modelVersion:action.modelVersion,subject:action.subject,
          replayOnly:kind==='recover'
        })}:{})});
    }catch{fail('BURN_HOST_NETWORK_UNCERTAIN');}
    if(!response || response.redirected ||
       (response.url && new URL(response.url).origin!==base.origin) ||
       !/^\s*application\/json\b/i.test(response.headers?.get('Content-Type')||''))
      fail('BURN_HOST_RESPONSE_INVALID');
    if(response.status===401 || response.status===403)fail('BURN_HOST_SESSION_EXPIRED');
    if(!response.ok)fail('BURN_HOST_HTTP_'+response.status);
    let data;
    try{data=await response.json();}catch{fail('BURN_HOST_JSON_INVALID');}
    if(!goodObject(data))fail('BURN_HOST_JSON_INVALID');
    // Never synthesize balance/ledger outcomes: controller validates these.
    return data;
  }
  return Object.freeze({
    getState:()=>call('session'),
    spin:action=>call('spin',action),
    recover:action=>call('recover',action),
    getWallet:()=>call('wallet'),
    getHistory:()=>call('history'),
    getDashboard:()=>call('dashboard')
  });
}
