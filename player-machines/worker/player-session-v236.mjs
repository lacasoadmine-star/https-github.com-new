// A server-signed, session-bound five-minute presence lease. Never replaces
// the platform's existing authentication or wallet authorization.
export const TTL=300000,LEASE='__Host-zplay_presence';
const utf8=new TextEncoder(),keys=new Map();
const bytes=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const base64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
async function key(secret){if(typeof secret!=='string'||secret.length<32)throw Error('PRESENCE_KEY_NOT_CONFIGURED');if(!keys.has(secret))keys.set(secret,crypto.subtle.importKey('raw',utf8.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']));return keys.get(secret);}
export function cookies(request){const raw=request.headers.get('cookie')||'';return {session:raw.match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/)?.[1]||'',lease:raw.match(/(?:^|;\s*)__Host-zplay_presence=([^;]+)(?:;|$)/)?.[1]||''};}
async function identity(token){return base64(await crypto.subtle.digest('SHA-256',utf8.encode(token)));}
export async function issue(token,secret,now=Date.now()){
 const payload=base64(utf8.encode(JSON.stringify({v:1,s:await identity(token),exp:now+TTL})));
 return payload+'.'+base64(await crypto.subtle.sign('HMAC',await key(secret),utf8.encode(payload)));
}
export async function verify(value,token,secret,now=Date.now()){
 try{const [payload,signature,...rest]=value.split('.');if(rest.length||!payload||!signature)return false;
 if(!await crypto.subtle.verify('HMAC',await key(secret),bytes(signature),utf8.encode(payload)))return false;
 const d=JSON.parse(new TextDecoder().decode(bytes(payload)));
 return d.v===1&&d.s===await identity(token)&&Number.isSafeInteger(d.exp)&&d.exp>now&&d.exp<=now+TTL;
 }catch{return false;}
}
function cookie(value,seconds=300){return LEASE+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+seconds;}
export function expire(response){const r=new Response(response.body,response);r.headers.append('Set-Cookie',cookie('',0));r.headers.append('Set-Cookie','sw_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');r.headers.set('Cache-Control','no-store');r.headers.set('X-Zplay-Session','expired');return r;}
const reply=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function publicAPI(path){return ['/api/config','/api/health','/api/session','/api/slots/session','/api/slots/games','/api/player-game-catalog','/api/internal-catalog'].includes(path)||/^\/api\/slots\/games\/[a-z0-9_]+$/.test(path);}
export function withoutSession(request){const headers=new Headers(request.headers);headers.delete('cookie');headers.delete('authorization');return new Request(request,{headers});}
export async function sessionGate(request,env,previous,ctx,{now=Date.now()}={}){
 const url=new URL(request.url),path=url.pathname,c=cookies(request),presence=path==='/_player/presence';
 if(presence){
  if(request.method!=='POST')return reply({detail:'METHOD_NOT_ALLOWED'},405);
  if(request.headers.get('origin')!==url.origin)return reply({detail:'INVALID_ORIGIN'},403);
 }
 if(!presence&&!path.startsWith('/api/'))return null;
 if(!presence&&request.method==='POST'&&/^\/api\/(?:(?:auth|player)\/)?(?:login|register|logout)$/.test(path))return null;
 if(!c.session)return presence?reply({active:false},401):null;
 let valid=await verify(c.lease,c.session,env.PLAYER_PRESENCE_KEY,now),migration=false;
 if(!valid&&!c.lease&&now<Number(env.PLAYER_PRESENCE_MIGRATION_UNTIL||0)){
  // A one-time rollout window for already-signed-in players. This check uses
  // the existing live session endpoint, never client-supplied identity.
  try{const h=new Headers({cookie:'sw_session='+c.session,accept:'application/json'});const r=await previous.fetch(new Request(new URL('/api/slots/session',url.origin),{headers:h}),env,ctx);valid=r.ok&&(await r.json()).authenticated===true;migration=valid;}catch{}
 }
 if(!valid){
  if(presence)return expire(reply({active:false,detail:'PLAYER_SESSION_EXPIRED'},401));
  if(['GET','HEAD'].includes(request.method)&&publicAPI(path))return expire(await previous.fetch(withoutSession(request),env,ctx));
  // Credential-based login/registration can establish a new session.
  if(request.method==='POST'&&/^\/api\/(?:(?:auth|player)\/)?(?:login|register|logout)$/.test(path))return null;
  return expire(reply({detail:'PLAYER_SESSION_EXPIRED'},401));
 }
 if(presence){const r=reply({active:true,expiresAt:now+TTL},200);r.headers.append('Set-Cookie',cookie(await issue(c.session,env.PLAYER_PRESENCE_KEY,now)));return r;}
 if(migration){const upstream=await previous.fetch(request,env,ctx),r=new Response(upstream.body,upstream);r.headers.append('Set-Cookie',cookie(await issue(c.session,env.PLAYER_PRESENCE_KEY,now)));r.headers.set('Cache-Control','no-store');return r;}
 return null;
}
export async function decorateSession(request,response,env,{now=Date.now()}={}){
 const path=new URL(request.url).pathname,c=cookies(request);
 const set=response.headers.get('Set-Cookie')||'',fresh=set.match(/(?:^|,\s*)sw_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 const login=request.method==='POST'&&response.ok&&fresh;
 const clear=request.method==='POST'&&/\/(?:auth\/)?logout$/.test(path);
 if(clear)return expire(response);
 if(login){const r=new Response(response.body,response);r.headers.append('Set-Cookie',cookie(await issue(fresh,env.PLAYER_PRESENCE_KEY,now)));r.headers.set('Cache-Control','no-store');r.headers.set('X-Zplay-Session','started');return r;}
 if(response.status===401&&c.session&&!/^\/api\/(?:(?:auth|player)\/)?(?:login|register)$/.test(path))return expire(response);
 return response;
}

