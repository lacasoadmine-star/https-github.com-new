import {cookies} from './player-session-v236.mjs';
import {assets,release} from './machine-assets-20261106.mjs';
const prefix='/'+release+'/',ids=new Set(['multi_hot_5_video','hot_foxy_20']);
const aliases={'multi-hot-5':'multi_hot_5_video','multi_hot_5':'multi_hot_5_video','multi-hot-5-new':'multi_hot_5_video','hot-foxy-20':'hot_foxy_20','foxy-hot-20':'hot_foxy_20'};
export function resolveGame(url){let id;if(['/slots/game.html','/zplaybet-v232/game.html'].includes(url.pathname))id=url.searchParams.get('game');else if(url.pathname.startsWith('/games/'))id=url.pathname.slice(7).replace(/\/$/,'');else if(['/play/multi-hot-5-new','/mh5-video-v1/index.html'].includes(url.pathname))id='multi_hot_5_video';id=aliases[id]||id;return ids.has(id)?id:null;}
export async function sessionIdentity(request){const token=cookies(request).session;if(!token)return '';const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('zplay-machine-session:'+token));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Zplay-Release':release}});
export async function machineAPI(request,env,ctx,previous){const url=new URL(request.url),bound=request.headers.get('X-Zplay-Machine-Session');
 if(request.method==='POST'&&['/api/slots/spin','/api/slots/gamble'].includes(url.pathname)&&bound){if(request.headers.get('origin')!==url.origin||bound!==await sessionIdentity(request))return json({detail:'MACHINE_SESSION_CHANGED'},403);}
 if(url.pathname!=='/api/machine-session')return null;
 if(request.method!=='GET')return json({detail:'METHOD_NOT_ALLOWED'},405);
 if(!cookies(request).session)return json({authenticated:false});
 const upstream=path=>previous.fetch(new Request(new URL(path,url.origin),{headers:{cookie:request.headers.get('cookie')||'',accept:'application/json'}}),env,ctx);
 const session=await upstream('/api/slots/session');if(!session.ok)return session;const data=await session.json();if(data.authenticated!==true)return json({authenticated:false});
 const wallet=await upstream('/api/slots/balance');if(!wallet.ok)return wallet;const balance=await wallet.json();if(balance.currency!=='ETB'||typeof balance.balance!=='string'||!/^\d+\.\d{2}$/.test(balance.balance))return json({detail:'INVALID_WALLET_RESPONSE'},502);
 return json({authenticated:true,currency:'ETB',balance:balance.balance,sessionId:await sessionIdentity(request)});
}
export function machinePage(request,config){const url=new URL(request.url);if(!['GET','HEAD'].includes(request.method))return null;
 if(url.pathname.startsWith(prefix)){const asset=assets[url.pathname.slice(prefix.length)];if(!asset||url.pathname.endsWith('/index.html'))return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','X-Zplay-Release':release}});}
 const id=resolveGame(url);if(!id)return null;
 const html=assets['index.html'].body.replace('{{GAME}}',id).replace('</body>','<script type="module" src="/player-v236/'+config.presence+'"></script></body>');
 return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Zplay-Release':release,'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"}});
}
