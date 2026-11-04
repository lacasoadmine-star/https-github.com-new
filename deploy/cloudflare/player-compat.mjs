import {ACTIVE_GAMES} from '../../apps/native-engine/catalog.mjs';
import {OFFICIAL_DEMO_CATALOG} from './official-demo-catalog.mjs';
import {GATEWAY_HTML} from './gateway-page.mjs';
import {integrateLobbyHTML, INTEGRATED_LOBBY_PATH} from './integrated-lobby.mjs';
import {nativeRoute,proxyNativeFamily,reconcileNativeFamilies} from './native-family-proxy.mjs';

export const COMPAT_RELEASE = 'superwin-dual-mode-ledger-20261104';

const money = value => typeof value === 'string' && /^\d{1,16}\.\d{2}$/.test(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

async function boundedJSON(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('JSON_REQUIRED');
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16000) {
        await reader.cancel();
        throw new Error('BODY_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function wrapPlayer(original, {legacy, GAMES, sessionHeaders, gatewayScript, lobbyScript}) {
  const json = (data, status = 200, sources = []) => Response.json(data, {
    status,
    headers: sessionHeaders(new Headers({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Superwin-Compat': COMPAT_RELEASE,
    }), sources),
  });
  const fail = (detail, status, sources) => json({detail}, status, sources);
  const readRequest = (request, path) => {
    const url = new URL(request.url);
    url.pathname = path;
    url.search = '';
    const headers=new Headers(request.headers);headers.delete('Content-Length');headers.delete('Content-Type');
    return new Request(url,{headers});
  };
  async function session(request, env) {
    const upstream = await legacy(readRequest(request, '/api/slots/originals/session'), env);
    if (!upstream.ok) return {error: fail(upstream.status === 401 ? 'PLAYER_LOGIN_REQUIRED' : 'WALLET_UNAVAILABLE', upstream.status === 401 ? 401 : 503, upstream.headers)};
    let data;
    try { data = await upstream.json(); }
    catch { return {error: fail('WALLET_UNAVAILABLE', 503, upstream.headers)}; }
    if (data.authenticated !== true || typeof data.identity !== 'string' || !data.identity) {
      return {error: fail('PLAYER_LOGIN_REQUIRED', 401, upstream.headers)};
    }
    if (data.currency !== 'ETB' || !money(data.balance)) {
      return {error: fail('WALLET_UNAVAILABLE', 503, upstream.headers)};
    }
    return {data, headers: upstream.headers};
  }
  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const path = url.pathname;
      const removedTestPath=path==='/api/wallet/test';
      const walletLaunchPath=path==='/api/gateway/launch';
      const walletPath = path === '/api/wallet' || path === '/api/wallet/DDSAgent';
      const gatewayPath = path === '/gateway' || path === '/gateway/' || path === '/gateway-player.mjs' || path === '/api/gateway/games';
      const lobbyPath = ['/', '/games', '/games/', '/casino', '/catalog', '/player', '/player/'].includes(path) && ['GET', 'HEAD'].includes(request.method);
      const handled = nativeRoute(path) || removedTestPath || walletLaunchPath || walletPath || gatewayPath || lobbyPath || path === INTEGRATED_LOBBY_PATH || path === '/api/games' || path === '/api/spin' || path === '/_player/wallet-compat-release';
      if (!handled && path !== '/ws' && !path.startsWith('/ws/')) return original.fetch(request, env, ctx);
      try {
        if (request.headers.has('x-zplay-two-hop')) return fail('LEGACY_DISPATCH_LOOP', 503);
        if(removedTestPath)return fail('REMOVED',410);
        if(walletLaunchPath){
          if(request.method!=='POST')return fail('METHOD_NOT_ALLOWED',405);
          if(request.headers.get('origin')!==url.origin)return fail('INVALID_ORIGIN',403);
          if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return fail('JSON_REQUIRED',415);
          let body;try{body=await boundedJSON(request);}catch(error){return fail(error.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'INVALID_JSON',error.message==='BODY_TOO_LARGE'?413:400);}
          if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(key=>!['game_id','mode'].includes(key))||!['ETB','DEMO'].includes(body.mode))return fail('INVALID_LAUNCH_REQUEST',422);
          const game=OFFICIAL_DEMO_CATALOG.games.find(game=>game.id===body.game_id);if(!game)return fail('GAME_NOT_FOUND',404);
          if(body.mode==='DEMO')return json({game_id:game.id,session_mode:'DEMO',launch_url:game.launch_url,settlement_enabled:false});
          const account=await session(request,env);if(account.error)return account.error;
          if(account.data.enabled!==true)return fail('ACCOUNT_PLAY_DISABLED',403,account.headers);
          if(BigInt(account.data.balance.replace('.',''))<=0n)return json({detail:'INSUFFICIENT_ETB_BALANCE',balance:account.data.balance,user_id:account.data.identity,currency:'ETB'},409,account.headers);
          if(!Object.hasOwn(ACTIVE_GAMES,game.id))return fail('ETB_ENGINE_UNAVAILABLE',503,account.headers);
          const me=await legacy(readRequest(request,'/api/me'),env);if(!me.ok)return fail(me.status===401?'PLAYER_LOGIN_REQUIRED':'ACCOUNT_UNAVAILABLE',me.status===401?401:503,[account.headers,me.headers]);
          const player=await me.json();if(typeof player.id!=='string'||!player.id||player.role!=='player')return fail('PLAYER_REQUIRED',403,[account.headers,me.headers]);
          return json({game_id:game.id,session_mode:'INTERNAL_ETB',implementation:'Superwin internal',official_provider_game:false,user_id:player.id,wallet_identity:account.data.identity,account_scope:'authenticated_player',launch_url:'/native/'+game.id+'?embed=1',wallet:{balance:account.data.balance,currency:'ETB'},settlement_enabled:true,credit_required:true},200,[account.headers,me.headers]);
        }
        if(nativeRoute(path))return proxyNativeFamily(request,env,{legacy,sessionHeaders});
        if (path === INTEGRATED_LOBBY_PATH) {
          if (!['GET','HEAD'].includes(request.method)) return fail('METHOD_NOT_ALLOWED',405);
          if (typeof lobbyScript !== 'string') return fail('PLAYER_ASSET_UNAVAILABLE',503);
          return new Response(request.method === 'HEAD' ? null : lobbyScript, {headers: {'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
        }
        if (lobbyPath) {
          const upstream = await original.fetch(request, env, ctx);
          if (request.method === 'HEAD' || !upstream.headers.get('Content-Type')?.includes('text/html')) return upstream;
          const html = await upstream.text();
          const decorated = typeof lobbyScript === 'string' ? integrateLobbyHTML(html) : html;
          const headers = new Headers(upstream.headers);
          for (const name of ['Content-Length', 'Content-Encoding', 'ETag']) headers.delete(name);
          headers.set('Cache-Control', 'no-store');
          return new Response(decorated, {status: upstream.status, headers});
        }
        if (gatewayPath) {
          if (!['GET', 'HEAD'].includes(request.method)) return fail('METHOD_NOT_ALLOWED', 405);
          if (path === '/gateway' || path === '/gateway/') {
            const target = new URL(request.url);target.pathname = '/';
            return new Response(null,{status:302,headers:{Location:target.href,'Cache-Control':'no-store'}});
          }
          if (path === '/api/gateway/games') {
            const result = json({...OFFICIAL_DEMO_CATALOG,status:'OFFICIAL_DEMO',configured_games_count:0,demo_games_count:30,official_provider_game:true,internal_etb_games_count:30,games:OFFICIAL_DEMO_CATALOG.games.map(game=>({...game,etb_enabled:true,etb_implementation:'Superwin internal',etb_launch_url:'/native/'+game.id,wallet_entry_enabled:true,credit_required:true,settlement_enabled:true})),wallet_entry_enabled:true,wallet_launch_endpoint:'/api/gateway/launch'});
            return request.method === 'HEAD' ? new Response(null, result) : result;
          }
          const script = path === '/gateway-player.mjs';
          if (script && typeof gatewayScript !== 'string') return fail('PLAYER_ASSET_UNAVAILABLE', 503);
          return new Response(request.method === 'HEAD' ? null : script ? gatewayScript : GATEWAY_HTML, {
            headers: {
              'Content-Type': script ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8',
              'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
              'X-Superwin-Compat': COMPAT_RELEASE,
              'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-src 'self' https://demo.smartsoftgaming.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
              'Referrer-Policy': 'no-referrer',
            },
          });
        }
        if (path === '/ws' || path.startsWith('/ws/')) {
          if (request.method !== 'GET' || request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return fail('WEBSOCKET_UPGRADE_REQUIRED', 426);
          if (request.headers.get('origin') !== url.origin) return fail('INVALID_ORIGIN', 403);
          return await legacy(request, env);
        }
        if (path === '/_player/wallet-compat-release') {
          if (request.method !== 'GET') return fail('METHOD_NOT_ALLOWED', 405);
          return json({release: COMPAT_RELEASE, wallet: '/api/wallet',wallet_launch:'/api/gateway/launch',wallet_launch_settlement_enabled:true, catalog: '/api/games', internal_catalog: '/api/gateway/games',native_engine_status:'/api/native-families/status', player: '/',
                       settlement: '/api/slots/spin', currency: 'ETB',
                       account_scope: 'authenticated_player', demo_settlement_enabled: false});
        }
        if (walletPath) {
          if (!['GET', 'HEAD'].includes(request.method)) return fail('METHOD_NOT_ALLOWED', 405);
          const account = await session(request, env);
          if (account.error) return account.error;
          // DDSAgent is a compatibility path, never a wallet selector.
          const result = json({user_id: account.data.identity, balance: account.data.balance,
                               currency: 'ETB', enabled: account.data.enabled === true,
                               account_scope: 'authenticated_player'}, 200, account.headers);
          return request.method === 'HEAD' ? new Response(null, result) : result;
        }
        if (path === '/api/games') {
          if (!['GET', 'HEAD'].includes(request.method)) return fail('METHOD_NOT_ALLOWED', 405);
          const upstream = await original.fetch(readRequest(request, '/api/slots/games'), env, ctx);
          if (!upstream.ok) return upstream;
          const data = await upstream.json();
          if (!Array.isArray(data.games)) return fail('CATALOG_UNAVAILABLE', 503, upstream.headers);
          const games = data.games.filter(game => game && Object.hasOwn(GAMES, game.id)).map(game => ({
            ...game, name: GAMES[game.id].title, category: 'Slots',
            launch_url: '/play/' + GAMES[game.id].slug,
            modes: ['ETB'], demo_launcher_url: null, demo_status: 'not_integrated',
          }));
          const result = json({games, currency: 'ETB', wallet_integration: 'existing_shared_backend'}, 200, upstream.headers);
          return request.method === 'HEAD' ? new Response(null, result) : result;
        }
        if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);
        if (request.headers.get('origin') !== url.origin) return fail('INVALID_ORIGIN', 403);
        if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail('JSON_REQUIRED', 415);
        let body;
        try { body = await boundedJSON(request); }
        catch (error) { return fail(error.message === 'BODY_TOO_LARGE' ? error.message : 'INVALID_JSON', error.message === 'BODY_TOO_LARGE' ? 413 : 400); }
        if (!body || Array.isArray(body) || typeof body !== 'object') return fail('INVALID_JSON', 400);
        if (body.mode === 'DEMO') return fail('DEMO_NOT_INTEGRATED_NO_WALLET_DEBIT', 409);
        if (body.mode !== 'ETB' || typeof body.game_id !== 'string' || !Object.hasOwn(GAMES, body.game_id) || !uuid(body.request_id) || !money(body.stake) || BigInt(body.stake.replace('.', '')) <= 0n) {
          return fail('GAME_STAKE_MODE_OR_REQUEST_ID_INVALID', 422);
        }
        const account = await session(request, env);
        if (account.error) return account.error;
        const target = new URL(request.url);
        target.pathname = '/api/slots/spin';
        target.search = '';
        const headers = new Headers(request.headers);
        headers.delete('Content-Length');
        const upstream = await original.fetch(new Request(target, {
          method: 'POST', headers,
          body: JSON.stringify({gameId: body.game_id, bet: body.stake,
                                roundToken: body.request_id, identity: account.data.identity}),
        }), env, ctx);
        const responseHeaders = new Headers(upstream.headers);
        responseHeaders.delete('set-cookie');
        sessionHeaders(responseHeaders, [account.headers, upstream.headers]);
        responseHeaders.set('Cache-Control', 'no-store');
        responseHeaders.set('X-Superwin-Compat', COMPAT_RELEASE);
        return new Response(upstream.body, {status: upstream.status, statusText: upstream.statusText, headers: responseHeaders});
      } catch {
        return fail('TEMPORARILY_UNAVAILABLE_RETRY_SAME_TOKEN', 503);
      }
    },
    async scheduled(event,env,ctx){
      if(typeof original.scheduled==='function')await original.scheduled(event,env,ctx);
      ctx.waitUntil(reconcileNativeFamilies(env).catch(()=>console.error(JSON.stringify({event:'native_reconcile_unavailable'}))));
    },
  };
}
