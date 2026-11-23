/**
 * Fresh Burn Wilds adapter for the EXISTING ZPLAY Player API.
 * Public live player-app.mjs confirms /api/me, /api/config, /api/history,
 * /api/spin and the {key, game, bet} request shape (2026-11-23).
 *
 * Does NOT replace/create a wallet/backend. It refuses money writes until
 * the existing server explicitly lists this game and confirms its native
 * per-round receipt contract. No fallback to another game's result rules.
 */
import {GAME_ID} from './contract.mjs';

const fail = code => {throw Object.assign(new Error(code), {code});};
const isObj = x => x !== null && typeof x==='object' && !Array.isArray(x);
const asGame = x => isObj(x) && x.id===GAME_ID;
const validAmount = n => Number.isSafeInteger(n) && n>0;
const validKey = s => typeof s==='string' && /^[a-zA-Z0-9-]{16,180}$/.test(s);
const GET = Object.freeze({me:'/api/me',config:'/api/config',history:'/api/history'});
const SPIN='/api/spin';
const toETB=amountMinor => (amountMinor/100).toFixed(2);
const own = (obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);

export function createBurnExistingPlayerAPI({origin,fetcher=globalThis.fetch}={}) {
  let site;
  try{site=new URL(origin);}catch{fail('BURN_PLAYER_ORIGIN_INVALID');}
  if(site.protocol!=='https:' || site.pathname!=='/' || site.search ||
     site.hash || site.username || site.password || typeof fetcher!=='function')
    fail('BURN_PLAYER_ORIGIN_INVALID');

  let approved=null,identity=null;
  async function json(path,body) {
    const url=new URL(path,site).href;
    const headers={Accept:'application/json'};
    if(body!==undefined)headers['Content-Type']='application/json';
    let response;
    try{
      response=await fetcher(url,{method:body===undefined?'GET':'POST',headers,
        ...(body===undefined?{cache:'no-store'}:{body:JSON.stringify(body)}),
        credentials:'same-origin',redirect:'error'});
    }catch{fail('BURN_PLAYER_CONNECTION_UNCERTAIN');}
    if(!response || response.redirected ||
       (response.url && new URL(response.url).origin!==site.origin) ||
       !/^application\/json\b/i.test(response.headers?.get('content-type')||''))fail('BURN_PLAYER_API_INVALID');
    if(response.status===401 || response.status===403)fail('BURN_PLAYER_LOGIN_REQUIRED');
    if(!response.ok)fail('BURN_PLAYER_HTTP_'+response.status);
    let data;
    try{data=await response.json();}catch{fail('BURN_PLAYER_UNREADABLE_JSON');}
    if(!isObj(data))fail('BURN_PLAYER_API_INVALID');
    return data;
  }

  async function inspect() {
    approved=null;identity=null;
    const [user,catalogue]=await Promise.all([json(GET.me),json(GET.config)]);
    if(!user.id || !isObj(catalogue) || !Array.isArray(catalogue.games))
      fail('BURN_PLAYER_IDENTITY_UNVERIFIED');
    const game=catalogue.games.find(asGame);
    identity=String(user.id);
    // The existing backend may already offer a game entry, but listing alone
    // does not prove asset rights, math, money settlement, or playable parity.
    const serverCertified=game?.serverCertified===true &&
      game?.ledgerSettled===true && game?.nativeReceiptContract==='burn-wilds-v1' &&
      game?.cashReleaseApproved===true;
    if(serverCertified && Array.isArray(game?.betLevelsMinor) &&
       game.betLevelsMinor.length && game.betLevelsMinor.every(validAmount) &&
       Number.isSafeInteger(user?.balanceMinor) && user.balanceMinor>=0 &&
       typeof game?.modelVersion==='string' && game.modelVersion &&
       typeof game?.assetManifestId==='string' && game.assetManifestId) {
      approved={
        gameId:GAME_ID,subject:identity,currency:'ETB',
        authenticated:true,balanceMinor:user.balanceMinor,
        betLevelsMinor:[...game.betLevelsMinor],
        modelVersion:game.modelVersion,assetManifestId:game.assetManifestId,
        cashReleaseApproved:true
      };
    }
    return Object.freeze({
      gameRegistered:Boolean(game),
      authenticated:true,subject:identity,
      cashReleaseApproved:Boolean(approved),
      release:approved?Object.freeze({...approved}):null
    });
  }

  async function getState() {
    const check=await inspect();
    if(!check.release)fail('BURN_PLAYER_GAME_RELEASE_UNVERIFIED');
    return check.release;
  }

  async function round(action,recoveryOnly) {
    if(!approved || !identity ||
       !isObj(action) || action.gameId!==GAME_ID ||
       action.subject!==identity || action.modelVersion!==approved.modelVersion ||
       !validKey(action.requestKey) ||
       !approved.betLevelsMinor.includes(action.betMinor) ||
       action.betMinor>approved.balanceMinor)
      fail('BURN_PLAYER_SPIN_NOT_AUTHORIZED');
    const game=GAME_ID;
    // This is the EXISTING API contract, never a new bank ledger.
    // A replay must use the original key; the existing API must be idempotent.
    const raw=await json(SPIN,{
      game,bet:toETB(action.betMinor),key:action.requestKey,
      ...(recoveryOnly?{replayOnly:true}:{})
    });
    // The old API's {id,payout,outcome} form cannot be silently upgraded
    // to a Burn Wilds receipt; the server must return the native contract.
    if(raw.gameId!==GAME_ID || raw.subject!==identity ||
       raw.requestKey!==action.requestKey || raw.serverSettled!==true ||
       raw.nativeReceiptContract!=='burn-wilds-v1')
      fail('BURN_PLAYER_NATIVE_SETTLEMENT_UNVERIFIED');
    return raw;
  }

  return Object.freeze({
    inspect,getState,
    getHistory:()=>json(GET.history),
    spin:a=>round(a,false),
    recover:a=>round(a,true)
  });
}
